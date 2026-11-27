// Optional language model for writing ideas and Turkish translations.
//
// Uses any OpenAI-compatible chat endpoint. By default that is Google's
// Gemini API free tier (key from https://aistudio.google.com/apikey, stored
// as the GEMINI_API_KEY repository secret). Without a key, nothing here runs
// and the radar falls back to its rules and the local translation model.
//
// Every answer is cached by the content it was asked about, so the same
// cluster or title is never sent twice, and each run has a request budget.

const DEFAULT_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export function llmConfig(env = process.env) {
  const key = env.LLM_API_KEY || env.GEMINI_API_KEY || '';
  if (!key) return null;
  return {
    key,
    url: env.LLM_URL || DEFAULT_URL,
    models: (env.LLM_MODEL || 'gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest').split(',').map((m) => m.trim()).filter(Boolean),
    maxRequests: Number(env.LLM_MAX_REQUESTS || 20),
    minGapMs: Number(env.LLM_MIN_GAP_MS || 13000), // free tier: about 5 requests a minute
  };
}

export class LLM {
  constructor(cfg, { fetch = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} } = {}) {
    this.cfg = cfg;
    this.fetch = fetch;
    this.sleep = sleep;
    this.log = log;
    this.used = 0;
    this.last = 0;
    this.modelIndex = 0;
    this.disabled = false;
  }

  get available() { return !this.disabled && this.used < this.cfg.maxRequests; }

  /** Ask for a JSON object. Returns the parsed object or null. */
  async json(system, user) {
    if (!this.available) return null;
    const wait = this.last + this.cfg.minGapMs - Date.now();
    if (wait > 0) await this.sleep(wait);
    for (let attempt = 0; attempt < 3 && this.modelIndex < this.cfg.models.length; attempt++) {
      this.used++;
      this.last = Date.now();
      const model = this.cfg.models[this.modelIndex];
      let res;
      try {
        res = await this.fetch(this.cfg.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.cfg.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        });
      } catch (err) {
        this.log(`  llm: network error ${err.message}`);
        return null;
      }
      if (res.status === 404 || res.status === 400) { this.log(`  llm: model ${model} unavailable (${res.status}), trying the next one`); this.modelIndex++; continue; }
      if (res.status === 429) {
        // Free tier per-minute limit: wait a minute once, then give up for this run.
        if (!this.waited) { this.waited = true; this.log('  llm: rate limited, waiting a minute'); await this.sleep(62_000); continue; }
        this.log('  llm: rate limited again, stopping for this run'); this.disabled = true; return null;
      }
      if (res.status === 401 || res.status === 403) { this.log('  llm: key rejected'); this.disabled = true; return null; }
      if (!res.ok) { this.log(`  llm: HTTP ${res.status}`); return null; }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      try {
        return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      } catch {
        this.log('  llm: answer was not JSON');
        return null;
      }
    }
    return null;
  }
}

/**
 * A small instruct model running locally (Qwen2.5-1.5B-Instruct, 4-bit, CPU,
 * through transformers.js). No key, no cost. It writes in English; the local
 * translation model turns its answers into Turkish. One cluster per prompt,
 * within a time budget per run.
 */
export class LocalLLM {
  constructor({ model = process.env.LOCAL_LLM_MODEL || 'onnx-community/Qwen2.5-1.5B-Instruct', budgetMs = 240_000, log = () => {} } = {}) {
    this.model = model;
    this.budgetMs = budgetMs;
    this.log = log;
    this.local = true;
    this.started = null;
    this.gen = null;
    this.used = 0;
    this.disabled = false;
  }

  get available() { return !this.disabled && (!this.started || Date.now() - this.started < this.budgetMs); }

