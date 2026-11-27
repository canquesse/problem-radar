// Developments, topic tagging and opportunity cards.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeDevelopments, computeOpportunities, processOpportunities, tagTopics } from '../src/market.js';
import { processCards } from '../src/pipeline.js';
import { isFunding, normalizeFeedItem, parseFeed, parseFunding, syncFeeds } from '../src/sources/developments.js';
import { HttpClient } from '../src/http.js';
import { comment, issue, response, stateWith } from './helpers.js';

const NOW = '2026-11-27T00:00:00Z';

test('RSS and Atom feeds parse, including Google News outlets', () => {
  const rss = `<rss><channel><item><title>Acme raises $10M seed to fix GPU waste - TechCrunch</title><link>https://news.google.com/x</link>
    <pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate><description>&lt;a href="x"&gt;Acme&lt;/a&gt;</description><source url="https://techcrunch.com">TechCrunch</source></item></channel></rss>`;
  const [r] = parseFeed(rss);
  assert.equal(r.outlet, 'TechCrunch');
  assert.equal(r.publishedAt, '2026-11-23T10:00:00.000Z');
  const rec = normalizeFeedItem({ id: 'g', kind: 'news' }, r);
  assert.equal(rec.title, 'Acme raises $10M seed to fix GPU waste');
  assert.equal(rec.devType, 'funding');

  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>tag:1</id><published>2026-11-25T21:09:09-08:00</published>
    <link rel="alternate" type="text/html" href="https://www.producthunt.com/products/x"/><title>Superframes</title><content type="html">AI video</content></entry></feed>`;
  const [a] = parseFeed(atom);
  assert.equal(a.link, 'https://www.producthunt.com/products/x');
  assert.equal(a.title, 'Superframes');
});

test('funding titles: company, amount and round', () => {
  assert.deepEqual(parseFunding('Exclusive: Princeton AI firm AidenAI raises $32M in Series A'), { company: 'AidenAI', amount: '$32M', round: 'Series A' });
  assert.deepEqual(parseFunding('Model ML Secures $250M Series B to Scale Personal AI Agents'), { company: 'Model ML', amount: '$250M', round: 'Series B' });
  assert.equal(parseFunding('Reversa raises €750K to automate regulatory processes').amount, '€750K');
  assert.equal(isFunding('Nvidia announces 5 million new users'), false);
  assert.equal(isFunding('Luminal raises $25 million to improve inference'), true);
});

const dev = (id, o) => ({ id, kind: 'dev', source: 'news', devType: 'news', createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z', lastSeenAt: NOW, body: '', ...o });

test('one funding round reported by many outlets is one development, verified by 2+ outlets', () => {
  const recs = {
    a: dev('a', { devType: 'funding', title: 'Acme raises $10M to cut inference costs', outlet: 'TechCrunch', url: 'https://tc.com/a', funding: { company: 'Acme', amount: '$10M', round: null } }),
    b: dev('b', { devType: 'funding', title: 'Acme.ai secures $10 million seed for AI spend tracking', outlet: 'VentureBeat', url: 'https://vb.com/b', funding: { company: 'Acme.ai', amount: '$10M', round: 'Seed' } }),
    c: dev('c', { devType: 'funding', title: 'Acme raises $10M', outlet: 'TechCrunch', url: 'https://tc.com/a?utm_source=x', funding: { company: 'Acme', amount: '$10M', round: null } }),
    d: dev('d', { devType: 'funding', title: 'Zeta raises $3M pre-seed for GPU scheduling', outlet: 'Wamda', url: 'https://w.com/z', funding: { company: 'Zeta', amount: '$3M', round: 'Pre-seed' } }),
  };
  const devs = computeDevelopments(recs).filter((x) => x.type === 'funding');
  assert.equal(devs.length, 2);
  const acme = devs.find((x) => x.funding.company.startsWith('Acme'));
  assert.equal(acme.copies, 3);
  assert.equal(acme.outletCount, 2, 'two distinct outlets');
  assert.equal(acme.verified, true);
  assert.equal(devs.find((x) => x.funding.company === 'Zeta').verified, false, 'a single outlet is not verified');
});

test('topic tagging needs a keyword; a repository only tips the balance', () => {
  assert.ok(tagTopics('Acme raises $10M to cut inference costs').includes('inference-cost'));
  assert.ok(tagTopics('Track token usage and billing per team').includes('inference-cost'));
  assert.deepEqual(tagTopics('Weird thing happens', '', 'huggingface/trl'), [], 'repo alone does not tag');
  assert.ok(tagTopics('GRPO trainer crashes', '', 'huggingface/trl').includes('fine-tuning'));
});

function marketState() {
  const s = stateWith([
    issue(1, { title: '[Bug]: cost tracking is wrong for cached tokens', body: 'Our billing dashboard shows wrong spend. Workaround: we reconcile the invoice by hand every week.', author: 'a' }),
    comment(1, { author: 'b', body: 'Same issue here, our invoice and usage logs differ by 12% on litellm 1.50.0.' }),
    issue(2, { title: '[Bug]: budget alerts never fire', body: 'The spend budget limit is ignored, server fails to block requests.', author: 'c' }),
  ]);
  s.records.f1 = dev('f1', { devType: 'funding', title: 'Touchwise raises $3M seed for AI cost management', outlet: 'TechCrunch', url: 'https://tc.com/t', funding: { company: 'Touchwise', amount: '$3M', round: 'Seed' } });
  return s;
}

test('an opportunity opens only where a development meets a first-hand need', () => {
  const s = marketState();
  processCards(s, NOW);
  const devs = computeDevelopments(s.records);
  const opps = computeOpportunities(devs, Object.values(s.cards), NOW);
  const o = opps.find((x) => x.topic === 'inference-cost');
  assert.ok(o, 'funding + cost complaints = opportunity');
  assert.equal(o.supply.funding, 1);
  assert.equal(o.demand.cases, 3);
  assert.equal(o.state, 'demand_confirmed', 'two people + a workaround = worth trying need');
  assert.equal(o.experiment.code, 'prototype');
  assert.ok(o.tools.length > 0, 'existing solutions are listed');
  assert.ok(o.question.en.length > 10, 'a narrow question to research');
  // No development, no opportunity.
  assert.equal(computeOpportunities([], Object.values(s.cards), NOW).length, 0);
  // Developments older than the window do not count.
  const old = devs.map((d) => ({ ...d, publishedAt: '2026-09-01T00:00:00Z' }));
  assert.equal(computeOpportunities(old, Object.values(s.cards), NOW).length, 0);
});

test('opportunity processing is idempotent and notifies only on state changes', () => {
  const s = marketState();
  processCards(s, NOW);
  const first = processOpportunities(s, NOW);
  assert.ok(first.created.length >= 1);
  assert.equal(first.transitions.length, 0);
  const again = processOpportunities(s, '2026-11-27T01:00:00Z');
  assert.equal(again.created.length + again.transitions.length, 0);
});

test('a blocked feed is reported as failing and does not stop the other feeds', async () => {
  const feeds = [{ id: 'ok', kind: 'news', url: 'https://ok.example/feed' }, { id: 'blocked', kind: 'news', url: 'https://blocked.example/feed' }];
  const fetch = async (url) => (url.includes('blocked')
    ? response(200, '<html><title>Attention Required! | Cloudflare</title></html>')
    : response(200, `<rss><channel><item><title>Acme raises $5M seed</title><link>https://ok.example/a</link><pubDate>${new Date(NOW).toUTCString()}</pubDate></item></channel></rss>`));
  const http = new HttpClient({ fetch, sleep: async () => {} });
  const got = {};
  const upserted = [];
  await syncFeeds({ http, now: NOW, upsert: (r) => upserted.push(r), record: (k, r) => { got[k] = r; }, feeds });
  assert.equal(got['feed:ok'].ok, true);
  assert.equal(got['feed:blocked'].ok, false);
  assert.equal(upserted.length, 1);
});
