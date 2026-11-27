// Gap engine: strong demand vs weak supply, using a stand-in for the model.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processMarket } from '../src/analyze.js';
import { askKind } from '../src/sources/demand.js';
import { fakeEmbed, stateWith } from './helpers.js';

const NOW = '2026-11-27T00:00:00Z';
const ask = (id, text, o = {}) => ({ id, source: 'hn', kind: 'ask', askKind: askKind(text), url: `https://news.ycombinator.com/item?id=${id}`, title: text, quote: text, body: text, author: `u${id}`, createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z', ...o });

test('asks are classified by intent', () => {
  assert.equal(askKind("I'd pay for a tool that reconciles LLM invoices"), 'would_pay');
  assert.equal(askKind('Is there a tool to reconcile LLM invoices?'), 'seeking');
  assert.equal(askKind('Why is my build slow?'), 'question');
});

test('people asking for the same thing in different places form one open market gap', async () => {
  const s = stateWith([
    ask('a1', 'Is there a tool to reconcile LLM provider invoices against our usage logs?'),
    ask('a2', "I'd pay for a tool to reconcile LLM provider invoices with usage logs"),
    ask('a3', 'How do you reconcile LLM provider invoices against usage logs?', { source: 'stackoverflow', kind: 'ask', answered: false, score: 2 }),
  ]);
  await processMarket(s, NOW, { embedFn: fakeEmbed });
  const gaps = Object.values(s.gaps);
  assert.equal(gaps.length, 1);
  const g = gaps[0];
  assert.equal(g.people, 3);
  assert.equal(g.scope, 'market');
  assert.equal(g.verdict, 'open');
  assert.equal(g.counts.pay, 1);
  assert.equal(g.nextStep.code, 'talk_payers');
  assert.ok(g.evidence.every((e) => e.url.startsWith('https://')), 'every claim links to its source');
});

test('a gap that existing products match is not called open', async () => {
  const s = stateWith([
    ask('b1', 'Is there a tool to reconcile LLM provider invoices against our usage logs?'),
    ask('b2', "I'd pay for a tool to reconcile LLM provider invoices with usage logs"),
    ask('b3', 'Looking for a tool to reconcile LLM provider invoices and usage logs'),
  ]);
  for (const [i, t] of ['Reconcile LLM provider invoices against usage logs', 'Tool to reconcile LLM invoices with usage logs', 'LLM provider invoices reconcile usage logs tool'].entries()) {
    s.records[`p${i}`] = { id: `p${i}`, kind: 'dev', devType: 'product', source: 'producthunt', title: t, body: '', url: `https://example.com/p${i}`, outlet: 'Product Hunt', createdAt: '2026-11-21T00:00:00Z', updatedAt: '2026-11-21T00:00:00Z' };
  }
  await processMarket(s, NOW, { embedFn: fakeEmbed });
  const g = Object.values(s.gaps)[0];
  assert.notEqual(g.verdict, 'open');
  assert.ok(g.solutions.length >= 2);
});

test('a single lone ask is not enough evidence for a gap', async () => {
  const s = stateWith([ask('c1', 'Is there a tool to turn Figma files into MCP servers?')]);
  await processMarket(s, NOW, { embedFn: fakeEmbed });
  assert.equal(Object.keys(s.gaps).length, 0);
});

test('market analysis is idempotent and embeds each text once', async () => {
  const s = stateWith([ask('d1', 'Is there a tool for agent retry loops?'), ask('d2', "I'd pay for a tool for agent retry loops")]);
  let calls = 0;
  const counting = async (texts) => { calls += texts.length; return fakeEmbed(texts); };
  await processMarket(s, NOW, { embedFn: counting });
  const first = calls;
  const r = await processMarket(s, '2026-11-27T00:03:00Z', { embedFn: counting });
  assert.equal(calls, first, 'cached vectors are reused');
  assert.equal(r.transitions.length, 0);
});
