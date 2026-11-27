// Scenario tests for the evidence engine and pipeline. Each test is one of the
// failure modes the radar must handle correctly before anyone trusts a card.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processCards, computeMetrics } from '../src/pipeline.js';
import { add, comment, hnItem, issue, pr, release, stateWith } from './helpers.js';

const T0 = '2026-11-10T00:00:00Z';
const T1 = '2026-11-11T00:00:00Z';
const T2 = '2026-11-12T00:00:00Z';

const cards = (s) => Object.values(s.cards);
const only = (s) => { const c = cards(s); assert.equal(c.length, 1, `expected 1 card, got ${c.length}`); return c[0]; };

test('two independent reports of the same failure merge into one card', () => {
  const sig = 'Traceback:\nValueError: tokenizer chat template is missing the generation prompt block for model';
  const s = stateWith([
    issue(1, { body: `When serving our model.\n${sig} qwen-7b`, author: 'alice', createdAt: '2026-11-01T00:00:00Z' }),
    issue(2, { body: `${sig} llama-8b\nWorkaround: pinning to 0.6.2 works for now, I ended up downgrading.`, author: 'bob', createdAt: '2026-11-02T00:00:00Z' }),
    issue(3, { title: '[Bug]: totally different thing', body: 'KeyError: missing rope_scaling field in config for this model family entirely', author: 'carol' }),
  ]);
  processCards(s, T0);
  const merged = cards(s).find((c) => c.memberIds.length === 2);
  assert.ok(merged, 'issues 1 and 2 share an error signature and must merge');
  assert.equal(merged.caseCount, 2);
  assert.equal(merged.state, 'worth_trying', '2 first-hand cases + workaround');
  assert.equal(cards(s).length, 2, 'unrelated issue 3 stays on its own card');
});

test('explicit "duplicate of" links merge clusters; same author counts once; bare +1 does not count', () => {
  const s = stateWith([
    issue(10, { author: 'alice' }),
    issue(11, { author: 'bob', body: 'Duplicate of #10. Our deploy fails the same way.' }),
    comment(10, { author: 'alice', body: 'Same issue here again on another machine, vllm 0.6.3 with A100.' }),
    comment(10, { author: 'dave', body: '+1' }),
  ]);
  processCards(s, T0);
  const c = only(s);
  assert.deepEqual(c.memberIds.sort(), ['gh:acme/infer:issue:10', 'gh:acme/infer:issue:11']);
  assert.equal(c.caseCount, 2, 'alice twice = 1, bob = 1, "+1" = 0');
});

test('syndicated duplicates collapse into one case', () => {
  const body = 'We keep hitting a crash: RuntimeError: NCCL watchdog timeout after collective operation on our 8 GPU node with the latest release';
  const s = stateWith([
    hnItem(100, { title: 'Infer crashes', body, linkedUrl: 'https://blog.example.com/post?utm_source=hn', author: 'p1' }),
    hnItem(101, { title: 'Infer crashes (repost)', body: 'Different words entirely but we see it too: RuntimeError: NCCL watchdog timeout after collective operation on h100', linkedUrl: 'https://www.blog.example.com/post/', author: 'p2' }),
    hnItem(102, { title: 'Mirror', body, author: 'p3' }),
  ]);
  processCards(s, T0);
  const c = only(s);
  assert.equal(c.caseCount, 1, 'same canonical URL and same text are one signal');
  assert.equal(c.syndicatedCount, 2);
});

test('repeated processing is idempotent: no new cards, no new events', () => {
  const s = stateWith([issue(20), comment(20, { body: 'Same problem here with torch 2.4.0 on Ubuntu 22.04, the server fails to boot.' })]);
  processCards(s, T0);
  const snapshot = JSON.stringify({ cards: s.cards, events: s.events });
  const r1 = processCards(s, T1);
  const r2 = processCards(s, T2);
  assert.equal(r1.created.length + r1.transitions.length + r2.created.length + r2.transitions.length, 0);
  assert.equal(JSON.stringify({ cards: s.cards, events: s.events }), snapshot);
  // Re-ingesting identical records changes nothing either.
  add(s, [issue(20)], T2);
  assert.equal(processCards(s, T2).transitions.length, 0);
});

test('a wrongly closed issue (closed without a merged fix) is never "resolved"', () => {
  const s = stateWith([issue(30, { state: 'closed', stateReason: 'completed', closedAt: '2026-11-04T00:00:00Z' })]);
  processCards(s, T0);
  const c = only(s);
  assert.equal(c.state, 'early_signal');
  assert.equal(c.flags.closedWithoutFix, true);
  assert.ok(c.evidence.some((e) => e.type === 'closed_without_fix'));
});

