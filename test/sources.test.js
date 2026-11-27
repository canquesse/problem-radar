// Fetcher tests with a fake fetch: conditional requests, pagination,
// rate-limit backoff, cursors, and a broken feed that must not erase data.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpClient, RateLimitError, parseLinkHeader } from '../src/http.js';
import { emptyState } from '../src/store.js';
import { runSync } from '../src/sync.js';
import { response } from './helpers.js';

const noSleep = async () => {};

test('parseLinkHeader reads rel=next', () => {
  const l = parseLinkHeader('<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"');
  assert.equal(l.next, 'https://api.github.com/x?page=2');
  assert.equal(l.last, 'https://api.github.com/x?page=5');
});

test('conditional requests send If-None-Match and treat 304 as "nothing new"', async () => {
  const seen = [];
  const fetch = async (url, { headers }) => {
    seen.push(headers['If-None-Match'] || null);
    return seen.length === 1 ? response(200, [{ id: 1 }], { etag: 'W/"abc"' }) : response(304, '');
  };
  const http = new HttpClient({ fetch, sleep: noSleep });
  const a = await http.get('https://api.github.com/r');
  const b = await http.get('https://api.github.com/r');
  assert.deepEqual(a.data, [{ id: 1 }]);
  assert.equal(b.notModified, true);
  assert.deepEqual(seen, [null, 'W/"abc"']);
  assert.equal(http.stats.notModified, 1);
});

test('rate limit: waits until reset when short, gives up when long', async () => {
  let calls = 0;
  const waits = [];
  const now = 1_000_000_000_000;
  const fetch = async () => {
    calls++;
    if (calls === 1) return response(403, 'rate limited', { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(now / 1000 + 5) });
    return response(200, { ok: true }, { 'x-ratelimit-remaining': '999' });
  };
  const http = new HttpClient({ fetch, sleep: async (ms) => waits.push(ms), now: () => now });
  const r = await http.get('https://api.github.com/x');
  assert.equal(r.data.ok, true);
  assert.equal(waits.length, 1);
  assert.ok(waits[0] >= 5000 && waits[0] <= 7000);

  const http2 = new HttpClient({
    fetch: async () => response(429, 'slow down', { 'retry-after': '3600' }),
    sleep: noSleep,
  });
  await assert.rejects(http2.get('https://api.github.com/y'), RateLimitError);
});

test('quota floor: stops before spending the last requests', async () => {
  const http = new HttpClient({ fetch: async () => response(200, [], { 'x-ratelimit-remaining': '50' }), sleep: noSleep, minRemaining: 100 });
  await http.get('https://api.github.com/a');
  await assert.rejects(http.get('https://api.github.com/b'), RateLimitError);
});

test('5xx errors are retried with backoff', async () => {
  let calls = 0;
  const http = new HttpClient({ fetch: async () => (++calls < 3 ? response(502, 'bad gateway') : response(200, [1])), sleep: noSleep });
  const r = await http.get('https://api.github.com/z');
  assert.deepEqual(r.data, [1]);
  assert.equal(calls, 3);
});

test('pagination follows Link headers and respects the page cap', async () => {
  const fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get('page') || 1);
    return response(200, [{ page }], { link: `<https://api.github.com/p?page=${page + 1}>; rel="next"` });
  };
  const http = new HttpClient({ fetch, sleep: noSleep });
  const pages = [];
  for await (const p of http.paginate('https://api.github.com/p', { maxPages: 3 })) pages.push(p);
  assert.equal(pages.filter((p) => p.items.length).length, 3);
  assert.equal(pages.at(-1).truncated, true);
});

// --- End-to-end sync against a fake GitHub ---------------------------------

