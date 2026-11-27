// Place items in a domain sub-area by meaning.
//
// Each sub-area has a short description; the local model embeds it once. An
// item goes to the sub-area whose description it is closest to, with a small
// boost for keyword hits and for the domain its source belongs to (a question
// on electronics.stackexchange is probably electronics). Items that are not
// close to anything stay unassigned instead of being forced somewhere.

import { DOMAINS, SUBS, domainOfSource } from './domains.js';
import { cosine } from './semantic.js';

export const CLASSIFY = { minScore: 0.3 };

export function subPrototypes() {
  return SUBS.map((s) => ({ id: `sub:${s.key}`, text: `${s.name.en}: ${s.desc}`, sub: s }));
}

const kwCache = new Map();
function keywordHits(sub, text) {
  if (!kwCache.has(sub.key)) kwCache.set(sub.key, sub.keywords.map((k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i')));
  return kwCache.get(sub.key).filter((re) => re.test(text)).length;
}

/**
 * @param {Float32Array} vec  item vector
 * @param {string} text       item text (for keyword hits)
 * @param {string} source     e.g. "se:electronics", "forum:forum.kicad.info", "hn"
 * @param {Map} protoVecs     sub key -> vector
 * @returns {{ domain, sub, score } | null}
 */
export function classify(vec, text, source, protoVecs, hintDomain = null) {
  if (!vec) return null;
  const prior = hintDomain || domainOfSource(source) || (source === 'stackoverflow' ? 'computer' : null);
  // A post on a domain's own forum or Q&A site stays in that domain: only the
  // sub-area is chosen by meaning. Open sources (Hacker News, news) must be
  // close enough to some sub-area to be placed at all.
  const fixed = !!(domainOfSource(source) || source === 'stackoverflow');
  let best = null;
  for (const s of SUBS) {
    if (fixed && s.domain !== prior) continue;
    const pv = protoVecs.get(s.key);
    if (!pv) continue;
    let score = cosine(vec, pv) + Math.min(keywordHits(s, text), 3) * 0.05 + (prior && prior === s.domain ? 0.08 : 0);
    if (!best || score > best.score) best = { domain: s.domain, sub: s.id, score };
  }
  return best && (fixed || best.score >= CLASSIFY.minScore) ? { ...best, score: Math.round(best.score * 100) / 100 } : null;
}

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);
