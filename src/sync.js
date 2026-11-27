// One sync run: fetch every source, verify pending fixes against releases,
// rebuild cards, append transitions. A failing source never blocks the others
// and never erases its last good data; it shows up as delayed in the UI.

import { LIMITS, REPOS } from './config.js';
import { computeClusters } from './engine.js';
import { HttpClient, RateLimitError } from './http.js';
import { computeMetrics, processCards, pruneRecords } from './pipeline.js';
import { fetchPull, ghId, releaseContainsCommit, syncRepo } from './sources/github.js';
import { syncHN } from './sources/hn.js';
import { parseFixedByRefs } from './extract.js';
import { recordSourceRun, upsertRecord } from './store.js';

export function makeGitHubClient({ token, etags, fetch, sleep }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'problem-radar',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new HttpClient({ headers, etags, fetch, sleep, minRemaining: token ? LIMITS.minRemainingQuota : 5 });
}

export async function runSync(state, { now = new Date().toISOString(), token, repos = REPOS, fetch, sleep, log = console.log, skipHN = false } = {}) {
  const gh = makeGitHubClient({ token, etags: state.etags, fetch, sleep });
  const hn = new HttpClient({ headers: { 'User-Agent': 'problem-radar' }, fetch, sleep });
  const counts = { new: 0, changed: 0, unchanged: 0 };
  const upsert = (rec) => { counts[upsertRecord(state, rec, now)]++; };
  let ghBlocked = null;

  for (const { repo, hn: terms } of repos) {
    const key = `github:${repo}`;
    if (ghBlocked) {
      recordSourceRun(state, key, { ok: false, error: `deferred: ${ghBlocked}` }, now);
    } else {
      const before = { ...gh.stats };
      // Work on a copy of the cursors so a failed run cannot half-advance them.
      const cursorSnapshot = JSON.stringify(Object.fromEntries(Object.entries(state.cursors).filter(([k]) => k.startsWith(`${key}:`))));
      try {
        const s = await syncRepo({ http: gh, state, repo, now, upsert });
        recordSourceRun(state, key, { ok: true, items: s.items, truncated: s.truncated, requests: gh.stats.requests - before.requests, notModified: gh.stats.notModified - before.notModified }, now);
        log(`  ${key}: ${s.items} items, ${gh.stats.requests - before.requests} requests (${gh.stats.notModified - before.notModified} not modified)${s.truncated ? ', truncated (resumes next run)' : ''}`);
      } catch (err) {
        Object.assign(state.cursors, JSON.parse(cursorSnapshot));
        recordSourceRun(state, key, { ok: false, error: err.message }, now);
        log(`  ${key}: FAILED ${err.message}`);
        if (err instanceof RateLimitError) ghBlocked = err.message;
      }
    }

    if (!skipHN) {
      const hkey = `hn:${repo}`;
      try {
        const s = await syncHN({ http: hn, state, repo, terms, now, upsert });
        recordSourceRun(state, hkey, { ok: true, items: s.items }, now);
      } catch (err) {
        recordSourceRun(state, hkey, { ok: false, error: err.message }, now);
        log(`  ${hkey}: FAILED ${err.message}`);
      }
    }
  }

  if (!ghBlocked) await verifyFixes(state, { gh, now, upsert, log });

  const result = processCards(state, now);
  const pruned = pruneRecords(state, now);
  const metrics = computeMetrics(state, now);
  log(`records: +${counts.new} new, ${counts.changed} changed, ${counts.unchanged} unchanged; pruned ${pruned}`);
  log(`cards: ${metrics.cards} (${JSON.stringify(metrics.byState)}); events: ${result.created.length} created, ${result.transitions.length} transitions`);
  log(`github quota: ${gh.stats.remaining ?? '?'} remaining, ${gh.stats.requests} requests this run (${gh.stats.notModified} were 304)`);
  return { result, metrics, counts, ghStats: gh.stats };
}

/**
 * For every card with a merged fix but no verified release, check newer
 * releases with the compare API. Also fetches PRs that issue comments name as
 * the fix ("fixed by #123") when we have not seen them yet.
 */
export async function verifyFixes(state, { gh, now, upsert, log = () => {} }) {
  let budget = LIMITS.maxCompareChecksPerRun;
  const clusters = computeClusters(state.records, state.verifications);

  // Missing "fixed by" PRs.
  for (const c of clusters) {
    if (c.state === 'resolved' || budget <= 0) continue;
    for (const id of c.memberIds) {
      const issue = state.records[id];
      if (issue?.kind !== 'issue') continue;
      const comments = Object.values(state.records).filter((r) => r.parentId === id);
      for (const cm of comments) {
        for (const ref of parseFixedByRefs(cm.body, cm.repo)) {
          if (state.records[ghId.pr(ref.repo, ref.number)] || budget <= 0) continue;
          budget--;
          try {
            const pr = await fetchPull({ http: gh, repo: ref.repo, number: ref.number });
            if (pr) upsert(pr);
          } catch (err) { log(`  fetch PR ${ref.repo}#${ref.number}: ${err.message}`); }
        }
      }
    }
  }

  // Release containment for merged fixes.
  const fresh = computeClusters(state.records, state.verifications);
  for (const c of fresh) {
    if (c.state !== 'fix_coming' && c.state !== 'watching') continue;
    for (const f of c.fixes) {
      if (f.release) continue;
      const pr = state.records[ghId.pr(...f.pr.split('#').map((v, i) => (i ? Number(v) : v)))];
      if (!pr?.mergeCommitSha) continue;
      const key = `${pr.repo}@${pr.mergeCommitSha}`;
      const ver = (state.verifications[key] ||= { checks: {}, checkedAt: null });
      const candidates = Object.values(state.records)
        .filter((r) => r.kind === 'release' && r.repo === pr.repo && !r.draft && !r.prerelease && r.publishedAt >= pr.mergedAt && ver.checks[r.tag] === undefined)
        .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      for (const rel of candidates) {
        if (budget-- <= 0) break;
        try {
          const contains = await releaseContainsCommit({ http: gh, repo: pr.repo, tag: rel.tag, sha: pr.mergeCommitSha });
          if (contains === null) continue;
          ver.checks[rel.tag] = contains;
          ver.checkedAt = now;
          log(`  verify ${pr.repo}#${pr.number} in ${rel.tag}: ${contains ? 'contained' : 'not contained'}`);
          if (contains) break;
        } catch (err) {
          log(`  verify ${key} ${rel.tag}: ${err.message}`);
          if (err instanceof RateLimitError) return;
        }
      }
    }
  }
}
