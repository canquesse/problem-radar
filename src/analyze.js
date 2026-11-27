// Market analysis, run after needs (GitHub problem cards) are processed:
//   1. collect developments, demand (asks, complaints) and supply
//   2. embed new texts with the local model (cached)
//   3. place everything in a domain sub-area by meaning
//   4. merge developments that tell the same story in different words
//   5. build ideas (strong demand, weak supply)
//   6. translate what the site shows into Turkish (cached, time-boxed)
// Idea verdict changes are written to the changelog like any other transition.

import { computeDevelopments, mergeSemantic, processOpportunities } from './market.js';
import { computeIdeas, demandItems, supplyItems } from './ideas.js';
import { classify, subPrototypes } from './classify.js';
import { ensureEmbeddings, pruneEmbeddings } from './semantic.js';
import { translatePending } from './translate.js';
import { hash } from './store.js';

export async function processMarket(state, now, { embedFn = null, translateFn = null, translateBudgetMs = 0, translateAll = true, log = () => {} } = {}) {
  let devs = computeDevelopments(state.records);
  const demand = demandItems(state, now);
  const supply = supplyItems(devs);
  const cards = Object.values(state.cards || {});
  const protos = subPrototypes();

  const toEmbed = new Map();
  for (const p of protos) toEmbed.set(p.id, p.text);
  for (const d of devs) toEmbed.set(d.embedId, `${d.title}. ${d.summary || ''}`);
  for (const d of demand) toEmbed.set(d.id, d.text);
  for (const s of supply) if (!toEmbed.has(s.id)) toEmbed.set(s.id, s.text);
  for (const c of cards) toEmbed.set(c.anchorId, `${c.title}. ${c.blocker?.value || ''}`);
  const vectors = await ensureEmbeddings(state, [...toEmbed.entries()].map(([id, text]) => ({ id, text })), { embedFn, log });
  pruneEmbeddings(state, new Set(toEmbed.keys()));

  // Place everything by meaning.
  const protoVecs = new Map(protos.map((p) => [p.sub.key, vectors.get(p.id)]));
  const place = new Map();
  for (const d of demand) { const p = classify(vectors.get(d.id), d.text, d.source, protoVecs); if (p) place.set(d.id, p); }
  for (const d of devs) {
    const p = classify(vectors.get(d.embedId), `${d.title} ${d.summary || ''}`, '', protoVecs, d.repo ? 'computer' : d.domainHint || null);
    d.domain = p?.domain || null;
    d.sub = p?.sub || null;
  }
  for (const c of cards) {
    const p = classify(vectors.get(c.anchorId), `${c.title} ${c.blocker?.value || ''}`, 'github', protoVecs, 'computer');
    c.domain = p?.domain || 'computer';
    c.sub = p?.sub || 'ai';
  }

  const before = devs.length;
  devs = mergeSemantic(devs, vectors);
  log(`semantic dedup: ${before - devs.length} developments merged into others`);

  // Ideas and their changelog.
  const ideas = computeIdeas(state, devs, vectors, place, now);
  const prev = state.ideas || {};
  const next = {};
  const eventIds = new Set(state.events.map((e) => e.id));
  const transitions = [];
  for (const g of ideas) {
    const p = prev[g.id];
    const changed = !p || p.verdict !== g.verdict;
    next[g.id] = { ...g, firstSeenAt: p?.firstSeenAt || now, verdictSince: changed ? now : p.verdictSince, previousVerdict: changed ? p?.verdict || null : p.previousVerdict || null };
    if (p && changed) {
      const id = `e-${hash(g.id, p.verdict, g.verdict, String(g.people))}`;
      if (!eventIds.has(id)) {
        eventIds.add(id);
        transitions.push({
          id, cardId: g.id, cardTitle: g.idea, kind: 'idea', repo: null, type: 'transition', from: p.verdict, to: g.verdict, at: now,
          code: `idea_${g.verdict}`, params: { people: g.people }, reason: `Now ${g.verdict}: ${g.people} people, ${g.solutions.length} close solutions.`,
          triggerRecordId: g.id, triggerUrl: g.evidence[0]?.url || null,
        });
      }
    }
  }
  state.ideas = next;
  delete state.gaps;
  state.events.push(...transitions);

  // Needs list for the site: every placed demand item, newest first.
  state.needs = demand.filter((d) => place.get(d.id)).map((d) => ({
    id: d.id, ...place.get(d.id), kind: d.kind, source: d.source, url: d.url, title: d.title, at: d.at, views: d.views || 0, answered: !!d.answered,
  })).sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 1500);

  const opp = processOpportunities(state, now, devs);

  // Turkish: ideas first, then what the domain pages show.
  if (translateBudgetMs > 0) {
    const ideasSorted = Object.values(next).sort((a, b) => b.score - a.score);
    // Fast runs only translate ideas (loading the model costs about a minute);
    // the hourly full run catches up on everything else.
    const texts = [
      ...ideasSorted.map((g) => g.idea),
      ...ideasSorted.slice(0, 80).flatMap((g) => g.evidence.slice(0, 4).map((e) => e.quote || e.title)),
    ];
    if (translateAll) texts.push(
      ...devs.filter((d) => d.type !== 'release').slice(0, 250).map((d) => d.title),
      ...state.needs.slice(0, 500).map((n) => n.title),
      ...cards.filter((c) => c.state !== 'early_signal').map((c) => c.title),
      ...devs.filter((d) => d.type !== 'release').slice(0, 120).map((d) => d.summary).filter(Boolean),
    );
    await translatePending(state, texts, { budgetMs: translateBudgetMs, translateFn, log });
  }
  log(`ideas: ${ideas.length} (${ideas.filter((g) => g.verdict === 'open').length} open), needs placed: ${state.needs.length}`);
  return { ...opp, transitions: [...opp.transitions, ...transitions], ideas: ideas.length };
}
