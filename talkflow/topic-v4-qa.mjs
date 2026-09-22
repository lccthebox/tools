import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture=JSON.parse(readFileSync(new URL("./fixtures/member-topic.json",import.meta.url),"utf8"));
const approvedStars=["BTS","BLACKPINK","Stray Kids","ATEEZ","EXO","SEVENTEEN","aespa","IU","Son Heung-min","Kim Yuna","Rosé"];
const oldSections=["easyTalk","realTalk","activity","leader","session1","session2"];

assert.equal(fixture.topicVersion,"topic-v4");
assert.equal(fixture.page1.story.fictional,true);
assert.ok(approvedStars.includes(fixture.page1.story.star));
assert.match(fixture.page1.story.paragraphs[0],/^Imagine\s+/);
assert.ok(fixture.page1.story.paragraphs.join(" ").includes(fixture.page1.story.star));
assert.equal(fixture.page1.keyWords.length,5);
assert.equal(fixture.page1.quickVote.options.length,3);
assert.equal(fixture.page1.questions.length,4);
assert.equal(fixture.page2.randomQuestions.length,4);
assert.equal(fixture.page2.randomWords.length,6);
assert.equal(fixture.page2.balanceGames.length,3);
oldSections.forEach(key=>assert.equal(Object.hasOwn(fixture,key),false,`${key} must not be inherited`));

const memberSource=readFileSync(new URL("./member.js",import.meta.url),"utf8");
assert.match(memberSource,/topicVersion==="topic-v4"/);
assert.match(memberSource,/가상의 상황입니다/);
assert.match(memberSource,/renderCompletion\(topic\)/);

const css=readFileSync(new URL("./member.css",import.meta.url),"utf8");
for(const token of ["#1b1b18","#2b5940","#5c5c57","#8b8b84","#e3e0d6","#f2f6f3"])assert.match(css,new RegExp(token));
assert.match(css,/border-left:3px solid var\(--green\)/);
assert.match(css,/font-family:var\(--font-display\)/);

console.log("Topic v4 reset fixture QA passed.");
