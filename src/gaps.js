// Gap engine: where is demand strong and supply weak?
//
// Demand: first-hand problems, feature requests, people on Hacker News asking
// for a tool or saying they would pay, Stack Overflow questions.
// Supply: known tools, new products and launches, brand-new repositories,
// funded startups.
//
// The local language model groups demand items that mean the same thing into
// one gap, then looks for supply items that mean the same thing as the gap.
// A gap with many different people behind it and nothing that matches it is
// what the radar calls "looks open".

import { TOPICS } from './config.js';
import { isFeatureRequest } from './sources/demand.js';
import { isFirstHandHN } from './extract.js';
import { tagTopics } from './market.js';
import { centroid, cosine } from './semantic.js';
import { hash } from './store.js';

export const GAP = {
  clusterAt: 0.62, // demand items this similar describe the same need
  supplyAt: 0.5, // a supply item this similar addresses the need
  interestAt: 0.42, // a funding story this similar shows investor interest
  windowDays: 60,
};

const LOOSE = new Set(['pay', 'seeking', 'complaint', 'question']);
const KIND_ORDER = { pay: 0, seeking: 1, complaint: 2, problem: 3, question: 4, feature: 5 };
const strip = (t) => (t || '').replace(/^\s*(\[[^\]]+\]\s*:?\s*)+/, '').replace(/^(feature request|feat|rfc)\s*[:\-]\s*/i, '').trim();

/** Everything that says "someone needs this". */
export function demandItems(state, now) {
  const since = new Date(Date.parse(now) - GAP.windowDays * 86400_000).toISOString();
  const items = [];
  for (const c of Object.values(state.cards || {})) {
    if (c.state === 'retracted' || c.caseCount < 1 || (c.lastEvidenceAt || '') < since) continue;
    items.push({
      id: `need:${c.id}`, embedId: c.anchorId, kind: 'problem', source: c.flags?.hnOnly ? 'hn' : 'github', repo: c.repo, url: c.url, title: c.title,
      quote: c.blocker?.value || c.title, people: c.caseCount, at: c.lastEvidenceAt, cardId: c.id, workaround: !!c.workaround,
      text: `${strip(c.title)}. ${c.blocker?.value || ''}`, resolved: ['resolved', 'fix_coming'].includes(c.state),
    });
  }
  for (const r of Object.values(state.records)) {
    if ((r.updatedAt || r.createdAt || '') < since) continue;
    if (r.kind === 'issue' && isFeatureRequest(r) && r.state === 'open') {
      items.push({ id: `feat:${r.id}`, embedId: r.id, kind: 'feature', source: 'github', repo: r.repo, url: r.url, title: strip(r.title), quote: strip(r.title), people: 1, at: r.createdAt, text: `${strip(r.title)}. ${(r.body || '').slice(0, 200)}` });
    } else if ((r.kind === 'hn_story' || r.kind === 'hn_comment') && isFirstHandHN(`${r.title}\n${r.body}`)) {
      // Someone on Hacker News describing their own problem with a tool.
      const q = (r.body || '').split(/(?<=[.!?])\s+/).find((x) => isFirstHandHN(x)) || (r.body || '').slice(0, 240);
      items.push({ id: `hnc:${r.id}`, embedId: r.id, kind: 'complaint', source: 'hn', repo: null, url: r.url, title: q.slice(0, 160), quote: q.slice(0, 300), people: 1, at: r.createdAt, text: q.slice(0, 400) });
    } else if (r.kind === 'ask') {
      if (r.source === 'stackoverflow' && r.answered && r.score < 1) continue; // answered, low-signal questions
      items.push({
        id: `ask:${r.id}`, embedId: r.id, kind: r.askKind === 'would_pay' ? 'pay' : r.source === 'stackoverflow' ? 'question' : 'seeking',
        source: r.source, url: r.url, title: r.title, quote: r.quote || r.title, people: 1, at: r.createdAt,
        unanswered: r.source === 'stackoverflow' && !r.answered, text: `${r.title}. ${r.quote || ''}`.slice(0, 400),
      });
    }
  }
  return items;
}

