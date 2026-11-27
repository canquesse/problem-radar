// Market analysis step, run after needs are processed:
//   1. embed new texts with the local model (cached)
//   2. merge developments that tell the same story in different words
//   3. find gaps (strong demand, weak supply)
//   4. rebuild topic-level opportunities
// Gap verdict changes are written to the changelog like any other transition.

import { computeDevelopments, processOpportunities, mergeSemantic } from './market.js';
import { computeGaps, demandItems, supplyItems } from './gaps.js';
import { ensureEmbeddings, pruneEmbeddings } from './semantic.js';
import { hash } from './store.js';

export async function processMarket(state, now, { embedFn = null, log = () => {} } = {}) {
  let devs = computeDevelopments(state.records);
  const demand = demandItems(state, now);
  const supply = supplyItems(devs);
  const toEmbed = new Map();
  for (const d of devs) toEmbed.set(d.embedId, `${d.title}. ${d.summary || ''}`);
  for (const d of demand) toEmbed.set(d.embedId, d.text);
  for (const s of supply) if (!s.embedId) toEmbed.set(s.id, s.text);
  const vectors = await ensureEmbeddings(state, [...toEmbed.entries()].map(([id, text]) => ({ id, text })), { embedFn, log });
  pruneEmbeddings(state, new Set(toEmbed.keys()));

  const before = devs.length;
  devs = mergeSemantic(devs, vectors);
  log(`semantic dedup: ${before - devs.length} developments merged into others`);

  const gaps = computeGaps(state, devs, vectors, now);
  const prev = state.gaps || {};
  const next = {};
  const eventIds = new Set(state.events.map((e) => e.id));
  const transitions = [];
  for (const g of gaps) {
    const p = prev[g.id];
    const changed = !p || p.verdict !== g.verdict;
    next[g.id] = { ...g, firstSeenAt: p?.firstSeenAt || now, verdictSince: changed ? now : p.verdictSince, previousVerdict: changed ? p?.verdict || null : p.previousVerdict || null };
    if (p && changed) {
      const id = `e-${hash(g.id, p.verdict, g.verdict, String(g.people))}`;
      if (!eventIds.has(id)) {
        eventIds.add(id);
        transitions.push({
          id, cardId: g.id, cardTitle: g.title, kind: 'gap', repo: null, type: 'transition', from: p.verdict, to: g.verdict, at: now,
          code: `gap_${g.verdict}`, params: { people: g.people }, reason: `Now ${g.verdict}: ${g.people} people, ${g.solutions.length} matching solutions.`,
          triggerRecordId: g.id, triggerUrl: g.evidence[0]?.url || null,
        });
      }
    }
  }
  state.gaps = next;
  state.events.push(...transitions);
  const opp = processOpportunities(state, now, devs);
  log(`gaps: ${gaps.length} (${gaps.filter((g) => g.verdict === 'open').length} open)`);
  return { ...opp, transitions: [...opp.transitions, ...transitions], gaps: gaps.length };
}
