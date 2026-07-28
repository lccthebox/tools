import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

let playwright;
try {
  playwright = createRequire(import.meta.url)("playwright");
} catch {
  playwright = createRequire(join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.js"))("playwright");
}
const { chromium } = playwright;
const root = fileURLToPath(new URL(".", import.meta.url));
const output = join(root, ".qa-pdf");
await mkdir(output, { recursive: true });
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const path = normalize(join(root, pathname === "/" ? "index.html" : pathname));
    if (!path.startsWith(normalize(root))) throw new Error("invalid path");
    response.setHeader("Content-Type", mime[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation`, { waitUntil: "networkidle" });
  const topics = await page.evaluate(() => TalkFlow.getTopics());
  for (const topic of Object.values(topics).sort((a, b) => a.date.localeCompare(b.date))) {
    await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&date=${topic.date}&view=print`, { waitUntil: "networkidle" });
    const safeTitle = topic.title.ko.replace(/[\\/:*?"<>|\s]+/g, "_");
    const filename = `${topic.date}_TheBox_TalkFlow_${safeTitle}.pdf`;
    const path = join(output, filename);
    const pageCount = await page.locator(".a4-page").count();
    const overflow = await page.locator(".a4-page").evaluateAll(pages => pages.map(item => ({
      vertical: item.scrollHeight - item.clientHeight,
      horizontal: item.scrollWidth - item.clientWidth
    })));
    await page.pdf({ path, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    report.push({ date: topic.date, title: topic.title.ko, filename, domPages: pageCount, overflow });
  }
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation`, { waitUntil: "networkidle" });
  for (const date of ["2026-08-03", "2026-08-06", "2026-08-10"]) await page.locator(`[data-print-date="${date}"]`).check();
  await page.locator("[data-action='batch-print']").click();
  const batchPages = await page.locator(".a4-page").count();
  await page.pdf({ path: join(output, "batch-3-topics.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&date=2026-08-03&view=leader`, { waitUntil: "networkidle" });
  await page.locator("[data-print-leader]").first().click();
  const leaderPages = await page.locator(".a4-page").count();
  const leaderOverflow = await page.locator(".a4-page").evaluateAll(pages => pages.map(item => ({
    vertical: item.scrollHeight - item.clientHeight,
    horizontal: item.scrollWidth - item.clientWidth
  })));
  await page.pdf({ path: join(output, "2026-08-03_TheBox_TalkFlow_leader.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  const pass = report.every(item => item.domPages === 2 && item.overflow.every(value => value.vertical <= 1 && value.horizontal <= 1))
    && batchPages === 6 && leaderPages === 2 && leaderOverflow.every(value => value.vertical <= 1 && value.horizontal <= 1);
  await writeFile(join(output, "generation-results.json"), `${JSON.stringify({ pass, topics: report, batchPages, leaderPages, leaderOverflow }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
