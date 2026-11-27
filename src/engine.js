// The engine turns raw source records into problem cards.
//
// It is a pure function of (records, verifications): no clock reads, no
// network, no randomness. Running it twice on the same input gives the same
// cards, which is what makes reprocessing idempotent.
//
// Steps
//   1. pick problem nodes (first-hand GitHub issues, first-hand HN items)
//   2. link nodes: explicit duplicates, shared error signature in the same
//      repo, HN items that link the issue, syndicated HN copies
//   3. per cluster: count first-hand cases (one per person, syndicated copies
//      collapse), verified teams, retractions
//   4. attach fixes (merged PRs with closing keywords), partial fixes, and
//      release verification
//   5. detect conflicts (reopened after fix, "still happening" after fix)
//   6. derive the evidence state and the next step

import {
  applicableVersion, cleanText, extractBlocker, extractEnvironment, extractErrorSignature, extractJob, extractTeam,
  extractWorkaround, isFirstHandHN, isFirstHandMeToo, isProblemReport, isRetraction, isStillHappening,
  parseDuplicateOf, parseFixedByRefs, parseFixRefs, parseIssueUrls, sentences,
} from './extract.js';
import { ghId } from './sources/github.js';

const MAINTAINER = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

// ---------------------------------------------------------------------------
// Dedup helpers

export function canonicalUrl(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, '');
    url.hash = '';
    for (const k of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_src$|source$|fbclid$|gclid$|mc_|s$|si$)/i.test(k)) url.searchParams.delete(k);
    }
    url.searchParams.sort();
    let s = url.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

/** Text fingerprint: catches the same text reposted under another id. */
export function fingerprint(text) {
  const words = cleanText(text).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  if (words.length < 8) return null;
  return words.slice(0, 40).join(' ');
}

class UnionFind {
  constructor() { this.p = new Map(); }
  find(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r);
    while (this.p.get(x) !== r) { const n = this.p.get(x); this.p.set(x, r); x = n; }
    return r;
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return;
    // Deterministic: smaller id becomes root.
    if (ra < rb) this.p.set(rb, ra); else this.p.set(ra, rb);
  }
}

const byTime = (a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);
const text = (r) => `${r.title || ''}\n${r.body || ''}`;
const stripPrefix = (t) => (t || '').replace(/^\s*(\[[^\]]+\]\s*:?\s*)+/, '').trim();

// ---------------------------------------------------------------------------

export function buildIndex(records) {
  const all = Object.values(records).sort(byTime);
  const idx = { all, issues: new Map(), prs: new Map(), commentsByParent: new Map(), releasesByRepo: new Map(), hn: [] };
  for (const r of all) {
    if (r.kind === 'issue') idx.issues.set(r.id, r);
    else if (r.kind === 'pr') idx.prs.set(r.id, r);
    else if (r.kind === 'comment') {
      if (!idx.commentsByParent.has(r.parentId)) idx.commentsByParent.set(r.parentId, []);
      idx.commentsByParent.get(r.parentId).push(r);
    } else if (r.kind === 'release') {
      if (!idx.releasesByRepo.has(r.repo)) idx.releasesByRepo.set(r.repo, []);
      idx.releasesByRepo.get(r.repo).push(r);
    } else if (r.kind === 'hn_story' || r.kind === 'hn_comment') idx.hn.push(r);
  }
  // Fix references indexed by the issue they point at ("owner/repo#123").
  idx.fixRefs = new Map();
  for (const pr of idx.prs.values()) {
    if (!pr.mergedAt) continue;
    const refs = parseFixRefs(text(pr), pr.repo);
    for (const [kind, list] of [['full', refs.full], ['partial', refs.partial]]) {
      for (const r of list) {
        const key = `${r.repo}#${r.number}`;
        if (!idx.fixRefs.has(key)) idx.fixRefs.set(key, []);
        idx.fixRefs.get(key).push({ pr, kind });
      }
    }
  }
  for (const list of idx.releasesByRepo.values()) list.sort((a, b) => (a.publishedAt || '').localeCompare(b.publishedAt || ''));
  return idx;
}

