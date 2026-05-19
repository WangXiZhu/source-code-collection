import { readFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const FOLDER_TOKEN = process.env.FEISHU_FOLDER_TOKEN || "IwdmflebWl8HqAdKeCwc9clbn9f";
const LOOKBACK_HOURS = Number(process.env.DIGEST_LOOKBACK_HOURS || 24);
const SINCE = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const USER_AGENT = "blog-generator/0.1 (+https://openai.com)";

async function main() {
  const config = JSON.parse(await readFile(new URL("../config/sources.json", import.meta.url), "utf8"));
  const previous = await loadPreviousDigest();
  const previousKeys = buildPreviousKeys(previous.content);

  const [xResult, blogItems, githubItems, hnItems] = await Promise.all([
    collectX(),
    collectBlogs(config.blogs),
    collectGitHub(config.github.queries),
    collectHackerNews(config.hackerNews.queries)
  ]);

  const sections = [
    { name: "X / Twitter", items: xResult.items, status: xResult.status },
    { name: "Blogs", items: blogItems },
    { name: "GitHub", items: githubItems },
    { name: "Hacker News", items: hnItems }
  ].map((section) => ({
    ...section,
    items: dedupe(section.items, previousKeys)
  }));

  const xml = renderDocumentXml({
    date: TODAY,
    since: SINCE,
    previous,
    sections
  });

  if (process.env.DIGEST_DRY_RUN === "1") {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      title: TODAY,
      folderToken: FOLDER_TOKEN,
      previousDocument: previous?.name || null,
      counts: Object.fromEntries(sections.map((s) => [s.name, s.items.length])),
      status: Object.fromEntries(sections.filter((s) => s.status?.length).map((s) => [s.name, s.status])),
      xmlBytes: Buffer.byteLength(xml)
    }, null, 2));
    return;
  }

  const created = await larkJson([
    "docs",
    "+create",
    "--api-version",
    "v2",
    "--as",
    "user",
    "--parent-token",
    FOLDER_TOKEN,
    "--content",
    xml,
    "--doc-format",
    "xml"
  ]);

  const document = created?.data?.document || created?.data || {};
  console.log(JSON.stringify({
    ok: true,
    title: TODAY,
    folderToken: FOLDER_TOKEN,
    previousDocument: previous?.name || null,
    counts: Object.fromEntries(sections.map((s) => [s.name, s.items.length])),
    created: {
      token: document.document_id || document.token || document.doc_token || null,
      url: document.url || null
    }
  }, null, 2));
}

async function loadPreviousDigest() {
  const list = await larkJson([
    "drive",
    "files",
    "list",
    "--as",
    "user",
    "--params",
    JSON.stringify({
      folder_token: FOLDER_TOKEN,
      page_size: 20,
      order_by: "EditedTime",
      direction: "DESC"
    })
  ]);

  const files = list?.data?.files || [];
  const latest = files.find((file) => file.type === "docx" && file.name !== TODAY) || files.find((file) => file.type === "docx");
  if (!latest) return { name: null, url: null, content: "" };

  try {
    const fetched = await larkJson([
      "docs",
      "+fetch",
      "--api-version",
      "v2",
      "--as",
      "user",
      "--doc",
      latest.url || latest.token,
      "--doc-format",
      "text"
    ]);
    return {
      name: latest.name,
      url: latest.url,
      content: fetched?.data?.document?.content || ""
    };
  } catch (error) {
    return {
      name: latest.name,
      url: latest.url,
      content: "",
      fetchError: error.message
    };
  }
}

async function collectX() {
  const cached = await collectXFromPostsCache();
  if (cached) return cached;

  if (!process.env.X_BEARER_TOKEN) {
    return collectXFromFollowingFeeds();
  }

  try {
    return await collectXFromApi();
  } catch (error) {
    const fallback = await collectXFromFollowingFeeds();
    fallback.status.push(`X API failed: ${error.message}`);
    return fallback;
  }
}

