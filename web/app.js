// Fırsat Radarı / Problem Radar front end. Plain ES modules, no build step.
// Everything that comes from outside sources is escaped before rendering.

import {
  evidenceName, flagText, getLang, meaningText, nextStepText, reasonText, setLang, sizeName, stateName, t,
} from './i18n.js';

const LADDER = ['early_signal', 'worth_trying', 'fix_coming', 'resolved'];
const OUTCOMES = ['talked', 'contributed', 'prototyped', 'not_useful'];
const DEV_TYPES = ['funding', 'product', 'launch', 'new_repo', 'news', 'release'];
const PAGE = 30;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https:\/\//.test(u || '') ? esc(u) : '#');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const ext = 'target="_blank" rel="noopener"';

// --- Local state ---------------------------------------------------------------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`radar.${k}`)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`radar.${k}`, JSON.stringify(v)); } catch { /* private mode */ } },
};
let follows = store.get('follows', {});
let outcomes = store.get('outcomes', {});
setLang(store.get('lang', (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'));

// --- Data ----------------------------------------------------------------------
const LIVE = (document.querySelector('meta[name="radar-live"]')?.content || '').trim();
let dataBase = 'data/';
let dataVersion = null;
const data = {
  ideas: [], ideaById: new Map(), needs: [], devs: [], events: [], byCard: new Map(), sources: {}, metrics: {}, digests: [], meta: { domains: [] },
  cards: null, cardById: new Map(),
};

async function pulse() {
  const tryGet = async (base) => {
    const r = await fetch(`${base}pulse.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  };
  if (LIVE) { try { return { base: LIVE, p: await tryGet(LIVE) }; } catch { /* fall back */ } }
  try { return { base: 'data/', p: await tryGet('data/') }; } catch { return { base: 'data/', p: null }; }
}
const getJson = (n) => fetch(`${dataBase}${n}.json?v=${encodeURIComponent(dataVersion)}`).then((r) => (r.ok ? r.json() : null));

async function load() {
  const { base, p } = await pulse();
  dataBase = base;
  dataVersion = p?.builtAt || String(Date.now());
  const [ideas, needs, devs, events, sources, metrics, digests, meta] = await Promise.all(['ideas', 'needs', 'developments', 'events', 'sources', 'metrics', 'digests', 'meta'].map(getJson));
  data.ideas = (ideas || []).sort((a, b) => b.score - a.score);
  data.ideaById = new Map(data.ideas.map((g) => [g.id, g]));
  data.needs = needs || [];
  data.devs = devs || [];
  data.events = events || [];
  data.byCard = new Map();
  for (const e of data.events) {
    if (!data.byCard.has(e.cardId)) data.byCard.set(e.cardId, []);
    data.byCard.get(e.cardId).push(e);
  }
  data.sources = sources || {};
  data.metrics = metrics || {};
  data.digests = digests || [];
  data.meta = meta || { domains: [] };
  if (data.cards) { data.cards = null; await loadCards(); }
}

// GitHub problem cards are large; load them only when a page needs them.
async function loadCards() {
  if (data.cards) return;
  data.cards = (await getJson('cards')) || [];
  data.cardById = new Map(data.cards.map((c) => [c.id, c]));
}

// --- Helpers -------------------------------------------------------------------
const L = () => getLang();
const locale = () => (L() === 'tr' ? 'tr-TR' : 'en-US');
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
const tx = (en, trText) => (L() === 'tr' && trText ? trText : en);
const domainOf = (id) => data.meta.domains.find((d) => d.id === id);
const subOf = (d, s) => domainOf(d)?.subs.find((x) => x.id === s);
const dName = (id) => domainOf(id)?.name[L()] || id;
const sName = (d, s) => subOf(d, s)?.name[L()] || s;
const dColor = (id) => domainOf(id)?.color || '#888';
const family = (src) => (src?.startsWith('se:') || src === 'stackoverflow' ? 'stackexchange' : src?.startsWith('forum:') ? 'forum' : src === 'hn' ? 'hn' : src === 'github' ? 'github' : 'other');
function sourceLabel(src) {
  if (!src) return '';
  if (src.startsWith('se:')) return { softwarerecs: 'Software Recs', hardwarerecs: 'Hardware Recs', '3dprinting': '3D Printing SE', stats: 'Cross Validated' }[src.slice(3)] || `${src.slice(3)}.stackexchange`;
  if (src === 'stackoverflow') return 'Stack Overflow';
  if (src.startsWith('forum:')) return src.slice(6).replace(/^(forum|community|discuss|discourse)\./, '').replace(/\.(org|io|cc|com|info)$/, '');
  return { hn: 'Hacker News', github: 'GitHub', producthunt: 'Product Hunt', news: 'News' }[src] || src;
}
const unseen = (id) => {
  const f = follows[id];
  return f ? (data.byCard.get(id) || []).filter((e) => e.type === 'transition' && e.at > f.seenAt) : [];
};
function followBtn(id) {
  const on = !!follows[id];
  return `<button class="follow" data-follow="${esc(id)}" aria-pressed="${on}">${on ? '★' : '☆'} ${esc(on ? t('card.following') : t('card.follow'))}</button>`;
}
const verdictPill = (v) => `<span class="pill v-${esc(v)}">${esc(t(`i.${v}`))}</span>`;
function hash01(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const devTypeLabel = (k) => { const v = t(`dt.${k}`); return v === `dt.${k}` ? k : v; };

// --- Chrome ----------------------------------------------------------------------
function statusLine() {
  const now = Date.now();
  let down = 0, newest = null;
  const entries = Object.values(data.sources);
  for (const s of entries) {
    if (s.consecutiveFailures > 0) down++;
    if (s.lastSuccessAt && (!newest || s.lastSuccessAt > newest)) newest = s.lastSuccessAt;
  }
  const late = newest && now - Date.parse(newest) > 20 * 60_000;
  $('#status').innerHTML = `<i class="live ${late ? 'late' : ''}"></i><b>${esc(t('h.live'))}</b> · ${esc(t('status.synced', { ago: ago(newest) }))} · <a href="#sources">${esc(t('status.sources', { n: entries.length }))}${down ? ` (${esc(t('status.failing', { n: down }))})` : ''}</a>`;
}

function ticker() {
  const items = data.devs.filter((d) => d.type !== 'release').slice(0, 24);
  if (!items.length) return;
  const row = items.map((d) => `<a href="${safeUrl(d.url)}" ${ext}><span class="tk k-${esc(d.type)}">${esc(devTypeLabel(d.type))}</span>${esc(tx(d.title, d.titleTr))}</a>`).join('<span class="sep">◆</span>');
  $('#ticker').innerHTML = `<div class="tk-track">${row}<span class="sep">◆</span>${row}</div>`;
}

function chrome() {
  document.documentElement.lang = L();
  $('.brand-text b').textContent = t('brand.name');
  $('#foot-left').textContent = t('foot.left');
  $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === L()));
  const badge = Object.keys(follows).reduce((n, id) => n + unseen(id).length, 0);
  $('#nav').innerHTML = [
    ['following', 'nav.following'], ['changes', 'nav.changes'], ['digest', 'nav.digest'], ['sources', 'nav.sources'], ['about', 'nav.about'],
  ].map(([k, key]) => `<a href="#${k}" data-tab="${k}">${esc(t(key))}${k === 'following' && badge ? `<span class="badge">${badge}</span>` : ''}</a>`).join('');
  $('#domains-nav').innerHTML = data.meta.domains.map((d, i) => `<a href="#d/${esc(d.id)}" data-domain="${esc(d.id)}" style="--dc:${esc(d.color)}"><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(d.name[L()])}</a>`).join('');
  statusLine();
  ticker();
}

// --- Opportunity map (readable quadrant chart) -----------------------------------
function oppMap(ideas, { colorBy = 'domain', height = 440 } = {}) {
  if (!ideas.length) return '';
  const W = 1000, H = height, pad = { l: 56, r: 24, t: 24, b: 52 };
  const maxX = Math.max(8, ...ideas.map((g) => g.demandScore || 0));
  const maxY = 2.4;
  const X = (v) => pad.l + (Math.min(v, maxX) / maxX) * (W - pad.l - pad.r);
  const Y = (v) => H - pad.b - (Math.min(v, maxY) / maxY) * (H - pad.t - pad.b);
  const yOpen = Y(0.6);
  const color = (g) => (colorBy === 'domain' ? dColor(g.domain) : `hsl(${Math.round(hash01(g.sub) * 360)} 55% 45%)`);
  const labeled = new Set(ideas.slice().sort((a, b) => b.score - a.score).slice(0, 9).map((g) => g.id));
  const placed = [];
  const dots = ideas.map((g) => {
    const cx = X(g.demandScore || 0) + (hash01(g.id) - 0.5) * 10;
    const cy = Y(g.coverage || 0) + (hash01(`${g.id}y`) - 0.5) * 10;
    const r = 5 + Math.sqrt(g.people) * 2.4;
    let label = '';
    if (labeled.has(g.id)) {
      const text = tx(g.idea, g.ideaTr);
      const short = text.length > 34 ? `${text.slice(0, 33)}…` : text;
      let ly = cy - r - 8;
      while (placed.some((p) => Math.abs(p.y - ly) < 16 && Math.abs(p.x - cx) < 230)) ly -= 17;
      placed.push({ x: cx, y: ly });
      const anchor = cx > W - 260 ? 'end' : 'start';
      label = `<text class="m-label" x="${(cx + (anchor === 'end' ? -4 : 4)).toFixed(0)}" y="${ly.toFixed(0)}" text-anchor="${anchor}">${esc(short)}</text>`;
    }
    return `<g class="m-dot" data-idea="${esc(g.id)}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${esc(color(g))}" fill-opacity="${g.verdict === 'open' ? 0.9 : 0.45}" stroke="${esc(color(g))}"/>${label}</g>`;
  }).join('');
  return `<figure class="map">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('h.map'))}">
      <rect class="m-open" x="${pad.l}" y="${yOpen}" width="${W - pad.l - pad.r}" height="${H - pad.b - yOpen}"/>
      <line class="m-axis" x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}"/>
      <line class="m-axis" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}"/>
      <line class="m-grid" x1="${pad.l}" y1="${yOpen}" x2="${W - pad.r}" y2="${yOpen}"/>
      <text class="m-zone" x="${W - pad.r - 8}" y="${H - pad.b - 10}" text-anchor="end">${esc(t('map.open'))}</text>
      <text class="m-zone dim" x="${W - pad.r - 8}" y="${pad.t + 16}" text-anchor="end">${esc(t('map.crowded'))}</text>
      <text class="m-ax" x="${W - pad.r}" y="${H - 16}" text-anchor="end">${esc(t('map.x'))}</text>
      <text class="m-ax" x="18" y="${pad.t}" transform="rotate(-90 18 ${pad.t})" text-anchor="end">${esc(t('map.y'))}</text>
      ${dots}
    </svg>
    <div class="map-tip" id="map-tip"></div>
  </figure>`;
}

// --- Components --------------------------------------------------------------------
function ideaCard(g, i = 0) {
  const c = g.counts;
  const signals = [c.pay && `<span class="sig strong">${c.pay} ${esc(t('k.pay'))}</span>`, c.seeking && `<span class="sig">${c.seeking} ${esc(t('k.seeking'))}</span>`, c.questions && `<span class="sig">${c.questions} ${esc(t('k.question'))}</span>`, c.complaints && `<span class="sig">${c.complaints} ${esc(t('k.complaint'))}</span>`].filter(Boolean).join('');
  const n = unseen(g.id).length;
  return `<article class="idea" data-idea="${esc(g.id)}" style="--dc:${esc(dColor(g.domain))};animation-delay:${Math.min(i, 8) * 40}ms">
    ${n ? `<span class="newflag">${esc(t('card.new', { n }))}</span>` : ''}
    <div class="idea-top"><span class="crumb"><i></i>${esc(dName(g.domain))} · ${esc(sName(g.domain, g.sub))}</span>${verdictPill(g.verdict)}</div>
    <p class="type">${esc(t(`i.type.${g.type}`))} · ${esc(t(`i.strength.${g.strength}`))}</p>
    <h3><a href="#idea/${esc(g.id)}">${esc(tx(g.idea, g.ideaTr))}</a></h3>
    <div class="who"><b>${esc(t('i.people', { n: g.people }))}</b><span>${g.sources.map((s) => esc(sourceLabel(s))).slice(0, 3).join(' · ')}</span></div>
    <div class="sigs">${signals}</div>
    <div class="idea-foot"><span class="size-tag">${esc(sizeName(g.nextStep.size))}</span>${followBtn(g.id)}</div>
  </article>`;
}

function needRow(n) {
  return `<a class="need" href="${safeUrl(n.url)}" ${ext} style="--dc:${esc(dColor(n.domain))}">
    <span class="src f-${esc(family(n.source))}">${esc(sourceLabel(n.source))}</span>
    <span class="nt">${esc(tx(n.title, n.titleTr))}${L() === 'tr' && n.titleTr ? `<small>${esc(n.title)}</small>` : ''}</span>
    <span class="nm">${esc(t(`k.${n.kind}`))}${n.views ? ` · ${esc(t('i.views', { n: num(n.views) }))}` : ''}${n.kind === 'question' ? ` · ${esc(n.answered ? t('i.answered') : t('i.unanswered'))}` : ''} · ${esc(fmtDate(n.at))}</span>
  </a>`;
}

function devRow(d) {
  const f = d.funding;
  const meta = [
    d.type === 'funding' && f ? [f.amount, f.round].filter(Boolean).join(' · ') : null,
    d.outletCount > 1 ? t('devs.outlets', { n: d.outletCount }) : d.outlets?.[0]?.name || null,
    d.type === 'funding' ? (d.verified ? `✓ ${t('devs.verified')}` : t('devs.single')) : null,
    d.stars != null ? t('devs.stars', { n: num(d.stars) }) : null,
  ].filter(Boolean);
  return `<div class="dev" style="--dc:${esc(dColor(d.domain))}">
    <span class="dtype k-${esc(d.type)}">${esc(devTypeLabel(d.type))}</span>
    <div class="dbody2">
      <a class="dtitle" href="${safeUrl(d.url)}" ${ext}>${esc(tx(d.title, d.titleTr))}</a>
      ${d.summary && d.type !== 'release' ? `<p class="dsum">${esc(tx(d.summary, d.summaryTr))}</p>` : ''}
      <div class="dmeta"><span>${esc(fmtDate(d.publishedAt))}</span>${d.domain ? `<a class="topic" href="#d/${esc(d.domain)}/${esc(d.sub)}">${esc(sName(d.domain, d.sub))}</a>` : ''}${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
    </div>
  </div>`;
}

// --- Views -------------------------------------------------------------------------
function viewHome() {
  const open = data.ideas.filter((g) => g.verdict !== 'crowded');
  const doms = data.meta.domains.map((d, i) => {
    const ideas = data.ideas.filter((g) => g.domain === d.id);
    const top = ideas[0];
    return `<a class="drow" href="#d/${esc(d.id)}" style="--dc:${esc(d.color)}">
      <span class="dno">${String(i + 1).padStart(2, '0')}</span>
      <span class="dname">${esc(d.name[L()])}<small>${d.subs.map((s) => esc(s.name[L()])).join(' · ')}</small></span>
      <span class="dpeek">${top ? `“${esc(tx(top.idea, top.ideaTr))}”` : ''}</span>
      <span class="dstat"><b>${num(ideas.filter((g) => g.verdict === 'open').length)}</b><span>${esc(t('h.stat.ideas'))}</span></span>
      <span class="dstat"><b>${num(data.needs.filter((x) => x.domain === d.id).length)}</b><span>${esc(t('d.needs'))}</span></span>
      <span class="darrow">→</span>
    </a>`;
  }).join('');
  return `<section class="hero2">
      <p class="kicker">${esc(t('h.kicker', { d: data.meta.domains.length, s: Object.keys(data.sources).length }))}</p>
      <h1>${t('h.title')}</h1>
      <div class="hero-grid">
        <p class="lede">${esc(t('h.lede'))}</p>
        <div class="stats">
          <div><b>${num(open.length)}</b><span>${esc(t('h.stat.ideas'))}</span></div>
          <div><b>${num(data.needs.length)}</b><span>${esc(t('h.stat.needs'))}</span></div>
          <div><b>${num(data.devs.length)}</b><span>${esc(t('h.stat.devs'))}</span></div>
        </div>
      </div>
    </section>
    <section class="block">
      <div class="block-head"><span class="bno">01</span><h2>${esc(t('h.index'))}</h2></div>
      <nav class="dindex">${doms}</nav>
    </section>
    <section class="block">
      <div class="block-head"><span class="bno">02</span><div><h2>${esc(t('h.top'))}</h2><p>${esc(t('h.top.sub'))}</p></div></div>
      <div class="ideas">${open.slice(0, 9).map(ideaCard).join('')}</div>
    </section>
    <section class="block">
      <div class="block-head"><span class="bno">03</span><div><h2>${esc(t('h.map'))}</h2><p>${esc(t('h.map.sub'))}</p></div></div>
      ${oppMap(data.ideas.slice(0, 150))}
      <div class="legend">${data.meta.domains.map((d) => `<a href="#d/${esc(d.id)}" style="--dc:${esc(d.color)}"><i></i>${esc(d.name[L()])}</a>`).join('')}</div>
    </section>`;
}

let dState = { section: 'ideas', src: 'all', limit: PAGE, devType: '' };

function viewDomain(domainId, subId) {
  const d = domainOf(domainId);
  if (!d) return viewHome();
  const idx = data.meta.domains.indexOf(d);
  const inScope = (x) => x.domain === d.id && (!subId || x.sub === subId);
  const ideas = data.ideas.filter(inScope);
  const needs = data.needs.filter(inScope);
  const devs = data.devs.filter(inScope);
  const subTabs = [`<a href="#d/${esc(d.id)}" class="${!subId ? 'on' : ''}">${esc(t('d.all'))}</a>`, ...d.subs.map((s) => {
    const n = data.ideas.filter((g) => g.domain === d.id && g.sub === s.id).length;
    return `<a href="#d/${esc(d.id)}/${esc(s.id)}" class="${subId === s.id ? 'on' : ''}">${esc(s.name[L()])}${n ? ` <i>${n}</i>` : ''}</a>`;
  })].join('');
  const sectionTabs = ['ideas', 'needs', 'devs'].map((k) => `<button data-dsec="${k}" aria-pressed="${dState.section === k}">${esc(t(`d.${k}`))} <i>${num({ ideas: ideas.length, needs: needs.length, devs: devs.length }[k])}</i></button>`).join('');
  let body = '';
  if (dState.section === 'ideas') {
    body = ideas.length
      ? `${oppMap(ideas, { colorBy: 'sub', height: 380 })}<div class="ideas">${ideas.slice(0, dState.limit).map(ideaCard).join('')}</div>${ideas.length > dState.limit ? `<button class="btn ghost more" id="more">${esc(t('list.more'))}</button>` : ''}`
      : `<p class="empty">${esc(t('d.noIdeas'))}</p>`;
  } else if (dState.section === 'needs') {
    const fams = ['all', 'stackexchange', 'forum', 'hn', ...(d.id === 'computer' ? ['github'] : [])];
    const chips = fams.map((f) => `<button class="chip" data-src="${f}" aria-pressed="${dState.src === f}">${esc(t(`d.src.${f}`))}</button>`).join('');
    if (dState.src === 'github') {
      if (!data.cards) loadCards().then(() => rerenderKeepScroll());
      const cards = (data.cards || []).filter((c) => (c.domain || 'computer') === d.id && (!subId || c.sub === subId)).sort((a, b) => LADDER.indexOf(b.state) - LADDER.indexOf(a.state) || b.caseCount - a.caseCount);
      body = `<div class="chips">${chips}</div>${data.cards ? `<div class="needs">${cards.slice(0, dState.limit).map((c) => `<a class="need" href="#card/${esc(c.id)}"><span class="src f-github">${esc(c.repo)}</span><span class="nt">${esc(tx(c.title, c.titleTr))}</span><span class="nm">${esc(stateName(c.state))} · ${esc(t('card.cases', { n: c.caseCount }))}</span></a>`).join('')}</div>${cards.length > dState.limit ? `<button class="btn ghost more" id="more">${esc(t('list.more'))}</button>` : ''}` : `<p class="loading">${esc(t('loading'))}</p>`}`;
    } else {
      const list = needs.filter((n) => dState.src === 'all' || family(n.source) === dState.src);
      body = `<div class="chips">${chips}</div><div class="needs">${list.slice(0, dState.limit).map(needRow).join('')}</div>${list.length > dState.limit ? `<button class="btn ghost more" id="more">${esc(t('list.more'))}</button>` : ''}${list.length ? '' : `<p class="empty">${esc(t('list.empty'))}</p>`}`;
    }
  } else {
    const types = ['', ...DEV_TYPES].map((ty) => `<button class="chip" data-devtype="${ty}" aria-pressed="${dState.devType === ty}">${esc(ty ? devTypeLabel(ty) : t('devs.all'))}</button>`).join('');
    const list = devs.filter((x) => !dState.devType || x.type === dState.devType);
    body = `<div class="chips">${types}</div><div class="devlist">${list.slice(0, dState.limit).map(devRow).join('')}</div>${list.length > dState.limit ? `<button class="btn ghost more" id="more">${esc(t('list.more'))}</button>` : ''}${list.length ? '' : `<p class="empty">${esc(t('devs.empty'))}</p>`}`;
  }
  return `<header class="dhead" style="--dc:${esc(d.color)}">
      <span class="dno-big">${String(idx + 1).padStart(2, '0')} / ${String(data.meta.domains.length).padStart(2, '0')}</span>
      <h1>${esc(subId ? sName(d.id, subId) : d.name[L()])}</h1>
      ${subId ? `<p class="dparent"><a href="#d/${esc(d.id)}">← ${esc(d.name[L()])}</a></p>` : ''}
      <p class="dcounts"><b>${esc(t('d.openIdeas', { n: ideas.filter((g) => g.verdict === 'open').length }))}</b> · ${esc(t('d.needsN', { n: num(needs.length) }))} · ${esc(t('d.devsN', { n: num(devs.length) }))}</p>
    </header>
    <nav class="subtabs" style="--dc:${esc(d.color)}">${subTabs}</nav>
    <div class="sectabs" style="--dc:${esc(d.color)}">${sectionTabs}</div>
    <div class="dpage">${body}</div>`;
}

function viewIdea(id) {
  const g = data.ideaById.get(id);
  if (!g) return `<div class="ideapage"><a class="back" href="#">${esc(t('detail.back'))}</a><p class="empty">${esc(t('detail.missing'))}</p></div>`;
  if (follows[g.id]) { follows[g.id].seenAt = new Date().toISOString(); store.set('follows', follows); }
  const people = t('i.people', { n: g.people });
  return `<article class="ideapage" style="--dc:${esc(dColor(g.domain))}">
    <a class="back" href="#d/${esc(g.domain)}/${esc(g.sub)}">← ${esc(dName(g.domain))} · ${esc(sName(g.domain, g.sub))}</a>
    <div class="ip-tags"><span class="tag solid">${esc(t(`i.type.${g.type}`))}</span>${verdictPill(g.verdict)}<span class="tag">${esc(t(`i.strength.${g.strength}`))}</span>${followBtn(g.id)}</div>
    <h1>${esc(tx(g.idea, g.ideaTr))}</h1>
    ${L() === 'tr' && g.ideaTr ? `<p class="orig">${esc(t('i.original'))}: ${esc(g.idea)}</p>` : ''}
    <p class="verdict">${esc(t(`i.verdict.${g.verdict}`, { people }))}</p>
    <div class="ip-grid">
      <section>
        <h2 class="h-sec">${esc(t('i.evidence'))} <span class="muted">(${g.evidence.length})</span></h2>
        <ul class="quotes">${g.evidence.map((e) => `<li>
          <div class="qmeta"><span class="src f-${esc(family(e.source))}">${esc(sourceLabel(e.source))}</span><span>${esc(t(`k.${e.kind}`))}</span><span>${esc(fmtDate(e.at))}</span>${e.views ? `<span>${esc(t('i.views', { n: num(e.views) }))}</span>` : ''}</div>
          <blockquote>${esc(tx(e.quote || e.title, e.quoteTr))}</blockquote>
          ${L() === 'tr' && e.quoteTr ? `<p class="orig">${esc(e.quote || e.title)}</p>` : ''}
          <a href="${safeUrl(e.url)}" ${ext}>${esc(t('detail.openSource'))} ↗</a></li>`).join('')}</ul>
      </section>
      <aside>
        <div class="panel next"><h2>${esc(t('i.next'))}</h2><span class="size">${esc(sizeName(g.nextStep.size))}</span><p>${esc(t(`i.step.${g.nextStep.code}`, g.nextStep.params || {}))}</p></div>
        <div class="panel"><h2>${esc(t('i.solutions'))}</h2>${g.solutions.length ? g.solutions.map((x) => `<div class="sol"><a href="${safeUrl(x.url)}" ${ext}>${esc(x.title)} ↗</a><span>${esc(devTypeLabel(x.kind))} · ${esc(t('gap.similar', { p: Math.round(x.similarity * 100) }))}</span></div>`).join('') : `<p class="openmark">${esc(t('i.none'))}</p>`}</div>
      </aside>
    </div>
  </article>`;
}

// GitHub problem card (the needs ladder for open-source projects)
function track(state, large = false) {
  const idx = state === 'watching' ? 2 : state === 'retracted' ? -1 : LADDER.indexOf(state);
  return `<div class="track ${large ? 'track-lg' : ''} c-${state}" aria-hidden="true">${LADDER.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>`;
}
const pill = (s) => `<span class="pill c-${esc(s)}">${esc(stateName(s))}</span>`;
function envText(env) {
  const parts = [...Object.entries(env?.versions || {}).map(([k, v]) => `${k} ${v.join(', ')}`), ...(env?.os || []), ...(env?.hardware || [])];
  return parts.length ? parts.join(' · ') : null;
}
const fact = (label, f) => `<dt>${esc(label)}</dt><dd>${f ? `${esc(f.value)}<a class="src-link" href="${safeUrl(f.url)}" ${ext}>${esc(t('detail.source'))} ↗</a>` : `<span class="none">${esc(t('detail.notStated'))}</span>`}</dd>`;

function viewCard(id) {
  if (!data.cards) { loadCards().then(() => render()); return `<p class="loading">${esc(t('loading'))}</p>`; }
  const c = data.cardById.get(id);
  if (!c) return `<div class="ideapage"><a class="back" href="#">${esc(t('detail.back'))}</a><p class="empty">${esc(t('detail.missing'))}</p></div>`;
  if (follows[c.id]) { follows[c.id].seenAt = new Date().toISOString(); store.set('follows', follows); }
  const events = (data.byCard.get(c.id) || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const env = envText(c.environment);
  const flags = [c.flags.closedWithoutFix && flagText('closedWithoutFix'), c.flags.partialFixMerged && flagText('partialFixMerged'), c.flags.narrowed && flagText('narrowed'), c.syndicatedCount && flagText('syndicated', { n: c.syndicatedCount }), c.retractedCount && flagText('retracted', { n: c.retractedCount })].filter(Boolean);
  const idx = c.state === 'watching' ? 2 : LADDER.indexOf(c.state);
  const mine = outcomes[c.id] || [];
  const fixRow = (f) => `<div class="sol"><a href="${safeUrl(f.url)}" ${ext}>${esc(f.pr)}</a><span>${esc(t('detail.mergedOn', { date: fmtDate(f.mergedAt) }))} · ${f.release ? `${esc(t('detail.shipped'))} <a href="${safeUrl(f.release.url)}" ${ext}>${esc(f.release.tag)}</a>` : esc(t('detail.notReleased'))}</span></div>`;
  return `<article class="ideapage" style="--dc:${esc(dColor('computer'))}">
    <a class="back" href="#d/computer">← ${esc(dName('computer'))} · ${esc(t('d.src.github'))}</a>
    <div class="ip-tags">${pill(c.state)}<span class="tag">${esc(c.repo)}</span><span class="tag">${esc(t('card.cases', { n: c.caseCount }))}</span>${followBtn(c.id)}</div>
    <h1>${esc(tx(c.title, c.titleTr))}</h1>
    ${track(c.state, true)}<div class="track-labels">${LADDER.map((s, i) => `<span class="${i <= idx ? 'on' : ''}">${esc(stateName(s))}</span>`).join('')}</div>
    ${flags.length ? `<div class="flags">${flags.map((f) => `<span class="tag">${esc(f)}</span>`).join('')}</div>` : ''}
    <p class="verdict">${esc(reasonText(c.trigger))} <a href="${safeUrl(c.trigger.url)}" ${ext}>${esc(t('detail.openSource'))} ↗</a></p>
    <div class="ip-grid">
      <section>
        <dl class="facts">${fact(t('detail.job'), c.job)}${fact(t('detail.blocker'), c.blocker)}${fact(t('detail.workaround'), c.workaround)}<dt>${esc(t('detail.env'))}</dt><dd>${env ? esc(env) : `<span class="none">${esc(t('detail.notStated'))}</span>`}</dd></dl>
        <h2 class="h-sec">${esc(t('detail.evidence'))} <span class="muted">(${c.evidence.length})</span></h2>
        <ul class="quotes">${c.evidence.map((e) => `<li><div class="qmeta"><span>${esc(evidenceName(e.type))}</span>${e.author ? `<span>${esc(e.author)}</span>` : ''}<span>${esc(fmtDate(e.at))}</span>${e.appliesTo ? `<span>${esc(t('detail.appliesTo', { v: e.appliesTo }))}</span>` : ''}${e.sourceState ? `<span>${esc(t('detail.sourceNow', { s: e.sourceState }))}</span>` : ''}</div>${e.excerpt ? `<blockquote>${esc(e.excerpt)}</blockquote>` : ''}<a href="${safeUrl(e.url)}" ${ext}>${esc(t('detail.openSource'))} ↗</a></li>`).join('')}</ul>
        <h2 class="h-sec">${esc(t('detail.history'))}</h2>
        <ul class="quotes">${events.map((e) => `<li><div class="qmeta"><span>${esc(fmtDate(e.at))}</span></div><p>${e.from ? `${pill(e.from)} → ` : ''}${pill(e.to)} ${esc(reasonText(e))}</p><p class="meaning">${esc(meaningText(e))}</p></li>`).join('')}</ul>
      </section>
      <aside>
        ${c.nextStep ? `<div class="panel next"><h2>${esc(t('detail.next'))}</h2>${c.nextStep.size ? `<span class="size">${esc(sizeName(c.nextStep.size))}</span>` : ''}<p>${esc(nextStepText(c.nextStep, c))}</p></div>` : ''}
        <div class="panel"><h2>${esc(t('detail.fix'))}</h2>${c.fixes.length ? c.fixes.map(fixRow).join('') : `<p class="muted">${esc(t('detail.noFix'))}</p>`}</div>
        <div class="panel"><h2>${esc(t('detail.outcome'))}</h2><div class="chips">${OUTCOMES.map((k) => `<button class="chip" data-outcome="${k}" data-card-id="${esc(c.id)}" aria-pressed="${mine.includes(k)}">${esc(t(`outcome.${k}`))}</button>`).join('')}</div><p class="note">${esc(t('detail.outcomeNote'))}</p></div>
      </aside>
    </div>
  </article>`;
}

function changeItem(e, withMeaning = false) {
  const isIdea = e.kind === 'idea';
  const g = isIdea ? data.ideaById.get(e.cardId) : null;
  const card = data.cardById.get(e.cardId);
  const title = isIdea ? (g ? tx(g.idea, g.ideaTr) : e.cardTitle) : (card ? tx(card.title, card.titleTr) : e.cardTitle);
  const p = isIdea ? verdictPill : pill;
  const meaning = withMeaning ? meaningText(e) : '';
  return `<div class="change">
    <div class="arrow">${e.from ? `${p(e.from)} →` : ''} ${p(e.to)}</div>
    <div><h3><a href="#${isIdea ? 'idea' : 'card'}/${esc(e.cardId)}">${esc(title)}</a></h3>
      <p>${isIdea ? esc(t('i.people', { n: e.params?.people || 0 })) : `${esc(e.repo || '')} · ${esc(reasonText(e))}`} ${e.triggerUrl ? `<a href="${safeUrl(e.triggerUrl)}" ${ext}>${esc(t('detail.openSource'))} ↗</a>` : ''}</p>
      ${meaning ? `<p class="meaning"><b>${esc(t('follow.meaning'))}:</b> ${esc(meaning)}</p>` : ''}</div>
  </div>`;
}
function byDay(events, withMeaning = false) {
  const out = [];
  let day = null;
  for (const e of events) {
    const dd = e.at.slice(0, 10);
    if (dd !== day) { out.push(`<h3 class="day">${esc(fmtDay(e.at))}</h3>`); day = dd; }
    out.push(changeItem(e, withMeaning));
  }
  return out.join('');
}

const pageHead = (title, sub) => `<header class="phead"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</header>`;

function viewFollowing() {
  const ids = Object.keys(follows);
  const ideas = ids.map((id) => data.ideaById.get(id)).filter(Boolean);
  const cardIds = ids.filter((id) => id.startsWith('c-'));
  if (cardIds.length && !data.cards) loadCards().then(() => rerenderKeepScroll());
  const cards = cardIds.map((id) => data.cardById.get(id)).filter(Boolean);
  const changes = ids.flatMap((id) => unseen(id)).sort((a, b) => b.at.localeCompare(a.at));
  return `${pageHead(t('following.title'), t('following.sub'))}
    ${changes.length ? `<section class="block"><div class="block-head"><h2>${esc(t('following.changes'))}</h2><button class="btn ghost" id="mark-seen">${esc(t('following.markSeen'))}</button></div>${byDay(changes, true)}</section>` : ''}
    ${ideas.length ? `<section class="block"><div class="ideas">${ideas.map(ideaCard).join('')}</div></section>` : ''}
    ${cards.length ? `<section class="block"><div class="needs">${cards.map((c) => `<a class="need" href="#card/${esc(c.id)}"><span class="src f-github">${esc(c.repo)}</span><span class="nt">${esc(tx(c.title, c.titleTr))}</span><span class="nm">${esc(stateName(c.state))}</span></a>`).join('')}</div></section>` : ''}
    ${!ideas.length && !cards.length ? `<p class="empty">${esc(t('following.empty'))}</p>` : ''}`;
}

function viewChanges() {
  const list = data.events.filter((e) => e.type === 'transition').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  if (list.some((e) => e.kind !== 'idea') && !data.cards) loadCards().then(() => rerenderKeepScroll());
  return `${pageHead(t('changes.title'), t('changes.sub'))}${list.length ? byDay(list) : `<p class="empty">${esc(t('changes.empty'))}</p>`}`;
}

function viewDigest(week) {
  const d = data.digests.find((x) => x.week === week) || data.digests[0];
  if (!d) return `${pageHead(t('digest.title'))}<p class="empty">${esc(t('digest.empty'))}</p>`;
  const fund = (d.funding || []).map((f) => `<div class="dev"><span class="dtype k-funding">${esc(devTypeLabel('funding'))}</span><div class="dbody2"><a class="dtitle" href="${safeUrl(f.url)}" ${ext}>${esc(f.title)}</a><div class="dmeta"><span>${esc(t('devs.outlets', { n: f.outletCount }))}</span>${f.verified ? `<span>✓ ${esc(t('devs.verified'))}</span>` : ''}</div></div></div>`).join('');
  const weekIdeas = data.ideas.filter((g) => g.firstSeenAt && g.firstSeenAt >= d.start && g.firstSeenAt < d.end && g.verdict !== 'crowded');
  return `${pageHead(`${t('digest.title')} · ${d.week}${d.inProgress ? ` (${t('digest.sofar')})` : ''}`, `${t('digest.sub')} feed.xml`)}
    <div class="chips">${data.digests.map((x) => `<a class="chip" aria-pressed="${x.week === d.week}" href="#digest/${esc(x.week)}">${esc(x.week)}</a>`).join('')}</div>
    ${weekIdeas.length ? `<section class="block"><div class="block-head"><h2>${esc(t('h.top'))}</h2></div><div class="ideas">${weekIdeas.slice(0, 12).map(ideaCard).join('')}</div></section>` : ''}
    ${fund ? `<section class="block"><div class="block-head"><h2>${esc(devTypeLabel('funding'))}</h2></div><div class="devlist">${fund}</div></section>` : ''}`;
}

function viewSources() {
  const m = data.metrics;
  const rows = Object.entries(data.sources).sort(([a], [b]) => a.localeCompare(b));
  const metric = (n, key) => `<div class="metric"><b>${num(n)}</b><span>${esc(t(key))}</span></div>`;
  return `${pageHead(t('sources.title'), t('sources.sub'))}
    <div class="metrics">${metric(data.ideas.length, 'd.ideas')}${metric(data.needs.length, 'h.stat.needs')}${metric(data.devs.length, 'h.stat.devs')}${metric(m.cards, 'm.cards')}${metric(m.genuineResolutions, 'm.resolved')}${metric(m.qualityRetractions, 'm.retracted')}</div>
    <div class="table-wrap"><table><thead><tr><th>${esc(t('sources.col.source'))}</th><th>${esc(t('sources.col.success'))}</th><th>${esc(t('sources.col.status'))}</th><th class="num">${esc(t('sources.col.items'))}</th></tr></thead>
    <tbody>${rows.map(([k, s]) => {
      const fail = s.consecutiveFailures > 0;
      const status = fail ? `<span class="bad-dot"></span>${esc(t('sources.failing', { n: s.consecutiveFailures }))}: ${esc(s.lastError)}` : s.truncated ? `<span class="late-dot"></span>${esc(t('sources.catching'))}` : `<span class="ok-dot"></span>${esc(t('sources.ok'))}`;
      return `<tr><td class="mono">${esc(k)}</td><td>${esc(ago(s.lastSuccessAt))}</td><td class="${fail ? 'wrap-cell' : ''}">${status}</td><td class="num">${num(s.itemsLastRun)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function viewAbout() {
  const tr = L() === 'tr';
  const body = tr ? `
    <p>Radar her gün insanların kendi cümleleriyle neye ihtiyaç duyduğunu okur: 13 Stack Exchange sitesi (Software Recommendations ve Hardware Recommendations dahil), KiCad, Arduino, PlatformIO, Inductive Automation, OpenEnergyMonitor, Hugging Face, PyTorch, Julia gibi açık topluluk forumları ve Hacker News’teki "böyle bir araç var mı", "para öderim", "alternatif arıyorum" gönderileri.</p>
    <p>Bir yerel dil modeli (all-MiniLM, GitHub Actions içinde çalışır, API yok, ücret yok) her ihtiyacı 7 alandan birinin alt başlığına anlamına göre yerleştirir ve aynı şeyi isteyenleri tek fikirde toplar. Sonra Product Hunt lansmanları, Show HN, yeni GitHub repoları ve bilinen araçlar arasında buna yakın bir şey var mı diye bakar. Yakın bir şey yoksa fikir "boşta görünüyor" olur.</p>
    <h2>Fikir ne zaman çıkar</h2><ul><li>En az iki kişi aynı şeyi istiyorsa, ya da bir kişi açıkça bir ürün istiyor ve buna gerçek ilgi varsa (görüntülenme, oy) ya da "para öderim" diyorsa.</li><li>GitHub issue’ları fikir kanıtı sayılmaz: bir repodaki eksik özellik pazar boşluğu değil, katkı fırsatıdır. Onlar Bilgisayar > İhtiyaçlar > GitHub sorunları altında durur.</li><li>Yatırım haberleri talep sayılmaz; piyasa ilgisi olarak gösterilir. Aynı haberi yayımlayan onlarca site tek olaydır.</li></ul>
    <h2>Türkçe</h2><p>Başlıklar, fikirler ve alıntılar yerel bir çeviri modeliyle (NLLB-200) Türkçeye çevrilir ve önbelleğe alınır. Orijinal metin her zaman yanında durur, çünkü kanıt odur.</p>
    <h2>Güncelleme</h2><p>Yaklaşık 3 dakikada bir yenilenir; sayfa dakikada bir yeni veri var mı bakar.</p>` : `
    <p>The radar reads what people say they need, in their own words: 13 Stack Exchange sites (including Software Recommendations and Hardware Recommendations), public community forums such as KiCad, Arduino, PlatformIO, Inductive Automation, OpenEnergyMonitor, Hugging Face, PyTorch and Julia, and Hacker News posts like "is there a tool", "I'd pay for", "alternative to".</p>
    <p>A local language model (all-MiniLM, running inside GitHub Actions, no API, no cost) places every need in a sub-area of one of 7 domains by meaning and groups people asking for the same thing into one idea. It then searches Product Hunt launches, Show HN, brand-new GitHub repositories and known tools for anything close. If nothing is close, the idea "looks open".</p>
    <h2>When an idea appears</h2><ul><li>At least two people ask for the same thing, or one person clearly asks for a product and it gets real attention (views, votes), or someone says they would pay.</li><li>GitHub issues are not idea evidence: a missing feature in one repository is a contribution opportunity, not a market gap. They live under Computing > Needs > GitHub issues.</li><li>Funding news is not demand; it is shown as market interest. A story published by dozens of sites is one event.</li></ul>
    <h2>Turkish</h2><p>Titles, ideas and quotes are translated with a local model (NLLB-200) and cached. The original text always stays next to it, because that is the evidence.</p>
    <h2>Updates</h2><p>About every 3 minutes; the page checks for fresh data every minute.</p>`;
  return `${pageHead(t('nav.about'))}<div class="prose">${body}</div>`;
}

// --- Router --------------------------------------------------------------------------
function parseHash() {
  const raw = decodeURIComponent(location.hash.slice(1)) || '';
  return raw.split('?')[0].split('/').filter(Boolean);
}

let lastDomain = '';
function render() {
  const [tab, a, b] = parseHash();
  if (tab === 'd' && a !== lastDomain) dState = { section: 'ideas', src: 'all', limit: PAGE, devType: '' };
  if (tab === 'd') lastDomain = a;
  const views = {
    d: () => viewDomain(a, b), idea: () => viewIdea(a), card: () => viewCard(a), following: viewFollowing, changes: viewChanges,
    digest: () => viewDigest(a), sources: viewSources, about: viewAbout,
  };
  chrome();
  $('#main').innerHTML = (views[tab] || viewHome)();
  $$('#nav a').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab));
  const activeDomain = tab === 'd' ? a : tab === 'idea' ? data.ideaById.get(a)?.domain : tab === 'card' ? 'computer' : null;
  $$('#domains-nav a').forEach((x) => x.classList.toggle('on', x.dataset.domain === activeDomain));
  document.documentElement.style.setProperty('--accent', activeDomain ? dColor(activeDomain) : '');
  const g = tab === 'idea' && data.ideaById.get(a);
  document.title = `${g ? `${tx(g.idea, g.ideaTr)} · ` : tab === 'd' && domainOf(a) ? `${dName(a)} · ` : ''}${t('brand.name')}`;
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
    rerenderKeepScroll();
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
  const sec = el.closest('[data-dsec]');
  if (sec) { dState = { ...dState, section: sec.dataset.dsec, limit: PAGE }; rerenderKeepScroll(); return; }
  const src = el.closest('[data-src]');
  if (src) { dState = { ...dState, src: src.dataset.src, limit: PAGE }; rerenderKeepScroll(); return; }
  const dt = el.closest('[data-devtype]');
  if (dt) { dState = { ...dState, devType: dt.dataset.devtype, limit: PAGE }; rerenderKeepScroll(); return; }
  if (el.id === 'more') { dState.limit += PAGE; rerenderKeepScroll(); return; }
  if (el.id === 'mark-seen') { const now = new Date().toISOString(); for (const id of Object.keys(follows)) follows[id].seenAt = now; store.set('follows', follows); render(); return; }
  if (el.closest('#menu-btn')) { $('#nav').classList.toggle('open'); return; }
  const dot = el.closest('.m-dot');
  if (dot) { location.hash = `idea/${dot.dataset.idea}`; return; }
  const card = el.closest('.idea');
  if (card && !el.closest('a, button')) location.hash = `idea/${card.dataset.idea}`;
});

document.addEventListener('mousemove', (ev) => {
  const dot = ev.target.closest?.('.m-dot');
  const tip = dot ? dot.closest('.map').querySelector('.map-tip') : $('#map-tip');
  if (!tip) return;
  if (!dot) { $$('.map-tip').forEach((x) => x.classList.remove('show')); return; }
  const g = data.ideaById.get(dot.dataset.idea);
  if (!g) return;
  const box = dot.closest('.map').getBoundingClientRect();
  tip.innerHTML = `${esc(tx(g.idea, g.ideaTr))}<small>${esc(dName(g.domain))} · ${esc(t(`i.${g.verdict}`))} · ${esc(t('i.people', { n: g.people }))}</small>`;
  tip.style.left = `${ev.clientX - box.left}px`;
  tip.style.top = `${ev.clientY - box.top}px`;
  tip.classList.add('show');
});

window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'instant' }); });

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 6000);
}

chrome();
$('#main').innerHTML = `<p class="loading">${esc(t('loading'))}</p>`;
load().then(render).catch((err) => { $('#main').innerHTML = `<p class="empty">${esc(t('loadError', { e: err.message }))}</p>`; });

setInterval(async () => {
  if (document.hidden) return;
  const { p } = await pulse();
  if (!p || !dataVersion || p.builtAt === dataVersion) { statusLine(); return; }
  const before = data.events.length;
  try {
    await load();
    rerenderKeepScroll();
    const n = Math.max(0, data.events.length - before);
    toast(n ? t('live.updatedN', { n }) : t('live.updated'));
  } catch { /* keep the current view */ }
}, 60_000);
