import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { validPlan, validContent } from "./generation-engine-qa.mjs";

let playwright;
let PDFDocument;
try {
  playwright = createRequire(import.meta.url)("playwright");
  ({ PDFDocument } = createRequire(import.meta.url)("pdf-lib"));
} catch {
  const runtime = join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules");
  playwright = createRequire(join(runtime, "playwright", "index.js"))("playwright");
  ({ PDFDocument } = createRequire(join(runtime, "pdf-lib", "cjs", "index.js"))("pdf-lib"));
}

const { chromium } = playwright;
const root = fileURLToPath(new URL(".", import.meta.url));
const evidence = join(root, "..", ".omo", "evidence", "talkflow-bound-fields");
const pdfPath = join(root, ".qa-pdf", "bound-field-topic.pdf");
await mkdir(evidence, { recursive: true });
await mkdir(join(root, ".qa-pdf"), { recursive: true });

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
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
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const topics = [
  { date: "2026-10-05", keyword: "빠른 업무 답장", titleEn: "Which Work Messages Need a Fast Reply?", titleKo: "어떤 업무 메시지에 빨리 답해야 할까?", firstQuestion: "Which work messages do you answer right away?", category: { en: "WORK", ko: "업무" } },
  { date: "2026-10-08", keyword: "업무 후속 메시지", titleEn: "When Should We Follow Up at Work?", titleKo: "업무 후속 메시지는 언제 보내야 할까?", firstQuestion: "How long do you wait before following up?", category: { en: "WORK", ko: "업무" } },
  { date: "2026-10-12", keyword: "업무 답장 맥락", titleEn: "How Much Context Does a Work Reply Need?", titleKo: "업무 답장에는 맥락이 얼마나 필요할까?", firstQuestion: "Do you prefer a short reply or a detailed reply?", category: { en: "WORK", ko: "업무" } }
];