/** Step 1 + 2: problem nodes and clusters. Returns array of member-id arrays. */
export function cluster(idx) {
  const uf = new UnionFind();
  const nodes = new Set();

  for (const issue of idx.issues.values()) {
    if (isProblemReport(issue)) { nodes.add(issue.id); uf.find(issue.id); }
  }

  // Explicit duplicates ("duplicate of #N") in the issue body or its comments.
  for (const issue of idx.issues.values()) {
    const sources = [issue, ...(idx.commentsByParent.get(issue.id) || [])];
    for (const s of sources) {
      for (const ref of parseDuplicateOf(s.body, issue.repo)) {
        const target = ghId.issue(ref.repo, ref.number);
        if (idx.issues.has(target) && target !== issue.id) {
          nodes.add(issue.id); nodes.add(target);
          uf.union(issue.id, target);
        }
      }
    }
  }

  // Same error signature inside one repo = same failure.
  const bySig = new Map();
  for (const id of [...nodes].sort()) {
    const r = idx.issues.get(id);
    const sig = extractErrorSignature(r.body);
    if (!sig) continue;
    const key = `${r.repo}|${sig.signature}`;
    if (bySig.has(key)) uf.union(bySig.get(key), id); else bySig.set(key, id);
  }

  // Hacker News: attach to issues they link, collapse syndicated copies,
  // and keep HN-only reports that carry a concrete error signature.
  const byLinked = new Map();
  const byPrint = new Map();
  for (const h of idx.hn) {
    const t = text(h);
    const linkedIssues = parseIssueUrls(`${t}\n${h.linkedUrl || ''}`).map((ref) => ghId.issue(ref.repo, ref.number)).filter((id) => nodes.has(id));
    const firstHand = isFirstHandHN(t);
    const sig = extractErrorSignature(t);
    if (!linkedIssues.length && !(firstHand && sig)) continue;
    nodes.add(h.id); uf.find(h.id);
    for (const id of linkedIssues) uf.union(h.id, id);
    if (sig) {
      const key = `${h.repo}|${sig.signature}`;
      if (bySig.has(key)) uf.union(bySig.get(key), h.id); else bySig.set(key, h.id);
    }
    const cu = h.kind === 'hn_story' ? canonicalUrl(h.linkedUrl) : null;
    if (cu) { if (byLinked.has(cu)) uf.union(byLinked.get(cu), h.id); else byLinked.set(cu, h.id); }
    const fp = fingerprint(h.body);
    if (fp) { if (byPrint.has(fp)) uf.union(byPrint.get(fp), h.id); else byPrint.set(fp, h.id); }
  }

  const groups = new Map();
  for (const id of nodes) {
    const root = uf.find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(id);
  }
  return [...groups.values()].map((g) => g.sort());
}

