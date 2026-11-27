// JSON-file store. In production the files live on the `data` branch and are
// rewritten by the scheduled workflow; locally they live in ./data.
//
// Files:
//   records.json        every source record we have seen, keyed by stable id
//   cursors.json        per-source, per-endpoint progress cursors
//   etags.json          conditional-request validators per URL
//   sources.json        per-source health (last success, last error, delay)
//   verifications.json  release-containment checks for merged fixes
//   cards.json          derived problem cards (rebuilt every run)
//   events.json         append-only state-transition changelog

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FILES = ['records', 'cursors', 'etags', 'sources', 'verifications', 'cards', 'events'];
const DEFAULTS = { records: {}, cursors: {}, etags: {}, sources: {}, verifications: {}, cards: {}, events: [] };

export function emptyState() {
  return structuredClone(DEFAULTS);
}

export function loadState(dir) {
  const state = emptyState();
  for (const name of FILES) {
    const file = path.join(dir, `${name}.json`);
    if (fs.existsSync(file)) state[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return state;
}

export function saveState(dir, state, extra = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const all = { ...state, ...extra };
  for (const [name, value] of Object.entries(all)) {
    const file = path.join(dir, `${name}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(sortKeys(value), null, 1) + '\n');
    fs.renameSync(tmp, file);
  }
}

// Stable key order keeps diffs on the data branch readable and makes
// "nothing changed" runs produce byte-identical files.
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  }
  return v;
}

export function hash(...parts) {
  return crypto.createHash('sha1').update(parts.join('\u0000')).digest('hex').slice(0, 12);
}

/** Fields that define a record's content. `lastSeenAt` is deliberately excluded. */
const CONTENT_FIELDS = ['title', 'body', 'state', 'stateReason', 'labels', 'mergedAt', 'mergeCommitSha', 'publishedAt', 'tag', 'prerelease', 'draft', 'updatedAt'];

/**
 * Insert or update a record. Idempotent: upserting the same payload twice only
 * bumps `lastSeenAt`. State changes are appended to `stateHistory`, which is
 * how reopened issues are detected later.
 * Returns 'new' | 'changed' | 'unchanged'.
 */
export function upsertRecord(state, incoming, now) {
  const prev = state.records[incoming.id];
  if (!prev) {
    state.records[incoming.id] = {
      ...incoming,
      firstSeenAt: now,
      lastSeenAt: now,
      stateHistory: incoming.state ? [{ state: incoming.state, at: incoming.updatedAt || incoming.createdAt || now }] : [],
    };
    return 'new';
  }
  const changed = CONTENT_FIELDS.some((f) => JSON.stringify(prev[f]) !== JSON.stringify(incoming[f]));
  const next = { ...prev, ...incoming, firstSeenAt: prev.firstSeenAt, lastSeenAt: now, stateHistory: prev.stateHistory || [] };
  if (incoming.state && incoming.state !== prev.state) {
    next.stateHistory = [...next.stateHistory, { state: incoming.state, at: incoming.updatedAt || now }];
  }
  state.records[incoming.id] = next;
  return changed ? 'changed' : 'unchanged';
}

/** Mark a source sync attempt. Failures keep the last good data untouched. */
export function recordSourceRun(state, key, { ok, error, items = 0, requests = 0, notModified = 0, truncated = false }, now) {
  const prev = state.sources[key] || { consecutiveFailures: 0 };
  state.sources[key] = {
    ...prev,
    lastAttemptAt: now,
    ...(ok
      ? { lastSuccessAt: now, lastError: null, consecutiveFailures: 0, itemsLastRun: items, requestsLastRun: requests, notModifiedLastRun: notModified, truncated }
      : { lastError: String(error).slice(0, 300), consecutiveFailures: (prev.consecutiveFailures || 0) + 1 }),
  };
}
