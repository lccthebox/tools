import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  const bundledRequire = createRequire(join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.js"));
  playwright = bundledRequire("playwright");
}
const { chromium } = playwright;
const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const evidence = join(root, "..", ".omo", "evidence", "talkflow");
await mkdir(evidence, { recursive: true });

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
const results = [];
const check = (name, condition, detail = "") => {
  results.push({ name, pass: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });

  check("daily management is default", await page.locator("#calendar-view").isVisible());
  check("August date cards", await page.locator(".date-card").count() === 31);
  check("8 sample topics", await page.locator(".topic-day").count() === 8);
  check("8 print-ready topics", await page.locator(".print-state.ready").count() === 8);
  check("daily cards expose A4 actions", await page.locator(".date-card [data-open$=':print']").count() === 8);
  await page.getByRole("button", { name: "학생", exact: true }).click();
  check("student view renders all sections", await page.locator("#student-view .flow-card").count() === 9);
  const quality = await page.evaluate(() => Object.values(TalkFlow.getTopics()).map(topic => ({ title: topic.title.en, result: TalkFlow.validateTopic(topic) })));
  check("all samples pass quality", quality.every(item => item.result.status === "approved"), JSON.stringify(quality.filter(item => item.result.status !== "approved")));
  check("isolated storage keys", await page.evaluate(() => Object.values(TalkFlow.KEYS).every(key => key.startsWith("tb_talkflow_"))));
  check("legacy storage untouched", await page.evaluate(() => !Object.keys(localStorage).some(key => ["tb_topics_v5","tb_gist_token","tb_gist_id","tb_api_key_v2"].includes(key))));

  await page.getByRole("button", { name: "리더", exact: true }).click();
  check("leader tools render", await page.locator(".leader-toolbar").isVisible());
  check("leader question checkboxes", await page.locator("[data-check]").count() === 10);
  await page.locator("[data-check]").first().check();
  check("leader completion check works", await page.locator("[data-check]").first().isChecked());
  await page.getByRole("button", { name: "시작/일시정지" }).click();
  await page.waitForFunction(() => document.querySelector("#timer-display").textContent !== "00:00");
  await page.getByRole("button", { name: "시작/일시정지" }).click();
  check("leader timer works", await page.locator("#timer-display").textContent() !== "00:00");

  await page.getByRole("button", { name: "관리", exact: true }).click();
  check("admin editor renders", await page.locator("[data-path='title.en']").isVisible());
  await page.locator("[data-path='title.en']").fill("Edited Review Topic");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "관리", exact: true }).click();
  check("save and reload restores edit", await page.locator("[data-path='title.en']").inputValue() === "Edited Review Topic");
  await page.locator("[data-path='title.en']").fill("Can You Trust the Stars?");
  await page.getByRole("button", { name: "저장", exact: true }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "월 JSON" }).click();
  const download = await downloadPromise;
  check("JSON export file rule", download.suggestedFilename() === "thebox-talkflow-2026-08.json", download.suggestedFilename());
  check("approved-only public filter", await page.evaluate(() => Object.values(TalkFlow.approvedMonth()).every(topic => topic.quality.status === "approved" && !topic.hidden)));
  let gistFiles = [];
  await page.route("https://api.github.com/gists", async route => {
    const body = route.request().postDataJSON();
    gistFiles = Object.keys(body.files);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "talkflow-test-gist" }) });
  });
  await page.getByRole("button", { name: "설정 열기" }).click();
  await page.locator("#gist-token").fill("test-token");
  await page.getByRole("button", { name: "설정 저장" }).click();
  await page.getByRole("button", { name: "설정 열기" }).click();
  await page.getByRole("button", { name: "Gist 저장" }).click();
  await page.waitForFunction(() => document.querySelector("#gist-id").value === "talkflow-test-gist");
  check("Gist uses isolated filenames", gistFiles.sort().join(",") === "thebox-talkflow-2026-08-viewer.html,thebox-talkflow-2026-08.json", gistFiles.join(","));
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#notice").classList.contains("show"));

  const sizes = [[360,800],[390,844],[768,900],[1024,900],[1440,1000]];
  for (const [width,height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "일별 관리", exact: true }).click();
    const calendarOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${width}px calendar has no horizontal overflow`, calendarOverflow <= 1, `${calendarOverflow}px`);
    await page.screenshot({ path: join(evidence, `calendar-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "학생", exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${width}px no horizontal overflow`, overflow <= 1, `${overflow}px`);
    check(`${width}px controls inside viewport`, await page.evaluate(() => [...document.querySelectorAll("button:not(.topic-day)")].every(button => {
      const rect = button.getBoundingClientRect();
      return rect.width === 0 || (rect.right <= innerWidth + 1 && rect.left >= -1);
    })));
    await page.screenshot({ path: join(evidence, `student-${width}.png`), fullPage: true });
  }
  check("student view hides leader notes", await page.locator("#student-view .leader-note").count() === 0);
  const firstCard = page.locator("#student-view .flow-card").first();
  await firstCard.locator(".collapse").click();
  check("section collapse works", await firstCard.evaluate(element => element.classList.contains("is-collapsed")));
  await firstCard.locator(".collapse").click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "리더", exact: true }).click();
  await page.screenshot({ path: join(evidence, "leader-390.png"), fullPage: true });
  await page.getByRole("button", { name: "관리", exact: true }).click();
  await page.screenshot({ path: join(evidence, "admin-390.png"), fullPage: true });
  const viewer = await context.newPage();
  const viewerMarkup = await page.evaluate(() => TalkFlow.viewerHtml(TalkFlow.approvedMonth()));
  await viewer.setViewportSize({ width: 390, height: 844 });
  await viewer.setContent(viewerMarkup, { waitUntil: "load" });
  check("public viewer contains approved topics", await viewer.locator(".topic-hero").count() === 8);
  check("public viewer has no admin controls", await viewer.locator(".admin-toolbar,.leader-toolbar").count() === 0);
  check("public viewer no horizontal overflow", await viewer.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await viewer.screenshot({ path: join(evidence, "public-viewer-390.png"), fullPage: true });
  await viewer.close();
  await page.getByRole("button", { name: "일별 관리" }).click();
  await page.locator("[data-open$=':print']").first().click();
  check("single date print has exactly 2 A4 pages", await page.locator(".a4-page").count() === 2);
  check("print title includes date and topic", (await page.title()).includes("2026-08-03_TheBox_TalkFlow"));
  check("student print excludes admin and secrets", await page.locator(".a4-page").evaluateAll(pages => !pages.some(item => /Gist|Token|API Key|품질검사|민감도/.test(item.innerText))));
  check("print URL preserves date and view", new URL(page.url()).searchParams.get("view") === "print" && new URL(page.url()).searchParams.get("date") === "2026-08-03");
  await page.getByRole("button", { name: "일별 관리" }).click();
  for (const date of ["2026-08-03", "2026-08-06", "2026-08-10"]) await page.locator(`[data-print-date="${date}"]`).check();
  await page.locator("[data-action='batch-print']").click();
  check("three selected dates produce 6 A4 pages", await page.locator(".a4-page").count() === 6);
  check("batch print preserves selected dates", await page.locator(".a4-topic").evaluateAll(items => items.map(item => item.dataset.printTopic).join(",") === "2026-08-03,2026-08-06,2026-08-10"));
  await page.getByRole("button", { name: "일별 관리" }).click();
  await page.locator("[data-open$=':leader']").first().click();
  await page.locator("[data-print-leader]").first().click();
  check("leader print has exactly 2 A4 pages", await page.locator(".a4-page").count() === 2);
  check("leader print includes facilitator notes", await page.locator(".a4-page .leader-only").count() > 0);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.emulateMedia({ media: "print" });
  check("print view hides navigation", await page.locator(".topbar").evaluate(element => getComputedStyle(element).display === "none"));
  check("print view has no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await page.screenshot({ path: join(evidence, "print-1024.png"), fullPage: true });
  await page.emulateMedia({ media: "screen" });
  check("no browser errors", errors.length === 0, errors.join("; "));

  const report = { pass: true, checks: results.length, evidence, generatedAt: new Date().toISOString(), results };
  await import("node:fs/promises").then(({ writeFile }) => writeFile(join(evidence, "qa-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