/** Step 3–6 for one cluster. */
export function evaluateCluster(memberIds, idx, records, verifications = {}) {
  const members = memberIds.map((id) => records[id]).sort(byTime);
  const issues = members.filter((m) => m.kind === 'issue');
  const hnItems = members.filter((m) => m.source === 'hn');
  const anchor = issues[0] || members[0];
  const repo = anchor.repo;
  const comments = issues.flatMap((i) => idx.commentsByParent.get(i.id) || []).sort(byTime);

  // --- Cases -----------------------------------------------------------------
  const cases = [];
  const seenAuthors = new Set();
  const seenPrints = new Set();
  const syndicated = [];
  const addCase = (rec, kind) => {
    const who = `${rec.source}:${(rec.author || '?').toLowerCase()}`;
    const fp = fingerprint(rec.body);
    const linked = rec.kind === 'hn_story' ? canonicalUrl(rec.linkedUrl) : null;
    if (seenAuthors.has(who)) return;
    if ((fp && seenPrints.has(fp)) || (linked && seenPrints.has(linked))) { syndicated.push(rec.id); return; }
    seenAuthors.add(who);
    if (fp) seenPrints.add(fp);
    if (linked) seenPrints.add(linked);
    const env = extractEnvironment(text(rec));
    cases.push({
      recordId: rec.id, kind, author: rec.author, source: rec.source, url: rec.url, at: rec.createdAt,
      environment: env, appliesTo: applicableVersion(env, repo),
      team: rec.source === 'github' ? extractTeam(rec.body, rec.author, repo) : null,
      retracted: null,
    });
  };
  for (const i of issues) addCase(i, 'report');
  for (const c of comments) {
    if (MAINTAINER.has(c.authorAssociation)) continue;
    if (isFirstHandMeToo(c.body)) addCase(c, 'me_too');
  }
  for (const h of hnItems) if (isFirstHandHN(text(h)) || parseIssueUrls(text(h)).length) addCase(h, 'hn');

  // Retractions: only the case author can retract their own case.
  const ownTexts = (author) => comments.filter((c) => c.author === author);
  for (const cs of cases) {
    if (cs.source !== 'github') continue;
    const later = ownTexts(cs.author).filter((c) => c.createdAt >= cs.at && c.id !== cs.recordId);
    const r = later.find((c) => isRetraction(c.body));
    if (r) cs.retracted = { recordId: r.id, url: r.url, at: r.createdAt, excerpt: excerpt(r.body, isRetraction) };
  }
  const activeCases = cases.filter((c) => !c.retracted);
  const teams = [...new Set(activeCases.map((c) => c.team).filter(Boolean))];

  // --- Problem description ---------------------------------------------------
  const caseRecords = activeCases.map((c) => records[c.recordId]);
  const firstOf = (fn) => {
    for (const r of caseRecords) { const v = fn(r); if (v) return { value: v, recordId: r.id, url: r.url }; }
    return null;
  };
  const job = firstOf((r) => extractJob(r.body));
  const blocker = firstOf((r) => extractBlocker(r.title, r.body));
  const workaround = firstOf((r) => extractWorkaround(r.body)) ||
    (() => {
      const authors = new Set(activeCases.map((c) => c.author));
      for (const c of comments) if (authors.has(c.author)) { const w = extractWorkaround(c.body); if (w) return { value: w, recordId: c.id, url: c.url }; }
      return null;
    })();
  const environment = mergeEnv(activeCases.map((c) => c.environment));

  // --- Fixes -----------------------------------------------------------------
  const issueKeys = new Set(issues.map((i) => `${i.repo}#${i.number}`));
  const fixes = [];
  const partialFixes = [];
  // A PR that fully fixes any member issue is a full fix for the card;
  // otherwise a partial reference makes it a partial fix.
  const best = new Map();
  for (const key of [...issueKeys].sort()) {
    for (const { pr, kind } of idx.fixRefs.get(key) || []) {
      if (best.get(pr.id)?.kind !== 'full') best.set(pr.id, { pr, kind });
    }
  }
  for (const { pr, kind } of [...best.values()].sort((x, y) => x.pr.id.localeCompare(y.pr.id))) {
    if (kind === 'full') fixes.push({ pr, via: 'closing keyword' });
    else partialFixes.push({ pr, via: 'partial reference' });
  }
  for (const c of comments) {
    for (const ref of parseFixedByRefs(c.body, c.repo)) {
      const pr = records[ghId.pr(ref.repo, ref.number)];
      if (pr && pr.mergedAt && !fixes.some((f) => f.pr.id === pr.id) && !partialFixes.some((f) => f.pr.id === pr.id)) {
        fixes.push({ pr, via: `comment ${c.url}` });
      }
    }
  }
  const withRelease = (f) => ({ ...f, release: findRelease(f.pr, idx, verifications) });
  const fixesR = fixes.map(withRelease).sort((a, b) => a.pr.mergedAt.localeCompare(b.pr.mergedAt));
  const partialR = partialFixes.map(withRelease);
  const mergedFix = fixesR[0] || null;
  const releasedFix = fixesR.filter((f) => f.release).sort((a, b) => a.release.publishedAt.localeCompare(b.release.publishedAt))[0] || null;

  // --- Conflicts -------------------------------------------------------------
  const conflicts = [];
  if (mergedFix) {
    for (const i of issues) {
      const hist = i.stateHistory || [];
      for (let k = 1; k < hist.length; k++) {
        if (hist[k - 1].state === 'closed' && hist[k].state === 'open' && hist[k].at > mergedFix.pr.mergedAt) {
          conflicts.push({ type: 'reopened', recordId: i.id, url: i.url, at: hist[k].at, excerpt: `Issue #${i.number} was reopened after the fix was merged.` });
        }
      }
    }
    const since = releasedFix ? releasedFix.release.publishedAt : mergedFix.pr.mergedAt;
    for (const c of comments) {
      if (c.createdAt > since && isStillHappening(c.body) && !isRetraction(c.body)) {
        conflicts.push({ type: 'still_happening', recordId: c.id, url: c.url, at: c.createdAt, excerpt: excerpt(c.body, isStillHappening) });
      }
    }
  }

  // --- State -----------------------------------------------------------------
  let state;
  let trigger;
  const latest = (arr) => arr.slice().sort((a, b) => (a.at || '').localeCompare(b.at || ''))[arr.length - 1];
  if (activeCases.length === 0 && cases.length > 0) {
    state = 'retracted';
    const r = latest(cases.map((c) => c.retracted));
    trigger = { recordId: r.recordId, url: r.url, reason: 'The only first-hand report was retracted by its author.' };
  } else if (conflicts.length) {
    state = 'watching';
    const c = latest(conflicts);
    trigger = { recordId: c.recordId, url: c.url, reason: c.type === 'reopened' ? 'The issue was reopened after a fix was merged.' : 'A new report says the problem still happens after the fix.' };
  } else if (releasedFix) {
    state = 'resolved';
    trigger = { recordId: releasedFix.release.recordId, url: releasedFix.release.url, reason: `Fix ${prRef(releasedFix.pr)} verified in release ${releasedFix.release.tag} (${releasedFix.release.method}).` };
  } else if (mergedFix) {
    state = 'fix_coming';
    trigger = { recordId: mergedFix.pr.id, url: mergedFix.pr.url, reason: `Fix ${prRef(mergedFix.pr)} was merged; no published release contains it yet.` };
  } else if (activeCases.length >= 2 && workaround) {
    state = 'worth_trying';
    const second = activeCases.slice().sort((a, b) => a.at.localeCompare(b.at))[1];
    trigger = { recordId: second.recordId, url: second.url, reason: `${activeCases.length} first-hand cases and a documented workaround.` };
  } else {
    state = 'early_signal';
    const first = activeCases[0];
    trigger = { recordId: first.recordId, url: first.url, reason: 'A first-hand report was found.' };
  }

  const closedIssues = issues.filter((i) => i.state === 'closed');
  const flags = {
    closedWithoutFix: closedIssues.length > 0 && !mergedFix && state !== 'retracted',
    partialFixMerged: partialR.length > 0,
    narrowed: partialR.some((p) => p.release) && state !== 'resolved',
    hnOnly: issues.length === 0,
  };

  // --- Evidence timeline -----------------------------------------------------
  const evidence = [];
  const ev = (type, rec, extra = {}) => evidence.push({
    type, recordId: rec.id, url: rec.url, source: rec.source, at: rec.createdAt,
    sourceState: rec.state || null, lastCheckedAt: rec.lastSeenAt || null, ...extra,
  });
  for (const c of cases) {
    const r = records[c.recordId];
    const quote = c.kind === 'me_too'
      ? excerpt(r.body, (l) => /\b(same|also|too|reproduc\w*|confirm\w*|seeing|hitting)\b/i.test(l), r.title)
      : extractBlocker(r.title, r.body) || excerpt(r.body, () => true, r.title);
    ev(c.retracted ? 'case_retracted' : 'case', r, { author: c.author, appliesTo: c.appliesTo, excerpt: quote.length > 220 ? quote.slice(0, 219) + '…' : quote });
  }
  for (const id of syndicated) ev('syndicated_copy', records[id], { excerpt: 'Same content as an existing case; counted once.' });
  for (const c of cases) if (c.retracted) evidence.push({ type: 'retraction', recordId: c.retracted.recordId, url: c.retracted.url, source: 'github', at: c.retracted.at, excerpt: c.retracted.excerpt });
  if (workaround) ev('workaround', records[workaround.recordId], { excerpt: workaround.value });
  for (const f of fixesR) {
    ev('fix_merged', f.pr, { at: f.pr.mergedAt, excerpt: `${prRef(f.pr)}: ${f.pr.title}`, via: f.via });
    if (f.release) evidence.push({ type: 'fix_released', recordId: f.release.recordId, url: f.release.url, source: 'github', at: f.release.publishedAt, sourceState: 'published', appliesTo: `${repo.split('/')[1]} ${f.release.tag}`, lastCheckedAt: f.release.checkedAt || null, excerpt: `Release ${f.release.tag} contains ${prRef(f.pr)} (${f.release.method}).` });
  }
  for (const f of partialR) {
    ev('partial_fix', f.pr, { at: f.pr.mergedAt, excerpt: `${prRef(f.pr)}: ${f.pr.title}` });
    if (f.release) evidence.push({ type: 'partial_fix_released', recordId: f.release.recordId, url: f.release.url, source: 'github', at: f.release.publishedAt, excerpt: `Release ${f.release.tag} ships a partial fix; remaining cases stay open.` });
  }
  for (const c of conflicts) evidence.push({ type: 'conflict', recordId: c.recordId, url: c.url, source: 'github', at: c.at, excerpt: c.excerpt });
  for (const i of closedIssues) if (!mergedFix) evidence.push({ type: 'closed_without_fix', recordId: i.id, url: i.url, source: 'github', at: i.closedAt, sourceState: `closed${i.stateReason ? ` (${i.stateReason})` : ''}`, excerpt: 'Closed without a linked merged fix. A closed issue alone never counts as resolved.' });
  evidence.sort((a, b) => (a.at || '').localeCompare(b.at || '') || a.type.localeCompare(b.type));

  return {
    anchorId: anchor.id,
    memberIds,
    repo,
    title: stripPrefix(anchor.title) || (blocker ? blocker.value : 'Untitled report'),
    url: anchor.url,
    state,
    trigger,
    caseCount: activeCases.length,
    teamCount: teams.length,
    teams,
    retractedCount: cases.length - activeCases.length,
    syndicatedCount: syndicated.length,
    job, blocker, workaround, environment,
    fixes: fixesR.map(fixView),
    partialFixes: partialR.map(fixView),
    flags,
    evidence,
    firstReportedAt: members[0].createdAt,
    lastEvidenceAt: evidence.reduce((m, e) => (e.at && e.at > m ? e.at : m), members[0].createdAt),
    nextStep: nextStep(state, { workaround, releasedFix, mergedFix, conflicts }),
  };
}

