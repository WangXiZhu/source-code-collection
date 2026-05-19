import { mkdir, writeFile } from "node:fs/promises";

const CDP_URL = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";
const OUT = new URL("../data/x_following.json", import.meta.url);
const MAX_SCROLLS = Number(process.env.X_FOLLOWING_SCROLLS || 80);
const USERNAME = process.env.X_USERNAME || "";

async function main() {
  const pages = await cdpJson("/json");
  const page = pages.find((p) => p.type === "page" && p.webSocketDebuggerUrl) || pages[0];
  if (!page) {
    throw new Error(`No debuggable Chrome tab found at ${CDP_URL}. Start Chrome with --remote-debugging-port=9222.`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const cdp = createCdp(ws);
  await onceOpen(ws);
  await cdp("Runtime.enable");
  await cdp("Page.enable");

  let profile = USERNAME;
  if (!profile) {
    await cdp("Page.navigate", { url: "https://x.com/home" });
    await wait(4000);
    profile = await detectUsername(cdp);
  }
  if (!profile) throw new Error("Could not detect X username. Set X_USERNAME and retry.");

  await cdp("Page.navigate", { url: `https://x.com/${profile}/following` });
  await wait(6000);

  const accounts = new Map();
  for (let i = 0; i < MAX_SCROLLS; i += 1) {
    const batch = await evalJson(cdp, extractScript());
    for (const account of batch) {
      if (account.username) accounts.set(account.username.toLowerCase(), account);
    }
    const before = accounts.size;
    await evalJson(cdp, "window.scrollBy(0, Math.floor(window.innerHeight * 0.85)); true");
    await wait(1500);
    if (i > 6 && accounts.size === before) {
      const atBottom = await evalJson(cdp, "Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight");
      if (atBottom) break;
    }
  }

  const output = {
    exportedAt: new Date().toISOString(),
    profile,
    source: `https://x.com/${profile}/following`,
    accounts: [...accounts.values()].sort((a, b) => a.username.localeCompare(b.username))
  };
  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, path: OUT.pathname, count: output.accounts.length }, null, 2));
  ws.close();
}

async function detectUsername(cdp) {
  const result = await evalJson(cdp, `(() => {
    const links = [...document.querySelectorAll('a[href^="/"][role="link"]')].map(a => a.getAttribute('href'));
    const hit = links.find(h => /^\\/[A-Za-z0-9_]{1,15}$/.test(h || '') && !['/home','/explore','/notifications','/messages','/settings'].includes(h));
    return hit ? hit.slice(1) : '';
  })()`);
  return result;
}

function extractScript() {
  return `(() => {
    const out = [];
    const seen = new Set();
    for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
      const links = [...cell.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href')).filter(Boolean);
      const profile = links.find(h => /^\\/[A-Za-z0-9_]{1,15}$/.test(h) && !h.includes('/status/'));
      if (!profile) continue;
      const username = profile.slice(1);
      if (seen.has(username.toLowerCase())) continue;
      seen.add(username.toLowerCase());
      const text = cell.innerText.split('\\n').map(s => s.trim()).filter(Boolean);
      const handleIndex = text.findIndex(s => s.toLowerCase() === '@' + username.toLowerCase());
      const name = handleIndex > 0 ? text[handleIndex - 1] : (text[0] || username);
      const bio = text.slice(Math.max(handleIndex + 1, 1)).filter(s => !/^Following$|^Follow$|^Follows you$/i.test(s)).join(' ');
      out.push({ username, name, bio, url: 'https://x.com/' + username });
    }
    return out;
  })()`;
}

function createCdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  });
  return (method, params = {}) => new Promise((resolve, reject) => {
    const request = { id: ++id, method, params };
    pending.set(request.id, { resolve, reject });
    ws.send(JSON.stringify(request));
  });
}

async function evalJson(cdp, expression) {
  const result = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  return result.result.value;
}

async function cdpJson(path) {
  const response = await fetch(`${CDP_URL}${path}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${CDP_URL}${path}`);
  return response.json();
}

function onceOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
