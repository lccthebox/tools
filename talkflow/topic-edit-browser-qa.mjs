// Editing a generated v4.3 topic (2026-11-12): the manager fixes only some parts instead of regenerating whole pages.
// (1) Direct edits are saved, and an approved topic goes back to review. (2) An edit request sends the current topic,
// including direct edits, as the previous draft with the request as the only issue; the result keeps the title,
// source and untouched edits, and is re-scored.
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
const topic = {
  ...fixture,
  id: "topic-edit-qa",
  generationRequest: { date: fixture.date, generationMode: "auto", topicHint: "", conversationDirection: "auto", source: "", articleSource: fixture.page2.source, avoid: "", repairSection: "", page1Template: "A" },
  generatedConversation: true,
  generationEngine: "v4-topic-v43",
  quality: { status: "approved", score: 100, issues: [] },
  operatorStatus: { generationStatus: "complete", reviewStatus: "approved", printStatus: "checked", used: false },
  hidden: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
const directEdit = "What is one thing you always pack for a day out?";
const requestText = "Make REAL TALK 2 ask about a real experience.";
const aiRewrite = "Tell us about a time a small change of plan made your day better.";
const contentFrom = draft => ({
  pointSituationKo: draft.page1.point.situation, pointTalkKo: draft.page1.point.talk,
  storyEn: draft.page1.story.en, storyKo: draft.page1.story.ko, keyWords: draft.page1.keyWords,
  quickVoteQuestion: draft.page1.quickVote.question, quickVoteOptions: draft.page1.quickVote.options,
  easyTalk: draft.page1.easyTalk, realTalk: [draft.page1.realTalk[0], aiRewrite, draft.page1.realTalk[2]], todayEnglish: draft.page1.todayEnglish,
  randomQuestions: ["One", "Two", "Three", "Four", "Five", "Six"],
  balanceGame: Array.from({ length: 6 }, (_, index) => ({ left: `Left ${index + 1}`, right: `Right ${index + 1}`, ko: `선택 ${index + 1}` })),
  articleTitleEn: draft.page2.title, articleBody: draft.page2.article, articleKeyWords: draft.page2.keyWords,
  stanceQuestion: draft.page2.stance.question, stanceOptions: draft.page2.stance.options, discussion: draft.page2.discussion,
  quizQuestion: draft.page2.quiz.question, quizOptions: draft.page2.quiz.options, quizAnswer: draft.page2.quiz.answer ?? 0
});

const browser = await playwright.chromium.launch({ headless: true });
const contentRequests = [];
let reviewRequests = 0;
try {
  for (const width of [1280, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/talkflow/status/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: true, authenticated: true, model: "claude-sonnet-4-6" }) }));
    await page.route("**/api/talkflow/models/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" }] }) }));
    await page.route("**/api/talkflow/messages/**", async route => {
      const body = route.request().postDataJSON(), tool = body.tools?.[0]?.name, prompt = JSON.parse(body.messages?.[0]?.content || "{}");
      if (tool === "submit_topic_v43_review") { reviewRequests += 1; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ issues: [{ location: "page2.discussion", message: "Widen question 4.", deduction: 3 }] }) }] }) }); return; }
      contentRequests.push(prompt);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "tool_use", name: tool, input: contentFrom(prompt.repair.previousDraft) }] }) });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle" });
    await page.evaluate(value => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [value.date]: value })), topic);
    await page.goto(`http://127.0.0.1:${server.address().port}/?section=topics&view=month&month=${topic.date.slice(0, 7)}&date=${topic.date}&tab=review`, { waitUntil: "networkidle" });
    await page.locator(`.drawer-tabs [data-open="${topic.date}:admin"]`).click();
    await page.locator(".v43-editor").waitFor();
    assert.ok(await page.locator(".v43-editor-note").isVisible(), "an approved topic warns that edits need approval again");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no horizontal scroll at ${width}px`);
    await page.locator(".v43-editor").screenshot({ path: join(root, "artifacts", `topic-edit-${width}.png`) });
    await page.locator(".v43-direct-edit summary").click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `the open edit form fits at ${width}px`);
    await page.locator(".v43-direct-edit").screenshot({ path: join(root, "artifacts", `topic-edit-open-${width}.png`) });
    if (width === 375) { assert.deepEqual(errors, []); await page.close(); continue; }

    // (1) Direct edit
    await page.locator('[data-v43-path="page1.realTalk.0"]').fill(directEdit);
    await page.locator("[data-v43-save]").click();
    const saved = await page.evaluate(date => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[date], topic.date);
    assert.equal(saved.page1.realTalk[0], directEdit, "a direct edit is saved");
    assert.equal(saved.quality.status, "review", "editing an approved topic sends it back to review");

    // (2) Edit request
    await page.locator("#v43-edit-request").fill(requestText);
    await page.locator("[data-v43-edit-request]").click();
    await page.waitForFunction(({ date, text }) => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[date]?.page1?.realTalk?.[1] === text, { date: topic.date, text: aiRewrite }, { timeout: 10000 });
    const request = contentRequests.at(-1);
    assert.ok(request.repair.issues[0].message.includes(requestText), "the request is sent as the only issue");
    assert.equal(request.repair.previousDraft.page1.realTalk[0], directEdit, "the model edits the topic including the direct edit");
    assert.ok(request.rules.some(rule => rule.startsWith("EDIT MODE")), "the model is told to change only what was asked");
    const edited = await page.evaluate(date => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[date], topic.date);
    assert.equal(edited.page1.realTalk[0], directEdit, "the direct edit survives the edit request");
    assert.deepEqual(edited.page1.title, topic.page1.title, "the Page 1 title is kept");
    assert.equal(edited.page2.source.url, topic.page2.source.url, "the Article source is kept");
    assert.equal(edited.page1.story.star, topic.page1.story.star, "the star is kept");
    assert.deepEqual([edited.selfReview?.scorePage1, edited.selfReview?.scorePage2], [100, 97], "the edited topic is re-scored");
    const versions = await page.evaluate(() => JSON.parse(localStorage.getItem("tb_talkflow_versions_v1") || "{}"));
    assert.ok(versions[topic.id]?.length, "the version before the edit request is kept");
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.equal(reviewRequests, 1);
  console.log("PASS topic-edit-browser-qa: direct edits save and reopen review; an edit request changes only what was asked and is re-scored");
} finally {
  await browser.close();
  server.close();
}