async function collectXFromPostsCache() {
  const cache = await readJsonIfExists(new URL("../data/x_posts.json", import.meta.url));
  if (!cache?.posts?.length) return null;

  const items = cache.posts
    .filter((post) => isRecent(post.publishedAt || post.time))
    .filter((post) => isRelevantAiText(`${post.title || ""} ${post.summary || ""} ${post.text || ""}`))
    .map((post) => ({
      source: post.source || `X / @${post.author || post.username || "unknown"}`,
      title: post.title || firstSentence(post.text || post.summary || "Untitled X post", 100),
      summary: truncate(post.summary || post.text || "", 500),
      why: "Recent post from the authenticated X Following timeline matching the AI / agentic tooling topic filter.",
      url: post.url,
      publishedAt: post.publishedAt || post.time || cache.exportedAt,
      language: post.language || detectLanguage(`${post.title || ""} ${post.summary || ""} ${post.text || ""}`)
    }))
    .filter((item) => item.url);

  return {
    items,
    status: [`X posts cache used: ${items.length}/${cache.posts.length} relevant posts from data/x_posts.json, exported at ${cache.exportedAt || "unknown"}.`]
  };
}

async function collectXFromApi() {
  if (!process.env.X_BEARER_TOKEN) {
    return { items: [], status: ["X_BEARER_TOKEN is not configured."] };
  }

  const me = await fetchJson("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }
  });
  const userId = me?.data?.id;
  if (!userId) throw new Error("X API did not return user id");

  const following = await fetchJson(`https://api.twitter.com/2/users/${userId}/following?max_results=1000&user.fields=username,name`, {
    headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }
  });
  const accounts = following?.data || [];
  const items = [];
  for (const account of accounts.slice(0, 50)) {
    const tweets = await fetchJson(`https://api.twitter.com/2/users/${account.id}/tweets?max_results=5&tweet.fields=created_at,entities&start_time=${SINCE.toISOString()}`, {
      headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }
    });
    for (const tweet of tweets?.data || []) {
      const text = tweet.text || "";
      if (!isRelevantAiText(text)) continue;
      items.push({
        source: `X / @${account.username}`,
        title: firstSentence(text, 100),
        summary: text,
        why: "Recent post from a followed X account matching the AI / agentic tooling topic filter.",
        url: `https://x.com/${account.username}/status/${tweet.id}`,
        publishedAt: tweet.created_at,
        language: detectLanguage(text)
      });
    }
  }
  return { items, status: [`X API collected ${accounts.length} followed accounts.`] };
}

async function collectXFromFollowingFeeds() {
  const following = await readJsonIfExists(new URL("../data/x_following.json", import.meta.url));
  if (!following?.accounts?.length) {
    return {
      items: [],
      status: ["X skipped: no X_BEARER_TOKEN and data/x_following.json is not available. Run npm run x:following after opening a logged-in X browser with remote debugging."]
    };
  }
  if (!process.env.RSSHUB_BASE_URL) {
    return {
      items: [],
      status: [`X skipped: loaded ${following.accounts.length} cached followed accounts, but RSSHUB_BASE_URL is not configured.`]
    };
  }

  const items = [];
  const base = process.env.RSSHUB_BASE_URL.replace(/\/$/, "");
  for (const account of following.accounts.slice(0, Number(process.env.X_ACCOUNT_LIMIT || 80))) {
    const username = account.username || account.screenName;
    if (!username) continue;
    try {
      const feed = await fetchText(`${base}/twitter/user/${encodeURIComponent(username)}`);
      items.push(...parseFeed(feed, `X / @${username}`).filter((item) => isRecent(item.publishedAt) && isRelevantAiText(`${item.title} ${item.summary}`)));
    } catch {
      // Public RSSHub instances and X routes can be rate-limited. Skip per-account failures.
    }
  }
  return {
    items,
    status: [`X RSS fallback used ${following.accounts.length} cached followed accounts via RSSHUB_BASE_URL.`]
  };
}

async function collectBlogs(blogs) {
  const items = [];
  for (const blog of blogs) {
    let feedFound = false;
    for (const feedUrl of blog.feeds) {
      try {
        const xml = await fetchText(feedUrl);
        const parsed = parseFeed(xml, blog.name).filter((item) => isRecent(item.publishedAt));
        if (parsed.length || xml.includes("<rss") || xml.includes("<feed")) feedFound = true;
        items.push(...parsed);
        if (feedFound) break;
      } catch {
        // Try the next candidate feed.
      }
    }
    if (!feedFound) {
      items.push({
        source: blog.name,
        title: `No reachable feed found for ${blog.name}`,
        summary: "Configured feed candidates did not return a readable RSS/Atom feed during this run.",
        why: "This source may need a corrected feed URL.",
        url: `https://${blog.name}`,
        publishedAt: new Date().toISOString(),
        language: "en",
        meta: "source-warning"
      });
    }
  }
  return items;
}

