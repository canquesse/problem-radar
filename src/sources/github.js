// GitHub source. One repository = four endpoints, each with its own cursor:
//
//   issues    GET /repos/{r}/issues?state=all&sort=updated&direction=asc&since=…
//             (ascending, so a page cap never loses data: the cursor is the
//             last `updated_at` we processed and the next run resumes there)
//   comments  GET /repos/{r}/issues/comments?sort=updated&direction=asc&since=…
//   pulls     GET /repos/{r}/pulls?state=closed&sort=updated&direction=desc
//             (no `since` on this endpoint: walk pages until we pass the cursor)
//   releases  GET /repos/{r}/releases  (walk until a release we already know)
//
// The first page of every endpoint is a conditional request. When nothing
// changed the cursor URL is identical to last run, GitHub answers 304, and
// that costs no primary quota for authenticated requests.

import { LIMITS } from '../config.js';
import { cleanText, isFirstHandMeToo, isRetraction, isStillHappening, parseDuplicateOf, parseFixedByRefs, parseFixRefs } from '../extract.js';

const API = 'https://api.github.com';

export const ghId = {
  issue: (repo, n) => `gh:${repo}:issue:${n}`,
  pr: (repo, n) => `gh:${repo}:pr:${n}`,
  comment: (repo, id) => `gh:${repo}:comment:${id}`,
  release: (repo, id) => `gh:${repo}:release:${id}`,
};

const isBot = (user) => !user || user.type === 'Bot' || /\[bot\]$|-bot$|^github-actions/i.test(user.login || '');
const trim = (s) => cleanText(s || '').slice(0, LIMITS.maxBodyChars);

export function normalizeIssue(repo, it) {
  return {
    id: ghId.issue(repo, it.number),
    source: 'github',
    repo,
    kind: 'issue',
    number: it.number,
    url: it.html_url,
    title: it.title || '',
    body: trim(it.body),
    author: it.user?.login || null,
    authorAssociation: it.author_association || null,
    createdAt: it.created_at,
    updatedAt: it.updated_at,
    closedAt: it.closed_at || null,
    state: it.state,
    stateReason: it.state_reason || null,
    labels: (it.labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean),
  };
}

export function normalizeComment(repo, c) {
  const m = (c.issue_url || '').match(/\/issues\/(\d+)$/);
  const parentNumber = m ? Number(m[1]) : null;
  return {
    id: ghId.comment(repo, c.id),
    source: 'github',
    repo,
    kind: 'comment',
    url: c.html_url,
    title: '',
    body: trim(c.body),
    author: c.user?.login || null,
    authorAssociation: c.author_association || null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    parentId: parentNumber ? ghId.issue(repo, parentNumber) : null,
  };
}

export function normalizePull(repo, p) {
  return {
    id: ghId.pr(repo, p.number),
    source: 'github',
    repo,
    kind: 'pr',
    number: p.number,
    url: p.html_url,
    title: p.title || '',
    body: trim(p.body),
    author: p.user?.login || null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    state: p.merged_at ? 'merged' : p.state,
    mergedAt: p.merged_at || null,
    mergeCommitSha: p.merged_at ? p.merge_commit_sha : null,
  };
}

export const isPrereleaseTag = (tag) => /(?:^|[-.+_])(?:alpha|beta|rc|dev|pre|preview|nightly)[-.]?\d*(?:$|[-.+])/i.test(tag || '') || /\d(?:a|b|rc)\d+$/.test(tag || '');

export function normalizeRelease(repo, r) {
  return {
    id: ghId.release(repo, r.id),
    source: 'github',
    repo,
    kind: 'release',
    url: r.html_url,
    title: r.name || r.tag_name,
    body: trim(r.body),
    tag: r.tag_name,
    author: r.author?.login || null,
    createdAt: r.created_at,
    updatedAt: r.published_at || r.created_at,
    publishedAt: r.published_at || null,
    // Some projects ship beta/rc tags without the pre-release flag.
    prerelease: !!r.prerelease || isPrereleaseTag(r.tag_name),
    draft: !!r.draft,
    state: r.draft ? 'draft' : 'published',
  };
}

/** A PR is only worth storing if it references an issue as (partial) fix. */
export function pullIsRelevant(rec) {
  const refs = parseFixRefs(`${rec.title}\n${rec.body}`, rec.repo);
  return refs.full.length + refs.partial.length > 0;
}

/** Comments are kept only when they can change a card. */
export function commentIsRelevant(rec, parent) {
  if (!parent) return false;
  const t = rec.body;
  if (rec.author && rec.author === parent.author) return true; // reporter follow-ups (retractions, repro details)
  return isFirstHandMeToo(t) || isRetraction(t) || isStillHappening(t) || parseFixedByRefs(t, rec.repo).length > 0 || parseDuplicateOf(t, rec.repo).length > 0;
}

function lookbackIso(now) {
  return new Date(Date.parse(now) - LIMITS.initialLookbackDays * 86400_000).toISOString();
}