function prRef(pr) { return `${pr.repo}#${pr.number}`; }

function fixView(f) {
  return {
    pr: prRef(f.pr), url: f.pr.url, title: f.pr.title, mergedAt: f.pr.mergedAt, via: f.via,
    release: f.release ? { tag: f.release.tag, url: f.release.url, publishedAt: f.release.publishedAt, method: f.release.method } : null,
  };
}

/**
 * First stable release, published after the merge, that provably contains the
 * fix: either the compare API said the tag contains the merge commit, or the
 * release notes reference the PR.
 */
export function findRelease(pr, idx, verifications) {
  const releases = (idx.releasesByRepo.get(pr.repo) || []).filter((r) => !r.draft && !r.prerelease && r.publishedAt && r.publishedAt >= pr.mergedAt);
  const ver = pr.mergeCommitSha ? verifications[`${pr.repo}@${pr.mergeCommitSha}`] : null;
  const prUrl = `github.com/${pr.repo}/pull/${pr.number}`;
  const noteRe = new RegExp(`(^|[^\\w/])#${pr.number}\\b`);
  for (const r of releases) {
    if (ver && ver.checks && ver.checks[r.tag] === true) return { recordId: r.id, tag: r.tag, url: r.url, publishedAt: r.publishedAt, method: 'tag contains merge commit', checkedAt: ver.checkedAt };
    if ((r.body || '').includes(prUrl) || noteRe.test(r.body || '')) return { recordId: r.id, tag: r.tag, url: r.url, publishedAt: r.publishedAt, method: 'release notes reference the PR', checkedAt: r.lastSeenAt };
  }
  return null;
}

