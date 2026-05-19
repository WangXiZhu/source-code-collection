// Paste this in the DevTools console on https://x.com/<your_username>/following.
// Scroll the page until enough accounts are loaded, then run it again if needed.
(() => {
  const accounts = [];
  const seen = new Set();
  for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
    const links = [...cell.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')).filter(Boolean);
    const profile = links.find((href) => /^\/[A-Za-z0-9_]{1,15}$/.test(href) && !href.includes('/status/'));
    if (!profile) continue;
    const username = profile.slice(1);
    if (seen.has(username.toLowerCase())) continue;
    seen.add(username.toLowerCase());
    const text = cell.innerText.split('\n').map((line) => line.trim()).filter(Boolean);
    const handleIndex = text.findIndex((line) => line.toLowerCase() === `@${username.toLowerCase()}`);
    const name = handleIndex > 0 ? text[handleIndex - 1] : (text[0] || username);
    const bio = text.slice(Math.max(handleIndex + 1, 1)).filter((line) => !/^Following$|^Follow$|^Follows you$/i.test(line)).join(' ');
    accounts.push({ username, name, bio, url: `https://x.com/${username}` });
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    source: location.href,
    accounts
  };
  console.log(JSON.stringify(payload, null, 2));
  copy(JSON.stringify(payload, null, 2));
  return payload;
})();
