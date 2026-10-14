// Submit the site's URLs to IndexNow (Bing, Yandex, Seznam, Naver).
// Bing's index feeds Microsoft Copilot and a large part of ChatGPT's web grounding,
// so this is the fastest legitimate way to get new pages picked up.
const KEY = process.env.INDEXNOW_KEY;
const HOST = "stefanyasin.github.io";

if (!KEY) {
  console.error("INDEXNOW_KEY is not set");
  process.exit(1);
}

const res = await fetch(`https://${HOST}/sitemap.xml`);
if (!res.ok) {
  console.error(`could not read sitemap: ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) {
  console.error("no URLs in sitemap");
  process.exit(1);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls.slice(0, 10000),
};

const submit = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log(`submitted ${body.urlList.length} URLs, IndexNow responded ${submit.status}`);
if (!submit.ok) {
  console.error(await submit.text());
  process.exit(1);
}
