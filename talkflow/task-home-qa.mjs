import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
const evidence = join(root, "..", ".omo", "evidence", "talkflow-task-home-final-r3");
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

const systemChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(systemChrome) ? { executablePath: systemChrome } : {}) });
const results = [];
const failures = [];
const check = (name, condition, detail = "") => {
  const pass = Boolean(condition);
  results.push({ name, pass, detail });
  if (!pass) failures.push(`${name}: ${detail}`);
};

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const browserErrors = [];
  const anthropicRequests = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("request", request => {
    if (/api\.anthropic\.com|\/api\/talkflow\/(?:models|messages)/.test(request.url())) anthropicRequests.push(`${request.method()} ${request.url()}`);
  });
  await page.route("**/api/talkflow/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: true, authenticated: true }) }));
  const url = `http://127.0.0.1:${server.address().port}/?section=topics&view=tasks&month=2026-08`;
  await page.goto(url, { waitUntil: "networkidle" });
  const samples = await page.evaluate(() => TalkFlow.getTopics());
  const approved = Object.values(samples);
  const topicFor = (source, date) => ({ ...structuredClone(source), id: `qa-${date}`, date, quality: { ...source.quality, status: "approved" } });
  const settingsFor = dates => ({ operatingWeekdays: [], additionalDates: dates, excludedDates: [] });
  const load = async (topics, settings) => {
    await page.evaluate(({ topics, settings }) => {
      localStorage.setItem("tb_talkflow_v1", JSON.stringify(topics));
      localStorage.setItem("tb_talkflow_settings_v1", JSON.stringify(settings));
    }, { topics, settings });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => scrollTo(0, 0));
  };

  const dates = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-18", "2026-08-20"];
  const failed = topicFor(approved[0], dates[0]);
  failed.operatorStatus = { ...(failed.operatorStatus || {}), generationStatus: "failed" };
  const review = topicFor(approved[1], dates[1]);
  review.quality = { ...review.quality, status: "draft" };
  review.generationEngine = "v3-simple";
  review.generatedConversation = true;
  delete review.session2;
  const ready = topicFor(approved[2], dates[2]);
  ready.quality = { ...ready.quality, status: "draft" };
  const multiple = {
    [dates[0]]: failed,
    [dates[1]]: review,
    [dates[2]]: ready,
    [dates[3]]: topicFor(approved[3], dates[3]),
    [dates[4]]: topicFor(approved[4], dates[4]),
  };
  await load(multiple, settingsFor(dates));

  check("product introduction is immediate", await page.locator(".product-intro").innerText().then(text => text.includes("THEBOX TALK") && text.includes("스터디 토픽을 만들고 준비하는 공간")));
  check("month summary uses one concise line", await page.locator(".month-title p").innerText().then(text => text === "승인 2 · 확인 필요 3 · 미작성 7"), await page.locator(".month-title p").innerText());
  check("priority heading is plain language", await page.getByRole("heading", { name: /지금 확인할 것/ }).isVisible());
  check("priority rows are capped at eight", await page.locator(".task-row").count() === 8, String(await page.locator(".task-row").count()));
  check("approved topics do not occupy priority list", await page.locator(".task-row.approved").count() === 0);
  check("each priority row has exactly one action", await page.locator(".task-row").evaluateAll(rows => rows.every(row => row.querySelectorAll("button,a").length === 1)));
  const priorityKeys = await page.locator(".task-row").evaluateAll(rows => rows.map(row => [...row.classList].filter(name => !["task-row"].includes(name)).join(",")));
  check("priority begins with failure then review then approval-ready", priorityKeys.slice(0, 3).join("|") === "generation-failed|review|print-ready", priorityKeys.join("|"));
  check("home hides row overflow menus", await page.locator(".task-home details").count() === 0);
  check("home hides technical information", await page.locator("#calendar-view").innerText().then(text => !/Claude|API|Gist|quality|generation engine|localStorage|PDF 일괄/.test(text)));
  check("secondary views follow this week", await page.locator(".this-week + .workspace-views").isVisible());
  check("week status is compact", await page.locator(".week-status").count() <= 7, String(await page.locator(".week-status").count()));

  for (const width of [375, 768, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${width}px overflow 0`, overflow <= 1, String(overflow));
    check(`${width}px exactly one row action`, await page.locator(".task-row").evaluateAll(rows => rows.every(row => row.querySelectorAll("button,a").length === 1)));
    if (width === 375) {
      check("375px action area is visible without searching", await page.locator(".task-section").evaluate(element => element.getBoundingClientRect().top < innerHeight));
      check("375px product title is at most two lines", await page.locator(".product-intro h1").evaluate(element => element.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(element).lineHeight) <= 2.1));
    }
    await page.screenshot({ path: join(evidence, `task-home-${width}.png`), fullPage: true });
  }

  await load(multiple, settingsFor(dates));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator(".task-row.empty [data-custom-date]").first().click();
    check(`${width}px auto modal is the default`, await page.locator("#custom-topic-dialog").isVisible() && await page.locator("#guided-topic-fields").isHidden());
    check(`${width}px auto primary is immediately visible`, await page.locator('#custom-topic-form button[value="auto"].primary').isVisible());
    check(`${width}px no native required topic input`, await page.locator("#custom-keyword").getAttribute("required") === null);
    check(`${width}px additional conditions start closed`, !await page.locator("#topic-create-options").evaluate(node => node.open));
    check(`${width}px auto modal overflow 0`, await page.locator("#custom-topic-dialog").evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    await page.screenshot({ path: join(evidence, `topic-create-auto-${width}.png`), fullPage: false });
    await page.getByRole("button", { name: "직접 주제 지정하기" }).click();
    check(`${width}px guided input expands and receives focus`, await page.locator("#guided-topic-fields").isVisible() && await page.locator("#custom-keyword").evaluate(node => node === document.activeElement));
    check(`${width}px guided mode has one primary action`, await page.locator("#custom-topic-dialog .primary:visible").count() === 1 && await page.locator(".topic-create-default").isHidden());
    await page.screenshot({ path: join(evidence, `topic-create-guided-${width}.png`), fullPage: false });
    await page.locator("#topic-create-options summary").click();
    check(`${width}px optional fields and automatic direction`, await page.locator("#custom-source").isVisible() && await page.locator("#custom-avoid").isVisible() && await page.locator("#custom-mood").inputValue() === "auto");
    check(`${width}px expanded modal overflow 0`, await page.locator("#custom-topic-dialog").evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    check(`${width}px expanded controls and primary stay visible`, await page.locator("#custom-mood").isVisible() && await page.locator('#custom-topic-form button[value="guided"]').isVisible());
    await page.screenshot({ path: join(evidence, `topic-create-options-${width}.png`), fullPage: false });
    await page.keyboard.press("Escape");
    check(`${width}px Escape closes modal`, await page.locator("#custom-topic-dialog").isHidden());
  }

  await page.setViewportSize({ width: 375, height: 900 });
  const onlyDate = "2026-08-18";
  await load({ [onlyDate]: { ...failed, id: "qa-one", date: onlyDate } }, settingsFor([onlyDate]));
  check("one actionable item renders once", await page.locator(".task-row").count() === 1);
  await page.screenshot({ path: join(evidence, "task-home-one-item-375.png"), fullPage: true });

  const doneDate = "2026-08-10";
  await load({ [doneDate]: topicFor(approved[0], doneDate) }, settingsFor([doneDate]));
  check("zero actionable items has a calm empty state", await page.locator(".task-row").count() === 0 && await page.getByText("지금 확인할 항목이 없습니다.", { exact: true }).isVisible());

  const weekDates = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"];
  await load(Object.fromEntries(weekDates.map((date, index) => [date, topicFor(approved[index], date)])), settingsFor(weekDates));
  check("completed week collapses to one sentence", await page.getByText("이번 주 토픽 준비가 모두 끝났습니다.", { exact: true }).isVisible() && await page.locator(".week-status").count() === 0);
  check("completed-week capture starts at page top", await page.evaluate(() => scrollY === 0) && await page.locator(".product-intro").isVisible() && await page.locator(".month-title").isVisible());
  await page.screenshot({ path: join(evidence, "task-home-week-complete-top-375-r3.png"), fullPage: true });

  check("generation failure scenario was visible", results.some(result => result.name === "priority begins with failure then review then approval-ready" && result.pass));
  await load(multiple, settingsFor(dates));
  check("review-needed scenario was visible", await page.locator(".task-row.review").count() === 1);
  check("many missing dates remain capped", await page.locator(".task-row.empty").count() <= 5 && await page.locator(".task-row").count() === 8);
  check("browser errors 0", browserErrors.length === 0, browserErrors.join("; "));
  check("actual Anthropic calls 0", anthropicRequests.length === 0, anthropicRequests.join("; "));

  const report = { pass: failures.length === 0, checks: results.length, failures, anthropicRequests: anthropicRequests.length, evidence, generatedAt: new Date().toISOString(), results };
  await writeFile(join(evidence, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