  async json(system, user) {
    if (!this.available) return null;
    this.started ||= Date.now();
    try {
      if (!this.gen) {
        const { pipeline, env } = await import('@huggingface/transformers');
        env.cacheDir = process.env.MODEL_CACHE_DIR || '.model-cache';
        this.gen = await pipeline('text-generation', this.model, { dtype: 'q4' });
      }
      this.used++;
      const out = await this.gen([{ role: 'system', content: system }, { role: 'user', content: user }], { max_new_tokens: 180, do_sample: false });
      const text = out[0]?.generated_text?.at(-1)?.content || '';
      const m = text.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch (err) {
      this.log(`  local llm: ${err.message}`);
      if (!this.gen) this.disabled = true;
      return null;
    }
  }
}

const IDEA_SYSTEM = `You review clusters of real requests that people posted online (Stack Exchange, community forums, Hacker News).
For each cluster decide whether it reveals an opportunity for a NEW product, startup or open-source project.
Say no for: plain technical support ("how do I configure X", "why does my code fail"), homework, opinions, news, or a missing feature that only the maintainers of one existing product can add.
Say yes only when several people (or one person explicitly asking for a tool, or saying they would pay) need something that a new tool, service or device could provide.
Never invent facts: base everything on the quotes. Answer in JSON only.`;

/**
 * Judge and write ideas for candidate clusters, in batches. Results are cached
 * in state.llmIdeas by cluster signature.
 */
export async function writeIdeas(state, candidates, llm, { domainName = (d) => d, log = () => {} } = {}) {
  state.llmIdeas ||= {};
  // A stronger (remote) model re-judges what the small local model decided.
  const todo = candidates.filter((c) => !state.llmIdeas[c.signature] || (!llm.local && state.llmIdeas[c.signature].local)).slice(0, 80);
  if (llm.local) {
    // Small local model: one cluster at a time, English answers.
    for (const c of todo) {
      if (!llm.available) break;
      const out = await llm.json(IDEA_SYSTEM, `Requests (${domainName(c.domain)}):
${c.evidence.slice(0, 5).map((e) => `- (${e.source}) ${(e.quote || e.title).slice(0, 200)}`).join('\n')}
Is this an opportunity for a new product, startup or project (not tech support)? Return {"is_idea":true|false,"type":"startup"|"product"|"project","idea":"A ... (one line)","who":"who needs it","problem":"the pain in one sentence","why_open":"why it seems unserved, from the requests only","first_step":"smallest first step"}`);
      if (!out) continue;
      state.llmIdeas[c.signature] = {
        isIdea: !!out.is_idea, type: ['startup', 'product', 'project'].includes(out.type) ? out.type : null,
        ideaEn: String(out.idea || '').slice(0, 200), whoEn: String(out.who || '').slice(0, 200), problemEn: String(out.problem || '').slice(0, 300),
        whyOpenEn: String(out.why_open || '').slice(0, 300), firstStepEn: String(out.first_step || '').slice(0, 300), local: true,
      };
    }
    log(`local llm: judged ${llm.used} clusters this run, ${Object.keys(state.llmIdeas).length} cached`);
    return;
  }
  for (let i = 0; i < todo.length && llm.available; i += 8) {
    const batch = todo.slice(i, i + 8);
    const user = `Clusters:\n${batch.map((c, k) => `#${k + 1} [${domainName(c.domain)} / ${c.sub}] ${c.people} people\n${c.evidence.slice(0, 5).map((e) => `- (${e.source}, ${e.kind}) ${(e.quote || e.title).slice(0, 220)}`).join('\n')}`).join('\n\n')}

Return {"items":[{"n":1,"is_idea":true|false,"type":"startup"|"product"|"project","idea_en":"one line, starts with A/An","idea_tr":"same in natural Turkish","who_tr":"who needs it, in Turkish","problem_tr":"the pain in one Turkish sentence","why_open_tr":"why it seems unserved, in Turkish, from the quotes only","first_step_tr":"smallest first step in Turkish"}]} with one item per cluster.`;
    const out = await llm.json(IDEA_SYSTEM, user);
    if (!out?.items) continue;
    for (const it of out.items) {
      const c = batch[(it.n || 0) - 1];
      if (!c) continue;
      state.llmIdeas[c.signature] = {
        isIdea: !!it.is_idea, type: ['startup', 'product', 'project'].includes(it.type) ? it.type : null,
        ideaEn: String(it.idea_en || '').slice(0, 200), ideaTr: String(it.idea_tr || '').slice(0, 200),
        whoTr: String(it.who_tr || '').slice(0, 200), problemTr: String(it.problem_tr || '').slice(0, 300),
        whyOpenTr: String(it.why_open_tr || '').slice(0, 300), firstStepTr: String(it.first_step_tr || '').slice(0, 300),
      };
    }
  }
  log(`llm: judged ${Object.keys(state.llmIdeas).length} clusters in total, ${llm.used} requests this run`);
}

/** Translate titles to Turkish in batches of 40; fills state.translations. */
export async function translateBatch(state, texts, llm, keyOf, { log = () => {} } = {}) {
  let done = 0;
  for (let i = 0; i < texts.length && llm.available; i += 40) {
    const batch = texts.slice(i, i + 40);
    const out = await llm.json(
      'You translate short English texts (titles, questions, news headlines) into natural Turkish. Keep product names, code and numbers as they are. Answer in JSON only.',
      `Translate each item. Return {"items":[{"n":1,"tr":"..."}]}.\n${batch.map((t, k) => `${k + 1}. ${t.slice(0, 300)}`).join('\n')}`,
    );
    for (const it of out?.items || []) {
      const src = batch[(it.n || 0) - 1];
      if (src && it.tr) { state.translations[keyOf(src)] = String(it.tr).slice(0, 500); done++; }
    }
  }
  log(`llm: translated ${done} texts`);
  return done;
}
