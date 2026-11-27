// Pipeline: engine output -> stable cards -> state transitions -> changelog.
//
// Guarantees
//   - Stable card ids: a card keeps its id when new members join or clusters
//     merge (the oldest existing card id wins).
//   - Notifications only on state transitions. A run that changes nothing
//     produces no events.
//   - Idempotent: event ids are a hash of (card, from, to, trigger record), so
//     reprocessing the same data never duplicates an event.

import { LIMITS, PUBLISHED_STATES, STATE_LABELS } from './config.js';
import { computeClusters } from './engine.js';
import { hash } from './store.js';

export function cardIdFor(anchorId) {
  return `c-${hash(anchorId)}`;
}

/**
 * Recompute cards from records and diff them against the previous cards.
 * Mutates state.cards and state.events. Returns { transitions, created }.
 */
export function processCards(state, now) {
  const clusters = computeClusters(state.records, state.verifications);
  const prevCards = state.cards || {};

  // Map every previous member record -> previous card id.
  const memberToPrev = new Map();
  for (const card of Object.values(prevCards)) for (const m of card.memberIds) memberToPrev.set(m, card.id);

  const nextCards = {};
  const eventIds = new Set(state.events.map((e) => e.id));
  const newEvents = [];

  // Process clusters in a deterministic order (oldest first).
  clusters.sort((a, b) => a.firstReportedAt.localeCompare(b.firstReportedAt) || a.anchorId.localeCompare(b.anchorId));
  for (const c of clusters) {
    const prevIds = [...new Set(c.memberIds.map((m) => memberToPrev.get(m)).filter(Boolean))]
      .filter((id) => !nextCards[id])
      .sort((a, b) => (prevCards[a].createdAt || '').localeCompare(prevCards[b].createdAt || '') || a.localeCompare(b));
    const id = prevIds[0] || cardIdFor(c.anchorId);
    const prev = prevCards[id] || null;
    const mergedFrom = prevIds.slice(1);

    const changed = !prev || prev.state !== c.state;
    const card = {
      ...c,
      id,
      createdAt: prev?.createdAt || now,
      stateSince: changed ? now : prev.stateSince,
      previousState: changed ? prev?.state || null : prev.previousState || null,
      mergedFrom: [...new Set([...(prev?.mergedFrom || []), ...mergedFrom])],
      published: PUBLISHED_STATES.includes(c.state),
    };
    nextCards[id] = card;

    if (changed) {
      const from = prev?.state || null;
      const evId = `e-${hash(id, from || 'none', c.state, c.trigger.recordId)}`;
      if (!eventIds.has(evId)) {
        eventIds.add(evId);
        newEvents.push({
          id: evId,
          cardId: id,
          cardTitle: c.title,
          repo: c.repo,
          type: from ? 'transition' : 'created',
          from,
          to: c.state,
          at: now,
          reason: c.trigger.reason,
          triggerRecordId: c.trigger.recordId,
          triggerUrl: c.trigger.url,
          summary: from
            ? `${STATE_LABELS[from]} → ${STATE_LABELS[c.state]}: ${c.trigger.reason}`
            : `New card (${STATE_LABELS[c.state]}): ${c.trigger.reason}`,
        });
      }
    }
  }

  state.cards = nextCards;
  state.events = [...state.events, ...newEvents];
  return {
    transitions: newEvents.filter((e) => e.type === 'transition'),
    created: newEvents.filter((e) => e.type === 'created'),
  };
}

/**
 * Quality and usage metrics. Counts, not percentages: at pilot scale a
 * percentage over five cards moves 20 points per card.
 * Quality retractions (bad extraction / reporter withdrew) are kept apart from
 * genuine resolutions (a release fixed it): the first is a radar error, the
 * second is the radar working.
 */
export function computeMetrics(state, now) {
  const cards = Object.values(state.cards);
  const byState = {};
  for (const c of cards) byState[c.state] = (byState[c.state] || 0) + 1;
  const transitions = state.events.filter((e) => e.type === 'transition');
  const everPublished = new Set(state.events.filter((e) => PUBLISHED_STATES.includes(e.to)).map((e) => e.cardId));
  const changed = new Set(transitions.map((e) => e.cardId));
  return {
    generatedAt: now,
    cards: cards.length,
    byState,
    publishedNow: cards.filter((c) => c.published).length,
    publishedEver: everPublished.size,
    changedByNewEvidence: changed.size,
    transitions: transitions.length,
    qualityRetractions: transitions.filter((e) => e.to === 'retracted').length,
    genuineResolutions: transitions.filter((e) => e.to === 'resolved').length,
    conflicts: transitions.filter((e) => e.to === 'watching').length,
    closedWithoutFix: cards.filter((c) => c.flags.closedWithoutFix).length,
    firstHandCases: cards.reduce((n, c) => n + c.caseCount, 0),
    verifiedTeams: cards.reduce((n, c) => n + c.teamCount, 0),
    records: Object.keys(state.records).length,
  };
}

/**
 * Drop old records that no live card needs. Records referenced by a card that
 * is still moving (worth trying / watching / fix coming) are kept, as are
 * releases and merged PRs a pending fix may still need.
 */
export function pruneRecords(state, now) {
  const cutoff = new Date(Date.parse(now) - LIMITS.pruneAfterDays * 86400_000).toISOString();
  const keep = new Set();
  for (const c of Object.values(state.cards)) {
    if (['worth_trying', 'watching', 'fix_coming'].includes(c.state)) {
      c.memberIds.forEach((id) => keep.add(id));
      c.evidence.forEach((e) => keep.add(e.recordId));
    }
  }
  let removed = 0;
  for (const [id, r] of Object.entries(state.records)) {
    const last = r.updatedAt || r.createdAt || r.lastSeenAt;
    const limit = r.kind === 'release' ? new Date(Date.parse(now) - 3 * LIMITS.pruneAfterDays * 86400_000).toISOString() : cutoff;
    if (!keep.has(id) && last < limit) { delete state.records[id]; removed++; }
  }
  return removed;
}
