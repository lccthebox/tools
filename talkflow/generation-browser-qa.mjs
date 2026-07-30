import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
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
const evidence = join(root, "..", ".omo", "evidence", "talkflow-fail-closed");
const pdfPath = join(root, ".qa-pdf", "fail-closed-generated-topic.pdf");
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
  { date: "2026-10-05", keyword: "최근 배달 음식 선택", titleEn: "How Do We Choose Delivery Food?", titleKo: "최근 배달 음식, 어떻게 고를까?" },
  { date: "2026-10-08", keyword: "약속 시간과 지각", titleEn: "When Is Late Too Late?", titleKo: "약속 시간, 몇 분부터 지각일까?" },
  { date: "2026-10-12", keyword: "여행 숙소 선택", titleEn: "Which Place Should We Stay?", titleKo: "여행 숙소, 어디에서 머물까?" }
];

function payloadFor(requestTopic) {
  const item = topics.find((candidate) => candidate.keyword === requestTopic.keyword) || {
    keyword: requestTopic.keyword,
    titleEn: "A Focused Conversation",
    titleKo: "집중 대화"
  };
  const plan = validPlan();
  const content = validContent();
  plan.centralTopic = { en: item.titleEn, ko: item.titleKo };
  plan.finalGroupResult = {
    en: `One group decision about ${item.keyword}`,
    ko: `${item.keyword}에 대한 그룹 결정 하나`
  };
  content.title = { en: item.titleEn, ko: item.titleKo };

  if (item.keyword.includes("지각")) {
    content.quickStart = {
      axis: "habit",
      questionEn: "How early do you usually arrive for an appointment?",
      questionKo: "약속에 보통 얼마나 일찍 도착하나요?",
      speakingHelp: [
        { en: "I usually arrive ... minutes early.", ko: "저는 보통 ...분 일찍 도착합니다." },
        { en: "For me, being on time means ...", ko: "저에게 정시 도착은 ...을 뜻합니다." }
      ]
    };
    content.personalExperience = {
      axis: "recentExperience",
      questionEn: "What happened the last time someone was late?",
      questionKo: "최근 누군가 늦었을 때 어떤 일이 있었나요?",
      speakingHelp: [
        { en: "The last time, we waited for ...", ko: "최근에는 ... 동안 기다렸습니다." },
        { en: "I felt ... because ...", ko: "저는 ... 때문에 ...하게 느꼈습니다." }
      ],
      alternativeEn: "If you cannot remember, describe a fictional appointment.",
      alternativeKo: "기억나는 경험이 없다면 가상의 약속을 설명하세요."
    };
    content.evidenceDecision = {
      axis: "evaluation",
      questionEn: "Which late message is most responsible?",
      questionKo: "어떤 지각 메시지가 가장 책임감 있나요?",
      speakingHelp: [
        { en: "Message ... is more responsible because ...", ko: "...번 메시지가 ... 때문에 더 책임감 있습니다." },
        { en: "The useful detail is ...", ko: "도움이 되는 정보는 ...입니다." },
        { en: "I still need to know ...", ko: "저는 아직 ...을 알아야 합니다." }
      ]
    };
    content.shortWrapUp = {
      axis: "decision",
      questionEn: "What should our group lateness rule be?",
      questionKo: "우리 그룹의 지각 규칙은 무엇이어야 하나요?",
      speakingHelp: [
        { en: "Our rule should be ...", ko: "우리 규칙은 ...이어야 합니다." },
        { en: "After ... minutes, we should ...", ko: "...분이 지나면 ...해야 합니다." }
      ]
    };
    content.conversationMaterials = [{
      type: "messages",
      title: { en: "Three late messages", ko: "지각 메시지 세 가지" },
      items: [
        { en: "8:55 — I missed my bus. I will arrive at 9:12. Please order without me.", ko: "8:55 — 버스를 놓쳤어요. 9시 12분 도착해요. 먼저 주문하세요." },
        { en: "9:04 — Sorry, running late. See you soon.", ko: "9:04 — 미안해요, 늦고 있어요. 곧 봐요." },
        { en: "8:40 — My meeting ends at 9:00. Could we move our time to 9:20?", ko: "8:40 — 회의가 9시에 끝나요. 약속을 9시 20분으로 옮길까요?" }
      ],
      decisionPrompt: { en: "Rank the messages and cite two details.", ko: "메시지의 순위를 정하고 세부 정보 두 가지를 근거로 말하세요." }
    }];
    content.reset = { titleEn: "Time Check", titleKo: "시간 확인", instructionEn: "In order, say your personal late limit.", instructionKo: "순서대로 자신의 지각 기준 시간을 말하세요." };
    content.mainActivity = {
      titleEn: "Build the Missing Timeline",
      titleKo: "빠진 시간표 완성하기",
      goalEn: "Share hidden time details and build one complete appointment timeline.",
      goalKo: "숨겨진 시간 정보를 공유해 완전한 약속 시간표 하나를 만드세요.",
      steps: [
        { en: "Read your private message for two minutes.", ko: "2분 동안 자신의 비공개 메시지를 읽으세요." },
        { en: "Take a timed turn and report the exact times.", ko: "제한시간 순번에 정확한 시간을 알리세요." },
        { en: "Ask one question before adding the detail.", ko: "정보를 추가하기 전에 질문 하나를 하세요." }
      ],
      participantOutput: { en: "Each person adds one verified time and one response.", ko: "각자 확인된 시간 하나와 대응 방법 하나를 추가합니다." }
    };
    content.roleChallenge = {
      titleEn: "Protect a Different Need",
      titleKo: "서로 다른 필요 지키기",
      ruleEn: "The host, late guest, and early-leaving guest must challenge one another.",
      ruleKo: "주최자·늦는 사람·일찍 떠나는 사람은 서로의 제안에 반론해야 합니다.",
      roles: [
        { nameEn: "Host", nameKo: "주최자", briefEn: "The table is held for only ten minutes.", briefKo: "테이블은 10분 동안만 유지됩니다." },
        { nameEn: "Late guest", nameKo: "늦는 사람", briefEn: "Your bus arrives every twenty minutes.", briefKo: "버스가 20분 간격으로 옵니다." },
        { nameEn: "Early guest", nameKo: "일찍 떠나는 사람", briefEn: "You must leave at 10:00.", briefKo: "10시에 반드시 떠나야 합니다." }
      ]
    };
    content.finalDecision = {
      promptEn: "Agree on one lateness rule and one message rule.",
      promptKo: "지각 규칙 하나와 메시지 규칙 하나에 합의하세요.",
      everyoneSpeaksRuleEn: "Everyone must state a limit before the final decision.",
      everyoneSpeaksRuleKo: "최종 결정 전에 모두 자신의 기준 시간을 말해야 합니다.",
      resultLabelEn: "Our time and message rule",
      resultLabelKo: "우리의 시간 및 메시지 규칙"
    };
  }

  if (item.keyword.includes("숙소")) {
    content.quickStart.questionEn = "What matters first when you choose accommodation?";
    content.quickStart.questionKo = "숙소를 고를 때 가장 먼저 보는 것은 무엇인가요?";
    content.personalExperience.questionEn = "What was memorable about your most recent stay?";
    content.personalExperience.questionKo = "최근 숙박에서 기억에 남는 점은 무엇인가요?";
    content.evidenceDecision.questionEn = "Which accommodation fits this group best?";
    content.evidenceDecision.questionKo = "이 그룹에는 어떤 숙소가 가장 잘 맞나요?";
    content.shortWrapUp.questionEn = "Which place is your first choice now?";
    content.shortWrapUp.questionKo = "지금 어떤 숙소가 첫 번째 선택인가요?";
    content.conversationMaterials = [{
      type: "priceConditions",
      title: { en: "Three places for two nights", ko: "2박 숙소 세 곳" },
      items: [
        { en: "City hotel: ₩240,000, free cancellation, 3 minutes from the station, no kitchen.", ko: "도심 호텔: 240,000원, 무료 취소, 역에서 3분, 주방 없음." },
        { en: "Guesthouse: ₩150,000, shared bathroom, breakfast included, quiet after 10 p.m.", ko: "게스트하우스: 150,000원, 공용 욕실, 조식 포함, 밤 10시 이후 정숙." },
        { en: "Apartment: ₩210,000, full kitchen, 25 minutes from downtown, no refund.", ko: "아파트: 210,000원, 주방 완비, 도심에서 25분, 환불 불가." }
      ],
      decisionPrompt: { en: "Choose one place and quote two conditions.", ko: "숙소 하나를 고르고 조건 두 가지를 근거로 말하세요." }
    }];
    content.reset = { titleEn: "Priority Reset", titleKo: "우선순위 리셋", instructionEn: "In order, name your top accommodation priority.", instructionKo: "순서대로 숙소 최우선 조건을 말하세요." };
    content.mainActivity.titleEn = "Complete the Hidden Comparison";
    content.mainActivity.titleKo = "숨겨진 비교표 완성하기";
    content.mainActivity.goalEn = "Exchange private conditions and complete one comparison.";
    content.mainActivity.goalKo = "비공개 조건을 교환해 비교표 하나를 완성하세요.";
    content.roleChallenge = {
      titleEn: "Defend Your Traveler",
      titleKo: "여행자 역할 변호하기",
      ruleEn: "The budget traveler, light sleeper, and cook must challenge one another.",
      ruleKo: "절약 여행자·잠이 예민한 사람·요리하는 사람은 서로의 선택에 반론해야 합니다.",
      roles: [
        { nameEn: "Budget traveler", nameKo: "절약 여행자", briefEn: "Keep the total below ₩180,000.", briefKo: "총액을 180,000원 아래로 유지하세요." },
        { nameEn: "Light sleeper", nameKo: "잠이 예민한 사람", briefEn: "Avoid shared rooms and street noise.", briefKo: "공용 객실과 거리 소음을 피하세요." },
        { nameEn: "Cook", nameKo: "요리하는 사람", briefEn: "You need a kitchen for both dinners.", briefKo: "저녁 두 끼를 위해 주방이 필요합니다." }
      ]
    };
    content.finalDecision = {
      promptEn: "Agree on one place and two trade-offs.",
      promptKo: "숙소 하나와 감수할 조건 두 가지에 합의하세요.",
      everyoneSpeaksRuleEn: "Everyone must defend one priority before the vote.",
      everyoneSpeaksRuleKo: "투표 전에 모두 우선순위 하나를 변호해야 합니다.",
      resultLabelEn: "Our place and two trade-offs",
      resultLabelKo: "우리 숙소와 감수할 조건 두 가지"
    };
  }
  return { plan, content };
}

