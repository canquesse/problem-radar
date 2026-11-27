// Market side of the radar: developments (funding, launches, news, new repos,
// releases), topic tagging, and opportunity cards that connect a development
// to a need. Pure functions of records + need cards, like the need engine.

import { REPOS, TOPICS } from './config.js';
import { canonicalUrl } from './engine.js';
import { hash } from './store.js';

// ---------------------------------------------------------------------------
// Topic tagging

const topicMatchers = TOPICS.map((t) => ({
  id: t.id,
  repos: new Set(t.repos),
  res: t.keywords.map((k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i')),
}));

/**
 * Topics for a piece of text. Title hits weigh double; a topic needs a title
 * hit or two body hits. `repo` adds that repository's home topic.
 */
export function tagTopics(title, body = '', repo = null) {
  const out = [];
  for (const m of topicMatchers) {
    let score = 0;
    for (const re of m.res) {
      if (re.test(title || '')) score += 2;
      else if (re.test(body || '')) score += 1;
    }
    // A repository's home topic only tips the balance; it never tags alone.
    if (repo && m.repos.has(repo) && score > 0) score += 1;
    if (score >= 2) out.push({ id: m.id, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.id);
}

export function needTopics(card) {
  const body = [card.blocker?.value, card.job?.value, card.workaround?.value].filter(Boolean).join(' ');
  return tagTopics(card.title, body, card.repo);
}

// ---------------------------------------------------------------------------
// Development events (syndicated copies collapse into one event)

const normCompany = (s) => (s || '').toLowerCase().replace(/\.(ai|io|com|dev)$/, '').replace(/[^a-z0-9]+/g, '');
const titlePrint = (t) => (t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2).slice(0, 9).join(' ');

export function computeDevelopments(records) {
  const devs = Object.values(records).filter((r) => r.kind === 'dev');
  const releases = Object.values(records).filter((r) => r.kind === 'release' && !r.draft);
  const groups = new Map();
  const add = (key, rec) => {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  };
  for (const r of devs) {
    if (r.devType === 'funding' && r.funding?.company) add(`funding:${normCompany(r.funding.company)}`, r);
    else if (r.devType === 'new_repo') add(`repo:${r.title.toLowerCase()}`, r);
    else if (r.devType === 'product') add(`product:${canonicalUrl(r.url) || r.title.toLowerCase()}`, r);
    else add(`news:${titlePrint(r.title) || canonicalUrl(r.url)}`, r);
  }
  // Second pass: news items that point at the same canonical URL.
  const byUrl = new Map();
  for (const [key, recs] of groups) {
    for (const r of recs) {
      const cu = canonicalUrl(r.url);
      if (!cu || /news\.google\.com/.test(cu)) continue;
      if (byUrl.has(cu) && byUrl.get(cu) !== key) {
        const target = byUrl.get(cu);
        groups.get(target).push(...groups.get(key));
        groups.delete(key);
        break;
      }
      byUrl.set(cu, key);
    }
  }

  const events = [];
  for (const [key, recs] of groups) {
    const sorted = recs.slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const first = sorted[0];
    const outlets = [...new Map(sorted.map((r) => [(r.outlet || '').toLowerCase(), { name: r.outlet, url: r.url, at: r.createdAt, title: r.title }])).values()];
    const text = sorted.map((r) => `${r.title} ${r.body || ''}`).join(' ');
    const type = first.devType;
    events.push({
      id: `d-${hash(key)}`,
      embedId: first.id,
      type,
      title: first.title,
      url: first.url,
      summary: cleanSummary(sorted.find((r) => r.body)?.body, first.title),
      publishedAt: first.createdAt,
      lastSeenAt: sorted.reduce((m, r) => (r.lastSeenAt > m ? r.lastSeenAt : m), ''),
      outlets,
      outletCount: outlets.length,
      copies: recs.length,
      verified: type === 'funding' ? outlets.length >= 2 : null,
      funding: type === 'funding' ? mergeFunding(sorted) : null,
      stars: first.stars ?? null,
      points: first.points ?? null,
      productUrl: first.productUrl || null,
      domainHint: first.domainHint || null,
      topics: tagTopics(first.title, text),
    });
  }
  for (const r of releases) {
    const repoCfg = REPOS.find((x) => x.repo === r.repo);
    if (!repoCfg) continue;
    events.push({
      id: `d-${hash(r.id)}`, embedId: r.id, type: 'release', title: `${r.repo.split('/')[1]} ${r.tag}`, url: r.url, repo: r.repo,
      summary: (r.body || '').replace(/[#*`>]/g, '').slice(0, 280), publishedAt: r.publishedAt, lastSeenAt: r.lastSeenAt,
      outlets: [{ name: 'GitHub', url: r.url, at: r.publishedAt }], outletCount: 1, copies: 1, verified: null, funding: null,
      prerelease: !!r.prerelease, topics: tagTopics('', r.body || '', r.repo),
    });
  }
  return events.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

// Feed summaries often repeat the title or carry leftover markup.
function cleanSummary(body, title) {
  let t = (body || '').replace(/<[^>]*>?/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  const head = (title || '').slice(0, 40).toLowerCase();
  if (head && t.toLowerCase().startsWith(head)) t = '';
  return t.slice(0, 280);
}

function mergeFunding(recs) {
  const pick = (k) => {
    const counts = new Map();
    for (const r of recs) { const v = r.funding?.[k]; if (v) counts.set(v, (counts.get(v) || 0) + 1); }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  };
  return { company: pick('company'), amount: pick('amount'), round: pick('round') };
}

// ---------------------------------------------------------------------------
// Opportunities: a development meets a need in the same topic.

const SIGNAL_TYPES = ['funding', 'product', 'launch', 'new_repo', 'news'];
const STATE_RANK = { resolved: 5, fix_coming: 4, watching: 3, worth_trying: 2, early_signal: 1, retracted: 0 };

export function computeOpportunities(developments, cards, now, windowDays = 30) {
  const since = new Date(Date.parse(now) - windowDays * 86400_000).toISOString();
  const live = cards.filter((c) => c.state !== 'retracted' && c.caseCount > 0);
  const needsByTopic = new Map();
  for (const c of live) for (const t of needTopics(c)) {
    if (!needsByTopic.has(t)) needsByTopic.set(t, []);
    needsByTopic.get(t).push(c);
  }
  const out = [];
  for (const topic of TOPICS) {
    const devs = developments.filter((d) => d.topics.includes(topic.id) && (d.publishedAt || '') >= since);
    const signals = devs.filter((d) => SIGNAL_TYPES.includes(d.type));
    const needs = (needsByTopic.get(topic.id) || []).slice().sort((a, b) =>
      (b.state === 'worth_trying') - (a.state === 'worth_trying') || b.caseCount - a.caseCount || STATE_RANK[b.state] - STATE_RANK[a.state] || (b.lastEvidenceAt || '').localeCompare(a.lastEvidenceAt || ''));
    if (!signals.length || !needs.length) continue;

    const count = (type) => signals.filter((d) => d.type === type).length;
    const demand = {
      cards: needs.length,
      cases: needs.reduce((n, c) => n + c.caseCount, 0),
      teams: needs.reduce((n, c) => n + c.teamCount, 0),
      workarounds: needs.filter((c) => c.workaround).length,
      worthTrying: needs.filter((c) => c.state === 'worth_trying').length,
      fixComing: needs.filter((c) => c.state === 'fix_coming').length,
      resolved: needs.filter((c) => c.state === 'resolved').length,
      watching: needs.filter((c) => c.state === 'watching').length,
      open: needs.filter((c) => ['early_signal', 'worth_trying', 'watching'].includes(c.state)).length,
      // Problems hit by at least two different people.
      multiPerson: needs.filter((c) => c.caseCount >= 2 && ['early_signal', 'worth_trying', 'watching'].includes(c.state)).length,
    };
    const supply = {
      funding: count('funding'), fundingVerified: signals.filter((d) => d.type === 'funding' && d.verified).length,
      products: count('product') + count('launch'), newRepos: count('new_repo'), news: count('news'),
      outlets: signals.reduce((n, d) => n + d.outletCount, 0),
      releases: devs.filter((d) => d.type === 'release').length,
    };

    // State of the opportunity.
    let state;
    let triggerCard = null;
    const firstOf = (s) => needs.find((c) => c.state === s);
    if (demand.watching) { state = 'watching'; triggerCard = firstOf('watching'); }
    else if (demand.open === 0) { state = 'being_solved'; triggerCard = firstOf('resolved') || firstOf('fix_coming'); }
    else if (demand.worthTrying || demand.multiPerson >= 2) { state = 'demand_confirmed'; triggerCard = firstOf('worth_trying') || needs.find((c) => c.caseCount >= 2); }
    else { state = 'investigating'; }
    const newestSignal = signals.slice().sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))[0];
    const trigger = triggerCard
      ? { kind: 'need', cardId: triggerCard.id, url: triggerCard.trigger?.url || triggerCard.url, title: triggerCard.title }
      : { kind: 'development', devId: newestSignal.id, url: newestSignal.url, title: newestSignal.title };

    // Smallest first experiment, sized by the evidence.
    const coming = firstOf('fix_coming');
    const worth = firstOf('worth_trying');
    let experiment;
    if (worth) experiment = { size: 'Weekend prototype', code: 'prototype', params: { cardId: worth.id, title: worth.title, workaround: worth.workaround?.value || '' } };
    else if (coming && demand.open === 0) experiment = { size: 'Tonight', code: 'contribute', params: { cardId: coming.id, title: coming.title, pr: coming.fixes?.[0]?.pr || '' } };
    else {
      const top = needs.slice(0, 3);
      experiment = { size: 'Interview first', code: 'interview', params: { reporters: top.reduce((n, c) => n + c.caseCount, 0), cardIds: top.map((c) => c.id) } };
    }

    const cap = (n, max) => Math.min(n, max);
    const score = cap(supply.fundingVerified * 4 + supply.funding * 2, 24) + cap(supply.products + supply.newRepos + supply.news * 0.5, 12)
      + demand.worthTrying * 6 + demand.multiPerson * 3 + demand.teams * 2 + cap(demand.workarounds, 6) + Math.log2(1 + demand.cases) * 2;
    out.push({
      id: `o-${topic.id}`,
      topic: topic.id,
      name: topic.name,
      state,
      trigger,
      score: Math.round(score * 10) / 10,
      supply,
      demand,
      developmentIds: signals.sort((a, b) => (b.type === 'funding') - (a.type === 'funding') || (b.publishedAt || '').localeCompare(a.publishedAt || '')).map((d) => d.id),
      releaseIds: devs.filter((d) => d.type === 'release').map((d) => d.id),
      needIds: needs.map((c) => c.id),
      tools: topic.tools,
      question: topic.question,
      anchor: needs[0] ? { cardId: needs[0].id, title: needs[0].title } : null,
      experiment,
      lastActivityAt: [newestSignal?.publishedAt, needs[0]?.lastEvidenceAt].filter(Boolean).sort().pop() || null,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Store opportunities and append transition events (same rules as needs:
 * idempotent ids, notifications only on a state change).
 */
export function processOpportunities(state, now, devs = computeDevelopments(state.records)) {
  const opps = computeOpportunities(devs, Object.values(state.cards), now);
  const prev = state.opportunities || {};
  const eventIds = new Set(state.events.map((e) => e.id));
  const next = {};
  const created = [];
  const transitions = [];
  for (const o of opps) {
    const p = prev[o.id];
    const changed = !p || p.state !== o.state;
    next[o.id] = { ...o, createdAt: p?.createdAt || now, stateSince: changed ? now : p.stateSince, previousState: changed ? p?.state || null : p.previousState || null };
    if (!changed) continue;
    const trig = o.trigger.cardId || o.trigger.devId;
    const id = `e-${hash(o.id, p?.state || 'none', o.state, trig)}`;
    if (eventIds.has(id)) continue;
    const ev = {
      id, cardId: o.id, cardTitle: o.name.en, kind: 'opportunity', repo: null, type: p ? 'transition' : 'created',
      from: p?.state || null, to: o.state, at: now, code: `opp_${o.state}`, params: { title: o.trigger.title },
      reason: oppReason(o), triggerRecordId: trig, triggerUrl: o.trigger.url,
    };
    eventIds.add(id);
    (p ? transitions : created).push(ev);
  }
  // Opportunities that lost their evidence are kept as "faded" for history.
  for (const [id, p] of Object.entries(prev)) if (!next[id]) next[id] = { ...p, faded: true };
  state.opportunities = next;
  state.developments = devs;
  state.events = [...state.events, ...created, ...transitions];
  return { created, transitions, developments: devs.length, opportunities: opps.length };
}

export function oppReason(o) {
  switch (o.state) {
    case 'demand_confirmed': return `Demand confirmed: ${o.demand.cases} first-hand cases on ${o.demand.cards} problems, ${o.demand.worthTrying} worth trying.`;
    case 'being_solved': return 'Every linked problem now has a merged or released fix.';
    case 'watching': return 'A linked problem is disputed after its fix.';
    default: return `${o.supply.funding ? `${o.supply.funding} funding round(s)` : `${o.supply.products + o.supply.newRepos + o.supply.news} market signal(s)`} meet ${o.demand.cases} first-hand case(s); is the need still unsolved?`;
  }
}

export const OPP_STATES = ['investigating', 'demand_confirmed', 'being_solved', 'watching'];

/**
 * Merge development events that tell the same story in different words,
 * using the local language model's vectors. Only news and funding merge, and
 * only when published within 4 days of each other.
 */
const CAP_STOP = new Set('The This That These Those What Why How When Where Who Which New First Report Reports Says Said Will Could Would Should After Before With From Into Over Under About Inside Behind Meet Here There Their They Your Our Most More Best Week Today Year Years Exclusive Update Breaking'.split(' '));
/** Distinctive names in a headline (Riemann, Alpöge, Nvidia...). */
function names(title) {
  return new Set((title || '').split(/[\s:;,.!?()"'“”‘’\-–—]+/).filter((w) => /^[A-ZÀ-Ý][\p{L}\d]{3,}$/u.test(w) && !CAP_STOP.has(w)).map((w) => w.toLowerCase()));
}

export function mergeSemantic(events, vectors, threshold = 0.8) {
  const mergeable = events.filter((e) => (e.type === 'news' || e.type === 'funding') && vectors.get(e.embedId));
  const absorbed = new Set();
  for (let i = 0; i < mergeable.length; i++) {
    const a = mergeable[i];
    if (absorbed.has(a.id)) continue;
    const va = vectors.get(a.embedId);
    for (let j = i + 1; j < mergeable.length; j++) {
      const b = mergeable[j];
      if (absorbed.has(b.id)) continue;
      if (Math.abs(Date.parse(a.publishedAt || 0) - Date.parse(b.publishedAt || 0)) > 6 * 86400_000) continue;
      if (a.type === 'funding' && b.type === 'funding' && a.funding?.company && b.funding?.company && a.funding.company !== b.funding.company) continue;
      let sim = 0;
      const vb = vectors.get(b.embedId);
      for (let k = 0; k < va.length; k++) sim += va[k] * vb[k];
      // Same story: very close in meaning, or fairly close and naming the
      // same distinctive thing (a person, a company, a theorem).
      if (sim < threshold) {
        if (sim < 0.58) continue;
        a._names ||= names(a.title);
        b._names ||= names(b.title);
        if (![...a._names].some((n) => b._names.has(n))) continue;
      }
      const keep = (a.publishedAt || '') <= (b.publishedAt || '') ? a : b;
      const drop = keep === a ? b : a;
      const outlets = new Map(keep.outlets.map((o) => [(o.name || '').toLowerCase(), o]));
      for (const o of drop.outlets) if (!outlets.has((o.name || '').toLowerCase())) outlets.set((o.name || '').toLowerCase(), o);
      keep.outlets = [...outlets.values()];
      keep.outletCount = keep.outlets.length;
      keep.copies += drop.copies;
      // The fullest description of the story becomes its summary.
      if ((drop.summary || '').length > (keep.summary || '').length) keep.summary = drop.summary;
      if (keep.type === 'funding' || drop.type === 'funding') {
        keep.type = 'funding';
        keep.funding ||= drop.funding;
        keep.verified = keep.outletCount >= 2;
      }
      keep.topics = [...new Set([...keep.topics, ...drop.topics])].slice(0, 3);
      keep.semanticMerges = (keep.semanticMerges || 0) + 1;
      absorbed.add(drop.id);
      if (drop === a) break;
    }
  }
  for (const e of events) delete e._names;
  return events.filter((e) => !absorbed.has(e.id));
}
