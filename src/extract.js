// Rule-based extraction. No LLM: every field is a verbatim substring of the
// source text (or null), so any claim on a card can be checked by opening the
// source. Text from GitHub and Hacker News is treated strictly as data.

// Sentence boundaries: punctuation, blank lines, or a new markdown block
// (list item, heading, quote). Single line wraps are joined back together.
const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n\s*\n|\n(?=\s*(?:[-*+>#|]|\d+[.)])\s)/;

export function sentences(text) {
  return (text || '')
    .replace(/```[\s\S]*?```/g, ' ') // drop code blocks from prose analysis
    .replace(/\*\*|__/g, '')
    .split(SENTENCE_SPLIT)
    .map((s) => s.replace(/\s*\n\s*/g, ' ').replace(/^\s*(?:[-*+>]|#{1,6}|\d+[.)])\s+/, '').trim())
    .filter((s) => s.length > 3);
}

function firstMatchSentence(text, re, maxLen = 240) {
  for (const s of sentences(text)) {
    if (re.test(s)) return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
  }
  return null;
}

/** Strip markdown noise for the excerpts we show. */
export function cleanText(text) {
  return (text || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Environment

const VERSIONED_TOOLS = [
  'vllm', 'sglang', 'ollama', 'llama.cpp', 'litellm', 'langchain', 'langchain-core', 'llama-index', 'llama_index',
  'pydantic-ai', 'pydantic', 'langfuse', 'trl', 'unsloth', 'transformers', 'torch', 'pytorch', 'cuda', 'rocm',
  'python', 'node', 'nodejs', 'openai', 'mcp', 'fastmcp', 'triton', 'flashinfer', 'flash-attn', 'xformers',
  'accelerate', 'peft', 'deepspeed', 'docker', 'nvidia driver', 'driver',
];
const OS_RE = /\b(ubuntu|debian|centos|rhel|fedora|arch linux|alpine|macos|mac os|os x|windows(?: 1[01])?|wsl2?|linux|android|ios)\b/gi;
const HW_RE = /\b(a100|h100|h200|b200|gb200|l4|l40s?|t4|v100|a10g?|rtx ?\d{4}(?: ti)?|mi\d{3}x?|apple m[1-4](?: (?:pro|max|ultra))?|m[1-4] (?:pro|max|ultra)|tpu v\d\w?|gaudi ?\d?)\b/gi;

export function extractEnvironment(text) {
  const t = text || '';
  const versions = {};
  for (const tool of VERSIONED_TOOLS) {
    const esc = tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^\\w-])${esc}\\s*(?:version)?\\s*(?:==|=|:|@|v|\\s)\\s*v?(\\d+\\.\\d+(?:\\.\\d+)?(?:[.-]?(?:post|rc|dev|a|b)\\d*)?)`, 'i');
    const m = t.match(re);
    if (m) versions[tool.replace('pytorch', 'torch').replace('nodejs', 'node')] = m[1];
  }
  const os = [...new Set((t.match(OS_RE) || []).map((s) => s.toLowerCase().replace('mac os', 'macos').replace('os x', 'macos')))];
  const hardware = [...new Set((t.match(HW_RE) || []).map((s) => s.toUpperCase().replace(/\s+/g, ' ')))];
  return { versions, os, hardware };
}

export function hasEnvironment(env) {
  return Object.keys(env.versions).length > 0 || env.os.length > 0 || env.hardware.length > 0;
}

// ---------------------------------------------------------------------------
// Error signature: used to cluster independent reports of the same failure.

const ERROR_LINE_RE = /\b([A-Z][A-Za-z0-9_]*(?:Error|Exception|Fault|Panic))\b\s*[:(]\s*([^\n]{4,200})/;
const RUST_GO_PANIC_RE = /\b(panic|fatal error|segmentation fault|core dumped|illegal memory access|out of memory|CUDA error)\b[: ]*([^\n]{0,160})/i;

export function normalizeSignature(type, message) {
  const msg = (message || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/(['"`])(?:(?!\1).){1,80}\1/g, '<v>') // quoted values vary per user
    .replace(/(?:\/[\w.-]+)+/g, '<path>')
    .replace(/0x[0-9a-f]+/g, '<hex>')
    .replace(/\b\d+(?:\.\d+)*\b/g, '<n>')
    .replace(/[^a-z<>_ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10)
    .join(' ');
  return `${type.toLowerCase()}: ${msg}`;
}

export function extractErrorSignature(text) {
  const t = text || '';
  const m = t.match(ERROR_LINE_RE);
  if (m) {
    const sig = normalizeSignature(m[1], m[2]);
    // Generic one-word messages do not identify a failure.
    if (sig.split(' ').length >= 4) return { signature: sig, line: `${m[1]}: ${m[2].trim()}`.slice(0, 220) };
  }
  const p = t.match(RUST_GO_PANIC_RE);
  if (p && p[2] && p[2].trim().length > 12) {
    const sig = normalizeSignature(p[1].replace(/\s+/g, '_'), p[2]);
    if (sig.split(' ').length >= 4) return { signature: sig, line: `${p[1]}: ${p[2].trim()}`.slice(0, 220) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Job, blocker, workaround

const JOB_RE = /\b(?:i'?m|i am|we'?re|we are|i was|we were)\s+(?:trying|attempting|working|looking)\s+to\b|\b(?:i|we)\s+(?:want|need|wanted|needed)\s+to\b|\bmy use ?case\b|\bour use ?case\b|\bwhen (?:running|serving|using|deploying|calling|loading|fine-?tuning|training)\b/i;
const BLOCKER_RE = /\b(fails?|failing|failed|error|errors|crash(?:es|ed|ing)?|hangs?|hanging|stuck|freez(?:e|es|ing)|broken|breaks|regression|doesn'?t work|does not work|not working|cannot|can'?t|unable to|oom|out of memory|timeout|timed out|segfault|leak(?:s|ing)?|wrong|incorrect|garbage|slow(?:er|down)?|degrad(?:ed|ation))\b/i;
const WORKAROUND_RE = /\b(work-?around|work around|temporary fix|temp fix|as a stopgap|for now,? (?:i|we)|currently,? (?:i|we)|(?:i|we) ended up|downgrad(?:e|ed|ing) to|pinn?(?:ed|ing) (?:to|the)|monkey-?patch(?:ed|ing)?|revert(?:ed|ing) to|rolling back to|rolled back to|hack(?:ed)? around|setting [`'"]?[\w.-]+[`'"]? to|disabl(?:e|ed|ing) [\w.-]+ (?:fixes|solves|avoids|works))\b/i;

export function extractJob(text) {
  return firstMatchSentence(text, JOB_RE);
}

export function extractBlocker(title, text) {
  const err = extractErrorSignature(text);
  if (err) return err.line;
  const fromBody = firstMatchSentence(text, BLOCKER_RE);
  if (fromBody) return fromBody;
  const t = (title || '').replace(/^\s*\[[^\]]+\]\s*:?\s*/, '').trim();
  return BLOCKER_RE.test(t) ? t : null;
}

export function extractWorkaround(text) {
  return firstMatchSentence(text, WORKAROUND_RE);
}

// ---------------------------------------------------------------------------
// Classification of reports

const FEATURE_TITLE_RE = /^\s*\[(feature|rfc|roadmap|doc|docs|documentation|usage|question|misc|new model|installation\?|discussion|proposal|tracking|good first issue)[^\]]*\]/i;
const BUG_TITLE_RE = /^\s*\[(bug|regression|crash|performance|perf)[^\]]*\]|\bbug\b/i;
const NON_BUG_LABELS = /^(enhancement|feature|feature request|question|documentation|docs|rfc|roadmap|discussion|good first issue|help wanted|new-model|usage|stale)$/i;
const BUG_LABELS = /^(bug|regression|crash|type: bug|kind\/bug|bug 🐛|🐛 bug|confirmed|performance)$/i;

/** Is a GitHub issue a first-hand problem report (vs feature request / question)? */
export function isProblemReport(issue) {
  const title = issue.title || '';
  const labels = issue.labels || [];
  if (labels.some((l) => BUG_LABELS.test(l))) return true;
  if (FEATURE_TITLE_RE.test(title)) return false;
  if (labels.some((l) => NON_BUG_LABELS.test(l))) return false;
  if (BUG_TITLE_RE.test(title)) return true;
  const text = `${title}\n${issue.body || ''}`;
  return !!extractErrorSignature(text) || BLOCKER_RE.test(title);
}

const ME_TOO_RE = /\b(same (?:issue|problem|error|bug|thing|here)|(?:also|too)\s+(?:seeing|getting|happening|hitting|experiencing|facing|having)|(?:i|we)\s+(?:can\s+)?(?:also\s+)?(?:reproduce|repro|confirm)|i'?m (?:also )?(?:seeing|getting|hitting|facing|having) (?:this|the same)|we'?re (?:also )?(?:seeing|hitting|getting|facing) (?:this|the same)|happens (?:to me|for me|for us|on my|on our)|(?:i|we) (?:ran|run|have run) into (?:this|the same)|(?:i|we) (?:have|had|get|got) the same|same for me|me too|affects us|affecting us)\b/i;
const FIRST_HAND_RE = /\b(?:i|we|my|our)\b[^.\n]{0,80}\b(see|seeing|get|getting|got|hit|hitting|ran into|run into|experienc\w*|reproduce\w*|encounter\w*|fail\w*|crash\w*|stuck|broke|breaks)\b/i;

/** A comment that adds a new first-hand case (not a bare "+1"). */
export function isFirstHandMeToo(text) {
  const t = cleanText(text);
  if (!ME_TOO_RE.test(t)) return false;
  const env = extractEnvironment(t);
  // A bare "+1" / "same here" carries no evidence. Require some substance.
  return t.length >= 60 || hasEnvironment(env) || !!extractErrorSignature(t);
}

/** Hacker News text describing the author's own problem. */
export function isFirstHandHN(text) {
  const t = cleanText(text);
  return FIRST_HAND_RE.test(t) && BLOCKER_RE.test(t);
}

const RETRACTION_RE = /\b(my (?:bad|mistake|fault)|user error|not an? (?:actual )?bug|was (?:a|my|an?) (?:own )?(?:config|configuration|setup|environment|env|installation)\s*(?:issue|problem|error|mistake)|(?:it )?works (?:now|fine|correctly) (?:after|with|once|when) (?:i|we|fixing|updating|correcting|changing|reinstalling)|can(?:'|no)?t reproduce (?:it )?(?:anymore|any ?more|on (?:latest|main|master|current))|cannot reproduce (?:it )?(?:anymore|any ?more|on (?:latest|main|master|current))|false alarm|turned out (?:to be|it was) (?:my|our|an? (?:issue|problem|bug) (?:on|in|with) (?:my|our))|i (?:was|am) wrong|retract(?:ing|ed)?|please disregard|nevermind|never mind)\b/i;

export function isRetraction(text) {
  return RETRACTION_RE.test(cleanText(text));
}

const STILL_RE = /\b(still (?:happening|broken|seeing|occurs|occurring|an issue|getting|reproduc\w*|present|failing|crash\w*|hangs?|not working)|not (?:fixed|resolved) (?:in|on|by|with)|(?:issue|problem|bug) (?:persists|remains)|regress(?:ed|ion) (?:in|on|with|since)|(?:re)?appears? again|came back in|is back in)\b/i;

export function isStillHappening(text) {
  return STILL_RE.test(cleanText(text));
}

// ---------------------------------------------------------------------------
// Cross references

/**
 * Parse fix references in a PR title/body.
 * Returns { full: [ {repo, number} ], partial: [ {repo, number} ] }.
 * `repo` is null for same-repo `#123` references.
 */
export function parseFixRefs(text, defaultRepo) {
  const t = text || '';
  const full = new Map();
  const partial = new Map();
  const re = /(?:([\w.-]+\/[\w.-]+)#(\d+)|(?<![\w/])#(\d+)|https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+))/g;
  for (const m of t.matchAll(re)) {
    const ref = { repo: m[1] || m[4] || defaultRepo, number: Number(m[2] || m[3] || m[5]) };
    const key = `${ref.repo}#${ref.number}`;
    const prefix = t.slice(Math.max(0, m.index - 48), m.index).toLowerCase();
    if (/\b(?:partially|partly)\s+(?:fix(?:es|ed)?|address(?:es|ed)?|resolve[sd]?|close[sd]?)\s*:?\s*$/.test(prefix)) partial.set(key, ref);
    else if (/\b(?:close[sd]?|fix(?:es|ed)?|resolve[sd]?)\s*:?\s*$/.test(prefix)) full.set(key, ref);
    else if (/\b(?:part of|related(?: to)?|refs?|towards|follow-?up (?:to|for)|addresses part of)\s*:?\s*$/.test(prefix)) partial.set(key, ref);
  }
  for (const k of full.keys()) partial.delete(k);
  return { full: [...full.values()], partial: [...partial.values()] };
}

/** "Fixed by #123" / "fixed in #123" style mentions inside issue comments. */
export function parseFixedByRefs(text, defaultRepo) {
  const out = [];
  const re = /\b(?:fixed|resolved|addressed|solved)\s+(?:by|in|via|with)\s+(?:(?:pr|pull request)\s*)?(?:([\w.-]+\/[\w.-]+)#(\d+)|#(\d+)|https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+))/gi;
  for (const m of (text || '').matchAll(re)) {
    out.push({ repo: m[1] || m[4] || defaultRepo, number: Number(m[2] || m[3] || m[5]) });
  }
  return out;
}

export function parseDuplicateOf(text, defaultRepo) {
  const out = [];
  const re = /\b(?:duplicate (?:of|to)|dup(?:e)? of|same as)\s+(?:([\w.-]+\/[\w.-]+)#(\d+)|#(\d+)|https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+))/gi;
  for (const m of (text || '').matchAll(re)) {
    out.push({ repo: m[1] || m[4] || defaultRepo, number: Number(m[2] || m[3] || m[5]) });
  }
  return out;
}

/** GitHub issue URLs mentioned anywhere (used to tie HN items to issues). */
export function parseIssueUrls(text) {
  const out = [];
  const re = /https?:\/\/(?:www\.)?github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+)/gi;
  for (const m of (text || '').matchAll(re)) out.push({ repo: m[1], number: Number(m[2]) });
  return out;
}

/**
 * Team evidence: the reporter ties the report to a public project of their
 * own. Returns the owner of that project, or null. Deliberately strict: no
 * profile scraping, only what the report itself shows.
 */
export function extractTeam(text, author, watchedRepo) {
  const t = text || '';
  const watchedOwner = (watchedRepo || '').split('/')[0].toLowerCase();
  const re = /https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/gi;
  for (const m of t.matchAll(re)) {
    const owner = m[1].toLowerCase();
    if (owner === watchedOwner) continue;
    if (author && owner === author.toLowerCase()) return owner;
    const idx = m.index;
    const before = t.slice(Math.max(0, idx - 80), idx).toLowerCase();
    if (/\b(our|my)\s+(project|repo|repository|library|app|application|product|service|framework|tool|startup|company)\b/.test(before)) return owner;
  }
  return null;
}

/** Version a fix or case applies to, best effort, for the watched tool. */
export function applicableVersion(env, repo) {
  const name = (repo || '').split('/')[1]?.toLowerCase();
  if (!name) return null;
  const aliases = { 'llama_index': ['llama-index', 'llama_index'], 'python-sdk': ['mcp', 'fastmcp'], 'openai-python': ['openai'] };
  for (const key of aliases[name] || [name]) if (env.versions[key]) return `${key} ${env.versions[key]}`;
  return null;
}
