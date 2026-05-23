import { readFile } from "node:fs/promises";

const file = new URL("../data/gmail_digest.json", import.meta.url);

function isLikelyAdEmail(email) {
  const text = `${email.from || ""} ${email.subject || ""} ${email.summary || ""} ${email.snippet || ""} ${(email.labels || []).join(" ")}`.toLowerCase();
  if (email.isAd === true || email.category === "promotion") return true;
  return /unsubscribe|promotion|promotions|advertisement|sponsored|sale|discount|deal|coupon|limited time|newsletter|marketing|webinar|event invite|广告|促销|优惠|折扣|订阅|退订|营销|限时/.test(text);
}

try {
  const cache = JSON.parse(await readFile(file, "utf8"));
  const emails = cache.emails || [];
  const kept = emails.filter((email) => !isLikelyAdEmail(email));
  console.log(JSON.stringify({
    ok: true,
    exportedAt: cache.exportedAt,
    count: emails.length,
    kept: kept.length,
    filteredAds: emails.length - kept.length,
    sample: kept.slice(0, 10).map((email) => ({
      from: email.from,
      subject: email.subject,
      receivedAt: email.receivedAt || email.date,
      summary: (email.summary || email.snippet || "").slice(0, 240),
      url: email.url || email.threadUrl
    }))
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: `Cannot read data/gmail_digest.json: ${error.message}`
  }, null, 2));
  process.exitCode = 1;
}
