// Small HTTP client used by every source.
//
// - Conditional requests: remembers ETag / Last-Modified per URL and sends
//   If-None-Match / If-Modified-Since. GitHub does not charge authenticated
//   304 responses against the primary rate limit.
// - Pagination: follows the RFC 5988 `Link: <...>; rel="next"` header.
// - Backoff: honours `Retry-After`, `x-ratelimit-remaining` / `x-ratelimit-reset`
//   and retries 5xx / network errors with exponential backoff.
// - Budget: refuses to spend the last `minRemaining` requests of the quota.

export class RateLimitError extends Error {
  constructor(message, resetAt) {
    super(message);
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export function parseLinkHeader(header) {
  const links = {};
  if (!header) return links;
  for (const part of header.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (m) links[m[2]] = m[1];
  }
  return links;
}

export class HttpClient {
  /**
   * @param {object} opts
   * @param {Function} [opts.fetch]  injectable fetch (tests)
   * @param {Function} [opts.sleep]  injectable sleep (tests)
   * @param {object}   [opts.etags]  persisted { url: { etag, lastModified } }
   * @param {object}   [opts.headers] default headers
   * @param {number}   [opts.minRemaining] quota floor
   * @param {number}   [opts.maxWaitMs] longest rate-limit wait we accept inline
   */
  constructor(opts = {}) {
    this.fetch = opts.fetch || globalThis.fetch;
    this.sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.etags = opts.etags || {};
    this.headers = opts.headers || {};
    this.minRemaining = opts.minRemaining ?? 0;
    this.maxWaitMs = opts.maxWaitMs ?? 60_000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.now = opts.now || (() => Date.now());
    this.stats = { requests: 0, notModified: 0, retries: 0, remaining: null, resetAt: null };
  }

  /**
   * GET a URL. Returns { status, data, headers, notModified }.
   * @param {string} url
   * @param {object} [opts]
   * @param {boolean} [opts.conditional=true]
   */
  /** GET a text body (RSS/Atom). Returns { status, text, notModified }. */
  async getText(url, opts = {}) {
    const r = await this.get(url, { ...opts, text: true });
    return { status: r.status, text: r.data, notModified: r.notModified };
  }

  async get(url, { conditional = true, text: asText = false } = {}) {
    if (this.stats.remaining !== null && this.stats.remaining <= this.minRemaining) {
      throw new RateLimitError(`quota floor reached (${this.stats.remaining} left)`, this.stats.resetAt);
    }
    const headers = { ...this.headers };
    const cached = this.etags[url];
    if (conditional && cached) {
      if (cached.etag) headers['If-None-Match'] = cached.etag;
      if (cached.lastModified) headers['If-Modified-Since'] = cached.lastModified;
    }

    let attempt = 0;
    for (;;) {
      let res;
      try {
        this.stats.requests++;
        res = await this.fetch(url, { headers });
      } catch (err) {
        if (attempt >= this.maxRetries) throw err;
        await this.sleep(1000 * 2 ** attempt++);
        this.stats.retries++;
        continue;
      }
      const h = (name) => (res.headers && res.headers.get ? res.headers.get(name) : null);
      const remaining = h('x-ratelimit-remaining');
      const reset = h('x-ratelimit-reset');
      // Only the core quota guards the budget; search has its own small
      // per-minute bucket that must not trip the core floor.
      const resource = h('x-ratelimit-resource');
      if (!resource || resource === 'core') {
        if (remaining !== null) this.stats.remaining = Number(remaining);
        if (reset !== null) this.stats.resetAt = Number(reset) * 1000;
      }

      if (res.status === 304) {
        this.stats.notModified++;
        return { status: 304, data: null, headers: res.headers, notModified: true };
      }

      if (res.status === 403 || res.status === 429) {
        const retryAfter = h('retry-after');
        let waitMs = null;
        if (retryAfter) waitMs = Number(retryAfter) * 1000;
        else if (remaining === '0' && reset) waitMs = Number(reset) * 1000 - this.now() + 1000;
        if (waitMs !== null || res.status === 429) {
          waitMs = waitMs ?? 60_000;
          if (waitMs > this.maxWaitMs || attempt >= this.maxRetries) {
            throw new RateLimitError(`rate limited on ${url}`, this.now() + waitMs);
          }
          await this.sleep(Math.max(waitMs, 0));
          attempt++;
          this.stats.retries++;
          continue;
        }
      }

      if (res.status >= 500 && attempt < this.maxRetries) {
        await this.sleep(1000 * 2 ** attempt++);
        this.stats.retries++;
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        let body = '';
        try { body = await res.text(); } catch { /* ignore */ }
        throw new HttpError(res.status, url, body.slice(0, 300));
      }

      let data;
      const text = await res.text();
      if (asText) data = text;
      else {
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw new HttpError(res.status, url, 'invalid JSON: ' + text.slice(0, 120));
        }
      }
      const etag = h('etag');
      const lastModified = h('last-modified');
      if (etag || lastModified) this.etags[url] = { etag: etag || undefined, lastModified: lastModified || undefined };
      return { status: res.status, data, headers: res.headers, notModified: false };
    }
  }

  /**
   * Iterate pages following `Link: rel="next"`.
   * Yields { items, page, notModified, url }.
   */
  async *paginate(url, { maxPages = 5 } = {}) {
    let next = url;
    let page = 0;
    while (next && page < maxPages) {
      // Only the first page is conditional: later page URLs embed cursors that
      // shift as data arrives, so cached validators would rarely match.
      const res = await this.get(next, { conditional: page === 0 });
      page++;
      if (res.notModified) {
        yield { items: [], page, notModified: true, url: next };
        return;
      }
      yield { items: Array.isArray(res.data) ? res.data : [], page, notModified: false, url: next };
      const links = parseLinkHeader(res.headers && res.headers.get ? res.headers.get('link') : null);
      next = links.next || null;
    }
    if (next) yield { items: [], page, truncated: true, url: next };
  }
}
