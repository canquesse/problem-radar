// Ideas: demand in people's own words, grouped by meaning, checked against supply.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processMarket } from '../src/analyze.js';
import { ideaFromText } from '../src/ideas.js';
import { askKind } from '../src/sources/demand.js';
import { isNeed } from '../src/sources/community.js';
import { cleanTranslation, translatePending, tr } from '../src/translate.js';
import { fakeEmbed, issue, stateWith } from './helpers.js';

const NOW = '2026-11-27T00:00:00Z';
const ask = (id, text, o = {}) => ({ id, source: 'se:electronics', kind: 'ask', askKind: askKind(text), url: `https://electronics.stackexchange.com/q/${id}`, title: text, quote: text, body: '', createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z', views: 120, ...o });
const opts = { embedFn: fakeEmbed, translateBudgetMs: 0 };

test('what people ask becomes an idea sentence', () => {
  assert.equal(ideaFromText('Is there a cheap tool to monitor vibration on old CNC machines?'), 'A tool to monitor vibration on old CNC machines');
  assert.equal(ideaFromText('Looking for an alternative to Altium for small boards'), 'An alternative to Altium for small boards');
  assert.equal(ideaFromText("I'd pay for something to reconcile LLM invoices"), 'A paid product for something to reconcile LLM invoices');
  assert.equal(ideaFromText('How do you handle firmware updates across 200 ESP32 devices?'), 'A better way to handle firmware updates across 200 ESP32 devices');
  assert.equal(ideaFromText('Why does my op-amp oscillate'), null);
  assert.ok(isNeed('Is there a tool that converts Gerber files to STEP?'));
  assert.ok(!isNeed('Why does my op-amp oscillate'));
});

test('people asking for the same thing in different places form one open idea', async () => {
  const s = stateWith([
    ask('a1', 'Is there a tool to manage firmware updates for a fleet of ESP32 microcontroller devices?'),
    ask('a2', "I'd pay for a tool to manage firmware updates for a fleet of ESP32 microcontroller devices", { source: 'forum:forum.arduino.cc', url: 'https://forum.arduino.cc/t/x/1' }),
    ask('a3', 'Looking for a tool to manage firmware updates for a fleet of ESP32 microcontroller devices', { source: 'forum:community.platformio.org', url: 'https://community.platformio.org/t/x/1' }),
  ]);
  await processMarket(s, NOW, opts);
  const ideas = Object.values(s.ideas);
  assert.equal(ideas.length, 1);
  const g = ideas[0];
  assert.equal(g.domain, 'electronics');
  assert.equal(g.people, 3);
  assert.equal(g.verdict, 'open');
  assert.equal(g.strength, 'strong');
  assert.equal(g.type, 'startup', 'someone would pay');
  assert.match(g.idea, /^A (tool|paid product)/);
  assert.ok(g.evidence.every((e) => e.url.startsWith('https://')));
});

test('GitHub issues are never idea evidence', async () => {
  const s = stateWith([
    issue(1, { title: '[Feature]: support firmware updates for ESP32 fleets', body: 'Please add OTA fleet updates' }),
    issue(2, { title: '[Feature]: OTA firmware updates for many ESP32 devices', body: 'Would be nice to have' }),
  ]);
  await processMarket(s, NOW, opts);
  assert.equal(Object.keys(s.ideas).length, 0);
});

test('existing products matching the need mean it is not open', async () => {
  const s = stateWith([
    ask('b1', 'Is there a tool to manage firmware updates for a fleet of ESP32 devices?'),
    ask('b2', 'Looking for a tool to manage firmware updates for a fleet of ESP32 devices', { source: 'hn', url: 'https://news.ycombinator.com/item?id=2' }),
  ]);
  for (let i = 0; i < 3; i++) s.records[`p${i}`] = { id: `p${i}`, kind: 'dev', devType: 'product', source: 'producthunt', title: 'Tool to manage firmware updates for a fleet of ESP32 devices', body: '', url: `https://example.com/p${i}`, outlet: `PH${i}`, createdAt: '2026-11-21T00:00:00Z', updatedAt: '2026-11-21T00:00:00Z' };
  await processMarket(s, NOW, opts);
  const g = Object.values(s.ideas)[0];
  assert.notEqual(g.verdict, 'open');
  assert.ok(g.solutions.length >= 1);
});

test('a lone, unnoticed question is not an idea', async () => {
  const s = stateWith([ask('c1', 'Is there a tool to sort resistors by color?', { views: 3 })]);
  await processMarket(s, NOW, opts);
  assert.equal(Object.keys(s.ideas).length, 0);
});

test('Turkish translations are cached and cleaned', async () => {
  assert.equal(cleanTranslation('SAP plans layoffs.', "SAP işten çıkarma planlıyor. SAP, SAP, SAP, SAP"), 'SAP işten çıkarma planlıyor.');
  assert.equal(cleanTranslation('A tool for X', 'X için bir araç مستحيل'), 'X için bir araç');
  const s = stateWith([]);
  let calls = 0;
  const fake = async (t) => { calls++; return `TR:${t}`; };
  await translatePending(s, ['Hello world', 'Hello world', 'Second text'], { translateFn: fake });
  await translatePending(s, ['Hello world'], { translateFn: fake });
  assert.equal(calls, 2, 'each text once');
  assert.equal(tr(s, 'Hello world'), 'TR:Hello world');
});
