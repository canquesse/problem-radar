// Hacker News source via the free Algolia API (no key required).
//
// One cursor per search term: `createdAfter` (unix seconds). Each run asks for
// items created after the cursor, newest first, and advances the cursor to the
// newest item seen. Hits are re-checked client-side so fuzzy matches that do
// not literally mention the term are dropped.

import { LIMITS } from '../config.js';
import { cleanText } from '../extract.js';

const API = 'https://hn.algolia.com/api/v1/search_by_date';

export const hnId = (objectID) => `hn:item:${objectID}`;

export function stripHtml(html) {
  return (html || '')
    .replace(/<p>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>[^<]*<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function normalizeHit(hit, repo) {
  const isStory = (hit._tags || []).includes('story');
  const tags = (hit._tags || []).filter((t) => ['ask_hn', 'show_hn', 'story', 'comment'].includes(t));
  return {
    id: hnId(hit.objectID),
    source: 'hn',
    repo,
    kind: isStory ? 'hn_story' : 'hn_comment',
    url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    title: isStory ? hit.title || '' : hit.story_title || '',
    body: cleanText(stripHtml(isStory ? hit.story_text : hit.comment_text)).slice(0, LIMITS.maxBodyChars),
    linkedUrl: isStory ? hit.url || null : hit.story_url || null,
    author: hit.author || null,
    createdAt: hit.created_at,
    updatedAt: hit.updated_at || hit.created_at,
    parentId: !isStory && hit.story_id ? hnId(hit.story_id) : null,
    hnTags: tags,
  };
}

export function mentionsTerm(rec, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w])${esc}([^\\w]|$)`, 'i').test(`${rec.title}\n${rec.body}\n${rec.linkedUrl || ''}`);
}

/** Sync all HN terms for one repo. */
export async function syncHN({ http, state, repo, terms, now, upsert }) {
  let items = 0;
  for (const term of terms) {
    const key = `hn:${term}`;
    const c = (state.cursors[key] ||= {});
    const after = c.createdAfter || Math.floor((Date.parse(now) - LIMITS.initialLookbackDays * 86400_000) / 1000);
    let newest = after;
    for (let page = 0; page < LIMITS.hnMaxPagesPerQuery; page++) {
      const url = `${API}?query=${encodeURIComponent(`"${term}"`)}&tags=(story,comment)&typoTolerance=false&hitsPerPage=100&page=${page}&numericFilters=${encodeURIComponent(`created_at_i>${after}`)}`;
      const res = await http.get(url, { conditional: false });
      const hits = res.data?.hits || [];
      for (const hit of hits) {
        if (hit.created_at_i > newest) newest = hit.created_at_i;
        const rec = normalizeHit(hit, repo);
        if (!mentionsTerm(rec, term)) continue;
        upsert(rec);
        items++;
      }
      if (page + 1 >= (res.data?.nbPages || 0)) break;
    }
    c.createdAfter = newest;
  }
  return { items };
}
