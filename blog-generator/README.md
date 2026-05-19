# AI & Agentic Tooling Daily Digest

Daily research job that collects recent AI / agentic tooling updates and publishes a Feishu document directly into the target folder.

## Run

```bash
npm run daily
```

The script uses `lark-cli` for Feishu reads/writes and does not save the generated report locally.

## Environment

- `FEISHU_FOLDER_TOKEN`: target folder token. Defaults to `IwdmflebWl8HqAdKeCwc9clbn9f`.
- `X_BEARER_TOKEN`: optional X API bearer token. Without it, the X section is marked as not configured.
- `RSSHUB_BASE_URL`: optional RSSHub base URL for reading X timelines from cached followed accounts.
- `X_USERNAME`: optional username for `npm run x:following`.
- `GITHUB_TOKEN`: optional GitHub token for higher API rate limits.
- `DIGEST_LOOKBACK_HOURS`: lookback window. Defaults to `24`.
- `DIGEST_DRY_RUN=1`: validate collection/rendering without creating a Feishu document.

## Sources

- X following timeline, when `X_BEARER_TOKEN` is available.
- Cached X following list plus RSSHub when `data/x_following.json` and `RSSHUB_BASE_URL` are available.
- Blogs configured in `config/sources.json`.
- GitHub Search API for AI agent repositories.
- Hacker News Algolia API.

## Refresh X Following Cache

Preferred browser-based flow:

1. Start Chrome with remote debugging enabled and log in to X in that browser.
2. Run:

```bash
X_USERNAME=your_username npm run x:following
```

This writes `data/x_following.json`.

If remote debugging is not available, open `https://x.com/<your_username>/following`, scroll until enough accounts are loaded, paste `scripts/x_following_console_snippet.js` in DevTools, then put the copied JSON into `data/x_following.json`.

The daily job can consume that cache. For post fetching without X API, set `RSSHUB_BASE_URL` to a working RSSHub instance that supports the X/Twitter user route.

## Test X Posts Separately

X post collection is intentionally separated from the daily publishing path. The daily job first reads `data/x_posts.json`; if that cache exists, it filters recent AI / agentic tooling posts from it.

To inspect the current X cache:

```bash
npm run x:test
```

To refresh posts manually with the browser session, open `https://x.com/home`, switch to the Following tab, scroll if needed, and run `scripts/x_posts_console_snippet.js` in DevTools. Save the copied JSON to `data/x_posts.json`.
