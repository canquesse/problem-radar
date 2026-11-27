#!/usr/bin/env node
// Usage:
//   node src/cli.js sync       fetch sources, update data/, rebuild cards
//   node src/cli.js reprocess  rebuild cards from stored records (no network)
//   node src/cli.js build      render the static site into dist/
//
// Env:
//   DATA_DIR      where the JSON store lives (default ./data)
//   DIST_DIR      where the site is written (default ./dist)
//   GITHUB_TOKEN  token for api.github.com (Actions provides one)
//   SITE_URL      absolute site URL used in the RSS feed

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildSite } from './site.js';
import { computeMetrics, processCards } from './pipeline.js';
import { processMarket } from './analyze.js';
import { loadState, saveState } from './store.js';
import { runSync } from './sync.js';

const cmd = process.argv[2];
const dataDir = path.resolve(process.env.DATA_DIR || 'data');
const distDir = path.resolve(process.env.DIST_DIR || 'dist');

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return undefined; }
}

const now = process.env.RADAR_NOW || new Date().toISOString();

if (cmd === 'sync') {
  const state = loadState(dataDir);
  const { metrics, lane } = await runSync(state, { now, token: token(), skipHN: process.env.SKIP_HN === '1', lane: process.env.RADAR_LANE || 'full' });
  saveState(dataDir, state, { metrics });
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `lane=${lane}\n`);
} else if (cmd === 'reprocess') {
  const state = loadState(dataDir);
  const r = processCards(state, now);
  const m = await processMarket(state, now, { log: console.log });
  r.created.push(...m.created); r.transitions.push(...m.transitions);
  const metrics = computeMetrics(state, now);
  saveState(dataDir, state, { metrics });
  console.log(`reprocessed: ${metrics.cards} cards, ${r.created.length} created, ${r.transitions.length} transitions`);
} else if (cmd === 'build') {
  buildSite({ dataDir, distDir, siteUrl: process.env.SITE_URL || '', now });
} else {
  console.error('usage: node src/cli.js <sync|reprocess|build>');
  process.exit(2);
}