function fakeGitHub({ failRepo } = {}) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (failRepo && u.pathname.includes(failRepo)) return response(500, 'upstream down');
    const h = { 'x-ratelimit-remaining': '900', etag: `"${u.pathname}"` };
    if (u.pathname.endsWith('/issues')) {
      return response(200, [{
        number: 1, html_url: `https://github.com${u.pathname.replace('/repos', '')}/1`, title: '[Bug]: crash on load',
        body: 'The server fails on load. RuntimeError: CUDA error: device-side assert triggered during warmup phase',
        user: { login: 'alice', type: 'User' }, author_association: 'NONE', created_at: '2026-11-05T00:00:00Z',
        updated_at: '2026-11-06T00:00:00Z', state: 'open', labels: [],
      }], h);
    }
    return response(200, [], h);
  };
  return { fetch, calls };
}

const REPOS = [{ repo: 'acme/a', hn: [] }, { repo: 'acme/b', hn: [] }];

test('sync stores records with stable ids and advances per-endpoint cursors', async () => {
  const s = emptyState();
  const { fetch } = fakeGitHub();
  await runSync(s, { now: '2026-11-10T00:00:00Z', token: 't', repos: REPOS, fetch, sleep: noSleep, log: () => {}, skipHN: true });
  assert.ok(s.records['gh:acme/a:issue:1']);
  assert.ok(s.records['gh:acme/b:issue:1']);
  assert.equal(s.cursors['github:acme/a:issues'].since, '2026-11-06T00:00:00Z');
  assert.ok(s.cursors['github:acme/a:comments']);
  assert.ok(s.cursors['github:acme/a:pulls']);
  assert.ok(s.cursors['github:acme/a:releases']);
  assert.equal(s.sources['github:acme/a'].lastSuccessAt, '2026-11-10T00:00:00Z');
  assert.equal(Object.keys(s.cards).length, 2);
});

test('broken feed: a failing source keeps its last good data, shows as delayed, and does not block others', async () => {
  const s = emptyState();
  await runSync(s, { now: '2026-11-10T00:00:00Z', token: 't', repos: REPOS, fetch: fakeGitHub().fetch, sleep: noSleep, log: () => {}, skipHN: true });
  const cursorBefore = structuredClone(s.cursors['github:acme/b:issues']);
  const cardsBefore = Object.keys(s.cards).length;

  await runSync(s, { now: '2026-11-11T00:00:00Z', token: 't', repos: REPOS, fetch: fakeGitHub({ failRepo: 'acme/b' }).fetch, sleep: noSleep, log: () => {}, skipHN: true });
  const src = s.sources['github:acme/b'];
  assert.equal(src.lastSuccessAt, '2026-11-10T00:00:00Z', 'last success is preserved');
  assert.equal(src.lastAttemptAt, '2026-11-11T00:00:00Z');
  assert.equal(src.consecutiveFailures, 1);
  assert.match(src.lastError, /500/);
  assert.ok(s.records['gh:acme/b:issue:1'], 'records from the broken source are kept');
  assert.deepEqual(s.cursors['github:acme/b:issues'], cursorBefore, 'cursor did not advance on failure');
  assert.equal(Object.keys(s.cards).length, cardsBefore, 'cards are not dropped');
  assert.equal(s.sources['github:acme/a'].lastSuccessAt, '2026-11-11T00:00:00Z', 'the healthy source still synced');
});

test('second sync with unchanged data uses conditional requests and creates no events', async () => {
  const s = emptyState();
  const gh = fakeGitHub();
  const etagFetch = async (url, opts) => (opts.headers['If-None-Match'] ? response(304, '', { 'x-ratelimit-remaining': '900' }) : gh.fetch(url, opts));
  await runSync(s, { now: '2026-11-10T00:00:00Z', token: 't', repos: REPOS, fetch: etagFetch, sleep: noSleep, log: () => {}, skipHN: true });
  const events = s.events.length;
  const { ghStats, result } = await runSync(s, { now: '2026-11-10T01:00:00Z', token: 't', repos: REPOS, fetch: etagFetch, sleep: noSleep, log: () => {}, skipHN: true });
  assert.ok(ghStats.notModified > 0, 'unchanged endpoints answered 304');
  assert.equal(result.transitions.length + result.created.length, 0);
  assert.equal(s.events.length, events);
});