test('merged but unreleased fix is "Fix coming"; a release containing it resolves the card exactly once', () => {
  const s = stateWith([issue(40), pr(41, { body: 'Fixes #40', mergedAt: '2026-11-05T00:00:00Z' })]);
  processCards(s, T0);
  assert.equal(only(s).state, 'fix_coming');

  // A release published BEFORE the merge must not count.
  add(s, [release(1, { tag: 'v1.0.0', publishedAt: '2026-11-04T00:00:00Z', body: 'Fixes #41' })], T1);
  processCards(s, T1);
  assert.equal(only(s).state, 'fix_coming');

  // A later release that does not contain the commit must not count.
  add(s, [release(2, { tag: 'v1.0.1', publishedAt: '2026-11-06T00:00:00Z' })], T1);
  s.verifications['acme/infer@sha41'] = { checks: { 'v1.0.1': false }, checkedAt: T1 };
  processCards(s, T1);
  assert.equal(only(s).state, 'fix_coming');

  // A pre-release is not something users can rely on yet.
  add(s, [release(3, { tag: 'v1.1.0-rc1', publishedAt: '2026-11-07T00:00:00Z', prerelease: true, body: '#41' })], T1);
  processCards(s, T1);
  assert.equal(only(s).state, 'fix_coming');

  add(s, [release(4, { tag: 'v1.1.0', publishedAt: '2026-11-08T00:00:00Z' })], T2);
  s.verifications['acme/infer@sha41'].checks['v1.1.0'] = true;
  const r = processCards(s, T2);
  const c = only(s);
  assert.equal(c.state, 'resolved');
  assert.equal(c.fixes[0].release.tag, 'v1.1.0');
  assert.equal(r.transitions.length, 1);
  assert.equal(r.transitions[0].from, 'fix_coming');
  assert.equal(r.transitions[0].triggerUrl, 'https://github.com/acme/infer/releases/tag/v1.1.0', 'the notification links the release that proves it');
  assert.equal(processCards(s, T2).transitions.length, 0, 'no duplicate notification');
});

test('release notes that reference the PR also verify a fix', () => {
  const s = stateWith([
    issue(45), pr(46, { body: 'closes #45', mergedAt: '2026-11-05T00:00:00Z' }),
    release(5, { tag: 'v2.0.0', publishedAt: '2026-11-06T00:00:00Z', body: '- Fix crash on startup (#46)' }),
  ]);
  processCards(s, T0);
  assert.equal(only(s).state, 'resolved');
  assert.equal(only(s).fixes[0].release.method, 'release notes reference the PR');
});

test('a retracted claim withdraws the card when it was the only case', () => {
  const s = stateWith([issue(50, { author: 'alice' })]);
  processCards(s, T0);
  add(s, [comment(50, { author: 'alice', body: 'Sorry, my mistake: it was a config issue on my side.', createdAt: '2026-11-03T00:00:00Z' })], T1);
  const r = processCards(s, T1);
  const c = only(s);
  assert.equal(c.state, 'retracted');
  assert.equal(c.caseCount, 0);
  assert.equal(r.transitions[0].to, 'retracted');
  const m = computeMetrics(s, T1);
  assert.equal(m.qualityRetractions, 1);
  assert.equal(m.genuineResolutions, 0, 'a retraction is not a resolution');
});

test('a retraction only removes the retracting person\'s case; someone else cannot retract it', () => {
  const s = stateWith([
    issue(55, { author: 'alice' }),
    comment(55, { author: 'bob', body: 'Same issue here on Ubuntu 22.04 with torch 2.4.0, the server fails to start.' }),
    comment(55, { author: 'carol', body: 'Not a bug, works for me.' }),
    comment(55, { author: 'bob', body: 'False alarm on my side, my mistake.', createdAt: '2026-11-04T00:00:00Z' }),
  ]);
  processCards(s, T0);
  const c = only(s);
  assert.equal(c.state, 'early_signal');
  assert.equal(c.caseCount, 1, 'bob retracted, alice stands; carol cannot retract alice');
  assert.equal(c.retractedCount, 1);
});

test('a partial fix does not move the card to "Fix coming"; once released the card is narrowed', () => {
  const s = stateWith([issue(60), pr(61, { body: 'Partially fixes #60 (only the fp16 path).', mergedAt: '2026-11-05T00:00:00Z' })]);
  processCards(s, T0);
  let c = only(s);
  assert.equal(c.state, 'early_signal');
  assert.equal(c.fixes.length, 0);
  assert.equal(c.partialFixes.length, 1);
  add(s, [release(6, { tag: 'v3.0.0', publishedAt: '2026-11-06T00:00:00Z', body: 'Partial fix for fp16 (#61)' })], T1);
  processCards(s, T1);
  c = only(s);
  assert.notEqual(c.state, 'resolved');
  assert.equal(c.flags.narrowed, true);
});