function mergeEnv(envs) {
  const versions = {};
  const os = new Set();
  const hardware = new Set();
  for (const e of envs) {
    for (const [k, v] of Object.entries(e.versions)) (versions[k] ||= new Set()).add(v);
    e.os.forEach((o) => os.add(o));
    e.hardware.forEach((h) => hardware.add(h));
  }
  return {
    versions: Object.fromEntries(Object.entries(versions).map(([k, s]) => [k, [...s].sort()])),
    os: [...os].sort(),
    hardware: [...hardware].sort(),
  };
}

function excerpt(body, test, fallback) {
  const parts = sentences(body).filter((l) => !/^[$|`]/.test(l) && /[a-z]{3}/i.test(l));
  const hit = parts.find((l) => test(l) && l.length >= 25) || parts.find((l) => test(l)) || parts.find((l) => l.length >= 40) || parts[0] || fallback || '';
  return hit.length > 220 ? hit.slice(0, 219) + '…' : hit;
}

function nextStep(state, { workaround, releasedFix, mergedFix, conflicts }) {
  switch (state) {
    case 'early_signal':
      return { size: 'Interview first', text: 'One first-hand report so far. Read the source thread and ask the reporter what they were trying to do and how they get by today.' };
    case 'worth_trying':
      return { size: 'Weekend prototype', text: `Several people hit this and one documented a workaround. Prototype the smallest tool or patch that removes it: "${workaround.value}"` };
    case 'watching':
      return { size: 'Tonight', text: `Sources disagree. Open the latest conflicting report (${conflicts.length} so far) and try to reproduce on the newest release.` };
    case 'fix_coming':
      return { size: 'Tonight', text: `A fix (${prRef(mergedFix.pr)}) is merged but not in a release yet. Test it from main and report back on the issue, or pin to the merge commit.` };
    case 'resolved':
      return { size: 'Tonight', text: `Upgrade to ${releasedFix.release.tag}. If you carry a workaround for this, you can drop it.` };
    default:
      return { size: null, text: 'Withdrawn: the reporter retracted the claim. Kept for transparency.' };
  }
}

/** Run the whole engine. Returns cards keyed by anchor id (pipeline assigns stable ids). */
export function computeClusters(records, verifications = {}) {
  const idx = buildIndex(records);
  return cluster(idx).map((ids) => evaluateCluster(ids, idx, records, verifications));
}
