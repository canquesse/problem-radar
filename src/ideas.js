// Ideas: products, startups and projects nobody seems to be building yet.
//
// Demand comes from people saying what they need, in their own words:
//   - Stack Exchange (Software/Hardware Recommendations, and need-phrased or
//     unanswered questions on 13 domain sites)
//   - public community forums (KiCad, Arduino, PlatformIO, Inductive
//     Automation, OpenEnergyMonitor, Hugging Face, PyTorch, Julia, ...)
//   - Hacker News: "is there a tool", "I'd pay for", "alternative to",
//     "how do you handle", and first-hand complaints
// GitHub issues are NOT idea evidence: a missing feature in one repository is
// a contribution opportunity, not a market gap.
//
// The local model groups needs that mean the same thing inside one sub-area,
// then searches supply (Product Hunt launches, Show/Launch HN, brand-new
// repositories, known tools) for anything that means the same thing.

import { TOPICS } from './config.js';
import { SUBS } from './domains.js';
import { isFirstHandHN } from './extract.js';
import { centroid, cosine } from './semantic.js';
import { hash } from './store.js';

export const IDEAS = {
  clusterAt: 0.55, // two needs this similar are the same need
  supplyAt: 0.52, // a supply item this similar already addresses it
  windowDays: 45,
};

