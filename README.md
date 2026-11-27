# Problem Radar (Fırsat Radarı)

**See what is happening in AI infrastructure and developer tools, see where people are stuck, and find real work you can start today.**

The radar has two streams and connects them:

- **Developments:** funding announcements, new AI products, release notes, media news and brand-new small open-source repositories (found before they collect stars).
- **Needs:** first-hand problems from GitHub issues and Hacker News: who is stuck, what they were trying to do, what blocks them, how they get by today, and whether a fix actually shipped.
- **Opportunities:** where a development meets a need in the same area, the radar opens a card with the evidence on both sides, what already exists, a narrow question to research, the smallest first experiment, a status line and a job size (contribute tonight, weekend prototype, talk to users first).

**Live:** https://canquesse.github.io/problem-radar/ · **Weekly digest (RSS):** https://canquesse.github.io/problem-radar/feed.xml

**Demo walkthrough:** [docs/DEMO.md](docs/DEMO.md) shows the three pilot behaviors on real cards.

Everything runs on free infrastructure: a scheduled GitHub Actions workflow, JSON data on a `data` branch, and GitHub Pages. No paid APIs, no LLM calls.

---

## What a user sees

The site is available in **English and Turkish** (switch in the top bar; it follows the browser language by default). Source excerpts stay in their original language because they are evidence.

- **Overview:** a live radar of every moving card by repository and state, the evidence ladder with counts, and the cards worth trying now, fixes on the way and fixes that just shipped.
- **Problems:** every card, filterable by state and repository, sorted by recent movement, case count or recency.
- **Card detail:** job, blocker, workaround and environment, each a verbatim excerpt with a link to its source. An evidence timeline shows every case, fix and release with the version it applies to, the source's current state and when it was last checked.
- **Follow:** star a card and the *Following* tab shows only state transitions since you last looked, each with the exact comment, PR or release that caused it.
- **Changelog, Weekly digest, Sources:** every transition, an auto-generated weekly digest (also as RSS), and per-source sync health.

Cards say **"3 first-hand cases, 2 verified teams"** instead of claiming independence they cannot prove.

## Developments and opportunities

| Development | Free source |
|---|---|
| Funding | Google News searches for AI infra / dev tool rounds, TechCrunch (AI, Venture), Crunchbase News |
| New AI products | Product Hunt (AI and developer tools), Show HN and Launch HN |
| Release notes | Releases of the 13 watched repositories |
| Media news | SiliconANGLE AI, The Verge AI, Hugging Face blog, TechCrunch |
| New small repos | GitHub search: repositories created in the last 7 days with 5 to 300 stars in LLM, agents, MCP, RAG, inference and LLMOps topics |

- **Syndication:** the same story from many outlets is one development. Funding is grouped by company; other stories by canonical URL and title. A round reported by two or more distinct outlets is marked *verified*; a single outlet stays *single source*.
- **Topics:** 13 areas (inference cost, serving, GPU and hardware, local models, agents, MCP, observability, RAG and memory, fine-tuning, structured output, gateways, security, coding agents). Both developments and needs are tagged by keywords; a watched repository only tips the balance, it never tags on its own.
- **Opportunity states:** *Investigating* (market interest meets first-hand cases), *Demand confirmed* (a need is worth trying, or at least two problems were hit by two or more people), *Being solved upstream* (every linked need has a merged or released fix), *Watching* (a linked fix is disputed).
- **First experiment:** a weekend prototype when a need has a documented workaround, contributing upstream when the fix is already coming, and talking to the reporters first otherwise.
- **Investor interest is not demand.** Funding, launches and news are shown as market signals and never counted as first-hand cases.

## The evidence ladder (needs)

| State | Rule |
|---|---|
| **Early signal** | At least one first-hand report. |
| **Worth trying** | Two or more first-hand cases from different people **and** a documented workaround someone uses today. |
| **Fix coming** | A PR that closes the issue (`fixes #N`, `closes #N`, `resolves #N`, or a "fixed by #N" comment) was merged, but no published stable release contains it yet. |
| **Resolved** | A stable release published after the merge **provably** contains the fix: the compare API says the tag contains the merge commit, or the release notes reference the PR. |
| **Watching** | Sources disagree: the issue was reopened after the fix merged, or someone reports it still happens after the fix. |
| **Withdrawn** | Every reporter retracted their claim. Kept for transparency and counted as a quality miss. |

Rules that keep the ladder honest:

