// Prints a source health table and raises GitHub Actions warnings for
// sources that keep failing. Never fails the job: stale data is shown in the
// UI as delayed, which is better than no deploy at all.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'data';
const sources = JSON.parse(fs.readFileSync(path.join(dir, 'sources.json'), 'utf8'));
const now = Date.now();
for (const [key, s] of Object.entries(sources).sort()) {
  const age = s.lastSuccessAt ? ((now - Date.parse(s.lastSuccessAt)) / 3600000).toFixed(1) : 'never';
  console.log(`${key.padEnd(44)} last success ${age}h ago${s.consecutiveFailures ? `, failing x${s.consecutiveFailures}: ${s.lastError}` : ''}`);
  if (s.consecutiveFailures >= 3) console.log(`::warning title=Source failing::${key} has failed ${s.consecutiveFailures} runs in a row: ${s.lastError}`);
}