const NOUNS = 'tool|tools|app|apps|application|software|program|library|service|product|device|platform|solution|plugin|extension|website|site|kit|module|board|system|way';
const IDEA_PATTERNS = [
  // "Is there a (free|simple) tool that/to/for X?"
  [new RegExp(`\\b(?:is there|are there|looking for|searching for|need|recommend(?:ation)?s?(?: for)?|wish there (?:was|were)|any(?:one know of)?|know of|suggest(?:ions)?(?: for)?)\\s+(?:a|an|any|some)?\\s*(?:good|free|cheap|simple|easy|open[- ]source|reliable|decent|lightweight|small|better|budget|low[- ]cost)?\\s*(?:${NOUNS})s?\\s+(that|to|for|which|where|with|who)\\s+([^?.!]{6,140})`, 'i'),
    (m) => `A ${/^(that|which|who)$/i.test(m[1]) ? 'tool that' : `tool ${m[1].toLowerCase()}`} ${m[2].trim()}`],
  [/\b(?:an? )?alternative to\s+([^?.!,]{2,60})/i, (m) => `An alternative to ${m[1].trim()}`],
  [new RegExp(`^\\s*(?:what|which)\\s+(?:[\\w-]+\\s+){0,2}?(${NOUNS})s?\\s+([^?]{6,140})\\?*\\s*$`, 'i'), (m) => `A ${m[1].toLowerCase()} that ${m[2].trim()}`],
  [/\bi(?:'d| would) pay (?:good money )?(?:for|to)\s+([^?.!]{6,140})/i, (m) => `A paid product for ${m[1].trim()}`],
  [/\bhow (?:do|are|can) (?:you|people|teams|i|we) (?:handle|handling|manage|managing|deal with|dealing with|track|tracking|automate|automating|monitor|monitoring)\s+([^?.!]{6,140})/i, (m) => `A better way to handle ${m[1].trim()}`],
  [/\bhow (?:do|can) (?:i|we|you) (?:automatically|easily|quickly)\s+([^?.!]{6,140})/i, (m) => `A tool to ${m[1].trim()}`],
];

/** Turn what someone asked into an idea sentence (English). */
export function ideaFromText(title, body = '') {
  for (const text of [title, body.slice(0, 400)]) {
    for (const [re, fmt] of IDEA_PATTERNS) {
      const m = (text || '').match(re);
      if (m) return fmt(m).replace(/\s+/g, ' ').replace(/\s+(please|thanks|thank you).*$/i, '');
    }
  }
  return null;
}

const B2B = /\b(team|teams|company|companies|enterprise|customers?|clients?|invoice|invoices|billing|compliance|audit|factory|plant|warehouse|fleet|production line|b2b|saas|workflow|employees)\b/i;

/** Every item that says "someone needs this", with its place in the domains. */
export function demandItems(state, now) {
  const since = new Date(Date.parse(now) - IDEAS.windowDays * 86400_000).toISOString();
  const items = [];
  for (const r of Object.values(state.records)) {
    if ((r.createdAt || '') < since) continue;
    if (r.kind === 'ask') {
      if (r.source === 'stackoverflow' && r.answered && (r.score || 0) < 1) continue;
      const kind = r.askKind === 'would_pay' ? 'pay' : r.askKind === 'seeking' ? 'seeking' : 'question';
      items.push({
        id: r.id, kind, source: r.source, url: r.url, title: r.title, quote: r.quote || r.title, body: r.body || '', at: r.createdAt,
        people: 1, answered: !!r.answered, views: r.views || 0, score: r.score || 0, text: `${r.title}. ${(r.body || '').slice(0, 240)}`,
      });
    } else if ((r.kind === 'hn_story' || r.kind === 'hn_comment') && isFirstHandHN(`${r.title}\n${r.body}`)) {
      const q = (r.body || '').split(/(?<=[.!?])\s+/).find((x) => isFirstHandHN(x)) || (r.body || '').slice(0, 240);
      items.push({ id: r.id, kind: 'complaint', source: 'hn', url: r.url, title: q.slice(0, 180), quote: q.slice(0, 300), body: '', at: r.createdAt, people: 1, text: q.slice(0, 400) });
    }
  }
  return items;
}

/** Everything that says "something already exists for this". */
export function supplyItems(developments) {
  const items = [];
  for (const t of TOPICS) for (const tool of t.tools) items.push({ id: `tool:${t.id}:${tool.name}`, kind: 'tool', weight: 1, title: tool.name, url: tool.url, text: `${tool.name}: ${tool.covers.en}` });
  for (const d of developments) {
    const w = { product: 0.8, launch: 0.7, new_repo: 0.5, funding: 0.4 }[d.type];
    if (!w) continue;
    items.push({ id: d.embedId, kind: d.type, weight: w, title: d.title, url: d.url, text: `${d.title}. ${d.summary || ''}`.slice(0, 400), at: d.publishedAt });
  }
  return items;
}

function clusterWithin(items, vec, threshold) {
  const sorted = items.slice().sort((a, b) => (b.views - a.views) || (a.at || '').localeCompare(b.at || '') || a.id.localeCompare(b.id));
  const clusters = [];
  for (const it of sorted) {
    const v = vec(it);
    if (!v) continue;
    let best = null;
    let bestSim = threshold;
    for (const c of clusters) {
      const s = cosine(v, c.leaderVec);
      if (s >= bestSim) { best = c; bestSim = s; }
    }
    if (best) best.members.push(it);
    else clusters.push({ leaderVec: v, members: [it] });
  }
  return clusters;
}

const srcFamily = (s) => (s.startsWith('se:') || s === 'stackoverflow' ? 'stackexchange' : s.startsWith('forum:') ? 'forum' : s);

/**
 * Build ideas. `place` maps item id -> { domain, sub } (from classify),
 * `vectors` maps id -> vector.
 */
export function computeIdeas(state, developments, vectors, place, now, { loose = false } = {}) {
  const demand = demandItems(state, now).filter((d) => place.get(d.id));
  const supply = supplyItems(developments);
  const vec = (it) => vectors.get(it.id);
  const bySub = new Map();
  for (const d of demand) {
    const p = place.get(d.id);
    const key = `${p.domain}/${p.sub}`;
    if (!bySub.has(key)) bySub.set(key, []);
    bySub.get(key).push(d);
  }
  const ideas = [];
  for (const [key, items] of bySub) {
    const [domain, sub] = key.split('/');
    for (const c of clusterWithin(items, vec, IDEAS.clusterAt)) {
      const m = c.members;
      const people = m.length;
      const families = new Set(m.map((x) => srcFamily(x.source)));
      const pay = m.filter((x) => x.kind === 'pay').length;
      const seeking = m.filter((x) => x.kind === 'seeking').length;
      const unanswered = m.filter((x) => x.kind !== 'complaint' && !x.answered).length;
      const views = m.reduce((n, x) => n + (x.views || 0), 0);
      // Evidence: 2+ people, or one explicit "I need a product for this"
      // with real attention (views/score), or someone saying they would pay.
      const strongSingle = people === 1 && (pay || (seeking && ((m[0].views || 0) >= 80 || (m[0].score || 0) >= 2)));
      if (people < 2 && !strongSingle) continue;
      // An idea must read as one: phrased from an explicit request, or backed
      // by three or more people with the same problem.
      const phrasedAny = m.some((x) => ideaFromText(x.title, x.body));
      let ruleIdea = phrasedAny || people >= 3;
      // Technical support questions ("how do I configure X") are needs, not
      // ideas. An idea needs someone asking for a tool or product, someone
      // saying they would pay, or the same complaint from several people.
      // (With a language model available, it makes this call instead.)
      const complaints = m.filter((x) => x.kind === 'complaint').length;
      if (!pay && !seeking && complaints < 2) ruleIdea = false;
      // In loose mode every candidate is kept for the language model to judge.
      if (!ruleIdea && !loose) continue;
      const cen = centroid(m.map(vec));
      const matches = supply.map((s) => ({ s, sim: vectors.get(s.id) ? cosine(cen, vectors.get(s.id)) : 0 })).filter((x) => x.sim >= IDEAS.supplyAt).sort((a, b) => b.sim - a.sim);
      const answeredShare = people ? m.filter((x) => x.answered).length / people : 0;
      const coverage = matches.reduce((n, x) => n + x.s.weight * (x.sim - IDEAS.supplyAt + 0.5), 0) + answeredShare * 0.8;
      const verdict = coverage < 0.6 ? 'open' : coverage < 1.6 ? 'partial' : 'crowded';
      const strength = people >= 3 && (families.size >= 2 || pay) ? 'strong' : people >= 2 ? 'emerging' : 'signal';
      const demandScore = Math.log2(1 + people) * 3 + pay * 4 + seeking * 1.5 + Math.min(unanswered, 4) + (families.size - 1) * 2 + Math.log10(1 + views);
      const score = Math.round(demandScore * (verdict === 'open' ? 1 : verdict === 'partial' ? 0.6 : 0.25) * 10) / 10;
      const rep = m.map((x) => ({ x, sim: cosine(cen, vec(x)) })).sort((a, b) => b.sim - a.sim)[0].x;
      // Phrase the idea from the most "idea-like" member.
      const phrased = m.map((x) => ideaFromText(x.title, x.body)).find(Boolean);
      const ideaEn = phrased || rep.title;
      const allText = m.map((x) => `${x.title} ${x.body}`).join(' ');
      const type = pay || B2B.test(allText) || domain === 'industry' ? 'startup' : domain === 'hardware' || domain === 'electronics' && /device|kit|board|module|product/i.test(allText) ? 'product' : 'project';
      const nextStep = pay
        ? { size: 'Interview first', code: 'talk_payers', params: { n: pay } }
        : strength === 'signal'
          ? { size: 'Interview first', code: 'validate', params: {} }
          : verdict === 'open'
            ? { size: 'Weekend prototype', code: 'prototype', params: { n: people } }
            : { size: 'Interview first', code: 'differentiate', params: {} };
      ideas.push({
        id: `i-${hash(m.map((x) => x.id).sort()[0])}`,
        domain, sub,
        idea: ideaEn,
        phrased: !!phrased,
        ruleIdea,
        signature: hash(m.map((x) => x.id).sort().join('|')),
        title: rep.title,
        type, verdict, strength, score, people,
        sources: [...new Set(m.map((x) => x.source))].sort(),
        families: [...families].sort(),
        counts: { pay, seeking, questions: m.filter((x) => x.kind === 'question').length, complaints: m.filter((x) => x.kind === 'complaint').length, unanswered, views },
        evidence: m.slice().sort((a, b) => ({ pay: 0, seeking: 1, complaint: 2, question: 3 }[a.kind] - { pay: 0, seeking: 1, complaint: 2, question: 3 }[b.kind]) || (b.views || 0) - (a.views || 0))
          .slice(0, 10).map((x) => ({ kind: x.kind, source: x.source, url: x.url, title: x.title, quote: x.quote, at: x.at, views: x.views || 0, answered: !!x.answered })),
        solutions: matches.slice(0, 6).map((x) => ({ kind: x.s.kind, title: x.s.title, url: x.s.url, similarity: Math.round(x.sim * 100) / 100 })),
        coverage: Math.round(coverage * 100) / 100,
        demandScore: Math.round(demandScore * 10) / 10,
        nextStep,
        lastActivityAt: m.map((x) => x.at).filter(Boolean).sort().pop() || null,
      });
    }
  }
  return ideas.sort((a, b) => b.score - a.score);
}

export const SUB_KEYS = SUBS.map((s) => s.key);
