// Problem Radar front end. Plain ES modules, no build step.
// All text that comes from GitHub or Hacker News is escaped before rendering.

const LABEL = {
  early_signal: 'Early signal', worth_trying: 'Worth trying', watching: 'Watching',
  fix_coming: 'Fix coming', resolved: 'Resolved', retracted: 'Withdrawn',
};
const MOVING = ['worth_trying', 'watching', 'fix_coming', 'resolved'];
const EVIDENCE_LABEL = {
  case: 'First-hand case', case_retracted: 'Retracted case', retraction: 'Retraction', workaround: 'Workaround',
  fix_merged: 'Fix merged', fix_released: 'Fix released', partial_fix: 'Partial fix merged',
  partial_fix_released: 'Partial fix released', conflict: 'Conflicting report', closed_without_fix: 'Closed, no fix',
  syndicated_copy: 'Syndicated copy',
};
const OUTCOMES = [
  ['talked', 'Talked to a user'], ['contributed', 'Contributed'], ['prototyped', 'Built a prototype'], ['not_useful', 'Not useful'],
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https:\/\//.test(u || '') ? esc(u) : '#');
const $ = (sel, root = document) => root.querySelector(sel);

// --- Local state (follow list, last visit, outcomes) ------------------------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`radar.${k}`)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(`radar.${k}`, JSON.stringify(v)); },
};
let follows = store.get('follows', {}); // { cardId: { since, seenAt } }
let outcomes = store.get('outcomes', {}); // { cardId: [outcome] }

// --- Data --------------------------------------------------------------------
const data = { cards: [], byId: new Map(), events: [], eventsByCard: new Map(), sources: {}, metrics: {}, digests: [], meta: {} };

