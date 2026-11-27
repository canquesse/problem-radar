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

// ---------------------------------------------------------------------------
// Developments: what is changing in the market. All free, no keys.
//
// News and funding come from RSS feeds plus Google News searches. Google News
// returns the same story from many outlets, which is exactly what the
// syndication rule needs: one funding round reported by 12 sites is one event.

const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const DEV_FEEDS = [
  // Funding (investor interest)
  { id: 'gnews-funding-infra', kind: 'news', url: gnews('(raises OR "seed round" OR "series A" OR "series B" OR funding) ("AI infrastructure" OR inference OR LLM OR GPU OR "AI agents") when:14d') },
  { id: 'gnews-funding-devtools', kind: 'news', url: gnews('(raises OR "seed round" OR "series A" OR funding) ("developer tools" OR "developer platform" OR observability OR "open source" AI) when:14d') },
  { id: 'crunchbase-news', kind: 'news', url: 'https://news.crunchbase.com/feed/' },
  { id: 'techcrunch-ai', kind: 'news', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'techcrunch-venture', kind: 'news', url: 'https://techcrunch.com/category/venture/feed/' },
  // Media and product news
  { id: 'siliconangle-ai', kind: 'news', url: 'https://siliconangle.com/category/ai/feed/' },
  { id: 'theverge-ai', kind: 'news', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'huggingface-blog', kind: 'news', url: 'https://huggingface.co/blog/feed.xml' },
  // New AI products
  { id: 'producthunt-ai', kind: 'product', url: 'https://www.producthunt.com/feed?category=artificial-intelligence' },
  { id: 'producthunt-devtools', kind: 'product', url: 'https://www.producthunt.com/feed?category=developer-tools' },
];

// Show HN / Launch HN posts that look AI or dev-tool related.
export const HN_LAUNCH_KEYWORDS = /\b(ai|llm|llms|gpt|agent|agents|mcp|rag|inference|model|models|embedding|vector|gpu|fine-?tun\w*|eval\w*|prompt|copilot|devtools?|sdk|api)\b/i;

// Brand-new small repositories, found before they collect stars.
export const NEW_REPO_QUERIES = [
  'topic:llm', 'topic:ai-agents', 'topic:mcp', 'topic:rag', 'topic:llm-inference', 'topic:llmops',
];
export const NEW_REPO_WINDOW_DAYS = 7;
export const NEW_REPO_STARS = '5..300';

// ---------------------------------------------------------------------------
// Topics connect developments to needs. Keywords are matched on whole words.
// `tools` are known solutions shown as "what already exists"; `question` is
// the narrow hypothesis to research when a development meets a need.

