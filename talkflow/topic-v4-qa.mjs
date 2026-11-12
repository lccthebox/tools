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
assert.doesNotMatch(app,/In my country/,"the Page 1 prompt line must not invite comparing countries");
assert.match(app,/MY TURN<br>In my life or at work/);
assert.ok(app.includes("otherMonths=Object.values(topics).filter(item=>item?.date&&!item.date.startsWith(month))"),"Article picks must also avoid sources already used in other months");
const cacheVersion=file=>Number(index.match(new RegExp(`${file.replace(".","\\.")}\\?v=(\\d{8})-`))?.[1]||0);
assert.ok(cacheVersion("topic-v4-generation.js")>=20261013,"prompt-contract changes must publish a fresh client generation module");
assert.ok(cacheVersion("app.js")>=20261013,"Article regeneration behavior must publish a fresh application module");
console.log("PASS topic-v4-qa: calendar, accordions, completion modes, regeneration controls");
