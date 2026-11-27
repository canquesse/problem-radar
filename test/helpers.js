// Synthetic fixtures for tests. These never reach the published data: the
// live site is built only from records fetched from GitHub and Hacker News.

import { emptyState, upsertRecord } from '../src/store.js';

export const REPO = 'acme/infer';
let seq = 1000;

export function issue(number, o = {}) {
  return {
    id: `gh:${o.repo || REPO}:issue:${number}`, source: 'github', repo: o.repo || REPO, kind: 'issue', number,
    url: `https://github.com/${o.repo || REPO}/issues/${number}`,
    title: o.title || `[Bug]: server crashes on startup (${number})`,
    body: o.body || `The server fails on startup when loading model variant ${'abcdefghijklmnopqrstuvwxyz'[number % 26]}.`,
    author: o.author || `user${number}`, authorAssociation: o.authorAssociation || 'NONE',
    createdAt: o.createdAt || '2026-11-01T10:00:00Z', updatedAt: o.updatedAt || o.createdAt || '2026-11-01T10:00:00Z',
    closedAt: o.closedAt || null, state: o.state || 'open', stateReason: o.stateReason || null, labels: o.labels || [],
  };
}

export function comment(parentNumber, o = {}) {
  const id = o.id || ++seq;
  return {
    id: `gh:${o.repo || REPO}:comment:${id}`, source: 'github', repo: o.repo || REPO, kind: 'comment',
    url: `https://github.com/${o.repo || REPO}/issues/${parentNumber}#issuecomment-${id}`, title: '',
    body: o.body, author: o.author || `commenter${id}`, authorAssociation: o.authorAssociation || 'NONE',
    createdAt: o.createdAt || '2026-11-02T10:00:00Z', updatedAt: o.createdAt || '2026-11-02T10:00:00Z',
    parentId: `gh:${o.repo || REPO}:issue:${parentNumber}`,
  };
}

export function pr(number, o = {}) {
  return {
    id: `gh:${o.repo || REPO}:pr:${number}`, source: 'github', repo: o.repo || REPO, kind: 'pr', number,
    url: `https://github.com/${o.repo || REPO}/pull/${number}`, title: o.title || `Fix crash (${number})`,
    body: o.body || '', author: o.author || 'maintainer', createdAt: o.mergedAt || '2026-11-05T10:00:00Z',
    updatedAt: o.mergedAt || '2026-11-05T10:00:00Z', state: 'merged', mergedAt: o.mergedAt || '2026-11-05T10:00:00Z',
    mergeCommitSha: o.sha || `sha${number}`,
  };
}

export function release(id, o = {}) {
  return {
    id: `gh:${o.repo || REPO}:release:${id}`, source: 'github', repo: o.repo || REPO, kind: 'release',
    url: `https://github.com/${o.repo || REPO}/releases/tag/${o.tag}`, title: o.tag, body: o.body || '', tag: o.tag,
    author: 'maintainer', createdAt: o.publishedAt, updatedAt: o.publishedAt, publishedAt: o.publishedAt,
    prerelease: !!o.prerelease, draft: false, state: 'published',
  };
}

export function hnItem(objectID, o = {}) {
  const story = o.kind !== 'hn_comment';
  return {
    id: `hn:item:${objectID}`, source: 'hn', repo: o.repo || REPO, kind: story ? 'hn_story' : 'hn_comment',
    url: `https://news.ycombinator.com/item?id=${objectID}`, title: o.title || '', body: o.body || '',
    linkedUrl: o.linkedUrl || null, author: o.author || `hn${objectID}`, createdAt: o.createdAt || '2026-11-03T10:00:00Z',
    updatedAt: o.createdAt || '2026-11-03T10:00:00Z', parentId: null, hnTags: [story ? 'story' : 'comment'],
  };
}

export function stateWith(records, now = '2026-11-10T00:00:00Z') {
  const s = emptyState();
  for (const r of records) upsertRecord(s, r, now);
  return s;
}

export function add(state, records, now) {
  for (const r of records) upsertRecord(state, r, now);
}

/** Minimal fetch Response stand-in. */
export function response(status, body, headers = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {
    status,
    headers: { get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null) },
    text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
  };
}