/**
 * Sync one repository. Mutates `state` through `upsert`. Returns per-endpoint
 * stats. Throws only on rate limit / fatal errors; the caller records health.
 */
export async function syncRepo({ http, state, repo, now, upsert }) {
  const stats = { items: 0, truncated: false };
  const cur = (ep) => (state.cursors[`github:${repo}:${ep}`] ||= {});

  // 1) Issues (ascending by update time, resumable)
  {
    const c = cur('issues');
    const since = c.since || lookbackIso(now);
    const url = `${API}/repos/${repo}/issues?state=all&sort=updated&direction=asc&per_page=${LIMITS.perPage}&since=${encodeURIComponent(since)}`;
    let maxUpdated = since;
    for await (const page of http.paginate(url, { maxPages: LIMITS.maxPagesPerEndpoint })) {
      if (page.truncated) stats.truncated = true;
      for (const it of page.items) {
        if (it.updated_at > maxUpdated) maxUpdated = it.updated_at;
        if (it.pull_request || isBot(it.user)) continue; // PRs come from the pulls endpoint
        upsert(normalizeIssue(repo, it));
        stats.items++;
      }
    }
    c.since = maxUpdated;
  }
  // If the issue walk hit the page cap, comments must not run ahead of it,
  // otherwise comments on not-yet-fetched issues would be skipped for good.
  const issuesCursor = stats.truncated ? cur('issues').since : null;

  // 2) Issue comments (ascending, resumable)
  {
    const c = cur('comments');
    const since = c.since || lookbackIso(now);
    const url = `${API}/repos/${repo}/issues/comments?sort=updated&direction=asc&per_page=${LIMITS.perPage}&since=${encodeURIComponent(since)}`;
    let maxUpdated = since;
    for await (const page of http.paginate(url, { maxPages: LIMITS.maxPagesPerEndpoint })) {
      if (page.truncated) stats.truncated = true;
      let stop = false;
      for (const cm of page.items) {
        if (issuesCursor && cm.updated_at > issuesCursor) { stop = true; break; }
        if (cm.updated_at > maxUpdated) maxUpdated = cm.updated_at;
        if (isBot(cm.user)) continue;
        const rec = normalizeComment(repo, cm);
        if (!commentIsRelevant(rec, state.records[rec.parentId])) continue;
        upsert(rec);
        stats.items++;
      }
      if (stop) break;
    }
    c.since = maxUpdated;
  }

  // 3) Closed pulls (descending; stop once we pass the cursor)
  {
    const c = cur('pulls');
    const after = c.updatedAfter || lookbackIso(now);
    const url = `${API}/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${LIMITS.perPage}`;
    let newest = after;
    let reachedCursor = false;
    for await (const page of http.paginate(url, { maxPages: LIMITS.maxPagesPerEndpoint })) {
      if (page.notModified) { reachedCursor = true; break; }
      if (page.truncated && !reachedCursor) stats.truncated = true;
      for (const p of page.items) {
        if (p.updated_at <= after) { reachedCursor = true; break; }
        if (p.updated_at > newest) newest = p.updated_at;
        if (!p.merged_at) continue;
        const rec = normalizePull(repo, p);
        if (!pullIsRelevant(rec)) continue;
        upsert(rec);
        stats.items++;
      }
      if (reachedCursor) break;
    }
    c.updatedAfter = newest;
  }

  // 4) Releases (descending; stop at the first release we already know)
  {
    const c = cur('releases');
    const known = new Set(c.knownIds || []);
    const floor = c.knownIds ? null : lookbackIso(now);
    const url = `${API}/repos/${repo}/releases?per_page=${Math.min(LIMITS.perPage, 30)}`;
    const seen = [];
    outer: for await (const page of http.paginate(url, { maxPages: 2 })) {
      if (page.notModified) break;
      for (const r of page.items) {
        if (known.has(r.id)) break outer;
        if (floor && (r.published_at || r.created_at) < floor) break outer;
        seen.push(r.id);
        if (r.draft) continue;
        upsert(normalizeRelease(repo, r));
        stats.items++;
      }
    }
    // Keep a bounded window of known ids.
    c.knownIds = [...seen, ...(c.knownIds || [])].slice(0, 200);
  }

  return stats;
}

/**
 * Is `sha` contained in release `tag`? Uses the compare API:
 * `compare/{tag}...{sha}` is "behind" or "identical" when the tag already
 * contains the commit.
 */
export async function releaseContainsCommit({ http, repo, tag, sha }) {
  const url = `${API}/repos/${repo}/compare/${encodeURIComponent(tag)}...${sha}?per_page=1`;
  const res = await http.get(url);
  if (res.notModified) return null; // unchanged since last check: caller keeps the old answer
  const status = res.data?.status;
  return status === 'behind' || status === 'identical';
}

/** Fetch a single PR (used when an issue comment says "fixed by #N"). */
export async function fetchPull({ http, repo, number }) {
  const res = await http.get(`${API}/repos/${repo}/pulls/${number}`);
  if (res.notModified || !res.data) return null;
  return normalizePull(repo, res.data);
}
