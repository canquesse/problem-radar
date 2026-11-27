// Optional language model: judges clusters and writes ideas in Turkish.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processMarket } from '../src/analyze.js';
import { LLM, llmConfig } from '../src/llm.js';
import { askKind } from '../src/sources/demand.js';
import { fakeEmbed, stateWith } from './helpers.js';

const NOW = '2026-11-27T00:00:00Z';
const ask = (id, text, o = {}) => ({ id, source: 'se:electronics', kind: 'ask', askKind: askKind(text), url: `https://electronics.stackexchange.com/q/${id}`, title: text, quote: text, body: '', createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z', views: 120, ...o });
const jsonRes = (obj, status = 200) => ({ status, ok: status < 300, json: async () => obj });

test('no key, no model', () => {
  assert.equal(llmConfig({}), null);
  assert.ok(llmConfig({ GEMINI_API_KEY: 'x' }));
});

test('the model keeps real ideas, drops support questions, and writes Turkish', async () => {
  const s = stateWith([
    ask('a1', 'Is there a tool to manage firmware updates for a fleet of ESP32 microcontroller devices?'),
    ask('a2', 'Looking for a tool to manage firmware updates for a fleet of ESP32 microcontroller devices', { source: 'forum:forum.arduino.cc', url: 'https://forum.arduino.cc/t/x/1' }),
    ask('b1', 'Is there a tool to make my op-amp stop oscillating in the microcontroller circuit?'),
    ask('b2', 'Is there a tool to make my op-amp stop oscillating in a microcontroller circuit?', { source: 'forum:forum.arduino.cc', url: 'https://forum.arduino.cc/t/x/2' }),
  ]);
  let calls = 0;
  const fetch = async (url, opts) => {
    calls++;
    const body = JSON.parse(opts.body);
    const prompt = body.messages[1].content;
    if (prompt.startsWith('Clusters')) {
      const items = [...prompt.matchAll(/#(\d+)[^\n]*\n- \([^)]*\) ([^\n]*)/g)].map((m) => ({
        n: Number(m[1]), is_idea: /fleet/.test(m[2]), type: 'startup', idea_en: 'A fleet firmware updater for ESP32 devices', idea_tr: 'ESP32 cihaz filoları için bir yazılım güncelleme aracı',
        who_tr: 'Çok sayıda ESP32 yöneten ekipler', problem_tr: 'Güncellemeler elle yapılıyor', why_open_tr: 'Kimse hazır bir araç önermemiş', first_step_tr: 'İki kişiyle konuş',
      }));
      return jsonRes({ choices: [{ message: { content: JSON.stringify({ items }) } }] });
    }
    return jsonRes({ choices: [{ message: { content: JSON.stringify({ items: [] }) } }] });
  };
  const llm = new LLM({ key: 'k', url: 'https://x', models: ['m'], maxRequests: 10, minGapMs: 0 }, { fetch, sleep: async () => {} });
  await processMarket(s, NOW, { embedFn: fakeEmbed, llm });
  const ideas = Object.values(s.ideas);
  assert.equal(ideas.length, 1, 'the op-amp question is not an idea');
  assert.equal(ideas[0].whoTr, 'Çok sayıda ESP32 yöneten ekipler');
  assert.equal(ideas[0].type, 'startup');
  const before = calls;
  await processMarket(s, '2026-11-27T01:00:00Z', { embedFn: fakeEmbed, llm });
  assert.equal(calls, before, 'cached answers are reused');
});

test('a rate limit stops the model for the run without failing it', async () => {
  const llm = new LLM({ key: 'k', url: 'https://x', models: ['m'], maxRequests: 10, minGapMs: 0 }, { fetch: async () => jsonRes({}, 429), sleep: async () => {} });
  assert.equal(await llm.json('s', 'u'), null);
  assert.equal(llm.available, false);
});