async function collectGitHub(queries) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const byUrl = new Map();
  for (const query of queries) {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", `${query} pushed:>=${dateOnly(SINCE)}`);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "5");
    try {
      const data = await fetchJson(url, { headers });
      for (const repo of data.items || []) {
        if (byUrl.has(repo.html_url)) continue;
        byUrl.set(repo.html_url, {
          source: "GitHub",
          title: `${repo.full_name} (${repo.stargazers_count} stars)`,
          summary: repo.description || "No repository description provided.",
          why: `Recently pushed AI-agent related repository found by query: ${query}.`,
          url: repo.html_url,
          publishedAt: repo.pushed_at || repo.updated_at || repo.created_at,
          language: "en"
        });
      }
    } catch (error) {
      byUrl.set(`github-error-${query}`, {
        source: "GitHub",
        title: `GitHub query failed: ${query}`,
        summary: error.message,
        why: "The job attempted GitHub collection but this query failed.",
        url: "https://github.com/search",
        publishedAt: new Date().toISOString(),
        language: "en",
        meta: "error"
      });
    }
  }
  return [...byUrl.values()];
}

async function collectHackerNews(queries) {
  const byUrl = new Map();
  const createdAfter = Math.floor(SINCE.getTime() / 1000);
  for (const query of queries) {
    const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
    url.searchParams.set("query", query);
    url.searchParams.set("tags", "story");
    url.searchParams.set("numericFilters", `created_at_i>${createdAfter}`);
    url.searchParams.set("hitsPerPage", "5");
    try {
      const data = await fetchJson(url);
      for (const hit of data.hits || []) {
        const link = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (byUrl.has(link)) continue;
        byUrl.set(link, {
          source: "Hacker News",
          title: hit.title || hit.story_title || "Untitled HN item",
          summary: `${hit.points || 0} points, ${hit.num_comments || 0} comments.`,
          why: `Recent HN story matching query: ${query}.`,
          url: link,
          publishedAt: hit.created_at,
          language: "en"
        });
      }
    } catch (error) {
      byUrl.set(`hn-error-${query}`, {
        source: "Hacker News",
        title: `HN query failed: ${query}`,
        summary: error.message,
        why: "The job attempted HN collection but this query failed.",
        url: "https://news.ycombinator.com/",
        publishedAt: new Date().toISOString(),
        language: "en",
        meta: "error"
      });
    }
  }
  return [...byUrl.values()];
}

function parseFeed(xml, source) {
  const itemMatches = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return itemMatches.map((item) => {
    const title = cleanXmlText(pickTag(item, "title")) || "Untitled";
    const link = pickLink(item);
    const publishedAt = pickTag(item, "pubDate") || pickTag(item, "published") || pickTag(item, "updated") || new Date().toISOString();
    const summary = cleanXmlText(pickTag(item, "description") || pickTag(item, "summary") || pickTag(item, "content")) || title;
    return {
      source,
      title,
      summary: truncate(summary, 320),
      why: "New post from a configured personal blog feed.",
      url: link || `https://${source}`,
      publishedAt: new Date(publishedAt).toISOString(),
      language: detectLanguage(`${title} ${summary}`)
    };
  }).filter((item) => item.url);
}

function pickTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function pickLink(xml) {
  const href = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  if (href) return decodeEntities(href);
  return cleanXmlText(pickTag(xml, "link"));
}

