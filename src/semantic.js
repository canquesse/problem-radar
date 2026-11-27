// A small, free, local language model for meaning-level comparisons.
//
// all-MiniLM-L6-v2 (quantized, ~23 MB) runs on the CPU inside GitHub Actions
// through transformers.js: no API, no key, no cost. It turns a sentence into
// a 384-number vector; two texts about the same thing get vectors that point
// the same way, even when the words differ ("Acme raises $20M" vs "Acme lands
// $20 million seed round").
//
// Vectors are cached per record in embeddings.json (int8, base64), so each
// run only embeds what is new.

import { hash } from './store.js';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
let extractor = null;

async function model() {
  if (!extractor) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = process.env.MODEL_CACHE_DIR || '.model-cache';
    extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  }
  return extractor;
}

export function encode(vec) {
  const b = Buffer.alloc(vec.length);
  for (let i = 0; i < vec.length; i++) b.writeInt8(Math.max(-127, Math.min(127, Math.round(vec[i] * 127))), i);
  return b.toString('base64');
}

export function decode(s) {
  const b = Buffer.from(s, 'base64');
  const v = new Float32Array(b.length);
  let norm = 0;
  for (let i = 0; i < b.length; i++) { v[i] = b.readInt8(i) / 127; norm += v[i] * v[i]; }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

export function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function centroid(vecs) {
  const c = new Float32Array(vecs[0].length);
  for (const v of vecs) for (let i = 0; i < c.length; i++) c[i] += v[i];
  let norm = 0;
  for (let i = 0; i < c.length; i++) norm += c[i] * c[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < c.length; i++) c[i] /= norm;
  return c;
}

/**
 * Make sure every item has a cached vector. items: [{ id, text }].
 * Returns Map(id -> Float32Array). `embedFn` can be injected in tests.
 */
export async function ensureEmbeddings(state, items, { embedFn = null, log = () => {} } = {}) {
  state.embeddings ||= {};
  const missing = items.filter((it) => {
    const e = state.embeddings[it.id];
    return !e || e.h !== hash(it.text);
  });
  if (missing.length) {
    const embed = embedFn || (async (texts) => {
      const ex = await model();
      const out = await ex(texts, { pooling: 'mean', normalize: true });
      return out.tolist();
    });
    for (let i = 0; i < missing.length; i += 64) {
      const batch = missing.slice(i, i + 64);
      const vecs = await embed(batch.map((b) => b.text.slice(0, 512)));
      batch.forEach((b, k) => { state.embeddings[b.id] = { h: hash(b.text), v: encode(vecs[k]) }; });
    }
    log(`embedded ${missing.length} new texts`);
  }
  const map = new Map();
  for (const it of items) if (state.embeddings[it.id]) map.set(it.id, decode(state.embeddings[it.id].v));
  return map;
}

/** Drop vectors for records that no longer exist. */
export function pruneEmbeddings(state, liveIds) {
  for (const id of Object.keys(state.embeddings || {})) if (!liveIds.has(id)) delete state.embeddings[id];
}
