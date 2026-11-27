// Static site builder: copies the web app, publishes the data it reads, and
// renders the weekly RSS digest. Output is plain files for GitHub Pages.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLISHED_STATES, REPOS, STATE_LABELS } from './config.js';
import { loadState } from './store.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** ISO-8601 week key, e.g. "2026-W48". */
export function isoWeek(iso) {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday 00:00 UTC .. next Monday for a week key. */
export function weekRange(key) {
  const [y, w] = key.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday.toISOString(), end: end.toISOString() };
}

/**
 * Weekly digest, derived only from the changelog and current cards, so it can
 * be regenerated from sources at any time.
 */
export function buildDigests(state, now, weeks = 8) {
  const moves = state.events.filter((e) => e.type === 'transition' || PUBLISHED_STATES.includes(e.to) || e.to === 'watching');
  const byWeek = new Map();
  for (const e of moves) {
    const k = isoWeek(e.at);
    if (!byWeek.has(k)) byWeek.set(k, []);
    byWeek.get(k).push(e);
  }
  const current = isoWeek(now);
  const keys = [...byWeek.keys()].sort().reverse().slice(0, weeks);
  return keys.map((key) => {
    const events = byWeek.get(key).filter((e) => state.cards[e.cardId]);
    // Keep the latest move per card in the week.
    const last = new Map();
    for (const e of events.sort((a, b) => a.at.localeCompare(b.at))) last.set(e.cardId, e);
    const items = [...last.values()].map((e) => {
      const c = state.cards[e.cardId];
      return { cardId: c.id, title: c.title, repo: c.repo, state: c.state, to: e.to, from: e.from, reason: e.reason, triggerUrl: e.triggerUrl, caseCount: c.caseCount, teamCount: c.teamCount, nextStep: c.nextStep };
    });
    const section = (s) => items.filter((i) => i.to === s && i.state === s).sort((a, b) => b.caseCount - a.caseCount);
    const top = Object.values(state.cards)
      .filter((c) => c.state === 'worth_trying')
      .sort((a, b) => b.caseCount - a.caseCount || b.teamCount - a.teamCount || b.lastEvidenceAt.localeCompare(a.lastEvidenceAt))
      .slice(0, 5)
      .map((c) => ({ cardId: c.id, title: c.title, repo: c.repo, caseCount: c.caseCount, teamCount: c.teamCount, nextStep: c.nextStep, url: c.url }));
    return {
      week: key,
      ...weekRange(key),
      inProgress: key === current,
      counts: { moves: items.length },
      topOpportunities: key === current ? top : [],
      sections: {
        worth_trying: section('worth_trying'),
        fix_coming: section('fix_coming'),
        resolved: section('resolved'),
        watching: section('watching'),
        retracted: section('retracted'),
      },
    };
  });
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderDigestHtml(d, siteUrl) {
  const link = (i) => `${siteUrl}#card/${i.cardId}`;
  const list = (title, arr) => arr.length
    ? `<h3>${esc(title)} (${arr.length})</h3><ul>${arr.slice(0, 15).map((i) => `<li><a href="${esc(link(i))}">${esc(i.title)}</a> <small>${esc(i.repo)} · ${i.caseCount} first-hand case${i.caseCount === 1 ? '' : 's'}, ${i.teamCount} verified team${i.teamCount === 1 ? '' : 's'}</small><br/>${esc(i.reason)} <a href="${esc(i.triggerUrl)}">source</a></li>`).join('')}${arr.length > 15 ? `<li>…and ${arr.length - 15} more on the site.</li>` : ''}</ul>`
    : '';
  const top = d.topOpportunities.length
    ? `<h3>Top opportunities right now</h3><ol>${d.topOpportunities.map((t) => `<li><a href="${esc(`${siteUrl}#card/${t.cardId}`)}">${esc(t.title)}</a> <small>${esc(t.repo)} · ${t.caseCount} cases, ${t.teamCount} teams</small><br/><em>${esc(t.nextStep.size)}:</em> ${esc(t.nextStep.text)}</li>`).join('')}</ol>`
    : '';
  return `${top}${list('Resolved (release verified)', d.sections.resolved)}${list('Fix coming (merged, not released)', d.sections.fix_coming)}${list('Worth trying', d.sections.worth_trying)}${list('Watching (sources disagree)', d.sections.watching)}${list('Withdrawn', d.sections.retracted)}`;
}

export function renderRss(digests, siteUrl, now) {
  const items = digests.map((d) => {
    const title = `Problem Radar ${d.week}${d.inProgress ? ' (so far)' : ''}: ${d.counts.moves} card${d.counts.moves === 1 ? '' : 's'} moved`;
    const guid = d.inProgress ? `${d.week}-partial-${d.counts.moves}` : d.week;
    return `  <item>
    <title>${esc(title)}</title>
    <link>${esc(`${siteUrl}#digest/${d.week}`)}</link>
    <guid isPermaLink="false">problem-radar-${esc(guid)}</guid>
    <pubDate>${new Date(d.inProgress ? now : d.end).toUTCString()}</pubDate>
    <description>${esc(renderDigestHtml(d, siteUrl))}</description>
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Problem Radar: weekly digest</title>
  <link>${esc(siteUrl)}</link>
  <atom:link href="${esc(`${siteUrl}feed.xml`)}" rel="self" type="application/rss+xml"/>
  <description>Where developers get stuck in AI infrastructure and dev tools, and which fixes actually shipped. Every item links to its source.</description>
  <lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

export function buildSite({ dataDir, distDir, siteUrl = '', now = new Date().toISOString() }) {
  const state = loadState(dataDir);
  const metricsFile = path.join(dataDir, 'metrics.json');
  const metrics = fs.existsSync(metricsFile) ? JSON.parse(fs.readFileSync(metricsFile, 'utf8')) : {};
  const base = siteUrl && !siteUrl.endsWith('/') ? `${siteUrl}/` : siteUrl;

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(distDir, 'data'), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'web'))) fs.copyFileSync(path.join(ROOT, 'web', f), path.join(distDir, f));

  const digests = buildDigests(state, now);
  const write = (name, value) => fs.writeFileSync(path.join(distDir, 'data', name), JSON.stringify(value));
  write('cards.json', Object.values(state.cards));
  write('events.json', state.events.slice(-3000));
  write('sources.json', state.sources);
  write('metrics.json', metrics);
  write('digests.json', digests);
  write('meta.json', { builtAt: now, repos: REPOS, stateLabels: STATE_LABELS, siteUrl: base });
  fs.writeFileSync(path.join(distDir, 'feed.xml'), renderRss(digests, base, now));
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
  console.log(`site: ${Object.keys(state.cards).length} cards, ${digests.length} digest weeks -> ${distDir}`);
}