const weekday = (date) => ["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T12:00:00`).getDay()];
function payloadFor(requestTopic) {
  const item = topics.find((candidate) => candidate.keyword === requestTopic.keyword) || {
    keyword: requestTopic.keyword,
    titleEn: "A Focused Conversation",
    titleKo: "집중 대화",
    firstQuestion: "What is your first reaction?",
    category: { en: "LIFE", ko: "생활" }
  };
  const plan = validPlan();
  const content = validContent();
  plan.centralTopic = { en: item.titleEn, ko: item.titleKo };
  plan.finalGroupResult = { en: `One decision about ${item.keyword}`, ko: `${item.keyword}에 대한 결정 하나` };
  content.date = requestTopic.date;
  content.weekday = weekday(requestTopic.date);
  content.category = item.category;
  content.title = { en: item.titleEn, ko: item.titleKo };
  content.session1.why.en = "Today we compare real work-message habits, response times, and the details that make a reply useful.";
  content.session1.why.ko = "오늘은 실제 업무 메시지 경험을 바탕으로 답장 속도와 도움이 되는 세부 정보의 기준을 이야기해요.";
  content.session1.icebreakers[0].en = item.firstQuestion;
  content.session1.icebreakers[0].starter = "My first reaction is…";
  content.session1.icebreakers[0].followup = "What made you react that way?";
  content.session2.situation.en = `It is 1:50 p.m. A manager needs one clear reply about “${item.titleEn}” before a 3 p.m. call. Two coworkers want opposite responses.`;
  content.session2.situation.ko = `지금은 오후 1시 50분이고, 매니저는 3시 통화 전에 “${item.titleKo}”에 대한 명확한 답장 하나가 필요해요. 두 동료는 서로 반대되는 답장을 원해요.`;
  content.session2.situation.facts = [
    { en: "70 minutes remain", ko: "70분 남음" },
    { en: "one clear reply is required", ko: "명확한 답장 하나 필요" },
    { en: "two coworkers disagree", ko: "두 동료의 의견이 반대" }
  ];
  return { plan, content };
}

const systemChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(systemChrome) ? { executablePath: systemChrome } : {}) });
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
};

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("tb_talkflow_settings_v1", JSON.stringify({ apiKey: "qa-intercept-key" })));
  const page = await context.newPage();
  const calls = [];
  await page.route("https://api.anthropic.com/v1/messages", async (route) => {
    const body = route.request().postDataJSON();
    const tool = body.tools?.[0]?.name;
    const requestData = JSON.parse(body.messages[0].content);
    calls.push({
      tool,
      keyword: requestData.topic.keyword,
      schema: body.tools?.[0]?.input_schema,
      hasPrevious: Boolean(requestData.previousCandidate),
      previousValidationIssues: requestData.previousValidationIssues || []
    });
    if (requestData.topic.keyword === "강제 Plan 실패") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "tool_use", name: tool, input: { questionAxes: ["habit"] } }] }) });
      return;
    }
    const payload = payloadFor(requestData.topic);
    if (requestData.topic.keyword === "게임 규칙 수정" && tool === "submit_content_fill" && calls.filter((call) => call.keyword === "게임 규칙 수정" && call.tool === tool).length === 1) {
      payload.content.session2.game.rules[1].ko = payload.content.session2.game.rules[0].ko;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "tool_use", name: tool, input: tool === "submit_topic_plan" ? payload.plan : payload.content }] })
    });
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle" });
  const initialStored = await page.evaluate(() => localStorage.getItem("tb_talkflow_v1"));
  const generated = [];
  for (const request of topics) generated.push(await page.evaluate((input) => TalkFlow.generateForTest({ ...input, mood: "경험 중심" }), request));

  check("T3 three general topics generated through the real two-stage path", generated.length === 3 && calls.filter((item) => item.tool === "submit_topic_plan").length === 3 && calls.filter((item) => item.tool === "submit_content_fill").length === 3);
  check("strict schemas reach the API boundary", calls.every((item) => item.schema?.additionalProperties === false));
  check("test generation does not save operational data", await page.evaluate(() => localStorage.getItem("tb_talkflow_v1")) === initialStored);
  check("all general topics pass the bound-field gate", await page.evaluate((items) => items.every((topic) => TalkFlow.generation.evaluate(topic).ready), generated));
  check("all general topics use the fixed eight sections", generated.every((topic) => topic.session1.why && topic.session1.popQuiz.length === 3 && topic.session1.icebreakers.length === 3 && topic.session1.bingo.words.length === 9 && topic.session2.game && topic.session2.situation && topic.session2.discussion.length === 3 && topic.session2.expressions.length === 6));
  check("game is copied without post-generation mutation", generated.every((topic) => JSON.stringify(topic.session2.game) === JSON.stringify(payloadFor({ date: topic.date, keyword: topic.generationRequest.keyword }).content.session2.game)));

  const beforeFailure = calls.length;
  const failure = await page.evaluate(async () => {
    try { await TalkFlow.generateForTest({ date: "2026-10-15", keyword: "강제 Plan 실패", mood: "경험 중심" }); return ""; }
    catch (error) { return error.message; }
  });
  const failedCalls = calls.slice(beforeFailure);
  check("plan retries once and blocks Content Fill", failure.includes("Topic Plan failed") && failedCalls.filter((item) => item.tool === "submit_topic_plan").length === 2 && failedCalls.every((item) => item.tool !== "submit_content_fill"));

  const repaired = await page.evaluate(() => TalkFlow.generateForTest({ date: "2026-10-16", keyword: "게임 규칙 수정", mood: "경험 중심" }));
  const repairCalls = calls.filter((item) => item.keyword === "게임 규칙 수정");
  check("B4 causes one targeted Content Fill retry", repairCalls.filter((item) => item.tool === "submit_topic_plan").length === 1 && repairCalls.filter((item) => item.tool === "submit_content_fill").length === 2 && repairCalls.at(-1).hasPrevious && repairCalls.at(-1).previousValidationIssues.some((item) => item.includes("session2.game.rules")));
  check("targeted retry returns an approvable topic", await page.evaluate((topic) => TalkFlow.generation.evaluate(topic).ready, repaired));

  const printable = generated[0];
  printable.quality = { status: "approved", score: 100, issues: [] };
  printable.operatorStatus.reviewStatus = "approved";
  await page.evaluate((topic) => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [topic.date]: topic })), printable);
  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${printable.date}&view=print`, { waitUntil: "networkidle" });
  check("T7 student handout has exactly two pages", await page.locator(".bound-handout .a4-page").count() === 2);
  check("each page has the correct four sections", await page.locator(".bound-handout .a4-page").evaluateAll((pages) => pages.map((page) => [...page.querySelectorAll(".bound-section")].map((section) => section.dataset.section).join(",")).join("|") === "why,popQuiz,icebreakers,bingo|game,situation,discussion,expressions"));
  check("T1 every displayed starter is bound to its question", await page.locator(".bound-question .bound-starter").allTextContents().then((items) => JSON.stringify(items) === JSON.stringify([...printable.session1.icebreakers, ...printable.session2.discussion].map((item) => item.starter))));
  check("T6 student question blocks contain no Korean", await page.locator(".bound-question").evaluateAll((nodes) => nodes.every((node) => !/[가-힣]/.test(node.innerText))));
  check("T4 title appears once per page without duplication", await page.locator(".bound-title").evaluateAll((nodes) => nodes.length === 2 && nodes.every((node) => node.querySelectorAll("h1").length === 1 && node.querySelectorAll("p").length === 1)));
  const studentBodyMetrics = await page.locator(".bound-handout .bound-body").evaluateAll((bodies) => bodies.map((body) => ({ scrollHeight: body.scrollHeight, clientHeight: body.clientHeight })));
  check("student content remains fully inside the printable body", studentBodyMetrics.every((item) => item.scrollHeight <= item.clientHeight + 1), JSON.stringify(studentBodyMetrics));
  check("T5 repeated student body sentences stay below three", await page.locator(".bound-body").evaluateAll((nodes) => {
    const sentences = nodes.flatMap((node) => node.innerText.split(/[.!?]\s+|\n+/).map((item) => item.trim()).filter((item) => item.length > 18));
    const counts = sentences.reduce((map, item) => map.set(item, (map.get(item) || 0) + 1), new Map());
    return Math.max(0, ...counts.values()) < 3;
  }));
  const overflow = await page.locator(".bound-handout .a4-page").evaluateAll((pages) => pages.map((item) => ({ vertical: item.scrollHeight - item.clientHeight, horizontal: item.scrollWidth - item.clientWidth })));
  check("T7 A4 pages have no clipping", overflow.every((item) => item.vertical <= 1 && item.horizontal <= 1), JSON.stringify(overflow));
  const printResult = await page.evaluate(() => TalkFlow.evaluateRenderedPrint(TalkFlow.getTopics()["2026-10-05"]));
  check("T7 print type floors pass", printResult.status === "ready", JSON.stringify(printResult));
  const pdf = await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  check("T7 actual PDF has two pages", (await PDFDocument.load(pdf)).getPageCount() === 2);
  await page.addStyleTag({ content: ".topbar,.daily-nav,.leader-toolbar,.print-toolbar{display:none!important}" });
  for (let index = 0; index < 2; index++) await page.locator(".bound-handout .a4-page").nth(index).screenshot({ path: join(evidence, `student-page-${index + 1}.png`) });

  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${printable.date}&view=leader`, { waitUntil: "networkidle" });
  check("T3 leader time cuts are generated from current topic", await page.locator(".bound-leader-handout").innerText().then((text) => printable.leader.timeCut.every((item) => text.includes(`${item.block} ${item.from}→${item.to}분`)) && text.includes(`${printable.session2.game.name}은 최소 ${printable.session2.game.minFloor}분`)));
  const leaderBodyMetrics = await page.locator(".bound-leader-handout .bound-body").evaluateAll((bodies) => bodies.map((body) => {
    const lastNote = body.querySelector(".bound-leader p:last-child");
    return { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, noteBottom: lastNote?.getBoundingClientRect().bottom || 0, bodyBottom: body.getBoundingClientRect().bottom };
  }));
  check("leader notes remain fully inside the printable body", leaderBodyMetrics.every((item) => item.scrollHeight <= item.clientHeight + 1 && item.noteBottom <= item.bodyBottom + 1), JSON.stringify(leaderBodyMetrics));
  await page.addStyleTag({ content: ".topbar,.daily-nav,.leader-toolbar,.print-toolbar{display:none!important}" });
  for (let index = 0; index < 2; index++) await page.locator(".bound-leader-handout .a4-page").nth(index).screenshot({ path: join(evidence, `leader-page-${index + 1}.png`) });

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}/?date=${printable.date}&view=student`, { waitUntil: "networkidle" });
    check(`${width}px student view has no document overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    await page.screenshot({ path: join(evidence, `student-${width}.png`), fullPage: true });
  }

  const mutant = structuredClone(printable);
  mutant.quality = { status: "review", score: 0, issues: [] };
  mutant.operatorStatus.reviewStatus = "review";
  mutant.session2.game.rules[1].ko = mutant.session2.game.rules[0].ko;
  await page.evaluate((topic) => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [topic.date]: topic })), mutant);
  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${mutant.date}&view=admin`, { waitUntil: "networkidle" });
  check("T8 B4 is visible in the approval gate", await page.locator(".issue-list").innerText().then((text) => text.includes("B4")));
  check("T8 blocker disables approval", await page.locator("[data-action='approve-save']").isDisabled());
  check("T8 blocker exposes auto-fix", await page.getByRole("button", { name: "자동 수정 시도" }).isVisible());
  await page.screenshot({ path: join(evidence, "admin-b4-blocker.png"), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  check("T8 blocker admin remains usable at 375px", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await page.screenshot({ path: join(evidence, "admin-b4-375.png"), fullPage: true });

  const report = { pass: true, checks: checks.length, generatedAt: new Date().toISOString(), evidence, pdfPath, results: checks };
  await writeFile(join(evidence, "report.json"), JSON.stringify(report, null, 2));
  console.log(`generation-browser-qa: PASS (${checks.length} checks)`);
} finally {
  await browser.close();
  server.close();
}