/** Everything that says "something already addresses this". */
export function supplyItems(developments) {
  const items = [];
  for (const t of TOPICS) for (const tool of t.tools) {
    items.push({ id: `tool:${t.id}:${tool.name}`, kind: 'tool', weight: 1, title: tool.name, url: tool.url, text: `${tool.name}: ${tool.covers.en}` });
  }
  for (const d of developments) {
    const w = { product: 0.7, launch: 0.6, new_repo: 0.5 }[d.type];
    if (!w) continue;
    items.push({ id: `dev:${d.id}`, embedId: d.embedId, kind: d.type, weight: w, title: d.title, url: d.url, text: `${d.title}. ${d.summary || ''}`.slice(0, 400), at: d.publishedAt });
  }
  return items;
}

/** Greedy leader clustering on normalized vectors. Deterministic. */
export function clusterVectors(items, vec, threshold) {
  const sorted = items.slice().sort((a, b) => (b.people - a.people) || (a.at || '').localeCompare(b.at || '') || a.id.localeCompare(b.id));
  const clusters = [];
  for (const it of sorted) {
    const v = vec(it);
    if (!v) continue;
    let best = null;
    let bestSim = threshold;
    for (const c of clusters) {
      const s = cosine(v, c.leaderVec);
      // People asking for a tool phrase things loosely; bug reports quote
      // exact errors. Asks and complaints join a group at a lower bar.
      const loose = LOOSE.has(it.kind) || LOOSE.has(c.leader.kind);
      if (s >= (loose ? threshold - 0.1 : threshold) && s >= bestSim - (loose ? 0.1 : 0)) { best = c; bestSim = s; }
    }
    if (best) best.members.push(it);
    else clusters.push({ leader: it, leaderVec: v, members: [it] });
  }
  return clusters;
}