function cleanXmlText(value) {
  return decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function buildPreviousKeys(content = "") {
  const keys = new Set();
  for (const url of content.matchAll(/https?:\/\/[^\s<>"')]+/g)) keys.add(normalizeKey(url[0]));
  for (const line of content.split(/\n+/)) {
    const cleaned = line.replace(/[^\p{Letter}\p{Number}\s:/._-]/gu, "").trim().toLowerCase();
    if (cleaned.length > 12) keys.add(cleaned.slice(0, 120));
  }
  return keys;
}

function dedupe(items, previousKeys) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const urlKey = normalizeKey(item.url);
    const titleKey = item.title.toLowerCase().trim();
    if (seen.has(urlKey) || previousKeys.has(urlKey) || previousKeys.has(titleKey)) continue;
    seen.add(urlKey);
    seen.add(titleKey);
    output.push(item);
  }
  return output.slice(0, 12);
}

function normalizeKey(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|ref$|source$/.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(value).trim().toLowerCase();
  }
}

function renderDocumentXml({ date, since, previous, sections }) {
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  return [
    `<title>${escapeXml(date)}</title>`,
    `<callout emoji="📌" background-color="light-blue" border-color="blue"><p>AI &amp; Agentic Tooling daily digest. Window: ${escapeXml(since.toISOString())} to now. New items after dedupe: ${total}.</p></callout>`,
    `<h1>Overview</h1>`,
    `<p>Previous digest checked: ${previous?.name ? escapeXml(previous.name) : "none found"}${previous?.url ? ` (${linkXml(previous.url, previous.url)})` : ""}.</p>`,
    `<table><thead><tr><th background-color="light-gray">Source</th><th background-color="light-gray">New items</th></tr></thead><tbody>${sections.map((s) => `<tr><td>${escapeXml(s.name)}</td><td>${s.items.length}</td></tr>`).join("")}</tbody></table>`,
    ...sections.flatMap(renderSection),
    `<h1>Run Status</h1>`,
    ...sections.flatMap((section) => (section.status || []).map((line) => `<p>${escapeXml(section.name)}: ${escapeXml(line)}</p>`)),
    `<h1>Dedupe Notes</h1>`,
    `<p>Before publishing, the job fetched the most recent docx document in folder ${escapeXml(FOLDER_TOKEN)} and skipped matching URLs or repeated titles. Cross-source duplicates in the same run are collapsed by normalized URL and title.</p>`
  ].join("\n");
}

function renderSection(section) {
  const blocks = [`<h1>${escapeXml(section.name)}</h1>`];
  if (!section.items.length) {
    blocks.push(`<p>No qualifying new items found in this source during the lookback window.</p>`);
    return blocks;
  }
  for (const item of section.items) {
    blocks.push(`<h2>${escapeXml(item.title)}</h2>`);
    blocks.push(`<p><b>Source:</b> ${escapeXml(item.source)} | <b>Published:</b> ${escapeXml(formatDate(item.publishedAt))}</p>`);
    blocks.push(`<p><b>Summary:</b> ${escapeXml(item.summary)}</p>`);
    blocks.push(`<p><b>Why it matters:</b> ${escapeXml(item.why)}</p>`);
    blocks.push(`<p><b>Original:</b> ${linkXml(item.url, item.url)}</p>`);
  }
  return blocks;
}

function linkXml(href, text) {
  return `<a href="${escapeAttr(href)}">${escapeXml(text)}</a>`;
}

function escapeXml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value = "") {
  return escapeXml(value).replace(/"/g, "&quot;");
}

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function firstSentence(value, max) {
  return truncate(value.split(/(?<=[.!?。！？])\s+/)[0] || value, max);
}

function detectLanguage(text) {
  return /[\u4e00-\u9fff]/.test(text) ? "zh" : "en";
}

function isRelevantAiText(text = "") {
  return /ai|agent|agentic|llm|mcp|coding|developer tool|workflow|openai|claude|cursor|codex|rag|fsd|autonomous|robot|robotics|foundation model|deep learning|cuda|gpu/i.test(text);
}

function isRecent(date) {
  const time = new Date(date).getTime();
  return Number.isFinite(time) && time >= SINCE.getTime();
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : String(date || "");
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

async function readJsonIfExists(url) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return null;
  }
}

async function larkJson(args) {
  const { stdout, stderr } = await execFile("lark-cli", args, {
    maxBuffer: 20 * 1024 * 1024
  });
  const text = stdout.trim() || stderr.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed?.ok === false) throw new Error(JSON.stringify(parsed.error || parsed));
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(text);
    throw error;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
