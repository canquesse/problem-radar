// Problem Radar front end. Plain ES modules, no build step.
// Everything that comes from GitHub or Hacker News is escaped before rendering.

import {
  evidenceName, flagText, getLang, groupName, nextStepText, reasonText, setLang, sizeName, stateName, stateRule, t,
} from './i18n.js';

const LADDER = ['early_signal', 'worth_trying', 'fix_coming', 'resolved'];
const ALL_STATES = ['early_signal', 'worth_trying', 'watching', 'fix_coming', 'resolved', 'retracted'];
const OUTCOMES = ['talked', 'contributed', 'prototyped', 'not_useful'];
const PAGE = 24;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https:\/\//.test(u || '') ? esc(u) : '#');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const ext = 'target="_blank" rel="noopener"';

// --- Persistent local state ----------------------------------------------------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`radar.${k}`)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`radar.${k}`, JSON.stringify(v)); } catch { /* private mode */ } },
};
let follows = store.get('follows', {});
let outcomes = store.get('outcomes', {});
setLang(store.get('lang', (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'));

// --- Data ------------------------------------------------------------------------
const data = { cards: [], byId: new Map(), events: [], byCard: new Map(), sources: {}, metrics: {}, digests: [], meta: {} };

async function load() {
  const get = (n) => fetch(`data/${n}.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null));
  const [cards, events, sources, metrics, digests, meta] = await Promise.all(['cards', 'events', 'sources', 'metrics', 'digests', 'meta'].map(get));
  data.cards = cards || [];
  data.byId = new Map(data.cards.map((c) => [c.id, c]));
  data.events = events || [];
  for (const e of data.events) {
    if (!data.byCard.has(e.cardId)) data.byCard.set(e.cardId, []);
    data.byCard.get(e.cardId).push(e);
  }
  data.sources = sources || {};
  data.metrics = metrics || {};
  data.digests = digests || [];
  data.meta = meta || {};
}

// --- Formatting --------------------------------------------------------------------
const locale = () => (getLang() === 'tr' ? 'tr-TR' : 'en-US');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const fmtDay = (iso) => new Date(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
function ago(iso) {
  if (!iso) return t('ago.never');
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), 'second');
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}
const num = (n) => Number(n || 0).toLocaleString(locale());
const pill = (s) => `<span class="pill c-${esc(s)}"><span class="t">${esc(stateName(s))}</span></span>`;
const counts = (c) => `<span><b>${num(c.caseCount)}</b> ${esc(t('card.cases', { n: c.caseCount }).replace(/^\S+\s/, ''))}</span><span><b>${num(c.teamCount)}</b> ${esc(t('card.teams', { n: c.teamCount }).replace(/^\S+\s/, ''))}</span>`;
const repoName = (r) => r.split('/')[1] || r;

function track(state, large = false) {
  const idx = state === 'watching' ? 2 : state === 'retracted' ? -1 : LADDER.indexOf(state);
  const cls = `track ${large ? 'track-lg' : ''} ${state === 'watching' ? 'watching' : ''} ${state === 'retracted' ? 'retracted' : ''} c-${state}`;
  return `<div class="${cls}" aria-hidden="true">${LADDER.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>`;
}
const unseen = (c) => {
  const f = follows[c.id];
  return f ? (data.byCard.get(c.id) || []).filter((e) => e.type === 'transition' && e.at > f.seenAt) : [];
};

// --- Components ------------------------------------------------------------------
function tile(c, i = 0) {
  const on = !!follows[c.id];
  const n = unseen(c).length;
  return `<article class="tile" data-card="${esc(c.id)}" style="animation-delay:${Math.min(i, 6) * 25}ms">
    ${n ? `<span class="newflag">${esc(t('card.new', { n }))}</span>` : ''}
    <div class="tile-top"><span class="repo">${esc(c.repo)}</span>${pill(c.state)}</div>
    <h3><a href="#card/${esc(c.id)}">${esc(c.title)}</a></h3>
    ${track(c.state)}
    ${c.blocker ? `<p class="quote">${esc(c.blocker.value)}</p>` : ''}
    <div class="tile-foot">
      <span class="counts">${counts(c)}</span>
      <button class="follow" data-follow="${esc(c.id)}" aria-pressed="${on}">${on ? '★' : '☆'} ${esc(on ? t('card.following') : t('card.follow'))}</button>
    </div>
  </article>`;
}

function statusStrip() {
  const now = Date.now();
  let late = 0, down = 0, newest = null;
  const entries = Object.values(data.sources);
  for (const s of entries) {
    const hours = s.lastSuccessAt ? (now - Date.parse(s.lastSuccessAt)) / 3600000 : Infinity;
    if (s.consecutiveFailures > 0) down++;
    else if (hours > 3) late++;
    if (s.lastSuccessAt && (!newest || s.lastSuccessAt > newest)) newest = s.lastSuccessAt;
  }
  $('#status').innerHTML = `
    <span><i class="live ${down ? 'down' : late ? 'late' : ''}"></i>${esc(t('status.synced', { ago: ago(newest) }))}</span>
    <span>${esc(t('status.sources', { n: entries.length }))}${down ? ` · <a href="#sources">${esc(t('status.failing', { n: down }))}</a>` : ''}${late ? ` · <a href="#sources">${esc(t('status.delayed', { n: late }))}</a>` : ''}</span>
    <span>${num(data.cards.length)} ${esc(t('m.cards'))}</span>`;
}

function chrome() {
  document.documentElement.lang = getLang();
  $('#brand-tag').textContent = t('brand.tag');
  $('#foot-left').textContent = t('foot.left');
  $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === getLang()));
  const badge = Object.keys(follows).map((id) => data.byId.get(id)).filter(Boolean).reduce((s, c) => s + unseen(c).length, 0);
  const items = [['overview', 'nav.overview'], ['cards', 'nav.cards'], ['following', 'nav.following'], ['changes', 'nav.changes'], ['digest', 'nav.digest'], ['sources', 'nav.sources'], ['about', 'nav.about']];
  $('#nav').innerHTML = items.map(([k, key]) => `<a href="#${k}" data-tab="${k}">${esc(t(key))}${k === 'following' && badge ? `<span class="badge">${badge}</span>` : ''}</a>`).join('');
  statusStrip();
}

// --- Radar scope (hero visual) ----------------------------------------------------
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

function scope() {
  const repos = (data.meta.repos || []).map((r) => r.repo);
  const R = 210;
  const bands = { resolved: [8, 52], fix_coming: [62, 98], watching: [104, 124], worth_trying: [130, 160], early_signal: [168, 202] };
  const early = data.cards.filter((c) => c.state === 'early_signal').sort((a, b) => (b.lastEvidenceAt || '').localeCompare(a.lastEvidenceAt || '')).slice(0, 140);
  const shown = [...data.cards.filter((c) => bands[c.state] && c.state !== 'early_signal'), ...early];
  const dots = shown.map((c) => {
    const ri = Math.max(0, repos.indexOf(c.repo));
    const ang = ((ri + 0.1 + hash(c.id) * 0.8) / Math.max(repos.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const [r0, r1] = bands[c.state];
    const r = r0 + hash(`${c.id}r`) * (r1 - r0);
    const size = c.state === 'early_signal' ? 2.2 : 3.6 + Math.min(c.caseCount, 4) * 0.5;
    return `<circle class="dot c-${c.state}" data-card="${esc(c.id)}" cx="${(Math.cos(ang) * r).toFixed(1)}" cy="${(Math.sin(ang) * r).toFixed(1)}" r="${size.toFixed(1)}" fill="currentColor" fill-opacity="${c.state === 'early_signal' ? 0.45 : 0.9}"/>`;
  }).join('');
  const spokes = repos.map((_, i) => {
    const a = (i / repos.length) * Math.PI * 2 - Math.PI / 2;
    return `<line class="spoke" x1="0" y1="0" x2="${(Math.cos(a) * R).toFixed(1)}" y2="${(Math.sin(a) * R).toFixed(1)}"/>`;
  }).join('');
  const labels = repos.map((r, i) => {
    const a = ((i + 0.5) / repos.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * (R + 16), y = Math.sin(a) * (R + 16);
    return `<text class="sector-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${Math.abs(x) < 20 ? 'middle' : x > 0 ? 'start' : 'end'}" dominant-baseline="middle">${esc(repoName(r))}</text>`;
  }).join('');
  const rings = [52, 98, 124, 160].map((r) => `<circle class="rung" r="${r}"/>`).join('');
  return `<div class="scope" id="scope">
    <svg viewBox="-290 -250 580 500" role="img" aria-label="${esc(t('ladder.title'))}">
      <defs><linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--signal)" stop-opacity="0"/><stop offset="1" stop-color="var(--signal)" stop-opacity=".22"/></linearGradient></defs>
      <circle class="disc" r="${R}"/>
      ${spokes}${rings}
      <g class="sweep"><path d="M0 0 L${R} 0 A${R} ${R} 0 0 0 ${(Math.cos(-0.5) * R).toFixed(1)} ${(Math.sin(-0.5) * R).toFixed(1)} Z"/></g>
      ${dots}
      ${labels}
      <circle r="3" fill="var(--ink)"/>
    </svg>
    <div class="scope-tip" id="scope-tip"></div>
  </div>`;
}

// --- Views -----------------------------------------------------------------------
function viewOverview() {
  const by = (s) => data.cards.filter((c) => c.state === s);
  const recent = (arr) => arr.sort((a, b) => (b.stateSince || '').localeCompare(a.stateSince || '') || b.caseCount - a.caseCount);
  const worth = by('worth_trying').sort((a, b) => b.caseCount - a.caseCount || (b.stateSince || '').localeCompare(a.stateSince || ''));
  const coming = recent(by('fix_coming'));
  const resolved = recent(by('resolved'));
  const watching = recent(by('watching'));
  const section = (key, list, state) => `<section class="section">
      <div class="section-head"><div><h2>${esc(t(key))}</h2><p>${esc(t(`${key}.sub`))}</p></div>${list.length > 6 ? `<a href="#cards?state=${state}">${esc(t('sec.seeall'))} (${num(list.length)}) →</a>` : ''}</div>
      ${list.length ? `<div class="grid">${list.slice(0, 6).map(tile).join('')}</div>` : `<p class="empty">${esc(t('sec.empty'))}</p>`}
    </section>`;
  const rung = (s) => `<a class="rung-tile c-${s}" href="#cards?state=${s}"><span class="num">${num(by(s).length)}</span><span class="name">${esc(stateName(s))}</span><span class="rule">${esc(stateRule(s))}</span></a>`;
  return `<section class="hero">
      <div>
        <p class="kicker">${esc(t('hero.kicker', { repos: (data.meta.repos || []).length }))}</p>
        <h1>${t('hero.title')}</h1>
        <p class="lede">${esc(t('hero.lede'))}</p>
        <div class="ctas"><a class="btn primary" href="#cards">${esc(t('hero.cta'))} →</a><a class="btn ghost" href="#about">${esc(t('hero.cta2'))}</a></div>
      </div>
      ${scope()}
    </section>
    <nav class="ladder" aria-label="${esc(t('ladder.title'))}">
      ${LADDER.map(rung).join('')}
      <div class="rung-tile side"><div class="pair">
        <a href="#cards?state=watching" class="c-watching" style="text-decoration:none"><span class="num">${num(by('watching').length)}</span><div class="name">${esc(stateName('watching'))}</div></a>
        <a href="#cards?state=retracted" class="c-retracted" style="text-decoration:none"><span class="num">${num(by('retracted').length)}</span><div class="name">${esc(stateName('retracted'))}</div></a>
      </div><span class="rule">${esc(stateRule('watching'))}</span></div>
    </nav>
    ${section('sec.opportunities', worth, 'worth_trying')}
    ${section('sec.coming', coming, 'fix_coming')}
    ${section('sec.resolved', resolved, 'resolved')}
    ${watching.length ? section('sec.watching', watching, 'watching') : ''}`;
}

// Problems browser
let filt = { q: '', state: '', repo: '', sort: 'recent', limit: PAGE };

function filteredCards() {
  const q = filt.q.trim().toLowerCase();
  let list = data.cards.filter((c) => (!filt.state || c.state === filt.state) && (!filt.repo || c.repo === filt.repo) &&
    (!q || `${c.title} ${c.blocker?.value || ''} ${c.workaround?.value || ''} ${c.repo}`.toLowerCase().includes(q)));
  const sorters = {
    recent: (a, b) => (b.stateSince || '').localeCompare(a.stateSince || '') || ALL_STATES.indexOf(b.state) - ALL_STATES.indexOf(a.state) || b.caseCount - a.caseCount,
    cases: (a, b) => b.caseCount - a.caseCount || b.teamCount - a.teamCount || (b.lastEvidenceAt || '').localeCompare(a.lastEvidenceAt || ''),
    new: (a, b) => (b.firstReportedAt || '').localeCompare(a.firstReportedAt || ''),
  };
  list.sort(sorters[filt.sort] || sorters.recent);
  // Default view puts moving cards first: early signals are the long tail.
  if (!filt.state && filt.sort === 'recent') list = [...list.filter((c) => c.state !== 'early_signal'), ...list.filter((c) => c.state === 'early_signal')];
  return list;
}

function viewCards() {
  const base = data.cards.filter((c) => (!filt.repo || c.repo === filt.repo));
  const stateCount = (s) => base.filter((c) => c.state === s).length;
  const repoCount = (r) => data.cards.filter((c) => c.repo === r && (!filt.state || c.state === filt.state)).length;
  const groups = {};
  for (const r of data.meta.repos || []) (groups[r.group] ||= []).push(r.repo);
  const list = filteredCards();
  return `<div class="page-head"><h1>${esc(t('nav.cards'))}</h1></div>
    <div class="browse">
      <aside class="side">
        <input class="search" type="search" id="q" placeholder="${esc(t('filters.search'))}" value="${esc(filt.q)}" aria-label="${esc(t('filters.search'))}" />
        <div class="mfilters">
          <select id="mstate" aria-label="${esc(t('filters.state'))}"><option value="">${esc(t('filters.allStates'))} (${num(base.length)})</option>${ALL_STATES.map((s) => `<option value="${s}" ${filt.state === s ? 'selected' : ''}>${esc(stateName(s))} (${num(stateCount(s))})</option>`).join('')}</select>
          <select id="mrepo" aria-label="${esc(t('filters.repo'))}"><option value="">${esc(t('filters.all'))}</option>${(data.meta.repos || []).map((r) => `<option value="${esc(r.repo)}" ${filt.repo === r.repo ? 'selected' : ''}>${esc(repoName(r.repo))}</option>`).join('')}</select>
        </div>
        <div class="desk"><h4>${esc(t('filters.state'))}</h4>
          <button class="opt" data-fstate="" aria-pressed="${!filt.state}"><span>${esc(t('filters.allStates'))}</span><span class="n">${num(base.length)}</span></button>
          ${ALL_STATES.map((s) => `<button class="opt" data-fstate="${s}" aria-pressed="${filt.state === s}"><span class="dotc c-${s}"><span style="color:var(--ink)">${esc(stateName(s))}</span></span><span class="n">${num(stateCount(s))}</span></button>`).join('')}
        </div>
        <div><h4>${esc(t('filters.sort'))}</h4>
          <select id="sort">${['recent', 'cases', 'new'].map((k) => `<option value="${k}" ${filt.sort === k ? 'selected' : ''}>${esc(t(`sort.${k}`))}</option>`).join('')}</select>
        </div>
        <div class="repo-list desk"><h4>${esc(t('filters.repo'))}</h4>
          <button class="opt" data-frepo="" aria-pressed="${!filt.repo}"><span>${esc(t('filters.all'))}</span></button>
          ${Object.entries(groups).map(([g, rs]) => `<div class="repo-group">${esc(groupName(g))}</div>${rs.map((r) => `<button class="opt" data-frepo="${esc(r)}" aria-pressed="${filt.repo === r}"><span>${esc(repoName(r))}</span><span class="n">${num(repoCount(r))}</span></button>`).join('')}`).join('')}
        </div>
        ${filt.q || filt.state || filt.repo ? `<button class="linkbtn" id="clear">${esc(t('filters.clear'))}</button>` : ''}
      </aside>
      <section>
        <div class="results-bar"><span>${esc(t('list.count', { n: num(list.length) }))}</span></div>
        ${list.length ? `<div class="grid">${list.slice(0, filt.limit).map(tile).join('')}</div>` : `<p class="empty">${esc(t('list.empty'))}</p>`}
        ${list.length > filt.limit ? `<button class="btn ghost more" id="more">${esc(t('list.more'))} (${num(list.length - filt.limit)})</button>` : ''}
      </section>
    </div>`;
}

function envText(env) {
  const parts = [...Object.entries(env?.versions || {}).map(([k, v]) => `${k} ${v.join(', ')}`), ...(env?.os || []), ...(env?.hardware || [])];
  return parts.length ? parts.join(' · ') : null;
}
const fact = (label, f) => `<dt>${esc(label)}</dt><dd>${f ? `${esc(f.value)}<a class="src" href="${safeUrl(f.url)}" ${ext}>${esc(t('detail.source'))} ↗</a>` : `<span class="none">${esc(t('detail.notStated'))}</span>`}</dd>`;

function viewDetail(id) {
  const c = data.byId.get(id);
  if (!c) return `<div class="detail"><a class="back" href="#cards">${esc(t('detail.back'))}</a><p class="empty">${esc(t('detail.missing'))}</p></div>`;
  if (follows[c.id]) { follows[c.id].seenAt = new Date().toISOString(); store.set('follows', follows); }
  const on = !!follows[c.id];
  const events = (data.byCard.get(c.id) || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const env = envText(c.environment);
  const flags = [
    c.flags.closedWithoutFix && flagText('closedWithoutFix'), c.flags.partialFixMerged && flagText('partialFixMerged'),
    c.flags.narrowed && flagText('narrowed'), c.flags.hnOnly && flagText('hnOnly'),
    c.syndicatedCount && flagText('syndicated', { n: c.syndicatedCount }), c.retractedCount && flagText('retracted', { n: c.retractedCount }),
  ].filter(Boolean);
  const idx = c.state === 'watching' ? 2 : LADDER.indexOf(c.state);
  const mine = outcomes[c.id] || [];
  const fixRow = (f) => `<div class="fixrow"><a href="${safeUrl(f.url)}" ${ext}>${esc(f.pr)}</a> · ${esc(t('detail.mergedOn', { date: fmtDate(f.mergedAt) }))}<br/>
    ${f.release ? `<span class="ok">✓ ${esc(t('detail.shipped'))} </span><a href="${safeUrl(f.release.url)}" ${ext}>${esc(f.release.tag)}</a> <span class="muted">(${esc(fmtDate(f.release.publishedAt))})</span>` : `<span class="wait">… ${esc(t('detail.notReleased'))}</span>`}
    <div class="muted" style="font-size:13px">${esc(f.title)}</div></div>`;
  const stateLine = c.previousState
    ? t('detail.was', { state: stateName(c.state), date: fmtDate(c.stateSince), prev: stateName(c.previousState) })
    : t('detail.sinceOnly', { state: stateName(c.state), date: fmtDate(c.stateSince) });

  return `<div class="detail">
    <a class="back" href="#${esc(lastList)}">${esc(t('detail.back'))}</a>
    <header class="detail-head">
      ${pill(c.state)}
      <h1>${esc(c.title)}</h1>
      <div class="detail-meta"><span class="mono">${esc(c.repo)}</span><span class="counts">${counts(c)}</span><span>${esc(t('detail.reported', { date: fmtDate(c.firstReportedAt) }))}</span><a href="${safeUrl(c.url)}" ${ext}>${esc(t('detail.openIssue'))} ↗</a>
        <button class="follow" data-follow="${esc(c.id)}" aria-pressed="${on}">${on ? '★' : '☆'} ${esc(on ? t('card.following') : t('card.follow'))}</button></div>
      ${flags.length ? `<div class="flags">${flags.map((f) => `<span class="flag">${esc(f)}</span>`).join('')}</div>` : ''}
      ${track(c.state, true)}
      <div class="track-labels">${LADDER.map((s, i) => `<span class="${i <= idx ? 'on' : ''}">${esc(stateName(s))}</span>`).join('')}</div>
    </header>

    <div class="detail-grid">
      <div>
        <div class="panel why"><h2>${esc(t('detail.why'))}</h2>
          <p>${esc(reasonText(c.trigger))} <a href="${safeUrl(c.trigger.url)}" ${ext}>${esc(t('detail.openSource'))} ↗</a></p>
          <div class="sub">${esc(stateLine)}</div>
        </div>
        <div class="panel"><dl class="facts" style="margin-top:-12px">
          ${fact(t('detail.job'), c.job)}${fact(t('detail.blocker'), c.blocker)}${fact(t('detail.workaround'), c.workaround)}
          <dt>${esc(t('detail.env'))}</dt><dd>${env ? `<span class="mono" style="font-size:13.5px">${esc(env)}</span>` : `<span class="none">${esc(t('detail.notStated'))}</span>`}</dd>
        </dl></div>
      </div>
      <div>
        ${c.nextStep ? `<div class="panel next"><h2>${esc(t('detail.next'))}</h2>${c.nextStep.size ? `<span class="size">${esc(sizeName(c.nextStep.size))}</span>` : ''}<p>${esc(nextStepText(c.nextStep, c))}</p></div>` : ''}
        <div class="panel"><h2>${esc(t('detail.fix'))}</h2>${c.fixes.length ? c.fixes.map(fixRow).join('') : `<p class="muted" style="margin:0">${esc(t('detail.noFix'))}</p>`}
          ${c.partialFixes?.length ? `<h2 style="margin-top:16px">${esc(t('detail.partial'))} (${c.partialFixes.length})</h2>${c.partialFixes.slice(0, 5).map(fixRow).join('')}` : ''}
        </div>
        <div class="panel"><h2>${esc(t('detail.outcome'))}</h2>
          <div class="outcomes">${OUTCOMES.map((k) => `<button class="chip" data-outcome="${k}" data-card-id="${esc(c.id)}" aria-pressed="${mine.includes(k)}">${esc(t(`outcome.${k}`))}</button>`).join('')}</div>
          <p class="note">${esc(t('detail.outcomeNote'))}</p>
        </div>
      </div>
    </div>

    <h2 class="h-sec">${esc(t('detail.evidence'))} <span class="muted">(${c.evidence.length})</span></h2>
    <ul class="timeline">${c.evidence.map((e) => `<li class="k-${esc(e.type)}">
      <span class="when">${esc(fmtDate(e.at))}</span><span class="kind">${esc(evidenceName(e.type))}</span>${e.author ? ` <span class="muted">· ${esc(e.author)}</span>` : ''}
      ${e.excerpt ? `<blockquote>${esc(e.excerpt)}</blockquote>` : ''}
      <div class="sub"><a href="${safeUrl(e.url)}" ${ext}>${e.source === 'hn' ? 'Hacker News' : 'GitHub'} ↗</a>${e.appliesTo ? `<span>${esc(t('detail.appliesTo', { v: e.appliesTo }))}</span>` : ''}${e.sourceState ? `<span>${esc(t('detail.sourceNow', { s: e.sourceState }))}</span>` : ''}${e.lastCheckedAt ? `<span>${esc(t('detail.checked', { ago: ago(e.lastCheckedAt) }))}</span>` : ''}</div>
    </li>`).join('')}</ul>

    <h2 class="h-sec">${esc(t('detail.history'))}</h2>
    <ul class="timeline">${events.map((e) => `<li class="h-${esc(e.to)}"><span class="when">${esc(fmtDate(e.at))}</span>
      <div class="body">${e.from ? `${pill(e.from)} → ` : `${esc(t('detail.created'))} `}${pill(e.to)}</div>
      <div class="body">${esc(reasonText(e))} <a href="${safeUrl(e.triggerUrl)}" ${ext}>${esc(t('detail.openSource'))} ↗</a></div></li>`).join('')}</ul>
  </div>`;
}

function changeItem(e) {
  return `<div class="change">
    <div class="arrow">${e.from ? pill(e.from) : ''}${e.from ? '→' : ''}${pill(e.to)}</div>
    <div><h3><a href="#card/${esc(e.cardId)}">${esc(e.cardTitle)}</a></h3>
      <p><span class="mono muted" style="font-size:12px">${esc(e.repo)}</span> · ${esc(reasonText(e))} <a href="${safeUrl(e.triggerUrl)}" ${ext}>${esc(t('detail.openSource'))} ↗</a></p></div>
  </div>`;
}

function byDay(events) {
  const out = [];
  let day = null;
  for (const e of events) {
    const d = e.at.slice(0, 10);
    if (d !== day) { out.push(`<h3 class="day">${esc(fmtDay(e.at))}</h3>`); day = d; }
    out.push(changeItem(e));
  }
  return out.join('');
}

function viewFollowing() {
  const list = Object.keys(follows).map((id) => data.byId.get(id)).filter(Boolean).sort((a, b) => unseen(b).length - unseen(a).length);
  const changes = list.flatMap((c) => unseen(c)).sort((a, b) => b.at.localeCompare(a.at));
  return `<div class="page-head"><h1>${esc(t('following.title'))}</h1><p>${esc(t('following.sub'))}</p></div>
    ${changes.length ? `<section class="section"><div class="section-head"><h2>${esc(t('following.changes'))}</h2><button class="btn ghost" id="mark-seen">${esc(t('following.markSeen'))}</button></div>${byDay(changes)}</section>` : ''}
    <section class="section"><div class="section-head"><h2>${esc(t('following.cards'))}</h2></div>
    ${list.length ? `<div class="grid">${list.map(tile).join('')}</div>` : `<p class="empty">${esc(t('following.empty'))}</p>`}</section>`;
}

function viewChanges() {
  const tr = data.events.filter((e) => e.type === 'transition').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  return `<div class="page-head"><h1>${esc(t('changes.title'))}</h1><p>${esc(t('changes.sub'))}</p></div>
    ${tr.length ? byDay(tr) : `<p class="empty">${esc(t('changes.empty'))}</p>`}`;
}

function viewDigest(week) {
  const d = data.digests.find((x) => x.week === week) || data.digests[0];
  const head = `<div class="page-head"><h1>${esc(t('digest.title'))}</h1><p>${esc(t('digest.sub'))} <a href="feed.xml">${esc(t('digest.rss'))}</a></p></div>`;
  if (!d) return `${head}<p class="empty">${esc(t('digest.empty'))}</p>`;
  const sec = (s, key) => (d.sections[s]?.length ? `<section class="section"><div class="section-head"><h2>${esc(stateName(s))} <span class="muted">(${d.sections[s].length})</span></h2></div><div class="grid">${d.sections[s].map((i) => data.byId.get(i.cardId)).filter(Boolean).slice(0, 12).map(tile).join('')}</div></section>` : '');
  const top = (d.topOpportunities || []).map((x) => data.byId.get(x.cardId)).filter(Boolean);
  return `${head}
    <div class="weeks">${data.digests.map((x) => `<a class="chip" aria-pressed="${x.week === d.week}" href="#digest/${esc(x.week)}">${esc(x.week)}${x.inProgress ? ` · ${esc(t('digest.sofar'))}` : ''}</a>`).join('')}</div>
    ${top.length ? `<section class="section"><div class="section-head"><h2>${esc(t('digest.top'))}</h2></div><div class="grid">${top.map(tile).join('')}</div></section>` : ''}
    ${sec('resolved')}${sec('fix_coming')}${sec('worth_trying')}${sec('watching')}${sec('retracted')}`;
}

function viewSources() {
  const m = data.metrics;
  const metric = (n, key) => `<div class="metric"><b>${num(n)}</b><span>${esc(t(key))}</span></div>`;
  const rows = Object.entries(data.sources).sort(([a], [b]) => a.localeCompare(b));
  return `<div class="page-head"><h1>${esc(t('sources.title'))}</h1><p>${esc(t('sources.sub'))}</p></div>
    <div class="metrics">
      ${metric(m.cards, 'm.cards')}${metric(m.publishedNow, 'm.published')}${metric(m.changedByNewEvidence, 'm.changed')}
      ${metric(m.genuineResolutions, 'm.resolved')}${metric(m.qualityRetractions, 'm.retracted')}${metric(m.conflicts, 'm.conflicts')}
      ${metric(m.closedWithoutFix, 'm.closedNoFix')}${metric(m.firstHandCases, 'm.cases')}${metric(m.verifiedTeams, 'm.teams')}
    </div>
    <p class="note" style="margin-bottom:22px">${esc(t('sources.note'))}</p>
    <div class="table-wrap"><table>
      <thead><tr><th>${esc(t('sources.col.source'))}</th><th>${esc(t('sources.col.success'))}</th><th>${esc(t('sources.col.status'))}</th><th class="num">${esc(t('sources.col.items'))}</th><th class="num">${esc(t('sources.col.requests'))}</th></tr></thead>
      <tbody>${rows.map(([k, s]) => {
        const fail = s.consecutiveFailures > 0;
        const status = fail ? `<span class="bad-dot"></span>${esc(t('sources.failing', { n: s.consecutiveFailures }))}: ${esc(s.lastError)}` : s.truncated ? `<span class="late-dot"></span>${esc(t('sources.catching'))}` : `<span class="ok-dot"></span>${esc(t('sources.ok'))}`;
        return `<tr><td class="mono">${esc(k)}</td><td>${esc(ago(s.lastSuccessAt))}</td><td class="${fail ? 'wrap-cell' : ''}">${status}</td><td class="num">${num(s.itemsLastRun)}</td><td class="num">${s.requestsLastRun != null ? num(s.requestsLastRun) : '—'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function viewAbout() {
  const tr = getLang() === 'tr';
  const rules = ['early_signal', 'worth_trying', 'fix_coming', 'resolved', 'watching', 'retracted'].map((s) => `<div>${pill(s)}<span>${esc(stateRule(s))}</span></div>`).join('');
  const body = tr ? `
    <p>Problem Radar, AI altyapısı ve geliştirici araçlarındaki ${(data.meta.repos || []).length} repodan issue'ları, yorumları, birleşmiş PR'ları ve sürümleri, bir de bunlardan bahseden Hacker News tartışmalarını okur. Bunları dil modeli değil kurallar problem kartlarına dönüştürür. Karttaki her alan kaynağından birebir alınmış bir alıntıdır ve kaynağı açılabilir.</p>
    <h2>Kanıt merdiveni</h2><div class="rules">${rules}</div>
    <h2>Ne vaka sayılır</h2><ul>
      <li>Bir kişi kaç yorum yazarsa yazsın bir kez sayılır. Tek başına "+1" vaka değildir.</li>
      <li>Aynı linkin ya da aynı metnin kopyaları tek sinyal olarak sayılır.</li>
      <li>Hatayı doğrulayan bakımcılar vaka eklemez, çünkü takılan onlar değil.</li>
      <li>Bir ekip ancak bildirim kendi açık projesine bağlanıyorsa "doğrulanmış" sayılır. Kartlar bağımsızlığı tahmin etmek yerine "3 birinci elden vaka, 2 doğrulanmış ekip" der.</li>
      <li>Kapatılmış bir issue tek başına asla "çözüldü" sayılmaz.</li></ul>
    <h2>Neden bildirim aldın</h2><p>Bildirim sadece durum değişince gelir ve her biri değişikliğe sebep olan yorumu, PR'ı ya da sürümü gösterir. Bir kartı aç, "Neden bu durumda" ve "Durum geçmişi" bölümlerine bak.</p>
    <h2>Sırada ne var</h2><p>Bu ücretsiz pilot. Kendi repolarını ve rakiplerininkini izleyen geliştirici aracı şirketleri için sürüm dahil yol haritası <a href="https://github.com/canquesse/problem-radar#roadmap" ${ext}>README</a> dosyasında.</p>` : `
    <p>Problem Radar reads issues, comments, merged pull requests and releases from ${(data.meta.repos || []).length} AI infrastructure and developer tool repositories, plus Hacker News discussions that mention them. Rules, not a language model, turn that into problem cards. Every field on a card is a verbatim excerpt you can open at its source.</p>
    <h2>The evidence ladder</h2><div class="rules">${rules}</div>
    <h2>What counts as a case</h2><ul>
      <li>One person counts once, however many times they comment. A bare "+1" is not a case.</li>
      <li>Syndicated copies (the same link or the same text posted again) collapse into one signal.</li>
      <li>Maintainers confirming a bug do not add cases; they are not the ones stuck.</li>
      <li>A team is "verified" only when the report ties itself to a public project of its own. Cards say "3 first-hand cases, 2 verified teams" instead of guessing independence.</li>
      <li>A closed issue alone is never "resolved".</li></ul>
    <h2>Why you were notified</h2><p>Notifications only happen on a state change, and each one links the exact comment, pull request or release that caused it. Open a card and look at "Why it is in this state" and "State history".</p>
    <h2>What is next</h2><p>This is the free pilot. The roadmap, including the version for dev tool companies that watch their own and their competitors' repositories, is in the <a href="https://github.com/canquesse/problem-radar#roadmap" ${ext}>README</a>.</p>`;
  return `<div class="page-head"><h1>${esc(t('nav.about'))}</h1></div><div class="prose">${body}</div>`;
}

// --- Router ------------------------------------------------------------------------
let lastList = 'cards';
function parseHash() {
  const raw = decodeURIComponent(location.hash.slice(1)) || 'overview';
  const [path, query] = raw.split('?');
  const [tab, arg] = path.split('/');
  return { tab, arg, params: new URLSearchParams(query || '') };
}

function render() {
  const { tab, arg, params } = parseHash();
  const main = $('#main');
  if (tab === 'cards') {
    if (params.has('state')) { filt.state = params.get('state'); filt.limit = PAGE; }
    if (params.has('repo')) filt.repo = params.get('repo');
  }
  const views = { overview: viewOverview, cards: viewCards, card: () => viewDetail(arg), following: viewFollowing, changes: viewChanges, digest: () => viewDigest(arg), sources: viewSources, about: viewAbout };
  const view = views[tab] || viewOverview;
  if (tab !== 'card') lastList = location.hash.slice(1) || 'overview';
  chrome();
  main.innerHTML = view();
  const active = tab === 'card' ? 'cards' : views[tab] ? tab : 'overview';
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.tab === active));
  $('#nav').classList.remove('open');
  document.title = `${tab === 'card' && data.byId.get(arg) ? `${data.byId.get(arg).title} · ` : ''}Problem Radar`;
}

function rerenderKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }

// --- Events --------------------------------------------------------------------------
document.addEventListener('click', (ev) => {
  const el = ev.target;
  const lang = el.closest('[data-lang]');
  if (lang) { setLang(lang.dataset.lang); store.set('lang', getLang()); rerenderKeepScroll(); return; }
  const fb = el.closest('[data-follow]');
  if (fb) {
    ev.preventDefault(); ev.stopPropagation();
    const id = fb.dataset.follow;
    if (follows[id]) delete follows[id]; else { const now = new Date().toISOString(); follows[id] = { since: now, seenAt: now }; }
    store.set('follows', follows);
    const on = !!follows[id];
    $$(`[data-follow="${CSS.escape(id)}"]`).forEach((b) => { b.setAttribute('aria-pressed', on); b.textContent = `${on ? '★' : '☆'} ${on ? t('card.following') : t('card.follow')}`; });
    chrome(); const { tab } = parseHash(); $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (tab === 'card' ? 'cards' : tab)));
    return;
  }
  const oc = el.closest('[data-outcome]');
  if (oc) {
    const id = oc.dataset.cardId, k = oc.dataset.outcome;
    const cur = new Set(outcomes[id] || []);
    cur.has(k) ? cur.delete(k) : cur.add(k);
    outcomes[id] = [...cur]; store.set('outcomes', outcomes);
    oc.setAttribute('aria-pressed', cur.has(k));
    return;
  }
  const fs = el.closest('[data-fstate]');
  if (fs) { filt.state = fs.dataset.fstate; filt.limit = PAGE; history.replaceState(null, '', '#cards'); rerenderKeepScroll(); return; }
  const fr = el.closest('[data-frepo]');
  if (fr) { filt.repo = fr.dataset.frepo; filt.limit = PAGE; history.replaceState(null, '', '#cards'); rerenderKeepScroll(); return; }
  if (el.id === 'clear') { filt = { ...filt, q: '', state: '', repo: '', limit: PAGE }; history.replaceState(null, '', '#cards'); render(); return; }
  if (el.id === 'more') { filt.limit += PAGE; rerenderKeepScroll(); return; }
  if (el.id === 'mark-seen') { const now = new Date().toISOString(); for (const id of Object.keys(follows)) follows[id].seenAt = now; store.set('follows', follows); render(); return; }
  if (el.id === 'menu-btn') { const n = $('#nav'); n.classList.toggle('open'); el.setAttribute('aria-expanded', n.classList.contains('open')); return; }
  const dot = el.closest('circle.dot');
  if (dot) { location.hash = `card/${dot.dataset.card}`; return; }
  const tileEl = el.closest('.tile');
  if (tileEl && !el.closest('a, button')) location.hash = `card/${tileEl.dataset.card}`;
});

document.addEventListener('mousemove', (ev) => {
  const tip = $('#scope-tip');
  if (!tip) return;
  const dot = ev.target.closest?.('circle.dot');
  if (!dot) { tip.classList.remove('show'); return; }
  const c = data.byId.get(dot.dataset.card);
  if (!c) return;
  const box = $('#scope').getBoundingClientRect();
  tip.innerHTML = `${esc(c.title)}<small>${esc(c.repo)} · ${esc(stateName(c.state))}</small>`;
  tip.style.left = `${ev.clientX - box.left}px`;
  tip.style.top = `${ev.clientY - box.top}px`;
  tip.classList.add('show');
});

let qTimer;
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'q') return;
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    filt.q = ev.target.value; filt.limit = PAGE;
    const pos = ev.target.selectionStart;
    rerenderKeepScroll();
    const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos);
  }, 180);
});
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'mstate') { filt.state = ev.target.value; filt.limit = PAGE; history.replaceState(null, '', '#cards'); rerenderKeepScroll(); return; }
  if (ev.target.id === 'mrepo') { filt.repo = ev.target.value; filt.limit = PAGE; history.replaceState(null, '', '#cards'); rerenderKeepScroll(); return; }
  if (ev.target.id === 'sort') { filt.sort = ev.target.value; filt.limit = PAGE; rerenderKeepScroll(); } });
window.addEventListener('hashchange', () => { render(); if (!location.hash.includes('?')) window.scrollTo({ top: 0, behavior: 'instant' }); $('#main').focus({ preventScroll: true }); });

chrome();
$('#main').innerHTML = `<p class="loading">${esc(t('loading'))}</p>`;
load().then(render).catch((err) => { $('#main').innerHTML = `<p class="empty">${esc(t('loadError', { e: err.message }))}</p>`; });