export const TOPICS = [
  {
    id: 'inference-cost', name: { en: 'Inference cost & spend tracking', tr: 'Çıkarım maliyeti ve harcama takibi' },
    keywords: ['cost', 'costs', 'spend', 'spending', 'billing', 'invoice', 'invoices', 'pricing', 'token usage', 'usage tracking', 'budget', 'budgets', 'finops', 'chargeback', 'ai economy', 'unit economics'],
    repos: [],
    tools: [
      { name: 'LiteLLM cost tracking', url: 'https://docs.litellm.ai/docs/proxy/cost_tracking', covers: { en: 'Per-key and per-team spend through a proxy', tr: 'Proxy üzerinden anahtar ve ekip bazında harcama' } },
      { name: 'Langfuse cost tracking', url: 'https://langfuse.com/docs/observability/features/token-and-cost-tracking', covers: { en: 'Token and cost per trace', tr: 'İz başına token ve maliyet' } },
      { name: 'OpenMeter', url: 'https://github.com/openmeterio/openmeter', covers: { en: 'Usage metering and billing', tr: 'Kullanım ölçümü ve faturalama' } },
    ],
    question: { en: 'Do small AI teams still reconcile provider invoices against their own usage logs by hand?', tr: 'Küçük AI ekipleri sağlayıcı faturasıyla kendi kullanım kayıtları arasındaki farkı hâlâ elle mi açıklıyor?' },
  },
  {
    id: 'serving', name: { en: 'Inference serving & throughput', tr: 'Model sunma ve verim' },
    keywords: ['inference', 'ai infrastructure', 'compute', 'throughput', 'latency', 'serving', 'inference server', 'kv cache', 'batching', 'tokens per second', 'speculative decoding', 'quantization', 'prefill', 'decode', 'scheduler'],
    repos: ['vllm-project/vllm', 'sgl-project/sglang'],
    tools: [
      { name: 'vLLM', url: 'https://github.com/vllm-project/vllm', covers: { en: 'High-throughput serving with paged attention', tr: 'Sayfalı attention ile yüksek verimli sunum' } },
      { name: 'SGLang', url: 'https://github.com/sgl-project/sglang', covers: { en: 'Fast serving with structured generation', tr: 'Yapılandırılmış üretimle hızlı sunum' } },
      { name: 'TensorRT-LLM', url: 'https://github.com/NVIDIA/TensorRT-LLM', covers: { en: 'NVIDIA-optimized inference', tr: 'NVIDIA için optimize çıkarım' } },
    ],
    question: { en: 'Which serving setups still need hand-tuning that teams repeat on every model upgrade?', tr: 'Hangi sunum kurulumları her model güncellemesinde ekiplerin tekrarladığı elle ayar gerektiriyor?' },
  },
  {
    id: 'gpu-hardware', name: { en: 'GPU memory & hardware support', tr: 'GPU belleği ve donanım desteği' },
    keywords: ['oom', 'out of memory', 'cuda', 'rocm', 'gpu', 'gpus', 'vram', 'h100', 'a100', 'amd', 'metal', 'npu', 'tpu', 'blackwell', 'nvidia'],
    repos: [],
    tools: [
      { name: 'llama.cpp', url: 'https://github.com/ggml-org/llama.cpp', covers: { en: 'Broad hardware backends (CUDA, ROCm, Metal, Vulkan)', tr: 'Geniş donanım desteği (CUDA, ROCm, Metal, Vulkan)' } },
      { name: 'vLLM', url: 'https://github.com/vllm-project/vllm', covers: { en: 'NVIDIA, AMD and TPU serving', tr: 'NVIDIA, AMD ve TPU üzerinde sunum' } },
    ],
    question: { en: 'Which hardware and memory limits block teams from running the model they actually want?', tr: 'Hangi donanım ve bellek sınırları ekiplerin gerçekten istedikleri modeli çalıştırmasını engelliyor?' },
  },
  {
    id: 'local-models', name: { en: 'Running models locally', tr: 'Modelleri yerelde çalıştırma' },
    keywords: ['local model', 'local models', 'on-device', 'gguf', 'ollama', 'llama.cpp', 'offline', 'laptop', 'self-hosted', 'self hosted', 'edge'],
    repos: ['ollama/ollama', 'ggml-org/llama.cpp'],
    tools: [
      { name: 'Ollama', url: 'https://github.com/ollama/ollama', covers: { en: 'One-command local models', tr: 'Tek komutla yerel model' } },
      { name: 'llama.cpp', url: 'https://github.com/ggml-org/llama.cpp', covers: { en: 'Portable C/C++ inference', tr: 'Taşınabilir C/C++ çıkarım' } },
    ],
    question: { en: 'Where does running a new open model locally still break on day one?', tr: 'Yeni bir açık modeli yerelde çalıştırmak ilk gün hâlâ nerede kırılıyor?' },
  },
  {
    id: 'agents', name: { en: 'Agent frameworks & orchestration', tr: 'Ajan çatıları ve orkestrasyon' },
    keywords: ['agent', 'agents', 'agentic', 'multi-agent', 'tool call', 'tool calls', 'tool calling', 'function calling', 'orchestration', 'workflow', 'workflows', 'durable execution'],
    repos: ['langchain-ai/langchain', 'run-llama/llama_index', 'pydantic/pydantic-ai'],
    tools: [
      { name: 'LangGraph', url: 'https://github.com/langchain-ai/langgraph', covers: { en: 'Stateful agent graphs', tr: 'Durumlu ajan grafikleri' } },
      { name: 'Pydantic AI', url: 'https://github.com/pydantic/pydantic-ai', covers: { en: 'Typed agents with durable execution', tr: 'Tipli ajanlar ve kalıcı yürütme' } },
      { name: 'LlamaIndex', url: 'https://github.com/run-llama/llama_index', covers: { en: 'Agents over your data', tr: 'Verin üzerinde ajanlar' } },
    ],
    question: { en: 'Which agent failures do teams still debug by reading raw logs?', tr: 'Ekipler hangi ajan hatalarını hâlâ ham logları okuyarak ayıklıyor?' },
  },
  {
    id: 'mcp', name: { en: 'MCP & tool integrations', tr: 'MCP ve araç entegrasyonları' },
    keywords: ['mcp', 'model context protocol', 'mcp server', 'mcp servers', 'tool server', 'connector', 'connectors'],
    repos: ['modelcontextprotocol/python-sdk'],
    tools: [
      { name: 'MCP Python SDK', url: 'https://github.com/modelcontextprotocol/python-sdk', covers: { en: 'Official server and client SDK', tr: 'Resmi sunucu ve istemci SDK' } },
      { name: 'FastMCP', url: 'https://github.com/jlowin/fastmcp', covers: { en: 'High-level server framework', tr: 'Üst seviye sunucu çatısı' } },
    ],
    question: { en: 'What breaks when teams move an MCP server from a demo to production (auth, transport, cancellation)?', tr: 'Ekipler bir MCP sunucusunu demodan üretime taşırken ne kırılıyor (kimlik doğrulama, taşıma, iptal)?' },
  },
  {
    id: 'observability', name: { en: 'Observability, tracing & evals', tr: 'Gözlemlenebilirlik, izleme ve değerlendirme' },
    keywords: ['tracing', 'trace', 'traces', 'observability', 'monitoring', 'eval', 'evals', 'evaluation', 'telemetry', 'opentelemetry', 'logging', 'dashboard'],
    repos: ['langfuse/langfuse'],
    tools: [
      { name: 'Langfuse', url: 'https://github.com/langfuse/langfuse', covers: { en: 'Open-source tracing, evals, prompt management', tr: 'Açık kaynak izleme, değerlendirme, prompt yönetimi' } },
      { name: 'Arize Phoenix', url: 'https://github.com/Arize-ai/phoenix', covers: { en: 'Tracing and evals on OpenTelemetry', tr: 'OpenTelemetry tabanlı izleme ve değerlendirme' } },
    ],
    question: { en: 'Which questions about a production LLM app can teams still not answer from their traces?', tr: 'Ekipler üretimdeki bir LLM uygulaması hakkında hangi soruları izlerinden hâlâ cevaplayamıyor?' },
  },
  {
    id: 'rag-memory', name: { en: 'RAG, retrieval & memory', tr: 'RAG, getirme ve bellek' },
    keywords: ['rag', 'retrieval', 'vector', 'vectors', 'embedding', 'embeddings', 'chunk', 'chunking', 'memory', 'context window', 'knowledge base', 'rerank', 'reranker', 'documents'],
    repos: [],
    tools: [
      { name: 'LlamaIndex', url: 'https://github.com/run-llama/llama_index', covers: { en: 'Indexing and retrieval pipelines', tr: 'İndeksleme ve getirme hatları' } },
      { name: 'pgvector', url: 'https://github.com/pgvector/pgvector', covers: { en: 'Vector search in Postgres', tr: "Postgres'te vektör arama" } },
    ],
    question: { en: 'Where does retrieval quality silently degrade without teams noticing?', tr: 'Getirme kalitesi ekipler fark etmeden nerede sessizce bozuluyor?' },
  },
  {
    id: 'fine-tuning', name: { en: 'Fine-tuning & training', tr: 'İnce ayar ve eğitim' },
    keywords: ['fine-tune', 'fine-tuning', 'finetune', 'finetuning', 'training', 'lora', 'qlora', 'rlhf', 'grpo', 'sft', 'dpo', 'distillation', 'reward model', 'post-training'],
    repos: ['huggingface/trl', 'unslothai/unsloth'],
    tools: [
      { name: 'TRL', url: 'https://github.com/huggingface/trl', covers: { en: 'SFT, DPO, GRPO trainers', tr: 'SFT, DPO, GRPO eğiticileri' } },
      { name: 'Unsloth', url: 'https://github.com/unslothai/unsloth', covers: { en: 'Fast, memory-light fine-tuning', tr: 'Hızlı ve az bellekli ince ayar' } },
    ],
    question: { en: 'Which model families still break assistant-only or chat-template training out of the box?', tr: 'Hangi model aileleri asistan-odaklı ya da sohbet şablonlu eğitimi kutudan çıktığı haliyle hâlâ bozuyor?' },
  },
  {
    id: 'structured-output', name: { en: 'Structured output & parsing', tr: 'Yapılandırılmış çıktı ve ayrıştırma' },
    keywords: ['json schema', 'structured output', 'structured outputs', 'response_format', 'parse', 'parsing', 'pydantic', 'validation', 'schema'],
    repos: ['openai/openai-python'],
    tools: [
      { name: 'OpenAI structured outputs', url: 'https://github.com/openai/openai-python', covers: { en: 'Schema-constrained responses', tr: 'Şemaya bağlı yanıtlar' } },
      { name: 'Outlines', url: 'https://github.com/dottxt-ai/outlines', covers: { en: 'Constrained generation for any model', tr: 'Her model için kısıtlı üretim' } },
    ],
    question: { en: 'Where do schema-validated outputs still fail in ways teams patch by hand?', tr: 'Şemayla doğrulanan çıktılar ekiplerin elle yamaladığı şekilde hâlâ nerede bozuluyor?' },
  },
  {
    id: 'gateway', name: { en: 'Gateways, routing & rate limits', tr: 'Ağ geçitleri, yönlendirme ve hız limitleri' },
    keywords: ['gateway', 'proxy', 'routing', 'router', 'fallback', 'fallbacks', 'rate limit', 'rate limits', '429', 'retries', 'load balancing', 'provider', 'providers', 'openai-compatible'],
    repos: ['BerriAI/litellm'],
    tools: [
      { name: 'LiteLLM', url: 'https://github.com/BerriAI/litellm', covers: { en: 'One API for 100+ providers with fallbacks', tr: 'Yedekli, 100+ sağlayıcı için tek API' } },
      { name: 'OpenRouter', url: 'https://openrouter.ai', covers: { en: 'Hosted multi-provider routing', tr: 'Barındırılan çok sağlayıcılı yönlendirme' } },
    ],
    question: { en: 'Which provider differences still leak through "OpenAI-compatible" gateways?', tr: '"OpenAI uyumlu" ağ geçitlerinden hangi sağlayıcı farkları hâlâ sızıyor?' },
  },
  {
    id: 'security', name: { en: 'AI security & guardrails', tr: 'AI güvenliği ve korkuluklar' },
    keywords: ['security', 'prompt injection', 'guardrail', 'guardrails', 'jailbreak', 'pii', 'compliance', 'secrets', 'oauth', 'authorization', 'authentication', 'sandbox', 'vulnerability'],
    repos: [],
    tools: [
      { name: 'Guardrails AI', url: 'https://github.com/guardrails-ai/guardrails', covers: { en: 'Validators for LLM inputs and outputs', tr: 'LLM girdi ve çıktıları için doğrulayıcılar' } },
      { name: 'LLM Guard', url: 'https://github.com/protectai/llm-guard', covers: { en: 'Prompt-injection and PII scanning', tr: 'Prompt injection ve kişisel veri taraması' } },
    ],
    question: { en: 'Which agent permissions do teams grant broadly today because scoping them is too hard?', tr: 'Ekipler bugün hangi ajan yetkilerini, daraltmak çok zor olduğu için geniş veriyor?' },
  },
  {
    id: 'coding-agents', name: { en: 'Coding agents & dev workflows', tr: 'Kodlama ajanları ve geliştirici akışları' },
    keywords: ['coding agent', 'coding agents', 'code review', 'ide', 'copilot', 'code generation', 'developer tools', 'devtools', 'pull request', 'ci', 'terminal'],
    repos: [],
    tools: [
      { name: 'Continue', url: 'https://github.com/continuedev/continue', covers: { en: 'Open-source coding assistant', tr: 'Açık kaynak kodlama asistanı' } },
      { name: 'Aider', url: 'https://github.com/Aider-AI/aider', covers: { en: 'Pair programming in the terminal', tr: 'Terminalde eşli programlama' } },
    ],
    question: { en: 'Which parts of review and CI do teams still not trust coding agents with?', tr: 'Ekipler kod incelemesi ve CI’ın hangi kısımlarında kodlama ajanlarına hâlâ güvenmiyor?' },
  },
];
