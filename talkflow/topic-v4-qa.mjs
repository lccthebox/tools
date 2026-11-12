import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root=new URL("./",import.meta.url),fixture=JSON.parse(await readFile(new URL("fixtures/member-topic.json",root),"utf8")),member=await readFile(new URL("member.js",root),"utf8"),html=await readFile(new URL("member.html",root),"utf8"),index=await readFile(new URL("index.html",root),"utf8"),css=await readFile(new URL("member.css",root),"utf8"),app=await readFile(new URL("app.js",root),"utf8");
assert.equal(fixture.topicVersion,"topic-v4.3");
assert.equal(fixture.page1.story.fictional,true);
assert.equal(fixture.page1.keyWords.length,4);
assert.equal(fixture.page2.template,"ARTICLE");
assert.equal(fixture.page2.keyWords.length,5);
assert.equal(fixture.page2.discussion.length,5);
assert.match(html,/member-calendar-tab/);
assert.match(html,/member-list-tab/);
assert.match(member,/topic-accordions/);
assert.match(member,/여러분이라면\?/);
assert.match(member,/quizOptions|quiz\.options/);
assert.doesNotMatch(member,/Ask & Pass|Round Two|RANDOM WORDS/);
assert.match(css,/--brand-red:#a9302e/);
assert.match(app,/첫 장 다시 생성/);
assert.match(app,/Article 다시 생성/);
assert.match(app,/articlePlanForRetainedPage/,"Article regeneration must validate a replacement source against the retained first page");
assert.match(app,/ensureArticleSource\(\{\.\.\.candidate,articleSource:null,page1Category:previous\?\.page1\?\.category\|\|candidate\.page1Category\}\)/,"Article regeneration must replace its RSS source and skip the kept Page 1 category");
{
  // 12/6 and 12/10 regeneration failed with "로컬 Topic Plan을 만들지 못했습니다": it required an unused Page 1 lane although Page 1 is kept.
  const retained=app.slice(app.indexOf("async function articlePlanForRetainedPage"),app.indexOf("function generationMessages"));
  assert.match(retained,/articleOnlyPlan\(candidate\)/,"Article-only regeneration builds its plan from the new Article alone");
  assert.doesNotMatch(retained,/stablePlanForRequest\(/,"Article-only regeneration must not need a fresh Page 1 lane");
}
{
  // 12/13 failed outright because its fuel-price Article left no unused Page 1 lane; a new topic now tries the next Article.
  const store=app.slice(app.indexOf("async function generateAndStore"),app.indexOf("async function regenerateV2"));
  assert.match(store,/request=await articleSourceWithPlan\(request\)/,"new topics must pick an Article that leaves a usable Page 1 plan");
  const retry=app.slice(app.indexOf("async function articleSourceWithPlan"),app.indexOf("async function generateAndStore"));
  assert.match(retry,/attempt<\(fixed\?1:4\)/,"an automatic Article pick retries up to four Articles");
  assert.match(retry,/error\?\.stage!=="plan"\)throw error/,"only plan failures move on to the next Article");
}
{
  // 12/1 regeneration (2026-11-12) failed after one repair; the criteria checks now allow two repairs with the remaining issues.
  const validated=app.slice(app.indexOf("async function requestValidatedGenerationStage"),app.indexOf("function buildTopicFromPlan"));
  assert.match(validated,/for\(let repair=0;repair<2;repair\+\+\)/,"generation gets two repair attempts");
  assert.match(validated,/lastError\.issues/,"each repair is told only the issues still left");
}
{
  // Self-review (2026-11-12): every generation path scores the draft and rewrites below 96, keeping the best version.
  const review=app.slice(app.indexOf("const SELF_REVIEW_ROUNDS"),app.indexOf("function buildTopicFromPlan"));
  assert.match(review,/SELF_REVIEW_ROUNDS=2/,"at most two rewrites");
  assert.match(review,/<TopicV4\.REVIEW_PASS_SCORE/,"rewrites only below the pass line");
  assert.match(review,/requestValidatedGenerationStage\("content",request,plan,modelId,issues\)/,"a rewrite still passes every automatic check");
  assert.match(review,/selfReviewScore\(review,focus\)>selfReviewScore\(best\.review,focus\)/,"the best-scoring version is kept");
  assert.match(review,/catch\(error\)\{console\.warn\("Self-review skipped"[^}]*return\{content,selfReview:null\}/,"a failed review never fails the generation");
  const generate=app.slice(app.indexOf("async function generateV2Topic"),app.indexOf("function applyGenerationFailure"));
  assert.match(generate,/reviewedTopicFromPlan\(/,"new topics are self-reviewed");
  const partial=app.slice(app.indexOf("async function regenerateV41Page"),app.indexOf("async function regenerateSimpleSection"));
  assert.match(partial,/selfReviewedContent\([^;]*\{focus:page,compose:merge\}/,"a partial regeneration is scored on the page it replaced");
  assert.match(app,/\$\{renderSelfReview\(t\)\}\$\{renderTopicCriteria\(t,evaluation\)\}/,"the admin review shows the self-review scores");
  // 11/12 review: the admin preview sits inside a button, which centred every line of the printed pages.
  assert.match(await readFile(new URL("styles.css",root),"utf8"),/\.v41-page\{height:1123px;display:flex;flex-direction:column;text-align:left\}/,"printed pages are left-aligned");
}
assert.doesNotMatch(app,/In my country/,"the Page 1 prompt line must not invite comparing countries");
assert.match(app,/MY TURN<br>In my life or at work/);
assert.ok(app.includes("otherMonths=Object.values(topics).filter(item=>item?.date&&!item.date.startsWith(month))"),"Article picks must also avoid sources already used in other months");
const cacheVersion=file=>Number(index.match(new RegExp(`${file.replace(".","\\.")}\\?v=(\\d{8})-`))?.[1]||0);
assert.ok(cacheVersion("topic-v4-generation.js")>=20261013,"prompt-contract changes must publish a fresh client generation module");
assert.ok(cacheVersion("app.js")>=20261013,"Article regeneration behavior must publish a fresh application module");
console.log("PASS topic-v4-qa: calendar, accordions, completion modes, regeneration controls");
