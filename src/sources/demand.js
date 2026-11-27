// Demand signals beyond bug reports: people asking for a tool, saying they
// would pay, looking for an alternative, or asking how to do something.
//
//   Hacker News   free Algolia API, phrase searches ("is there a tool", ...)
//   Stack Overflow free Stack Exchange API, newest questions per AI tag
//   GitHub        feature requests from the watched repositories (already
//                 fetched by the GitHub source, classified here)
//   GDELT         free worldwide news search (65 languages), for developments

import { HN_LAUNCH_KEYWORDS, TOPICS } from '../config.js';
import { cleanText } from '../extract.js';
import { stripHtml } from './hn.js';
import { isFunding, parseFunding } from './developments.js';

export const ASK_PHRASES = [
  'is there a tool', 'is there an app', 'is there a library', 'is there a service', 'looking for a tool', 'looking for an alternative',
  'alternative to', 'I would pay', "I'd pay", 'would pay for', 'I wish there was', 'anyone know of a', 'how do you handle', 'how do you manage',
  'how are you handling', 'what do you use for', 'does anyone have a good way',
];

const PAY_RE = /\b(i'?d pay|i would pay|would pay for|happy to pay|shut up and take my money|willing to pay)\b/i;
const SEEK_RE = /\b(is there (?:a|an|any) (?:tool|app|library|service|way|product)|looking for (?:a|an) (?:tool|alternative|solution|library|service)|alternative to|i wish there (?:was|were)|anyone know of|what do you use for|how (?:do|are) you (?:handle|handling|manage|managing|deal|dealing))\b/i;

export function askKind(text) {
  if (PAY_RE.test(text)) return 'would_pay';
  if (SEEK_RE.test(text)) return 'seeking';
  return 'question';
}

/** HN stories and comments where someone asks for a tool or says they would pay. */
export async function syncHNAsks({ http, state, now, upsert, record }) {
  const key = 'hn:asks';
  let n = 0;
  try {
    for (const phrase of ASK_PHRASES) {
      const c = (state.cursors[`hn:ask:${phrase}`] ||= {});
      const after = c.createdAfter || Math.floor((Date.parse(now) - 30 * 86400_000) / 1000);
      let newest = after;
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(`"${phrase}"`)}&tags=(story,comment)&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${after}`)}`;
      const res = await http.get(url, { conditional: false });
      for (const h of res.data?.hits || []) {
        if (h.created_at_i > newest) newest = h.created_at_i;
        const body = cleanText(stripHtml(h.comment_text || h.story_text || ''));
        const title = h.title || h.story_title || '';
        const text = `${h.title || ''} ${body}`;
        if (!HN_LAUNCH_KEYWORDS.test(text) || !new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)) continue;
        // Keep the sentence around the ask: it is the evidence.
        const sentence = body.split(/(?<=[.!?])\s+/).find((s) => s.toLowerCase().includes(phrase.toLowerCase().replace(/^i'd/, "i'd"))) || body.slice(0, 300);
        upsert({
          id: `ask:hn:${h.objectID}`, source: 'hn', kind: 'ask', askKind: askKind(text), url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          title: h.title || sentence.slice(0, 140), context: title, body: body.slice(0, 1500), quote: sentence.slice(0, 300), author: h.author,
          createdAt: h.created_at, updatedAt: h.created_at,
        });
        n++;
      }
      c.createdAfter = newest;
    }
    record(key, { ok: true, items: n });
  } catch (err) {
    record(key, { ok: false, error: err.message });
  }
}

export const SO_TAGS = ['large-language-model', 'langchain', 'openai-api', 'ollama', 'llama-index', 'huggingface-transformers', 'retrieval-augmented-generation', 'model-context-protocol'];

/** Newest Stack Overflow questions per AI tag (300 requests/day without a key: plenty for hourly). */
export async function syncStackOverflow({ http, state, now, upsert, record }) {
  const key = 'stackoverflow';
  let n = 0;
  try {
    for (const tag of SO_TAGS) {
      const c = (state.cursors[`so:${tag}`] ||= {});
      const from = c.fromDate || Math.floor((Date.parse(now) - 30 * 86400_000) / 1000);
      const url = `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&tagged=${encodeURIComponent(tag)}&site=stackoverflow&pagesize=100&fromdate=${from}&filter=withbody`;
      const res = await http.get(url, { conditional: false });
      let newest = from;
      for (const q of res.data?.items || []) {
        if (q.creation_date > newest) newest = q.creation_date;
        const body = cleanText(stripHtml(q.body || '')).slice(0, 1500);
        upsert({
          id: `ask:so:${q.question_id}`, source: 'stackoverflow', kind: 'ask', askKind: askKind(`${q.title} ${body}`), url: q.link,
          title: stripHtml(q.title), body, quote: stripHtml(q.title), author: q.owner?.display_name || null, tags: q.tags || [],
          score: q.score, answers: q.answer_count, answered: !!q.is_answered, views: q.view_count,
          createdAt: new Date(q.creation_date * 1000).toISOString(), updatedAt: new Date((q.last_activity_date || q.creation_date) * 1000).toISOString(),
        });
        n++;
      }
      c.fromDate = newest;
      if (res.data?.backoff) await new Promise((r) => setTimeout(r, res.data.backoff * 1000));
    }
    record(key, { ok: true, items: n });
  } catch (err) {
    record(key, { ok: false, error: err.message });
  }
}

/** Feature requests already fetched from the watched repositories. */
const FEATURE_RE = /^\s*\[(feature|rfc|enhancement|proposal|feature request)[^\]]*\]|\b(feature request|would be (?:nice|great|useful)|it would be (?:nice|great|helpful)|please (?:add|support)|support for|add support)\b/i;
export function isFeatureRequest(issue) {
  if (issue.kind !== 'issue') return false;
  const labels = (issue.labels || []).map((l) => l.toLowerCase());
  return labels.some((l) => /enhancement|feature/.test(l)) || FEATURE_RE.test(`${issue.title}\n${(issue.body || '').slice(0, 400)}`);
}

/**
 * GDELT DOC 2.0: worldwide news in 65 languages, free, no key. One query per
 * topic in the full lane, spaced 6 seconds apart as GDELT asks.
 */
export async function syncGdelt({ http, now, upsert, record, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const key = 'gdelt';
  let n = 0;
  let failures = 0;
  try {
    for (const [i, topic] of TOPICS.entries()) {
      if (i) await sleep(6000);
      const kws = topic.keywords.filter((k) => k.length > 3 && !/^\d+$/.test(k)).slice(0, 4).map((k) => (k.includes(' ') ? `"${k}"` : k));
      const query = `(${kws.join(' OR ')}) (AI OR LLM OR "machine learning")`;
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=60&timespan=1d&sort=DateDesc`;
      let data;
      try {
        const res = await http.getText(url);
        data = JSON.parse(res.text);
      } catch { failures++; continue; } // rate notice or a blip: skip this topic, keep going
      for (const a of data.articles || []) {
        const seen = a.seendate ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}T${a.seendate.slice(9, 11)}:${a.seendate.slice(11, 13)}:${a.seendate.slice(13, 15)}Z` : now;
        const funding = isFunding(a.title);
        upsert({
          id: `dev:gdelt:${Buffer.from(a.url).toString('base64url').slice(-40)}`, source: 'gdelt', kind: 'dev', devType: funding ? 'funding' : 'news',
          feed: 'gdelt', url: a.url, title: a.title, body: '', outlet: a.domain, language: a.language, country: a.sourcecountry,
          createdAt: seen, updatedAt: seen, ...(funding ? { funding: parseFunding(a.title) } : {}),
        });
        n++;
      }
    }
    if (failures === TOPICS.length) throw new Error('every GDELT query failed (rate limited?)');
    record(key, { ok: true, items: n });
  } catch (err) {
    record(key, { ok: false, error: err.message });
  }
}
