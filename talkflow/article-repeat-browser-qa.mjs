// 11/24: "이미 사용한 기사와 겹치지 않는 새 RSS 후보를 찾지 못했습니다." New candidates were compared with every Article since
// October, so three shared subject words with any old Article rejected them all. Now: the same URL never repeats,
// similar subjects only count within 45 days, and after 8 similar-only candidates one is used instead of failing.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.js")); }

const root = fileURLToPath(new URL(".", import.meta.url));
const mime = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname.replace(/^\/talkflow\//, "/");
    const path = normalize(join(root, pathname === "/" ? "index.html" : pathname.slice(1)));
    if (!path.startsWith(normalize(root))) throw new Error("invalid path");
    response.setHeader("content-type", mime[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

const fixture = JSON.parse(await readFile(join(root, "fixtures", "member-topic.json"), "utf8"));
const source = (slug, subjectKey, category = "LIFE") => ({ publisher: "BBC News · Life", category, title: `${subjectKey} story`, titleKey: subjectKey, subjectKey, url: `https://www.bbc.co.uk/news/${slug}`, excerpt: `A story about ${subjectKey}.`, popularityScore: 10, publishedAt: "2026-11-20T08:00:00.000Z" });
const topicWith = (date, articleSource) => ({ ...fixture, id: `repeat-${date}`, date, page2: { ...fixture.page2, source: articleSource }, generationRequest: { date, articleSource }, generationEngine: "v4-topic-v43", quality: { status: "approved", score: 100, issues: [] }, operatorStatus: { generationStatus: "complete", reviewStatus: "approved", printStatus: "checked", used: false } });
const october = source("october-garden", "community garden neighbours weekly routine");
const december = source("december-coats", "winter coat sale shoppers discount");
const topics = { "2026-10-05": topicWith("2026-10-05", october), "2026-12-03": topicWith("2026-12-03", december) };

const browser = await playwright.chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  let mode = "", calls = 0;
  await page.route("**/api/talkflow/status/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: true, authenticated: true, model: "claude-sonnet-4-6" }) }));
  await page.route("**/api/talkflow/models/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" }] }) }));
  await page.route("**/api/talkflow/article-source/**", route => {
    calls += 1;
    const article = mode === "old-subject" ? source("garden-tools", "community garden neighbours share tools")
      : mode === "recent-subject" ? source(`coats-${calls}`, `winter coat sale bargain ${calls}`)
      : { ...december };
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ article }) });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle" });
  await page.evaluate(value => localStorage.setItem("tb_talkflow_v1", JSON.stringify(value)), topics);
  await page.reload({ waitUntil: "networkidle" });
  const pick = () => page.evaluate(async () => { try { const result = await TalkFlow.articleSourceForTest({ date: "2026-12-20", generationMode: "auto", page1Template: "A" }); return { url: result.articleSource.url }; } catch (error) { return { error: error.type || error.message }; } });

  mode = "old-subject"; calls = 0;
  assert.deepEqual(await pick(), { url: "https://www.bbc.co.uk/news/garden-tools" }, "a subject last used in October (over 45 days ago) is fine");
  assert.equal(calls, 1, "it is taken on the first try");

  mode = "recent-subject"; calls = 0;
  const similar = await pick();
  assert.equal(calls, 8, "Articles similar to this month's are tried 8 times");
  assert.equal(similar.url, "https://www.bbc.co.uk/news/coats-1", "then one of them is used instead of failing");

  mode = "same-url"; calls = 0;
  assert.deepEqual(await pick(), { error: "rss_duplicate_exhausted" }, "the exact same Article is never reused");
  console.log("PASS article-repeat-browser-qa: old subjects are reusable, recent-similar falls back after 8 tries, exact repeats are refused");
} finally {
  await browser.close();
  server.close();
}
