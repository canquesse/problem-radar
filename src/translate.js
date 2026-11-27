// English -> Turkish with a free local model.
//
// NLLB-200 (distilled, 600M parameters, quantized) runs on the CPU inside
// GitHub Actions through transformers.js: no API, no key, no cost. One
// sentence takes about a second, so translations are cached forever
// (translations.json, keyed by a hash of the English text) and each run only
// translates what is new, highest priority first, up to a time budget.
//
// Source quotes stay available in the original language on every card: the
// translation is for reading, the original is the evidence.

import { hash } from './store.js';

const MODEL = 'Xenova/nllb-200-distilled-600M';
let translator = null;

async function model() {
  if (!translator) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = process.env.MODEL_CACHE_DIR || '.model-cache';
    translator = await pipeline('translation', MODEL, { dtype: 'q8' });
  }
  return translator;
}

export const trKey = (text) => hash('tr', (text || '').trim());

/** Trim the runaway text small translation models sometimes append. */
export function cleanTranslation(src, out) {
  let t = (out || '').trim();
  // Cut at the first character from a script that cannot be Turkish.
  const bad = t.search(/[Ѐ-ӿ؀-ۿ֐-׿一-鿿぀-ヿऀ-ॿ]/);
  if (bad > 0) t = t.slice(0, bad).trim();
  // Keep as many sentences as the source had.
  const srcSentences = Math.max(1, (src.match(/[.!?](\s|$)/g) || []).length || 1);
  const parts = t.split(/(?<=[.!?])\s+/);
  if (parts.length > srcSentences) t = parts.slice(0, srcSentences).join(' ');
  // Drop a word repeated three or more times in a row ("SAP, SAP, SAP").
  t = t.replace(/(\b[\wçğıöşüÇĞİÖŞÜ'’-]+\b)(?:[,\s]+\1\b){2,}/gi, '$1');
  if (t.length > src.length * 2.2 + 20) t = t.slice(0, Math.round(src.length * 1.8)).replace(/\s+\S*$/, '') + '…';
  return t;
}

/**
 * Translate texts in priority order until `budgetMs` runs out.
 * texts: array of English strings (duplicates fine). Returns count translated.
 */
export async function translatePending(state, texts, { budgetMs = 120_000, translateFn = null, log = () => {} } = {}) {
  state.translations ||= {};
  const todo = [];
  const seen = new Set();
  for (const raw of texts) {
    const text = (raw || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 3) continue;
    const k = trKey(text);
    if (state.translations[k] || seen.has(k)) continue;
    seen.add(k);
    todo.push({ k, text: text.slice(0, 400) });
  }
  if (!todo.length) return 0;
  const start = Date.now();
  const run = translateFn || (async (text) => {
    const tr = await model();
    const n = Math.ceil(text.split(/\s+/).length * 2.2) + 8;
    const out = await tr(text, { src_lang: 'eng_Latn', tgt_lang: 'tur_Latn', max_new_tokens: Math.min(n, 220), repetition_penalty: 1.3, no_repeat_ngram_size: 3 });
    return out[0]?.translation_text || '';
  });
  let done = 0;
  for (const item of todo) {
    if (Date.now() - start > budgetMs) break;
    try {
      const out = cleanTranslation(item.text, await run(item.text));
      if (out) { state.translations[item.k] = out; done++; }
    } catch (err) {
      log(`  translate failed: ${err.message}`);
      break;
    }
  }
  log(`translated ${done} of ${todo.length} pending texts`);
  return done;
}

/** Look up a cached translation. */
export function tr(state, text) {
  if (!text) return null;
  return state.translations?.[trKey(text.replace(/\s+/g, ' ').trim())] || null;
}
