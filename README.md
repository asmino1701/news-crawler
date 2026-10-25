# news-crawler

A small web crawler for the first 30 entries of [Hacker News](https://news.ycombinator.com/),
exposed as an HTTP API and a minimal web page. It extracts each entry's rank, title, points and number of comments,
applies one of two filters and records every request in a SQLite database.

- **long-titles**: titles with more than five words, ordered by number of comments.
- **short-titles**: titles with five words or fewer, ordered by points.

## Requirements

- Node.js **22.13 or newer** (uses the built-in `node:sqlite` module). Developed on Node 24.

## Getting started

```sh
npm install
npm start          # web page and API on http://localhost:3000
npm test           # run the test suite once
npm run test:watch # run tests in watch mode
npm run typecheck  # type-check sources and tests
```

Configuration through environment variables:

| Variable        | Default    | Description                         |
| --------------- | ---------- | ----------------------------------- |
| `PORT`          | `3000`     | Port the HTTP server listens on     |
| `DATABASE_PATH` | `usage.db` | SQLite file where usage is recorded |

## API

### `GET /`

Serves the web page (`public/index.html`): one button per filter, a table with the filtered
entries and a table with the recorded usage, newest first.

### `GET /entries?filter=long-titles|short-titles`

Crawls the front page and returns the filtered entries.

```sh
curl "http://localhost:3000/entries?filter=long-titles"
```

```json
[
  { "rank": 5, "title": "We should be more ambitious with the software we build", "points": 574, "comments": 535 },
  { "rank": 19, "title": "America has lost 200k of jobs in media, film and the arts. How much is AI?", "points": 428, "comments": 455 }
]
```

| Status | When                                                                 |
| ------ | -------------------------------------------------------------------- |
| `200`  | Crawl succeeded                                                      |
| `400`  | `filter` is missing or unknown; the message lists the valid filters |
| `502`  | Hacker News could not be fetched or parsed; body is `{ "error": … }` |

### `GET /usage`

Returns every recorded request, oldest first.

```sh
curl "http://localhost:3000/usage"
```

```json
[
  { "requestedAt": "2026-10-25T15:28:52.802Z", "filter": "long-titles", "durationMs": 397, "resultCount": 24, "error": null },
  { "requestedAt": "2026-10-25T15:31:04.118Z", "filter": "short-titles", "durationMs": 5003, "resultCount": 0, "error": "The operation was aborted due to timeout" }
]
```

Any other path or method responds `404`. An unexpected server error responds `500` with `{ "error": … }`.

## Project structure

```
src/
  domain/      Pure business rules: Entry, countWords, filters
  crawler/     fetchFrontPage (I/O), parseEntries (pure), crawlerService (orchestration)
  usage/       UsageLog, UsageRepository and its SQLite implementation
  http/        requestHandler (routes), nodeAdapter (node:http glue), httpStatus
  shared/      Small helpers shared across modules
  server.ts    Composition root: creates real dependencies and starts the server
public/        index.html: minimal web page (plain HTML and JavaScript)
tests/         Mirrors src/; fixtures/ holds a saved copy of the front page
```

Request flow: `server.ts` → `nodeAdapter` → `requestHandler` → `crawlerService`
→ `fetchFrontPage` → `parseEntries` → first 30 → `applyFilter` → `UsageRepository.record`.

## Design decisions and assumptions

### Domain rules

- **Word count**: a title is split on whitespace and only tokens that contain at least one
  letter or number count (`/[\p{L}\p{N}]/u`). Symbol-only tokens such as `-` or `|` are ignored,
  so `"This is - a self-explained example"` has 5 words. Hyphenated words count once.
- **Numbers count as words** (`"SpeedCrunch 1.1"` has 2 words): the statement only excludes
  symbol-only tokens. The Unicode classes also make non-English titles count correctly.
- **Descending order**: "ordered by comments/points" is read as highest first, which is the
  useful order for a news ranking.
- **Ties are broken by rank** (ascending), so the output is deterministic and keeps the
  front page's own order among equal values.
- **The 30-entry limit is applied before filtering**: filters work on the first 30 entries of the
  page, never on entries beyond them.
- **Filters are data, not branches**: each filter is an `EntryFilter { name, predicate, sortBy }`
  and `applyFilter` is the single implementation. `FILTERS` is the only list of filters, used
  both to look a filter up by name and to build the 400 error message, so adding a filter is
  one new object.

### Scraping

- **One HTTP request per crawl and no headless browser**: Hacker News is server-rendered, so a
  plain `fetch` plus `cheerio` is enough and much cheaper than running a browser.
- **Honest scraping**: requests send an identifying `User-Agent`
  (`news-crawler/1.0 (+https://github.com/asmino1701/news-crawler)`) and time out after 5 seconds.
- **Parsing rules**: the title is the first direct link inside `.titleline`, which excludes the
  site domain. Job posts have no points or comments and "discuss" means no comments; both
  are read as `0`. `&nbsp;` and singular forms (`1 point`, `1 comment`) are handled.
- **No cache**: every request crawls the page live. A short in-memory cache would reduce load on
  Hacker News, but it is not required and is left as future work.

### Architecture

- **Functional style**: pure functions, `readonly` types, `toSorted` instead of in-place sorting,
  and factories returning plain objects (`createCrawlerService`, `createSqliteUsageRepository`,
  `createRequestHandler`) instead of classes.
- **Dependency injection for all I/O**: `fetch`, the database connection and the clock are passed
  in, so every module is tested without network or disk. `server.ts` is the only place where
  the real implementations are created.
- **Injected clock (`now`)**: one time source gives both the request timestamp and the duration,
  which makes usage logs deterministic in tests.
- **Usage is recorded on success and on failure**: the crawler service records the error message
  and rethrows the *same* error, so the HTTP layer decides the response and nothing fails
  silently. Only fetching and parsing are inside the `try`, so a failure while recording a
  successful crawl is never logged as a crawl error.
- **Invalid filters are rejected before any work and are not recorded**: the requirement is to
  store the *applied* filter, and a 400 request applies none and does no crawl.

### Storage

- **`node:sqlite` instead of `better-sqlite3`**: Node's built-in SQLite (`DatabaseSync`) has the
  same synchronous API with no native dependency to compile. The trade-off is requiring
  Node 22.13+ (declared in `engines`), where it is available without a flag.
- **Schema**: one table, created with `CREATE TABLE IF NOT EXISTS` when the repository is created.
  No migration tool is needed for a single table.

  ```sql
  usage_logs(id INTEGER PRIMARY KEY AUTOINCREMENT, requested_at TEXT NOT NULL,
             filter TEXT NOT NULL, duration_ms INTEGER NOT NULL,
             result_count INTEGER NOT NULL, error TEXT)
  ```

- **`requestedAt` is an ISO 8601 string**, not a `Date`: it is stored as text and returned as-is
  in JSON, and ISO strings sort correctly as text.
- **`filter` is a plain string**: the storage module does not depend on the filters module.
- **`error` is `string | null`**, not optional: it mirrors the nullable column and forces callers
  to state explicitly that there was no error.
- **`UsageLog` has no `id`**: the id is a table detail used only for ordering, with an explicit
  `ORDER BY id`, because SQLite does not guarantee row order without it.
- **Prepared statements are created once** per repository, which is faster and safe from SQL
  injection. SQL aliases map `snake_case` columns to `camelCase` fields, so no mapping
  function is needed; the round-trip tests verify it.
- **No `cache_hit` column**: there is no cache, and an always-zero column would be speculative.

### HTTP

- **No web framework**: with three GET routes, `node:http` is enough. Routes are written as a
  `(Request) => Promise<Response>` function using the standard Fetch API, so they are tested by
  calling the function directly. A small adapter (`nodeAdapter`) connects it to `node:http`.
- **Status codes**: `400` for client errors, `502` when Hacker News fails (the upstream failed,
  not this server), `500` for unexpected errors and `404` for anything else, including non-GET
  methods (simpler than `405` for an API with only GET routes).
- **Routes are a `Map`** from path to function, so adding a route is one line and lookups cannot
  hit inherited object keys.
- **No build step**: the project type-checks with `tsc --noEmit` and runs with `tsx`, which keeps
  the setup simple for a small service.

### Web page

- **Plain HTML and JavaScript, no framework or build**: one page with two buttons and two tables
  does not justify a frontend toolchain. It only calls the public API, so the API stays the
  single source of behavior.
- **The page is read once at startup** and injected into the request handler as a string, like
  any other dependency, so the route is tested without disk access.
- **`textContent`, never `innerHTML`**: titles come from an external site, so they are always
  inserted as text to prevent HTML injection (XSS).
- **One `render` function for both tables**: each table is described by its list of columns.
- **Buttons are disabled while a crawl runs** to avoid duplicate requests to Hacker News, and the
  usage table refreshes after every crawl, including failed ones.

### Testing

- Tests describe behavior, mirror the `src/` layout and use realistic Hacker News data.
- The parser is tested against a saved copy of the real front page and against hand-written
  HTML for edge cases (job posts, "discuss", singular forms, `&nbsp;`, site domains).
- The SQLite repository is tested against an in-memory database; the crawler service and the
  request handler with fakes; the node adapter with a real server on a random local port.
  No test calls Hacker News.
- The `GET /` route is tested, but the page's browser script is not: it was checked manually.
- Work followed TDD: each feature has a `test:` commit followed by its `feat:` commit.

## Future work

- Short in-memory cache for the front page (e.g. 60 seconds) to reduce load on Hacker News.
- Automated tests for the web page script (e.g. with jsdom or Playwright).
- Pagination and date filters for `GET /usage`.