async function load() {
  const get = (n) => fetch(`data/${n}.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null));
  const [cards, events, sources, metrics, digests, meta] = await Promise.all(['cards', 'events', 'sources', 'metrics', 'digests', 'meta'].map(get));
  data.cards = cards || [];
  data.byId = new Map(data.cards.map((c) => [c.id, c]));
  data.events = events || [];
  for (const e of data.events) {
    if (!data.eventsByCard.has(e.cardId)) data.eventsByCard.set(e.cardId, []);
    data.eventsByCard.get(e.cardId).push(e);
  }
  data.sources = sources || {};
  data.metrics = metrics || {};
  data.digests = digests || [];
  data.meta = meta || {};
}

// --- Helpers -------------------------------------------------------------------
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
function ago(iso) {
  if (!iso) return 'never';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 129600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const stateBadge = (s) => `<span class="state s-${esc(s)}">${esc(LABEL[s] || s)}</span>`;
const caseLine = (c) => `${plural(c.caseCount, 'first-hand case')}, ${plural(c.teamCount, 'verified team')}`;
const unseenFor = (c) => {
  const f = follows[c.id];
  if (!f) return [];
  return (data.eventsByCard.get(c.id) || []).filter((e) => e.type === 'transition' && e.at > f.seenAt);
};

// --- Status bar: per-source freshness ------------------------------------------
function renderStatus() {
  const entries = Object.entries(data.sources);
  const now = Date.now();
  let late = 0, down = 0, newest = null;
  for (const [, s] of entries) {
    const age = s.lastSuccessAt ? (now - Date.parse(s.lastSuccessAt)) / 3600000 : Infinity;
    if (s.lastError && s.consecutiveFailures > 0) down++;
    else if (age > 3) late++;
    if (s.lastSuccessAt && (!newest || s.lastSuccessAt > newest)) newest = s.lastSuccessAt;
  }
  const cls = down ? 'down' : late ? 'late' : '';
  $('#status-row').innerHTML = `
    <span><i class="dot ${cls}"></i>Last sync ${esc(ago(newest))}</span>
    <span>${entries.length} sources${down ? ` · <a class="warn" href="#sources">${down} failing</a>` : ''}${late ? ` · <a href="#sources">${late} delayed</a>` : ''}</span>
    <span>${data.cards.length} cards · ${data.metrics.firstHandCases ?? 0} first-hand cases</span>`;
}

// --- Views ---------------------------------------------------------------------
let filters = { q: '', repo: '', states: new Set(MOVING), limit: 60 };

function cardRow(c) {
  const followed = !!follows[c.id];
  const unseen = unseenFor(c).length;
  return `<li class="row" tabindex="0" data-card="${esc(c.id)}">
    <div>${stateBadge(c.state)}</div>
    <div>
      <h2>${esc(c.title)}</h2>
      <div class="meta"><span>${esc(c.repo)}</span><span>${esc(caseLine(c))}</span><span>since ${esc(fmtDate(c.stateSince))}</span>${c.flags.closedWithoutFix ? '<span>closed without fix</span>' : ''}</div>
      ${c.blocker ? `<p class="blocker">${esc(c.blocker.value)}</p>` : ''}
    </div>
    <div class="side">
      ${unseen ? `<span class="new-flag">${unseen} new</span>` : ''}
      ${c.nextStep?.size ? `<span class="size" title="Suggested job size">${esc(c.nextStep.size)}</span>` : ''}
      <button class="follow" data-follow="${esc(c.id)}" aria-pressed="${followed}">${followed ? '★ Following' : '☆ Follow'}</button>
    </div>
  </li>`;
}

function filtered(base) {
  const q = filters.q.toLowerCase();
  return base.filter((c) => (!filters.repo || c.repo === filters.repo) &&
    (!q || `${c.title} ${c.blocker?.value || ''} ${c.workaround?.value || ''} ${c.repo}`.toLowerCase().includes(q)));
}

function controls({ chips }) {
  const repos = [...new Set(data.cards.map((c) => c.repo))].sort();
  return `<div class="controls">
    <input type="search" id="q" placeholder="Search problems, errors, workarounds…" value="${esc(filters.q)}" aria-label="Search" />
    <select id="repo" aria-label="Repository"><option value="">All repositories</option>${repos.map((r) => `<option ${r === filters.repo ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
    ${chips ? MOVING.map((s) => `<button class="chip" data-state="${s}" aria-pressed="${filters.states.has(s)}">${esc(LABEL[s])}</button>`).join('') : ''}
    <span class="count" id="count"></span>
  </div>`;
}

function renderList(cards, emptyText) {
  const shown = cards.slice(0, filters.limit);
  return `<ul class="list">${shown.map(cardRow).join('')}</ul>
    ${cards.length ? '' : `<p class="empty">${esc(emptyText)}</p>`}
    ${cards.length > shown.length ? `<button class="chip more" id="more">Show ${Math.min(60, cards.length - shown.length)} more of ${cards.length - shown.length}</button>` : ''}`;
}

const sortMoving = (a, b) => (b.stateSince || '').localeCompare(a.stateSince || '') || b.caseCount - a.caseCount || (b.lastEvidenceAt || '').localeCompare(a.lastEvidenceAt || '');

function viewFeed() {
  const counts = Object.fromEntries(MOVING.map((s) => [s, data.cards.filter((c) => c.state === s).length]));
  const list = filtered(data.cards.filter((c) => filters.states.has(c.state))).sort(sortMoving);
  return `<section class="intro">
      <div>
        <h1>Where builders get stuck in AI infra and dev tools, and when it actually gets fixed.</h1>
        <p>Each card is one problem, counted in first-hand cases rather than headlines. A card moves only when the evidence does: a second team hits it, a fix merges, a release ships it. Follow a card and you hear about it only when its state changes.</p>
      </div>
      <div class="ladder" aria-label="Cards by state">
        ${MOVING.map((s) => `<div><strong class="s-${s}">${counts[s]}</strong><span>${esc(LABEL[s])}</span></div>`).join('')}
      </div>
    </section>
    ${controls({ chips: true })}
    ${renderList(list, 'Nothing matches these filters yet.')}`;
}

function viewEarly() {
  const list = filtered(data.cards.filter((c) => c.state === 'early_signal')).sort((a, b) => b.caseCount - a.caseCount || (b.lastEvidenceAt || '').localeCompare(a.lastEvidenceAt || ''));
  return `<div class="page-head"><h1>Early signals</h1><p>One or more first-hand reports, but not yet the second case plus a documented workaround that makes a card worth trying. Most of these will stay quiet; follow the ones in your area.</p></div>
    ${controls({ chips: false })}${renderList(list, 'No early signals match.')}`;
}

function viewFollowing() {
  const ids = Object.keys(follows);
  const list = ids.map((id) => data.byId.get(id)).filter(Boolean).sort((a, b) => unseenFor(b).length - unseenFor(a).length || sortMoving(a, b));
  const changes = list.flatMap((c) => unseenFor(c).map((e) => ({ e, c }))).sort((a, b) => b.e.at.localeCompare(a.e.at));
  return `<div class="page-head"><h1>Following</h1><p>Saved in this browser only. You are told about a card only when its state changes, and every change links the source that caused it.</p></div>
    ${changes.length ? `<h3 class="section">What changed since you last looked</h3><ul class="timeline changes">${changes.map(({ e, c }) => `<li><span class="when">${esc(fmtDate(e.at))}</span><span class="what"><a href="#card/${esc(c.id)}">${esc(c.title)}</a><br/>${stateBadge(e.from)} → ${stateBadge(e.to)} ${esc(e.reason)} <a href="${safeUrl(e.triggerUrl)}" target="_blank" rel="noopener">Open source ↗</a></span></li>`).join('')}</ul>
    <p><button class="chip" id="mark-seen">Mark all as seen</button></p>` : ''}
    <h3 class="section">Followed cards</h3>
    ${list.length ? `<ul class="list">${list.map(cardRow).join('')}</ul>` : '<p class="empty">You are not following anything yet. Press ☆ Follow on any card.</p>'}`;
}

function viewChanges() {
  const tr = data.events.filter((e) => e.type === 'transition').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  return `<div class="page-head"><h1>Changelog</h1><p>Every state transition, newest first. Rescans that find nothing new produce no entry.</p></div>
    ${tr.length ? `<ul class="timeline changes">${tr.map((e) => `<li><span class="when">${esc(fmtDate(e.at))}</span><span class="what"><a href="#card/${esc(e.cardId)}">${esc(e.cardTitle)}</a> <span class="micro">${esc(e.repo)}</span><br/>${stateBadge(e.from)} → ${stateBadge(e.to)} ${esc(e.reason)} <a href="${safeUrl(e.triggerUrl)}" target="_blank" rel="noopener">Source ↗</a></span></li>`).join('')}</ul>` : '<p class="empty">No transitions yet. The first sync creates cards; later syncs move them.</p>'}`;
}

function digestItems(title, arr) {
  if (!arr?.length) return '';
  return `<h3 class="section">${esc(title)} (${arr.length})</h3><ul>${arr.map((i) => `<li><a href="#card/${esc(i.cardId)}">${esc(i.title)}</a> <span class="micro">${esc(i.repo)} · ${esc(caseLine(i))}</span><br/>${esc(i.reason)} <a href="${safeUrl(i.triggerUrl)}" target="_blank" rel="noopener">Source ↗</a></li>`).join('')}</ul>`;
}

function viewDigest(week) {
  const d = data.digests.find((x) => x.week === week) || data.digests[0];
  if (!d) return '<div class="page-head"><h1>Weekly digest</h1></div><p class="empty">No digest yet.</p>';
  return `<div class="page-head"><h1>Weekly digest · ${esc(d.week)}${d.inProgress ? ' (so far)' : ''}</h1>
      <p>Generated automatically from the changelog. Subscribe with any reader: <a href="feed.xml">RSS feed</a>.</p></div>
    <div class="week-nav">${data.digests.map((x) => `<a class="chip" aria-pressed="${x.week === d.week}" href="#digest/${esc(x.week)}">${esc(x.week)}</a>`).join('')}</div>
    <div class="digest-week">
      ${d.topOpportunities?.length ? `<h3 class="section">Top opportunities right now</h3><ol>${d.topOpportunities.map((t) => `<li><a href="#card/${esc(t.cardId)}">${esc(t.title)}</a> <span class="micro">${esc(t.repo)} · ${esc(caseLine(t))}</span><br/><strong>${esc(t.nextStep.size)}:</strong> ${esc(t.nextStep.text)}</li>`).join('')}</ol>` : ''}
      ${digestItems('Resolved (release verified)', d.sections.resolved)}
      ${digestItems('Fix coming (merged, not released)', d.sections.fix_coming)}
      ${digestItems('Worth trying', d.sections.worth_trying)}
      ${digestItems('Watching (sources disagree)', d.sections.watching)}
      ${digestItems('Withdrawn', d.sections.retracted)}
    </div>`;
}

function viewSources() {
  const rows = Object.entries(data.sources).sort(([a], [b]) => a.localeCompare(b));
  const m = data.metrics;
  const metric = (n, l) => `<div><strong>${esc(n ?? 0)}</strong><span>${esc(l)}</span></div>`;
  return `<div class="page-head"><h1>Sources and quality</h1><p>Each source syncs on its own cursor. A failing source keeps its last good data and shows its delay here instead of silently going stale.</p></div>
    <div class="grid-metrics">
      ${metric(m.cards, 'cards tracked')}${metric(m.publishedNow, 'cards past the publish rule now')}${metric(m.changedByNewEvidence, 'cards moved by new evidence')}
      ${metric(m.genuineResolutions, 'resolved by a verified release')}${metric(m.qualityRetractions, 'withdrawn (quality retraction)')}${metric(m.conflicts, 'moved to watching (conflict)')}
      ${metric(m.closedWithoutFix, 'closed issues not counted as fixed')}${metric(m.firstHandCases, 'first-hand cases')}${metric(m.verifiedTeams, 'verified teams')}
    </div>
    <p class="micro">Resolutions and retractions are counted separately on purpose: a withdrawn card is a radar error, a resolved one is the radar working.</p>
    <table><thead><tr><th>Source</th><th>Last success</th><th>Last attempt</th><th>Status</th><th class="num">Items</th><th class="num">Requests</th><th class="num">304</th></tr></thead><tbody>
    ${rows.map(([k, s]) => {
      const failing = s.consecutiveFailures > 0;
      return `<tr><td class="mono">${esc(k)}</td><td>${esc(ago(s.lastSuccessAt))}</td><td>${esc(ago(s.lastAttemptAt))}</td><td>${failing ? `<span class="warn">failing ×${esc(s.consecutiveFailures)}: ${esc(s.lastError)}</span>` : s.truncated ? 'ok, catching up' : 'ok'}</td><td class="num">${esc(s.itemsLastRun ?? '')}</td><td class="num">${esc(s.requestsLastRun ?? '')}</td><td class="num">${esc(s.notModifiedLastRun ?? '')}</td></tr>`;
    }).join('')}</tbody></table>`;
}

function viewAbout() {
  return `<div class="page-head"><h1>How it works</h1></div>
  <div class="prose">
    <p>Problem Radar reads issues, comments, merged pull requests and releases from a fixed set of AI infrastructure and developer tool repositories, plus Hacker News discussions that mention them. Rules, not a language model, turn that into problem cards. Every field on a card is a verbatim excerpt you can open at its source.</p>
    <h2>The evidence ladder</h2>
    <ul>
      <li>${stateBadge('early_signal')} at least one first-hand report.</li>
      <li>${stateBadge('worth_trying')} two or more first-hand cases from different people, and someone documented the workaround they use today.</li>
      <li>${stateBadge('fix_coming')} a pull request that closes the issue was merged, but no published release contains it yet.</li>
      <li>${stateBadge('resolved')} a stable release provably contains the fix: the tag contains the merge commit, or the release notes reference the PR.</li>
      <li>${stateBadge('watching')} sources disagree: the issue was reopened after the fix, or someone reports it still happens after the release.</li>
      <li>${stateBadge('retracted')} the only reporter withdrew the claim. Kept, and counted as a quality miss.</li>
    </ul>
    <h2>What counts as a case</h2>
    <ul>
      <li>One person counts once, however many times they comment. A bare "+1" is not a case.</li>
      <li>Syndicated copies (the same link or the same text posted again) collapse into one signal.</li>
      <li>Maintainers confirming a bug do not add cases; they are not the ones stuck.</li>
      <li>A team is "verified" only when the report ties itself to a public project of its own. Cards say "3 first-hand cases, 2 verified teams" rather than guessing independence.</li>
      <li>A closed issue alone is never "resolved". Plenty of issues are closed by bots, by mistake, or as "works for me".</li>
    </ul>
    <h2>Why you were notified</h2>
    <p>Notifications only happen on a state transition, and each one links the exact comment, pull request or release that caused it. Open a card and look under "Why it is in this state".</p>
    <h2>What is next</h2>
    <p>This is the free pilot. The roadmap, including the version for dev tool companies that watch their own and their competitors' repositories, is in the <a href="${esc($('#repo-link').href)}">README</a>.</p>
  </div>`;
}

// --- Card detail ---------------------------------------------------------------
function fact(label, f) {
  return `<dt>${esc(label)}</dt><dd>${f ? `${esc(f.value)}<a class="src" href="${safeUrl(f.url)}" target="_blank" rel="noopener">source ↗</a>` : '<span class="none">not stated in the sources</span>'}</dd>`;
}

function envText(env) {
  const parts = [
    ...Object.entries(env.versions || {}).map(([k, v]) => `${k} ${v.join(', ')}`),
    ...(env.os || []), ...(env.hardware || []),
  ];
  return parts.length ? parts.join(' · ') : null;
}

function openCard(id) {
  const c = data.byId.get(id);
  const sheet = $('#sheet');
  const panel = $('#sheet-panel');
  if (!c) { panel.innerHTML = `<div class="sheet-top"><span class="micro">Card</span><button class="close" data-close>Close ✕</button></div><p class="empty">This card no longer exists. It may have merged into another card.</p>`; sheet.hidden = false; return; }
  const followed = !!follows[c.id];
  const events = (data.eventsByCard.get(c.id) || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  const env = envText(c.environment);
  const flags = [
    c.flags.closedWithoutFix && 'Closed without a merged fix (not counted as resolved)',
    c.flags.partialFixMerged && 'Partial fix merged',
    c.flags.narrowed && 'Narrowed: a partial fix shipped, remaining cases stay open',
    c.flags.hnOnly && 'Hacker News only',
    c.syndicatedCount && `${plural(c.syndicatedCount, 'syndicated copy')} counted once`,
    c.retractedCount && `${plural(c.retractedCount, 'retracted case')}`,
  ].filter(Boolean);
  const mine = outcomes[c.id] || [];
  panel.innerHTML = `
    <div class="sheet-top">${stateBadge(c.state)}<span><button class="follow" data-follow="${esc(c.id)}" aria-pressed="${followed}">${followed ? '★ Following' : '☆ Follow'}</button> <button class="close" data-close>Close ✕</button></span></div>
    <h1 id="sheet-title">${esc(c.title)}</h1>
    <div class="micro">${esc(c.repo)} · ${esc(caseLine(c))} · first reported ${esc(fmtDate(c.firstReportedAt))} · <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">open issue ↗</a></div>
    ${flags.length ? `<div class="flags">${flags.map((f) => `<span class="flag">${esc(f)}</span>`).join('')}</div>` : ''}

    <div class="why">
      <span class="micro">Why it is in this state</span>
      <p>${esc(c.trigger.reason)} <a href="${safeUrl(c.trigger.url)}" target="_blank" rel="noopener">Open the source ↗</a></p>
      <p class="micro">${esc(LABEL[c.state])} since ${esc(fmtDate(c.stateSince))}${c.previousState ? `, was ${esc(LABEL[c.previousState])}` : ''}</p>
    </div>

    <dl class="facts">
      ${fact('Trying to', c.job)}
      ${fact('Blocked by', c.blocker)}
      ${fact('Workaround', c.workaround)}
      <dt>Environment</dt><dd>${env ? esc(env) : '<span class="none">not stated in the sources</span>'}</dd>
      <dt>Fix</dt><dd>${c.fixes.length ? c.fixes.map((f) => `<a href="${safeUrl(f.url)}" target="_blank" rel="noopener">${esc(f.pr)}</a> merged ${esc(fmtDate(f.mergedAt))}${f.release ? `, shipped in <a href="${safeUrl(f.release.url)}" target="_blank" rel="noopener">${esc(f.release.tag)}</a> (${esc(f.release.method)})` : ', not in a release yet'}`).join('<br/>') : '<span class="none">no merged fix linked</span>'}</dd>
    </dl>

    ${c.nextStep?.size ? `<div class="next"><span class="micro">Smallest next step · ${esc(c.nextStep.size)}</span>${esc(c.nextStep.text)}</div>` : ''}

    <h3 class="section">Evidence (${c.evidence.length})</h3>
    <ul class="timeline">${c.evidence.map((e) => `<li>
      <span class="when">${esc(fmtDate(e.at))}</span>
      <span class="what"><span class="kind k-${esc(e.type)}">${esc(EVIDENCE_LABEL[e.type] || e.type)}</span>${e.author ? ` · ${esc(e.author)}` : ''}
        ${e.excerpt ? `<q>${esc(e.excerpt)}</q>` : ''}
        <span class="sub"><a href="${safeUrl(e.url)}" target="_blank" rel="noopener">${esc(e.source === 'hn' ? 'Hacker News' : 'GitHub')} ↗</a>${e.appliesTo ? `<span>applies to ${esc(e.appliesTo)}</span>` : ''}${e.sourceState ? `<span>source now: ${esc(e.sourceState)}</span>` : ''}${e.lastCheckedAt ? `<span>checked ${esc(ago(e.lastCheckedAt))}</span>` : ''}</span>
      </span></li>`).join('')}</ul>

    <h3 class="section">State history</h3>
    ${events.length ? `<ul class="timeline">${events.map((e) => `<li><span class="when">${esc(fmtDate(e.at))}</span><span class="what">${e.from ? `${stateBadge(e.from)} → ` : 'Created as '}${stateBadge(e.to)}<br/>${esc(e.reason)} <a href="${safeUrl(e.triggerUrl)}" target="_blank" rel="noopener">Source ↗</a></span></li>`).join('')}</ul>` : '<p class="empty">No history yet.</p>'}

    <h3 class="section">Did this card lead somewhere?</h3>
    <div class="outcomes">${OUTCOMES.map(([k, l]) => `<button class="chip" data-outcome="${k}" data-card-id="${esc(c.id)}" aria-pressed="${mine.includes(k)}">${esc(l)}</button>`).join('')}</div>
    <p class="micro">Stored in this browser for now. In the pilot these answers are the signal that matters most.</p>`;
  sheet.hidden = false;
  if (follows[c.id]) { follows[c.id].seenAt = new Date().toISOString(); store.set('follows', follows); updateBadge(); }
  panel.focus();
}

function closeCard() {
  $('#sheet').hidden = true;
  if (location.hash.startsWith('#card/')) history.replaceState(null, '', `#${lastTab}`);
}

// --- Routing -------------------------------------------------------------------
let lastTab = 'feed';
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'feed';
  if (h.startsWith('card/')) {
    if (!$('#main').dataset.rendered) render(lastTab);
    openCard(h.slice(5));
    return;
  }
  $('#sheet').hidden = true;
  const [tab, arg] = h.split('/');
  lastTab = tab === 'digest' && arg ? `digest/${arg}` : tab;
  render(tab, arg);
}

function render(tab, arg) {
  const main = $('#main');
  const views = { feed: viewFeed, early: viewEarly, following: viewFollowing, changes: viewChanges, digest: () => viewDigest(arg), sources: viewSources, about: viewAbout };
  main.innerHTML = (views[tab] || viewFeed)();
  main.dataset.rendered = '1';
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (views[tab] ? tab : 'feed')));
  const count = $('#count');
  if (count) count.textContent = `${main.querySelectorAll('.row').length} shown`;
}

function updateBadge() {
  const n = Object.keys(follows).map((id) => data.byId.get(id)).filter(Boolean).reduce((s, c) => s + unseenFor(c).length, 0);
  const b = $('#follow-badge');
  b.hidden = !n;
  b.textContent = n;
}

// --- Events --------------------------------------------------------------------
document.addEventListener('click', (ev) => {
  const t = ev.target;
  const followBtn = t.closest('[data-follow]');
  if (followBtn) {
    ev.stopPropagation();
    const id = followBtn.dataset.follow;
    if (follows[id]) delete follows[id];
    else { const now = new Date().toISOString(); follows[id] = { since: now, seenAt: now }; }
    store.set('follows', follows);
    updateBadge();
    const on = !!follows[id];
    document.querySelectorAll(`[data-follow="${CSS.escape(id)}"]`).forEach((b) => { b.setAttribute('aria-pressed', on); b.textContent = on ? '★ Following' : '☆ Follow'; });
    return;
  }
  if (t.closest('[data-close]')) { closeCard(); return; }
  const outcome = t.closest('[data-outcome]');
  if (outcome) {
    const id = outcome.dataset.cardId, k = outcome.dataset.outcome;
    const cur = new Set(outcomes[id] || []);
    cur.has(k) ? cur.delete(k) : cur.add(k);
    outcomes[id] = [...cur];
    store.set('outcomes', outcomes);
    outcome.setAttribute('aria-pressed', cur.has(k));
    return;
  }
  const chip = t.closest('[data-state]');
  if (chip) {
    const s = chip.dataset.state;
    filters.states.has(s) ? filters.states.delete(s) : filters.states.add(s);
    if (!filters.states.size) filters.states = new Set(MOVING);
    render(lastTab.split('/')[0]);
    return;
  }
  if (t.id === 'more') { filters.limit += 60; render(lastTab.split('/')[0]); return; }
  if (t.id === 'mark-seen') {
    const now = new Date().toISOString();
    for (const id of Object.keys(follows)) follows[id].seenAt = now;
    store.set('follows', follows); updateBadge(); render('following');
    return;
  }
  const row = t.closest('[data-card]');
  if (row && !t.closest('a')) location.hash = `card/${row.dataset.card}`;
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !$('#sheet').hidden) closeCard();
  if (ev.key === 'Enter' && ev.target.matches?.('.row')) location.hash = `card/${ev.target.dataset.card}`;
});
let qTimer;
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'q') {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      filters.q = ev.target.value; filters.limit = 60;
      const pos = ev.target.selectionStart;
      render(lastTab.split('/')[0]);
      const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos);
    }, 160);
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'repo') { filters.repo = ev.target.value; filters.limit = 60; render(lastTab.split('/')[0]); }
});
window.addEventListener('hashchange', route);

load().then(() => { renderStatus(); updateBadge(); route(); }).catch((err) => {
  $('#main').innerHTML = `<p class="empty">Could not load radar data: ${esc(err.message)}</p>`;
});
