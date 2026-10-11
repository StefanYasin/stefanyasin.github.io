// Builds data/stats.json from the GitHub API.
// Runs in GitHub Actions with a scoped GITHUB_TOKEN, so it is not rate limited
// like an anonymous browser fetch would be, and no key is exposed on the site.
import { writeFile, mkdir } from "node:fs/promises";

const USER = "StefanYasin";
const SITE_REPO = "stefanyasin.github.io";
const OUT = new URL("../data/stats.json", import.meta.url);
const OUT_DIR = new URL("../data/", import.meta.url);

const token = process.env.GITHUB_TOKEN;
const headers = { Accept: "application/vnd.github+json", "User-Agent": "stefan-site-stats" };
if (token) headers.Authorization = `Bearer ${token}`;

async function api(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function apiSafe(url, fallback = null) {
  try {
    return await api(url);
  } catch (err) {
    console.error(`warn: ${err.message}`);
    return fallback;
  }
}

const repos = await apiSafe(
  `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
  []
);

const own = repos.filter((r) => !r.fork && !r.archived);
const tools = own.filter((r) => r.name !== SITE_REPO && r.name !== USER);
const stars = own.reduce((n, r) => n + (r.stargazers_count || 0), 0);

// Most recent commit across the tooling repos, so "last shipped" is real.
let lastShip = null;
for (const repo of tools.slice(0, 12)) {
  const commits = await apiSafe(
    `https://api.github.com/repos/${USER}/${repo.name}/commits?per_page=1`,
    []
  );
  const c = Array.isArray(commits) ? commits[0] : null;
  if (!c) continue;
  const date = c.commit?.committer?.date || c.commit?.author?.date;
  if (!date) continue;
  if (!lastShip || date > lastShip.date) {
    lastShip = {
      repo: repo.name,
      url: `https://github.com/${USER}/${repo.name}`,
      date,
      message: (c.commit?.message || "").split("\n")[0].slice(0, 120),
    };
  }
}

// Commits in the last 12 months, via the commit search endpoint.
const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const search = await apiSafe(
  `https://api.github.com/search/commits?q=author:${USER}+committer-date:>=${since}&per_page=1`,
  null
);

const top = tools
  .slice()
  .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
  .slice(0, 5)
  .map((r) => ({
    name: r.name,
    url: r.html_url,
    stars: r.stargazers_count || 0,
    language: r.language || null,
    description: r.description || null,
    pushedAt: r.pushed_at,
  }));

const out = {
  generatedAt: new Date().toISOString(),
  user: USER,
  publicTools: tools.length,
  repos: own.length,
  stars,
  commitsLast365: search && typeof search.total_count === "number" ? search.total_count : null,
  lastShip,
  topRepos: top,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`wrote ${OUT.pathname}: ${out.publicTools} tools, ${out.stars} stars, last ship ${out.lastShip?.date || "n/a"}`);