test('an issue reopened after its fix merged moves the card to "Watching"', () => {
  const s = stateWith([
    issue(70, { state: 'closed', updatedAt: '2026-11-05T01:00:00Z', closedAt: '2026-11-05T01:00:00Z' }),
    pr(71, { body: 'Fixes #70', mergedAt: '2026-11-05T00:00:00Z' }),
    release(7, { tag: 'v4.0.0', publishedAt: '2026-11-06T00:00:00Z', body: '#71' }),
  ]);
  processCards(s, T0);
  assert.equal(only(s).state, 'resolved');
  add(s, [issue(70, { state: 'open', updatedAt: '2026-11-09T00:00:00Z' })], T1);
  const r = processCards(s, T1);
  assert.equal(only(s).state, 'watching');
  assert.equal(r.transitions[0].from, 'resolved');
  assert.equal(r.transitions[0].to, 'watching');
});

test('conflicting sources ("still happening" after the release) move the card to "Watching"', () => {
  const s = stateWith([
    issue(80), pr(81, { body: 'Fixes #80', mergedAt: '2026-11-05T00:00:00Z' }),
    release(8, { tag: 'v5.0.0', publishedAt: '2026-11-06T00:00:00Z', body: '(#81)' }),
    // Said before the release: not a conflict.
    comment(80, { author: 'zed', body: 'Still happening on main as of today.', createdAt: '2026-11-05T12:00:00Z' }),
  ]);
  processCards(s, T0);
  assert.equal(only(s).state, 'resolved');
  add(s, [comment(80, { author: 'yan', body: 'Still happening on v5.0.0 with CUDA 12.4, same crash.', createdAt: '2026-11-07T00:00:00Z' })], T1);
  processCards(s, T1);
  const c = only(s);
  assert.equal(c.state, 'watching');
  assert.ok(c.evidence.some((e) => e.type === 'conflict'));
});

test('card ids stay stable when a new report joins an existing card', () => {
  const s = stateWith([issue(90, { author: 'a', createdAt: '2026-11-05T00:00:00Z' })]);
  processCards(s, T0);
  const id = only(s).id;
  // An OLDER issue gets linked as a duplicate: anchor changes, id must not.
  add(s, [issue(89, { author: 'b', createdAt: '2026-10-01T00:00:00Z', body: 'Duplicate of #90' })], T1);
  processCards(s, T1);
  assert.equal(only(s).id, id);
});

test('notifications fire only on state transitions and explain themselves', () => {
  const s = stateWith([issue(95, { author: 'a', body: 'We are trying to serve two adapters. The server fails on load.' })]);
  const first = processCards(s, T0);
  assert.equal(first.created.length, 1);
  assert.equal(first.transitions.length, 0, 'a new card is not a notification');
  // New evidence that does not change the state: no notification.
  add(s, [comment(95, { author: 'b', body: 'I can reproduce this on Ubuntu with torch 2.4.0 and two adapters loaded.' })], T1);
  assert.equal(processCards(s, T1).transitions.length, 0);
  // A workaround pushes it to "Worth trying": exactly one notification.
  add(s, [comment(95, { author: 'b', body: 'Workaround: setting max_loras to 1 avoids the crash for now.', createdAt: '2026-11-03T00:00:00Z' })], T2);
  const r = processCards(s, T2);
  assert.equal(r.transitions.length, 1);
  assert.equal(r.transitions[0].to, 'worth_trying');
  assert.match(r.transitions[0].triggerUrl, /^https:\/\/github\.com\//);
  assert.ok(r.transitions[0].reason.length > 10);
});

test('maintainer comments do not count as first-hand cases', () => {
  const s = stateWith([issue(96), comment(96, { author: 'core', authorAssociation: 'MEMBER', body: 'I can reproduce this on main with torch 2.4.0 on H100.' })]);
  processCards(s, T0);
  assert.equal(only(s).caseCount, 1);
});

test('verified teams are counted only from reports that tie to their own public project', () => {
  const s = stateWith([
    issue(97, { author: 'alice', body: 'The server fails in our project https://github.com/alice-labs/agent-app when loading.' }),
    comment(97, { author: 'bob', body: 'Same issue here, see https://github.com/bob/tiny-bot which hits it on Ubuntu 22.04.' }),
    comment(97, { author: 'carol', body: 'Same problem for me on macOS, the server fails to start after upgrading.' }),
  ]);
  processCards(s, T0);
  const c = only(s);
  assert.equal(c.caseCount, 3);
  assert.equal(c.teamCount, 2, '"3 first-hand cases, 2 verified teams"');
});

test('feature requests and questions do not become problem cards', () => {
  const s = stateWith([
    issue(98, { title: '[Feature]: support streaming tool calls', body: 'It would be nice to support this.' }),
    issue(99, { title: 'How do I set the port?', body: 'Question about config.', labels: ['question'] }),
  ]);
  processCards(s, T0);
  assert.equal(cards(s).length, 0);
});
