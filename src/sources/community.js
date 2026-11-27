// Where people in each domain ask for things: Stack Exchange sites and public
// Discourse forums. Both are free and keyless.
//
// Stack Exchange allows 300 requests a day per IP without a key, so each site
// is fetched at most every ~2 hours, round-robin. Software Recommendations and
// Hardware Recommendations are pure demand (every question is "I need a
// product that…"); on the other sites only questions that ask for a tool,
// service or product, or that stay unanswered with real interest, are kept.

import { ALL_FORUMS, ALL_SE_SITES } from '../domains.js';
import { cleanText } from '../extract.js';
import { stripHtml } from './hn.js';
import { askKind } from './demand.js';

const NEED_RE = /\b(is there (?:a|an|any) (?:tool|app|software|program|library|service|product|device|kit|module|way)|looking for (?:a|an|some)? ?(?:tool|app|software|program|library|service|product|device|solution|alternative)|recommend(?:ation)?s? (?:for )?(?:a|an)? ?(?:tool|app|software|program|device|product)|alternative to|i(?:'d| would) pay|wish there (?:was|were)|any (?:tool|app|software|program) (?:that|to|for)|how (?:do|can) (?:i|we|you) automate)\b/i;
const PURE_DEMAND = new Set(['softwarerecs', 'hardwarerecs']);
const ENTITIES = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', mdash: '—', ndash: '–', nbsp: ' ' };
const unescape = (s) => (s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, k) => ENTITIES[k.toLowerCase()] ?? m);

export function isNeed(text) {
  return NEED_RE.test(text || '');
}

export async function syncStackExchange({ http, state, now, upsert, record, sites = ALL_SE_SITES, maxSites = 8, everyMin = 110 }) {
  const due = sites
    .map((site) => ({ site, c: (state.cursors[`se:${site}`] ||= {}) }))
    .filter(({ c }) => !c.fetchedAt || Date.parse(now) - Date.parse(c.fetchedAt) >= everyMin * 60_000)
    .sort((a, b) => (a.c.fetchedAt || '').localeCompare(b.c.fetchedAt || ''))
    .slice(0, maxSites);
  for (const { site, c } of due) {
    const key = `se:${site}`;
    try {
      const from = c.fromDate || Math.floor((Date.parse(now) - 30 * 86400_000) / 1000);
      const url = `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=${site}&pagesize=100&fromdate=${from}&filter=withbody`;
      const res = await http.get(url, { conditional: false });
      let newest = from;
      let n = 0;
      for (const q of res.data?.items || []) {
        if (q.creation_date > newest) newest = q.creation_date;
        const title = unescape(stripHtml(q.title));
        const body = cleanText(stripHtml(q.body || '')).slice(0, 1200);
        const text = `${title} ${body.slice(0, 500)}`;
        // Needs, not homework: tool/product requests, and questions nobody has
        // been able to answer yet (or that many people up-voted).
        const keep = PURE_DEMAND.has(site) || isNeed(text) || !q.is_answered || q.score >= 3;
        if (!keep) continue;
        upsert({
          id: `ask:se:${site}:${q.question_id}`, source: `se:${site}`, kind: 'ask', askKind: PURE_DEMAND.has(site) && askKind(text) === 'question' ? 'seeking' : askKind(text),
          url: q.link, title, body, quote: title, author: q.owner?.display_name || null, tags: q.tags || [], score: q.score, answers: q.answer_count,
          answered: !!q.is_answered, views: q.view_count, createdAt: new Date(q.creation_date * 1000).toISOString(),
          updatedAt: new Date((q.last_activity_date || q.creation_date) * 1000).toISOString(),
        });
        n++;
      }
      c.fromDate = newest;
      c.fetchedAt = now;
      record(key, { ok: true, items: n });
      if (res.data?.backoff) await new Promise((r) => setTimeout(r, res.data.backoff * 1000));
      if (res.data?.quota_remaining !== undefined && res.data.quota_remaining < 20) break;
    } catch (err) {
      record(key, { ok: false, error: err.message });
    }
  }
}

/** Public Discourse forums: /latest.json lists recent topics with views and replies. */
export async function syncForums({ http, state, now, upsert, record, forums = ALL_FORUMS, everyMin = 15 }) {
  const horizon = new Date(Date.parse(now) - 30 * 86400_000).toISOString();
  for (const host of forums) {
    const key = `forum:${host}`;
    const c = (state.cursors[key] ||= {});
    if (c.fetchedAt && Date.parse(now) - Date.parse(c.fetchedAt) < everyMin * 60_000) continue;
    try {
      const res = await http.get(`https://${host}/latest.json?order=created`, { conditional: false });
      const topics = res.data?.topic_list?.topics || [];
      let n = 0;
      for (const tp of topics) {
        if (tp.pinned || tp.pinned_globally || !tp.created_at || tp.created_at < horizon) continue;
        const title = unescape(tp.fancy_title || tp.title || '');
        const unanswered = (tp.posts_count || 1) <= 1;
        const keep = isNeed(title) || (unanswered && (tp.views || 0) >= 40) || /\?$/.test(title);
        if (!keep) continue;
        upsert({
          id: `ask:forum:${host}:${tp.id}`, source: `forum:${host}`, kind: 'ask', askKind: askKind(title), url: `https://${host}/t/${tp.slug}/${tp.id}`,
          title, body: unescape(tp.excerpt || ''), quote: title, author: null, views: tp.views || 0, answers: Math.max(0, (tp.posts_count || 1) - 1),
          answered: !unanswered && !!tp.has_accepted_answer, createdAt: tp.created_at, updatedAt: tp.last_posted_at || tp.created_at,
        });
        n++;
      }
      c.fetchedAt = now;
      record(key, { ok: true, items: n });
    } catch (err) {
      c.fetchedAt = now;
      record(key, { ok: false, error: err.message });
    }
  }
}
