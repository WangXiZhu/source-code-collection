// Paste this in DevTools on https://x.com/home after switching to the Following tab.
// It extracts visible posts. Scroll and run again if you need more.
(() => {
  const posts = [];
  const seen = new Set();
  for (const article of document.querySelectorAll('article')) {
    const status = [...article.querySelectorAll('a[href*="/status/"]')]
      .map((a) => a.href)
      .find((href) => /\/status\/\d+/.test(href));
    if (!status || seen.has(status)) continue;
    seen.add(status);

    const authorPath = [...article.querySelectorAll('a[href^="/"]')]
      .map((a) => a.getAttribute('href'))
      .find((href) => /^\/[A-Za-z0-9_]{1,15}$/.test(href || ''));
    const author = authorPath ? authorPath.slice(1) : '';
    const publishedAt = article.querySelector('time')?.getAttribute('datetime') || '';
    const text = (article.innerText || '').replace(/\n+/g, '\n').trim();

    posts.push({
      source: author ? `X / @${author}` : 'X / Following',
      author,
      title: text.split('\n').find((line) => line && !line.startsWith('@')) || 'X post',
      text,
      summary: text,
      url: status.replace('/analytics', ''),
      publishedAt,
      language: /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en'
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    source: location.href,
    posts
  };
  console.log(JSON.stringify(payload, null, 2));
  copy(JSON.stringify(payload, null, 2));
  return payload;
})();
