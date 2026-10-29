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
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

const fixture = JSON.parse(await readFile(join(root, "fixtures", "member-topic.json"), "utf8"));
const source = {
  publisher: "BBC News · Technology",
  category: "TECH & DIGITAL",
  title: "Libraries test a simpler digital borrowing service",
  titleKey: "libraries test simpler digital borrowing service",
  subjectKey: "libraries digital borrowing service readers routines",
  url: "https://www.bbc.co.uk/news/technology-library-service",
  excerpt: "Libraries are testing a digital borrowing service designed to make everyday reading easier.",
  popularityScore: 20,
  publishedAt: "2026-09-29T08:00:00.000Z"
};
const alternateSource = {
  ...source,
  publisher: "The Guardian · Culture",
  category: "CULTURE",
  title: "Neighbourhood cinemas make room for local film clubs",
  titleKey: "neighbourhood cinemas local film clubs",
  subjectKey: "neighbourhood cinemas local film clubs shared screenings",
  url: "https://www.theguardian.com/culture/neighbourhood-film-clubs",
  excerpt: "Local cinemas are offering regular screenings and discussion groups for nearby residents."
};
const repairSource = {
  ...source,
  publisher: "BBC News · Health",
  category: "LIFE",
  title: "Community gardens help neighbours share a weekly routine",
  titleKey: "community gardens neighbours weekly routine",
  subjectKey: "community gardens neighbours weekly routine shared outdoor activity",
  url: "https://www.bbc.co.uk/news/community-gardens-routine",
  excerpt: "Community gardens are giving neighbours a simple way to spend time outdoors together."
};
const deletedSource = {
  ...source,
  title: "A deleted Article must remain unavailable this month",
  titleKey: "deleted article must remain unavailable this month",
  subjectKey: "deleted article source monthly exclusion",
  url: "https://www.bbc.co.uk/news/deleted-article-source"
};
const plan = {
  titleEn: fixture.page1.title.en,
  titleKo: fixture.page1.title.ko,
  star: "Namjoon",
  category: fixture.page1.category,
  page1Template: "A",
  page1Premise: "A completely different temporary plan that must not replace the retained first page.",
  articleTitle: source.title,
  articleCategory: source.category,
  page2Premise: "A practical discussion about how digital library borrowing can fit into ordinary routines."
};
const content = {
  storyEn: fixture.page1.story.en,
  storyKo: fixture.page1.story.ko,
  keyWords: fixture.page1.keyWords,
  quickVoteQuestion: fixture.page1.quickVote.question,
  quickVoteOptions: fixture.page1.quickVote.options,
  easyTalk: fixture.page1.easyTalk,
  realTalk: fixture.page1.realTalk,
  todayEnglish: fixture.page1.todayEnglish,
  randomQuestions: ["One", "Two", "Three", "Four", "Five", "Six"],
  balanceGame: Array.from({ length: 6 }, (_, index) => ({ left: `Left ${index + 1}`, right: `Right ${index + 1}`, ko: `선택 ${index + 1}` })),
  articleBody: "Digital borrowing can make it easier for readers to find a book without travelling far. Some libraries hope a simpler service will help busy adults return to regular reading. Others worry that a digital-first system could leave out people who prefer personal help. Supporters say staff can spend more time recommending books when routine tasks are easier. The question is how libraries can add convenience while keeping a welcoming local space.",
  articleKeyWords: [{ en: "borrowing", ko: "대출" }, { en: "routine", ko: "일상" }, { en: "convenience", ko: "편의" }, { en: "recommend", ko: "추천하다" }, { en: "local", ko: "지역의" }],
  stanceQuestion: "Should libraries make digital borrowing their main service?",
  stanceOptions: ["Yes, convenience comes first", "Use both services equally", "No, keep in-person service first"],
  discussion: ["What makes a library useful in your routine?", "Who could benefit most from digital borrowing?", "What might people miss without staff help?", "How should a public service balance speed and access?", "What would make you visit a library more often?"],
  quizQuestion: "What is one concern about a digital-first service?",
  quizOptions: ["Some people may prefer personal help", "Books would disappear", "Readers would stop borrowing"],
  quizAnswer: 0
};
content.articleBody += " A balanced service can keep both options open for different readers.";
const overlappingContent = {
  ...content,
  articleBody: "Digital borrowing can help readers find books without travelling far. Libraries want a simpler service for busy adults. Some people still prefer personal help from staff. The question is how to keep both choices available.",
  keyWords: [
    { en: "digital borrowing", ko: "디지털 대출" },
    { en: "library service", ko: "도서관 서비스" },
    { en: "reader routines", ko: "독서 습관" },
    { en: "local library", ko: "지역 도서관" }
  ]
};
const shortArticleContent = {
  ...content,
  articleBody: content.articleBody.split(/(?<=[.!?])\s+/).slice(0, 4).join(" ")
};
const topic = {
  ...fixture,
  id: "article-regeneration-qa",
  page1: fixture.page1,
  topicPlan: fixture.topicPlan,
  generationRequest: { date: fixture.date, generationMode: "auto", topicHint: "", conversationDirection: "auto", source: "", articleSource: fixture.page2.source, avoid: "", repairSection: "", page1Template: "A" },
  generatedConversation: true,
  generationEngine: "v4-topic-v43",
  quality: { status: "review", score: 100, issues: [] },
  operatorStatus: { generationStatus: "complete", reviewStatus: "review", printStatus: "unchecked", used: false },
  hidden: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let sourceRequests = 0;
let generationRequests = 0;
let resolveNextSourceRequest = null;
let nextInvalidContentMode = "";
const contentRepairIssues = [];
const contentPlanPremises = [];
const generationTokenBudgets = [];
const contentRules = [];
const waitForSourceRequest = () => new Promise(resolve => { resolveNextSourceRequest = resolve; });
try {
  await page.route("**/api/talkflow/status/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: true, authenticated: true, model: "claude-sonnet-4-6" }) }));
  await page.route("**/api/talkflow/models/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" }] }) }));
  await page.route("**/api/talkflow/article-source/**", route => {
    sourceRequests += 1;
    const url = new URL(route.request().url());
    const excluded = url.searchParams.getAll("exclude");
    assert.ok(excluded.includes(sourceRequests === 1 ? fixture.page2.source.url : source.url), "regeneration must exclude the Article currently used for this monthly topic");
    assert.ok(url.searchParams.getAll("exclude").includes(deletedSource.url), "Article-only regeneration must exclude an Article used by a deleted topic this month");
    if (sourceRequests >= 4) assert.ok(excluded.includes(alternateSource.url), "a previously requested replacement Article must remain excluded after a failed regeneration");
    if (resolveNextSourceRequest) { resolveNextSourceRequest(); resolveNextSourceRequest = null; }
    const article = sourceRequests === 1 ? source : sourceRequests === 2 ? source : sourceRequests === 3 ? alternateSource : repairSource;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ article }) });
  });
  await page.route("**/api/talkflow/messages/**", async route => {
    generationRequests += 1;
    const body = route.request().postDataJSON();
    const tool = body.tools?.[0]?.name;
    const repair = JSON.parse(body.messages?.[0]?.content || "{}").repair;
    const approvedPlan = JSON.parse(body.messages?.[0]?.content || "{}").approvedPlan;
    const prompt = JSON.parse(body.messages?.[0]?.content || "{}");
    generationTokenBudgets.push(body.max_tokens);
    if (tool === "submit_topic_v43_content") { contentPlanPremises.push(approvedPlan?.page1Premise); contentRules.push(prompt.rules || []); }
    if (tool === "submit_topic_v43_content" && repair?.issues?.length) contentRepairIssues.push(repair.issues);
    const invalidContentMode = tool === "submit_topic_v43_content" ? nextInvalidContentMode : "";
    if (invalidContentMode) nextInvalidContentMode = "";
    const input = tool === "submit_topic_v43_plan" ? plan : invalidContentMode === "separation" ? overlappingContent : invalidContentMode === "short" ? shortArticleContent : content;
    // A real model writes Page 1 with the approved star, so the fixture story follows the plan star too.
    const star = approvedPlan?.star || fixture.page1.story.star;
    const answer = tool === "submit_topic_v43_content" ? JSON.parse(JSON.stringify(input).replaceAll(fixture.page1.story.star, star).replace(/\bYuna\b(?! Kim)/g, star)) : input;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "tool_use", name: tool, input: answer }] }) });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#custom-page1-category option").count(), 9, "the topic-create dialog must offer direct Page 1 category choices");
  assert.equal(await page.locator("#custom-article-category option").count(), 9, "the topic-create dialog must offer direct Article category choices");
  assert.equal(await page.locator("#custom-page1-category").inputValue(), "auto", "Page 1 category starts in automatic mode");
  assert.equal(await page.locator("#custom-article-category").inputValue(), "auto", "Article category starts in automatic mode");
  await page.evaluate(value => {
    localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [value.topic.date]: value.topic }));
    localStorage.setItem("tb_talkflow_article_history_v1", JSON.stringify({ [value.month]: [value.deletedSource] }));
  }, { topic, month: topic.date.slice(0, 7), deletedSource });
  await page.goto(`http://127.0.0.1:${server.address().port}/?section=topics&view=month&month=${topic.date.slice(0, 7)}&date=${topic.date}&tab=review`, { waitUntil: "networkidle" });
  await page.locator(`.drawer-tabs [data-open="${topic.date}:admin"]`).click();
  const button = page.getByRole("button", { name: "Article 다시 생성" });
  await button.waitFor({ state: "visible" });
  await button.evaluate(element => { element.click(); element.click(); });
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[expected.date]?.page2?.source?.url === expected.url, { date: topic.date, url: source.url });
  assert.equal(sourceRequests, 1, "double-clicking Article regeneration must create one RSS selection request");
  assert.equal(generationRequests, 1, "automatic Article regeneration must use a local plan and one Content Fill request");
  assert.deepEqual(generationTokenBudgets.slice(0, 1), [2800], "automatic Article regeneration must use the bounded Content Fill token budget");
  assert.equal(contentPlanPremises[0], topic.topicPlan.page1Premise, "Article-only Content Fill must be planned against the retained Page 1, not a temporary replacement plan");
  assert.ok(contentRules[0].some(rule => rule.includes("CONTENT SEPARATION CHECK")), "Content Fill must receive an explicit preflight rule that keeps Page 1 and Article subjects apart");
  const saved = await page.evaluate(date => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[date], topic.date);
  assert.equal(saved.page1.title.en, fixture.page1.title.en, "Article-only regeneration must preserve Page 1");
  assert.equal(saved.page2.source.url, source.url, "Article-only regeneration must save the new source");
  assert.equal(saved.reviewCard.sourceLink, source.url, "Article-only regeneration must refresh the manager review source");
  const versions = await page.evaluate(() => JSON.parse(localStorage.getItem("tb_talkflow_versions_v1") || "{}"));
  assert.equal(versions[topic.id]?.[0]?.topic?.page2?.source?.url, fixture.page2.source.url, "Article-only regeneration must preserve the prior topic before replacing it");
  const history = await page.evaluate(month => JSON.parse(localStorage.getItem("tb_talkflow_article_history_v1") || "{}")[month] || [], topic.date.slice(0, 7));
  assert.ok(history.some(item => item.url === fixture.page2.source.url), "Article replacement must remember the outgoing Article source before it can be deleted");
  assert.ok(history.some(item => item.url === source.url), "Article-only regeneration must remember its selected source after later deletion");
  const nextSourceRequest = waitForSourceRequest();
  nextInvalidContentMode = "separation";
  await button.click();
  await nextSourceRequest;
  await page.getByText("Article 다시 생성 실패:", { exact: false }).waitFor({ state: "visible" });
  assert.equal(sourceRequests, 3, "a duplicate RSS response must be rejected and replaced with another monthly-safe source");
  assert.equal(generationRequests, 2, "a real Page 1/Article subject collision must stop after one Content Fill instead of spending a repair call");
  assert.equal(contentRepairIssues.length, 0, "content separation must not create a second model request");
  const shortSourceRequest = waitForSourceRequest();
  const beforeRepair = saved.updatedAt;
  nextInvalidContentMode = "short";
  await button.click();
  await shortSourceRequest;
  await page.waitForFunction(expected => {
    const savedTopic = JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[expected.date];
    return savedTopic?.operatorStatus?.generationStatus === "complete" && savedTopic.updatedAt !== expected.updatedAt;
  }, { date: topic.date, updatedAt: beforeRepair }, { timeout: 5000 });
  assert.equal(sourceRequests, 4, "a non-separation validation repair still uses a fresh monthly-safe RSS source");
  assert.equal(generationRequests, 4, "a short Article receives one bounded repair request without an AI Plan call");
  assert.ok(contentRepairIssues.some(issues => issues.some(issue => issue.location === "page2.article") && !issues.some(issue => issue.location === "content.separation")), "only structural Article errors may trigger the bounded repair request");
  const repeatedDate = "2026-11-12";
  const repeatedTopic = { ...topic, id: "repeated-page-one-qa", date: repeatedDate, page1: { ...topic.page1, title: { en: "The Shared Plan", ko: "함께 정하는 계획" } }, topicPlan: { ...plan, titleEn: "The Shared Plan", titleKo: "함께 정하는 계획", page1Premise: "Finding a fair way for friends to choose a simple weekend activity." }, generationRequest: { ...topic.generationRequest, date: repeatedDate, articleSource: source } };
  await page.evaluate(value => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [value.date]: value })), repeatedTopic);
  await page.reload({ waitUntil: "networkidle" });
  const regenerated = await page.evaluate(async request => {
    const next = await TalkFlow.generateForTest(request);
    return { title: next.page1.title.en, category: next.page1.category };
  }, { date: repeatedDate, generationMode: "auto", page1Template: "A", articleSource: source });
  assert.notEqual(regenerated.title, "The Shared Plan", "full regeneration must skip the active date's prior Page 1 title");
  const beforeGuidedFullRequests = generationRequests;
  const guidedFull = await page.evaluate(async request => {
    const next = await TalkFlow.generateForTest(request);
    return { template: next.topicPlan.page1Template, articleUrl: next.page2.source.url };
  }, { date: "2026-11-13", generationMode: "guided", topicHint: "easy everyday conversation", page1Template: "A", articleSource: source });
  assert.equal(generationRequests - beforeGuidedFullRequests, 1, "guided full regeneration must skip the AI Plan call and use one Content Fill");
  assert.equal(guidedFull.template, "A", "guided full regeneration must keep the requested Page 1 template");
  assert.equal(guidedFull.articleUrl, source.url, "guided full regeneration must retain the selected Article source");
  const variants = await page.evaluate(async request => {
    const first = await TalkFlow.generateForTest({ ...request, planVariant: 0 });
    const next = await TalkFlow.generateForTest({ ...request, planVariant: 1 });
    return { firstTitle: first.page1.title.en, nextTitle: next.page1.title.en, firstStar: first.page1.story?.star, nextStar: next.page1.story?.star };
  }, { date: "2026-11-21", generationMode: "auto", page1Template: "A", articleSource: source });
  assert.notEqual(variants.firstTitle, variants.nextTitle, "each full regeneration variant must start from a different Page 1 lane");
  assert.notEqual(variants.firstStar, variants.nextStar, "each full regeneration variant must rotate the fictional star name");
  const categorySelected = await page.evaluate(async request => {
    const next = await TalkFlow.generateForTest(request);
    return { page1Category: next.page1.category, articleCategory: next.page2.category };
  }, { date: "2026-11-22", generationMode: "auto", page1Template: "A", page1Category: "LIFE", articleCategory: "CULTURE", articleSource: alternateSource });
  assert.deepEqual(categorySelected, { page1Category: "LIFE", articleCategory: "CULTURE" }, "direct category choices must drive both generated pages without another AI plan request");
  await page.goto(`http://127.0.0.1:${server.address().port}/?section=topics&view=month&month=${repeatedDate.slice(0, 7)}&date=${repeatedDate}&tab=review`, { waitUntil: "networkidle" });
  await page.locator(`.drawer-tabs [data-open="${repeatedDate}:admin"]`).click();
  const firstPageButton = page.getByRole("button", { name: "첫 장 다시 생성" });
  await firstPageButton.click();
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[expected.date]?.page1?.title?.en !== expected.title, { date: repeatedDate, title: "The Shared Plan" });
  const pageOneRegenerated = await page.evaluate(date => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[date], repeatedDate);
  assert.notEqual(pageOneRegenerated.page1.title.en, "The Shared Plan", "first-page-only regeneration must replace the repeated plan instead of reusing it");
  const repeatedIcebreakerDate = "2026-11-17";
  const repeatedIcebreakerTopic = {
    ...topic,
    id: "repeated-icebreaker-page-one-qa",
    date: repeatedIcebreakerDate,
    page1: { template: "B", title: { en: "Little Choices, Big Talk", ko: "작은 선택, 큰 대화" }, category: "ICEBREAKERS", categoryColor: "#76558D", randomQuestions: content.randomQuestions, balanceGame: content.balanceGame },
    topicPlan: { ...plan, titleEn: "Little Choices, Big Talk", titleKo: "작은 선택, 큰 대화", category: "ICEBREAKERS", page1Template: "B", page1Premise: "Light questions about everyday preferences and simple choices." },
    generationRequest: { ...topic.generationRequest, date: repeatedIcebreakerDate, generationMode: "guided", topicHint: "keep the Article source", page1Template: "B", articleSource: source }
  };
  await page.evaluate(value => localStorage.setItem("tb_talkflow_v1", JSON.stringify({ [value.date]: value.topic })), { date: repeatedIcebreakerDate, topic: repeatedIcebreakerTopic });
  await page.goto(`http://127.0.0.1:${server.address().port}/?section=topics&view=month&month=${repeatedIcebreakerDate.slice(0, 7)}&date=${repeatedIcebreakerDate}&tab=review`, { waitUntil: "networkidle" });
  await page.locator(`.drawer-tabs [data-open="${repeatedIcebreakerDate}:admin"]`).click();
  const beforeIcebreakerRequests = generationRequests;
  await page.getByRole("button", { name: "첫 장 다시 생성" }).click();
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[expected.date]?.page1?.title?.en !== "Little Choices, Big Talk", { date: repeatedIcebreakerDate });
  const regeneratedIcebreaker = await page.evaluate(date => JSON.parse(localStorage.getItem("tb_talkflow_v1") || "{}")[date], repeatedIcebreakerDate);
  assert.notEqual(regeneratedIcebreaker.page1.title.en, "Little Choices, Big Talk", "first-page-only regeneration must replace a repeated Template B icebreaker");
  assert.equal(generationRequests - beforeIcebreakerRequests, 1, "first-page-only regeneration must skip the AI Plan call even for a guided request");
  console.log("PASS article-regeneration-browser-qa: subject collisions stop after one Content Fill; structural errors retain one bounded repair; full and Page 1-only regeneration skip repeated Page 1 titles.");
} finally {
  await browser.close();
  server.close();
}
