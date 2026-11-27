// Central configuration for the radar. Everything here is plain data so it can
// be reviewed in a PR and changed without touching the pipeline code.

/**
 * Watched repositories. Picked from AI infrastructure and developer tooling,
 * grouped so that direct competitors sit next to each other. That grouping is
 * the seed of the later B2B angle (a dev tool company watching its own repo
 * and its competitors' repos side by side).
 *
 * `hn` holds the Hacker News search terms that map a discussion to this repo.
 */
export const REPOS = [
  // Inference servers
  { repo: 'vllm-project/vllm', group: 'inference-server', hn: ['vllm'] },
  { repo: 'sgl-project/sglang', group: 'inference-server', hn: ['sglang'] },
  // Local model runners
  { repo: 'ollama/ollama', group: 'local-runner', hn: ['ollama'] },
  { repo: 'ggml-org/llama.cpp', group: 'local-runner', hn: ['llama.cpp'] },
  // LLM gateways / SDKs
  { repo: 'BerriAI/litellm', group: 'gateway', hn: ['litellm'] },
  { repo: 'openai/openai-python', group: 'sdk', hn: ['openai-python', 'openai python sdk'] },
  { repo: 'modelcontextprotocol/python-sdk', group: 'sdk', hn: ['mcp python sdk', 'fastmcp'] },
  // Agent / RAG frameworks
  { repo: 'langchain-ai/langchain', group: 'framework', hn: ['langchain'] },
  { repo: 'run-llama/llama_index', group: 'framework', hn: ['llamaindex', 'llama_index'] },
  { repo: 'pydantic/pydantic-ai', group: 'framework', hn: ['pydantic-ai', 'pydantic ai'] },
  // Observability / training
  { repo: 'langfuse/langfuse', group: 'observability', hn: ['langfuse'] },
  { repo: 'huggingface/trl', group: 'training', hn: ['huggingface trl'] },
  { repo: 'unslothai/unsloth', group: 'training', hn: ['unsloth'] },
];

export const LIMITS = {
  // How far back the very first sync of an endpoint looks.
  initialLookbackDays: 10,
  // Hard cap on pages per endpoint per run. Cursors make the next run resume.
  maxPagesPerEndpoint: 4,
  perPage: 100,
  // Stop calling GitHub when the remaining primary quota drops below this.
  // GITHUB_TOKEN inside Actions has 1,000 requests/hour per repository.
  minRemainingQuota: 100,
  // Release-containment checks (compare API) per run, across all repos.
  maxCompareChecksPerRun: 40,
  // Records unrelated to any card are pruned after this many days.
  pruneAfterDays: 45,
  // Body text kept per record (characters). Keeps the data branch small.
  maxBodyChars: 4000,
  hnMaxPagesPerQuery: 2,
};

// Evidence ladder. Order matters: higher index = further along.
export const STATES = ['retracted', 'early_signal', 'worth_trying', 'watching', 'fix_coming', 'resolved'];

export const STATE_LABELS = {
  retracted: 'Withdrawn',
  early_signal: 'Early signal',
  worth_trying: 'Worth trying',
  watching: 'Watching',
  fix_coming: 'Fix coming',
  resolved: 'Resolved',
};

// States that make a card eligible for the weekly digest.
export const PUBLISHED_STATES = ['worth_trying', 'fix_coming', 'resolved'];
