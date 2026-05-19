import { readFile } from "node:fs/promises";

const file = new URL("../data/x_posts.json", import.meta.url);

try {
  const cache = JSON.parse(await readFile(file, "utf8"));
  const posts = cache.posts || [];
  console.log(JSON.stringify({
    ok: true,
    exportedAt: cache.exportedAt,
    source: cache.source,
    count: posts.length,
    sample: posts.slice(0, 10).map((post) => ({
      author: post.author,
      publishedAt: post.publishedAt,
      url: post.url,
      text: (post.text || post.summary || "").slice(0, 240)
    }))
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: `Cannot read data/x_posts.json: ${error.message}`
  }, null, 2));
  process.exitCode = 1;
}
