// Developments: funding, product launches, media news and brand-new repos.
// Every source is free and keyless: RSS/Atom feeds (including Google News
// searches), the Hacker News Algolia API and the GitHub search API.

import { DEV_FEEDS, LIMITS, NEW_REPO_QUERIES, NEW_REPO_STARS, NEW_REPO_WINDOW_DAYS } from '../config.js';
import { hash } from '../store.js';
import { stripHtml } from './hn.js';

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
export const decode = (s) => stripHtml(unescape((s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : null;
};

/** Minimal RSS 2.0 / Atom parser. Returns [{ guid, title, link, summary, publishedAt, outlet, outletUrl, author }]. */
export function parseFeed(xml) {
  const out = [];
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    let link;
    if (isAtom) {
      const alt = b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || b.match(/<link[^>]*href="([^"]+)"/i);
      link = alt ? alt[1] : null;
    } else {
      link = decode(tag(b, 'link'));
    }
    const src = b.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
    const date = decode(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    const published = date ? new Date(date) : null;
    out.push({
      guid: decode(tag(b, 'guid') || tag(b, 'id')) || link,
      title: decode(tag(b, 'title')),
      link: (link || '').replace(/&amp;/g, '&'),
      summary: decode(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 600),
      publishedAt: published && !isNaN(published) ? published.toISOString() : null,
      outlet: src ? decode(src[2]) : null,
      outletUrl: src ? src[1] : null,
      author: decode(tag(b, 'dc:creator') || tag(tag(b, 'author') || '', 'name') || tag(b, 'author')) || null,
    });
  }
  return out;
}

const FUNDING_RE = /\b(raises?|raised|raising|secures?|secured|lands?|landed|closes?|closed|bags?|nabs?|snags?|gets?)\b[^.]{0,60}?(?:[$€£₹]\s?\d|\b(?:pre-seed|seed|series [a-f])\b)|\b(?:pre-seed|seed|series [a-f]) (?:round|funding|financing)\b/i;

export function isFunding(title) {
  return FUNDING_RE.test(title || '');
}

/** "Princeton AI firm AidenAI raises $32M in Series A" -> { company: 'AidenAI', amount: '$32M', round: 'Series A' } */
export function parseFunding(title) {
  const t = (title || '').replace(/^(exclusive|breaking|report|scoop)\s*:\s*/i, '');
  const verb = t.match(/\s(raises?|raised|raising|secures?|secured|lands?|landed|closes?|closed|bags?|nabs?|snags?|gets?|announces?)\b/i);
  let company = null;
  if (verb) {
    const words = t.slice(0, verb.index).replace(/[’']s$/, '').split(/\s+/).filter(Boolean);
    const generic = /^(ai|startup|firm|company|the|a|an|platform|unicorn|maker|developer|based|backed|led|lab|labs)$/i;
    const picked = [];
    for (let i = words.length - 1; i >= 0 && picked.length < 3; i--) {
      const w = words[i].replace(/[,:]$/, '');
      if (/^[A-Z0-9]/.test(w) && !generic.test(w)) picked.unshift(w);
      else if (picked.length) break;
    }
    company = picked.join(' ') || null;
  }
  const amt = t.match(/([$€£₹])\s?(\d+(?:[.,]\d+)?)\s?(million|billion|mn|bn|m|b|k|crore|cr)?\b/i) || t.match(/(\d+(?:\.\d+)?)\s?(million|billion)\s(dollars|euros)/i);
  let amount = null;
  if (amt) {
    if (/[$€£₹]/.test(amt[1])) {
      const unit = (amt[3] || '').toLowerCase();
      const u = { million: 'M', mn: 'M', m: 'M', billion: 'B', bn: 'B', b: 'B', k: 'K', crore: ' Cr', cr: ' Cr' }[unit] || '';
      amount = `${amt[1]}${amt[2]}${u}`;
    } else amount = `${amt[1]} ${amt[2]}`;
  }
  const round = (t.match(/\b(pre-seed|seed|series [a-f]|pre-series [a-f]|growth)\b/i) || [])[1] || null;
  return { company, amount, round: round ? round.replace(/\b\w/g, (c) => c.toUpperCase()).replace('Pre-Seed', 'Pre-seed') : null };
}

/** Google News titles end with " - Outlet". */
function splitOutlet(title, outlet) {
  if (outlet && title.endsWith(` - ${outlet}`)) return title.slice(0, -(outlet.length + 3));
  return title;
}

export function normalizeFeedItem(feed, item) {
  const title = splitOutlet(item.title, item.outlet);
  const devType = feed.kind === 'product' ? 'product' : isFunding(title) ? 'funding' : 'news';
  let outlet = item.outlet;
  if (!outlet) {
    try { outlet = new URL(item.link).hostname.replace(/^www\./, ''); } catch { outlet = feed.id; }
  }
  const publishedAt = item.publishedAt || null;
  return {
    id: `dev:${feed.id}:${hash(item.guid || item.link || title)}`,
    source: feed.kind === 'product' ? 'producthunt' : 'news',
    kind: 'dev',
    devType,
    feed: feed.id,
    url: item.link,
    title,
    body: item.summary,
    outlet,
    author: item.author,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    ...(devType === 'funding' ? { funding: parseFunding(title) } : {}),
    ...(feed.domain ? { domainHint: feed.domain } : {}),
  };
}

/** Fetch every RSS/Atom feed. Each feed is its own source with its own health. */
export async function syncFeeds({ http, now, upsert, record, feeds = DEV_FEEDS, state = null, minIntervalMin = 0 }) {
  const horizon = new Date(Date.parse(now) - 30 * 86400_000).toISOString();
  for (const feed of feeds) {
    // Be polite to publishers: in the fast lane a feed is fetched at most
    // every `minIntervalMin` minutes.
    const cur = state ? (state.cursors[`feed:${feed.id}`] ||= {}) : {};
    if (minIntervalMin && cur.fetchedAt && Date.parse(now) - Date.parse(cur.fetchedAt) < minIntervalMin * 60_000) continue;
    cur.fetchedAt = now;
    try {
      const res = await http.getText(feed.url);
      if (res.notModified) { record(`feed:${feed.id}`, { ok: true, items: 0, notModified: 1 }); continue; }
      const items = parseFeed(res.text);
      if (!items.length && !/<(rss|feed)[\s>]/i.test(res.text)) throw new Error('not a feed (blocked or changed)');
      let n = 0;
      for (const it of items) {
        if (!it.title || !it.link) continue;
        if (it.publishedAt && it.publishedAt < horizon) continue;
        upsert(normalizeFeedItem(feed, it));
        n++;
      }
      record(`feed:${feed.id}`, { ok: true, items: n });
    } catch (err) {
      record(`feed:${feed.id}`, { ok: false, error: err.message });
    }
  }
}

/** Show HN / Launch HN posts that look AI or dev-tool related. */
export async function syncLaunches({ http, state, now, upsert, record }) {
  const key = 'hn:launches';
  const c = (state.cursors[key] ||= {});
  const after = c.createdAfter || Math.floor((Date.parse(now) - 7 * 86400_000) / 1000);
  let newest = after;
  let n = 0;
  try {
    for (const q of [{ tags: 'show_hn' }, { tags: 'story', query: '"Launch HN"' }]) {
      const url = `https://hn.algolia.com/api/v1/search_by_date?tags=${q.tags}${q.query ? `&query=${encodeURIComponent(q.query)}` : ''}&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${after}`)}`;
      const res = await http.get(url, { conditional: false });
      for (const h of res.data?.hits || []) {
        if (h.created_at_i > newest) newest = h.created_at_i;
        const title = h.title || '';
        if (!/^(Show|Launch) HN/i.test(title)) continue;
        upsert({
          id: `dev:hn:${h.objectID}`, source: 'hn', kind: 'dev', devType: 'launch', url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          productUrl: h.url || null, title, body: stripHtml(h.story_text || '').slice(0, 600), outlet: 'Hacker News', author: h.author,
          points: h.points || 0, comments: h.num_comments || 0, createdAt: h.created_at, updatedAt: h.created_at,
        });
        n++;
      }
    }
    c.createdAfter = newest;
    record(key, { ok: true, items: n });
  } catch (err) {
    record(key, { ok: false, error: err.message });
  }
}

/**
 * Brand-new repositories with a little early traction. The search API has
 * its own limit (30 requests/minute), separate from the core quota.
 */
export async function syncNewRepos({ http, now, upsert, record }) {
  const since = new Date(Date.parse(now) - NEW_REPO_WINDOW_DAYS * 86400_000).toISOString().slice(0, 10);
  let n = 0;
  try {
    for (const [i, q] of NEW_REPO_QUERIES.entries()) {
      // The search API allows 30 requests a minute: pace the queries.
      if (i) await new Promise((r) => setTimeout(r, 2200));
      const query = `${q} created:>=${since} stars:${NEW_REPO_STARS} fork:false archived:false`;
      const res = await http.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=15`, { conditional: false });
      for (const r of res.data?.items || []) {
        if (!r.description) continue; // no description, no way to tell what it is
        upsert({
          id: `dev:repo:${r.id}`, source: 'github', kind: 'dev', devType: 'new_repo', url: r.html_url, title: r.full_name,
          body: (r.description || '').slice(0, 400), outlet: 'GitHub', author: r.owner?.login || null, stars: r.stargazers_count,
          language: r.language || null, topics: (r.topics || []).slice(0, 8), createdAt: r.created_at, updatedAt: r.pushed_at || r.updated_at,
        });
        n++;
      }
    }
    record('github:new-repos', { ok: true, items: n });
  } catch (err) {
    record('github:new-repos', { ok: false, error: err.message });
  }
}

export const _limits = LIMITS;