- **A closed issue alone is never "resolved".** Issues closed without a linked merged fix are flagged *closed without fix*.
- **Partial fixes** (`partially fixes #N`, `part of #N`, `related to #N`) never move a card to *Fix coming*. When one ships, the card is marked *narrowed*.
- **One person counts once.** A bare "+1" is not a case. Maintainers confirming a bug do not add cases.
- **Syndicated copies collapse:** the same link (after stripping tracking parameters) or the same text posted again counts as one signal.
- **Retractions** only count when the person who reported a case withdraws it. Nobody else can retract someone's case.
- **Verified team** means the report ties itself to a public project of its own (a link to the reporter's own repository, or "our project: github.com/…"). No profile scraping, no guessing.
- **Pre-releases do not resolve cards.** Users should be able to install the fix from a stable release.

## How it works

```
GitHub REST ─┐                       ┌─> records.json  (stable ids, first/last seen, state history)
             ├─ sync (cursors, ETag) ─┤
HN Algolia ──┘                       └─> cursors.json, etags.json, sources.json
                                              │
                          engine (pure, deterministic)
                     cluster ─> cases ─> fixes ─> releases ─> conflicts ─> state
                                              │
                    pipeline: stable card ids, transitions only, idempotent events
                                              │
                    cards.json · events.json (changelog) · metrics.json
                                              │
                         static site + weekly RSS on GitHub Pages
```

- `src/sources/github.js`: four endpoints per repo, **each with its own cursor**.
  - `issues?since=…&sort=updated&direction=asc` and `issues/comments?since=…&direction=asc`. Ascending order means a page cap never loses data: the next run resumes from the last processed `updated_at`.
  - `pulls?state=closed&sort=updated&direction=desc` has no `since`, so it pages until it passes the cursor.
  - `releases` pages until it reaches a release it already knows.
  - `compare/{tag}...{sha}` verifies that a release contains a fix's merge commit.
- `src/http.js`: authenticated **conditional requests** (`If-None-Match` / `If-Modified-Since`; authenticated 304s don't count against the primary rate limit), `Link` header pagination, backoff on `Retry-After` and `x-ratelimit-*`, retries on 5xx, and a quota floor so a run never spends the last 100 requests.
- `src/sources/hn.js`: Hacker News via the free Algolia API, one `created_at_i` cursor per search term. HN items join a card when they link the GitHub issue or carry the same error signature. HN-only reports become cards only with a concrete error signature.
- `src/extract.js`: rule-based extraction of job, blocker, workaround, environment (tool versions, OS, GPU), error signatures, fix and duplicate references, retractions and "still happening" reports. Every extracted field is a substring of the source text.
- `src/engine.js`: a pure function from records to cards. Same input, same output.
- `src/pipeline.js`: keeps card ids stable when clusters grow or merge, writes an event **only on a state transition**, and derives event ids from `(card, from, to, trigger record)` so reprocessing never duplicates a notification.
- `src/sync.js`: one run. A failing source keeps its last good data and its cursors, is shown as delayed, and does not block the other sources.

### GitHub API budget

`GITHUB_TOKEN` inside Actions is limited to **1,000 requests per hour per repository**. A typical hourly run uses 100 to 180 requests for 13 repositories, so the budget has plenty of headroom. The main saving comes from the cursors: each endpoint asks only for what changed since the last run.

Conditional requests are always sent, but there is a catch worth knowing: `GITHUB_TOKEN` is minted fresh for every run and GitHub's ETags vary by token, so in Actions they rarely produce a 304. Locally (with `gh auth token`) they do. To get 304s in Actions too, add a read-only fine-grained personal access token as the `RADAR_TOKEN` repository secret; the workflow prefers it when present and falls back to `GITHUB_TOKEN` otherwise.

The workflow also:

- runs at minute 17, avoiding the top-of-the-hour scheduler rush, and the UI shows per-source freshness, so a late run is visible;
- uses a `concurrency` group so two syncs never write the data branch at once;
- force-pushes the `data` branch every run and calls the workflow `enable` API, so GitHub's **60-day auto-disable** of scheduled workflows never kicks in.

## Run it locally

Requirements: Node.js 20+ and, optionally, the GitHub CLI (`gh`) for a token. No `npm install` is needed: there are zero dependencies.

```bash
npm test              # scenario tests, offline
npm run sync          # fetch sources into ./data (uses GITHUB_TOKEN or `gh auth token`)
npm run reprocess     # rebuild cards from stored records, no network
npm run dev           # build the site into ./dist and serve it on http://localhost:8080
```

Useful environment variables: `DATA_DIR`, `DIST_DIR`, `SITE_URL`, `GITHUB_TOKEN`, `SKIP_HN=1`.

Watched repositories, search terms and limits live in [`src/config.js`](src/config.js).

## Tests

`npm test` runs the scenarios that have to work before anyone trusts a card:

| Scenario | Expected behavior |
|---|---|
| Two independent reports of one failure | Merge into one card with 2 cases (shared error signature or "duplicate of") |
| Syndicated duplicate | Same link or same text counts once |
| Repeated processing | No new cards, no new events, byte-identical output |
| Wrongly closed issue | Stays unresolved, flagged *closed without fix* |
| Merged but unreleased fix | *Fix coming*; earlier releases, releases without the commit and pre-releases do not resolve it; the right release resolves it exactly once |
| Retracted claim | Card withdrawn, counted as a quality retraction, not a resolution |
| Partial fix | Never *Fix coming*; card narrowed when it ships |
| Reopened issue | Resolved card moves to *Watching* |
| Conflicting sources | "Still happening on vX" after the release moves the card to *Watching* |
| Broken feed | Last good data and cursors kept, source shown as failing, other sources unaffected |

Plus fetcher tests for ETag/304, rate-limit waits, the quota floor, 5xx retries and pagination.

## Metrics

The *Sources* page counts cards past the publish rule, cards moved by new evidence, **genuine resolutions** (a verified release) and **quality retractions** (a reporter withdrew the claim) separately. A retraction is a radar error; a resolution is the radar working. At pilot scale, counts are shown instead of percentages.

## Roadmap

1. **Pilot (now):** one user group (solo developers building AI developer tools), GitHub + Hacker News, a live feed and a weekly RSS digest. Measure whether a card leads to a decision: talking to a user, contributing, or prototyping (the *Did this card lead somewhere?* buttons).
2. **Calibration:** sample both published and held-back cards each week, and report misses as "1 of 5 cards wrong" with the error type, not a percentage.
3. **Workers AI (optional, free tier):** only for ambiguous clusters, bounded to fields and supporting quotes, with rules as the fallback when the quota runs out.
4. **More sources:** company announcement feeds and funding news as separate evidence types that never count as demand.
5. **For dev tool companies (B2B):** the same engine pointed at a company's own repositories **and its competitors'**: where users are stuck right now, which gaps are an opening, and which competitor release just fixed what your users still complain about. The initial repositories are already grouped in competitor pairs (vLLM / SGLang, Ollama / llama.cpp, LangChain / LlamaIndex / Pydantic AI) with that in mind.

## License

MIT