const browser = await chromium.launch({ headless: true });
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
};

try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem("tb_talkflow_settings_v1", JSON.stringify({ apiKey: "qa-intercept-key" }));
  });
  const page = await context.newPage();
  const calls = [];
  await page.route("https://api.anthropic.com/v1/messages", async (route) => {
    const body = route.request().postDataJSON();
    const tool = body.tools?.[0]?.name;
    const requestData = JSON.parse(body.messages[0].content);
    calls.push({ tool, keyword: requestData.topic.keyword, schema: body.tools?.[0]?.input_schema, hasPrevious: Boolean(requestData.previousCandidate), previousValidationIssues: requestData.previousValidationIssues });
    if (requestData.topic.keyword === "강제 Plan 실패") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "tool_use", name: tool, input: { questionAxes: ["habit"] } }] }) });
      return;
    }
    const payload = payloadFor(requestData.topic);
    if (requestData.topic.keyword === "중복 축 수정" && tool === "submit_content_fill" && calls.filter((call) => call.keyword === "중복 축 수정" && call.tool === tool).length === 1) {
      payload.content.evidenceDecision.axis = "habit";
      payload.content.shortWrapUp.axis = "habit";
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
  for (const request of topics) {
    generated.push(await page.evaluate((input) => TalkFlow.generateForTest({ ...input, mood: "경험 중심" }), request));
  }
  check("three non-fixture topics generated", generated.length === 3);
  check("actual API path used two stages", calls.filter((call) => call.tool === "submit_topic_plan").length === 3 && calls.filter((call) => call.tool === "submit_content_fill").length === 3);
  check("strict schemas sent at API boundary", calls.every((call) => call.schema?.additionalProperties === false));
  check("test generation did not save operational data", await page.evaluate(() => localStorage.getItem("tb_talkflow_v1")) === initialStored);
  check("all generated topics are fail-closed ready", await page.evaluate((items) => items.every((topic) => TalkFlow.generation.evaluate(topic).ready), generated));
  check("no v1 fallback in generated topics", generated.every((topic) => !topic.conversationFlow && topic.generationEngine === "v2-fail-closed"));
  check("titles are bilingual and distinct", new Set(generated.map((topic) => topic.title.en)).size === 3 && generated.every((topic) => /[A-Za-z]/.test(topic.title.en) && /[가-힣]/.test(topic.title.ko)));
  check("materials and session two are complete", generated.every((topic) => topic.conversationMaterials[0].items.length >= 3 && topic.sessionTwo.sections.length === 4));
  check("three axes and three speaking mechanisms", generated.every((topic) => topic.promptAxes.length >= 3 && Object.values(topic.speakingMechanisms).filter(Boolean).length >= 3));

  const beforeFailureCalls = calls.length;
  const failed = await page.evaluate(async () => {
    try {
      await TalkFlow.generateForTest({ date: "2026-10-15", keyword: "강제 Plan 실패", mood: "경험 중심" });
      return null;
    } catch (error) {
      return error.message;
    }
  });
  const failureCalls = calls.slice(beforeFailureCalls);
  check("plan retry is limited to one", failureCalls.filter((call) => call.tool === "submit_topic_plan").length === 2);
  check("plan failure blocks content fill", failed?.includes("Topic Plan failed") && failureCalls.every((call) => call.tool !== "submit_content_fill"));
  const repaired = await page.evaluate(() => TalkFlow.generateForTest({ date: "2026-10-16", keyword: "중복 축 수정", mood: "경험 중심" }));
  const repairCalls = calls.filter((call) => call.keyword === "중복 축 수정");
  check("duplicate axes trigger only one Content Fill retry", repairCalls.filter((call) => call.tool === "submit_topic_plan").length === 1 && repairCalls.filter((call) => call.tool === "submit_content_fill").length === 2);
  check("retry preserves candidate and targets failed locations", repairCalls.at(-1).hasPrevious && repairCalls.at(-1).previousValidationIssues.some((item) => item.includes("questions.axis")));
  check("targeted retry returns a valid topic", await page.evaluate((topic) => TalkFlow.generation.evaluate(topic).ready, repaired));

  const printable = generated[0];
  printable.quality = { status: "approved", score: 100, issues: [] };
  await page.evaluate((topic) => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [topic.date]: topic })), printable);
  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${printable.date}&view=print`, { waitUntil: "networkidle" });
  check("generated handout has exactly two A4 pages", await page.locator(".fc-handout .a4-page").count() === 2);
  check("four major sections on each page", await page.locator(".fc-handout .a4-page").evaluateAll((pages) => pages.every((item) => item.querySelectorAll(".fc-section").length === 4)));
  const overflow = await page.locator(".fc-handout .a4-page").evaluateAll((pages) => pages.map((item) => ({ vertical: item.scrollHeight - item.clientHeight, horizontal: item.scrollWidth - item.clientWidth })));
  check("A4 content is not clipped", overflow.every((item) => item.vertical <= 1 && item.horizontal <= 1), JSON.stringify(overflow));
  const type = await page.evaluate(() => TalkFlow.evaluateRenderedPrint(TalkFlow.getTopics()["2026-10-05"]));
  check("print minimum type sizes pass", type.status === "ready", JSON.stringify(type));
  const pdf = await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  const parsedPdf = await PDFDocument.load(pdf);
  check("actual PDF is two pages", parsedPdf.getPageCount() === 2, String(parsedPdf.getPageCount()));
  await page.screenshot({ path: join(evidence, "generated-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${printable.date}&view=student`, { waitUntil: "networkidle" });
  check("mobile generated screen has no horizontal page overflow", await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth));
  await page.screenshot({ path: join(evidence, "generated-mobile.png"), fullPage: true });

  const failedDraft = {
    id: "failed-test",
    date: "2026-10-19",
    title: { en: "", ko: "실패 초안" },
    generatedConversation: true,
    generationEngine: "v2-fail-closed",
    generationRequest: { date: "2026-10-19", keyword: "실패 초안", mood: "경험 중심" },
    quality: { status: "review", score: 0, issues: ["plan failed"] },
    operatorStatus: { generationStatus: "failed", reviewStatus: "review", printStatus: "unchecked" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await page.evaluate((topic) => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [topic.date]: topic })), failedDraft);
  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${failedDraft.date}&view=admin`, { waitUntil: "networkidle" });
  check("generation failure state is explicit", await page.getByText("GENERATION FAILED", { exact: true }).count() === 1);
  check("failed topic blocks preview approval and PDF", await page.locator("[data-open$=':print'],[data-action='approve-save'],[data-print-leader]").count() === 0);
  check("failed draft offers regenerate delete and original", await page.getByRole("button", { name: "v2 구조로 다시 생성" }).count() === 1 && await page.getByRole("button", { name: "기존 초안 삭제" }).count() === 1 && await page.getByText("원문 보기").count() === 1);
  await page.goto(`http://127.0.0.1:${server.address().port}/?date=${failedDraft.date}&view=print`, { waitUntil: "networkidle" });
  check("direct print URL remains fail-closed", await page.locator(".a4-page").count() === 0 && await page.getByText("PRINT BLOCKED", { exact: true }).count() === 1);

  const report = {
    pass: checks.every((item) => item.pass),
    checks,
    apiCalls: calls.map(({ tool, keyword }) => ({ tool, keyword })),
    generated: generated.map((topic) => ({
      date: topic.date,
      title: topic.title,
      axes: topic.promptAxes,
      materialItems: topic.conversationMaterials[0].items.length,
      sessionTwoSections: topic.sessionTwo.sections.map((section) => section.id),
      v1Fallback: Boolean(topic.conversationFlow)
    })),
    pdf: { path: pdfPath, pages: parsedPdf.getPageCount(), type },
    evidence
  };
  await writeFile(join(evidence, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