const STOP = new Set('the a an and or of to in for on with is are be it this that when from by as at not no can how what does do using use via into your you we our my i its using after before without support add issue error bug fails failed failing'.split(' '));
function keywords(titles, n = 3) {
  const f = new Map();
  for (const t of titles) for (const w of new Set(t.toLowerCase().replace(/[^a-z0-9.+-]+/g, ' ').split(/\s+/))) {
    if (w.length < 3 || STOP.has(w) || /^\d/.test(w)) continue;
    f.set(w, (f.get(w) || 0) + 1);
  }
  return [...f.entries()].filter(([, c]) => c > 1 || titles.length === 1).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

/**
 * Build gaps. `vectors` maps embedId -> Float32Array.
 * Returns gaps sorted by score (open, well-evidenced gaps first).
 */
export function computeGaps(state, developments, vectors, now) {
  const demand = demandItems(state, now);
  const supply = supplyItems(developments);
  const vec = (it) => vectors.get(it.embedId || it.id);
  const funding = developments.filter((d) => d.type === 'funding');
  const clusters = clusterVectors(demand, vec, GAP.clusterAt);
  const gaps = [];
  for (const c of clusters) {
    const members = c.members;
    const people = members.reduce((n, m) => n + m.people, 0);
    const sources = new Set(members.map((m) => m.source));
    const kinds = new Set(members.map((m) => m.kind));
    // Evidence threshold: three people, or two different kinds of source.
    if (people < 3 && sources.size < 2) continue;
    if (members.every((m) => m.resolved)) continue; // already fixed upstream
    const cen = centroid(members.map(vec));
    const matches = supply.map((s) => ({ s, sim: vec(s) ? cosine(cen, vec(s)) : 0 })).filter((x) => x.sim >= GAP.supplyAt).sort((a, b) => b.sim - a.sim);
    const coverage = matches.reduce((n, x) => n + x.s.weight * (x.sim - GAP.supplyAt + 0.5), 0);
    const verdict = coverage < 0.6 ? 'open' : coverage < 1.8 ? 'partial' : 'crowded';
    const interest = funding.map((d) => ({ d, sim: vectors.get(d.embedId) ? cosine(cen, vectors.get(d.embedId)) : 0 })).filter((x) => x.sim >= GAP.interestAt).sort((a, b) => b.sim - a.sim).slice(0, 5);
    const pay = members.filter((m) => m.kind === 'pay').length;
    const seeking = members.filter((m) => m.kind === 'seeking').length;
    const unanswered = members.filter((m) => m.unanswered).length;
    const workarounds = members.filter((m) => m.workaround).length;
    const demandScore = Math.log2(1 + people) * 2 + pay * 3 + seeking * 1.5 + unanswered + workarounds + (sources.size - 1) * 2;
    // A market gap shows up off GitHub or across projects; a gap inside one
    // repository is an upstream request, better solved by contributing.
    const repos = new Set(members.map((m) => m.repo).filter(Boolean));
    const scope = [...sources].some((x) => x !== 'github') || repos.size >= 2 ? 'market' : 'upstream';
    const score = Math.round(demandScore * (verdict === 'open' ? 1 : verdict === 'partial' ? 0.55 : 0.2) * (scope === 'market' ? 1.5 : 0.6) * 10 + interest.length * 3) / 10;
    // Representative: the member closest to the centroid.
    const rep = members.map((m) => ({ m, sim: cosine(cen, vec(m)) })).sort((a, b) => b.sim - a.sim)[0].m;
    const topicVotes = new Map();
    for (const m of members) for (const t of tagTopics(m.title, m.quote)) topicVotes.set(t, (topicVotes.get(t) || 0) + 1);
    const topic = [...topicVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const firstId = members.map((m) => m.id).sort()[0];
    const nextStep = scope === 'upstream'
      ? { size: 'Tonight', code: 'contribute', params: { repo: [...repos][0] } }
      : pay
      ? { size: 'Interview first', code: 'talk_payers', params: { n: pay } }
      : workarounds
        ? { size: 'Weekend prototype', code: 'prototype', params: {} }
        : { size: 'Interview first', code: 'interview', params: { n: Math.min(people, 5) } };
    gaps.push({
      id: `g-${hash(firstId)}`,
      title: strip(rep.title),
      keywords: keywords(members.map((m) => strip(m.title))),
      topic,
      verdict,
      scope,
      repos: [...repos].sort(),
      score,
      people,
      counts: { items: members.length, complaints: members.filter((m) => m.kind === 'complaint').length, problems: members.filter((m) => m.kind === 'problem').length, features: members.filter((m) => m.kind === 'feature').length, pay, seeking, questions: members.filter((m) => m.kind === 'question').length, unanswered, workarounds },
      sources: [...sources].sort(),
      kinds: [...kinds].sort(),
      evidence: members.slice().sort((a, b) => ((KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)) || (b.at || '').localeCompare(a.at || ''))
        .slice(0, 12).map((m) => ({ kind: m.kind, source: m.source, url: m.url, title: strip(m.title), quote: m.quote, people: m.people, at: m.at, cardId: m.cardId || null })),
      solutions: matches.slice(0, 6).map((x) => ({ kind: x.s.kind, title: x.s.title, url: x.s.url, similarity: Math.round(x.sim * 100) / 100 })),
      coverage: Math.round(coverage * 100) / 100,
      interest: interest.map((x) => ({ title: x.d.title, url: x.d.url, funding: x.d.funding, verified: x.d.verified, similarity: Math.round(x.sim * 100) / 100 })),
      nextStep,
      lastActivityAt: members.map((m) => m.at).filter(Boolean).sort().pop() || null,
    });
  }
  return gaps.sort((a, b) => b.score - a.score);
}

export const VERDICTS = ['open', 'partial', 'crowded'];
