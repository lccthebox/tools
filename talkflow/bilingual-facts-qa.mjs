import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Simple = require("./simple-generation.js");

const cases = [
  ["same typed numbers", "The wait is 25 minutes and the rating is 4.8 stars.", "대기 시간은 25분이고 별점은 4.8이에요.", true],
  ["duration notation", "The wait is 25 minutes.", "대기 시간은 25분이에요.", true],
  ["hour duration words", "The class lasts two hours.", "수업은 두 시간 동안 진행돼요.", true],
  ["article hour duration", "The class lasts an hour.", "수업은 한 시간 동안 진행돼요.", true],
  ["written hour duration", "The class lasts seven hours.", "수업은 일곱 시간 동안 진행돼요.", true],
  ["hyphenated written minute duration", "The wait is twenty-five minutes.", "대기 시간은 25분이에요.", true],
  ["numeric hour duration", "The class lasts 2 hours.", "수업은 2시간 동안 진행돼요.", true],
  ["short hour duration", "The class lasts 2h.", "수업은 2시간 동안 진행돼요.", true],
  ["short day duration", "The pass lasts 2d.", "이용권은 2일 동안 유효해요.", true],
  ["different short duration unit", "The class lasts 2h.", "수업은 2일 동안 진행돼요.", false],
  ["unsupported compound word fails closed", "The wait is twenty-one minutes.", "대기 시간은 1분이에요.", false],
  ["Korean compound hour does not partially match", "The class lasts one hour.", "수업은 열한 시간 동안 진행돼요.", false],
  ["Korean compound person does not partially match", "One friend joined.", "열한 명이 참여했어요.", false],
  ["duplicate fact preserved", "Mina waited 25 minutes and Jae waited 25 minutes.", "민지는 25분, 재는 25분 기다렸어요.", true],
  ["duplicate fact omitted", "Mina waited 25 minutes and Jae waited 25 minutes.", "민지는 25분 기다렸어요.", false],
  ["day duration", "The pass lasts 2 days.", "이용권은 2일 동안 유효해요.", true],
  ["clock notation", "Meet at 7 p.m.", "오후 7시에 만나요.", true],
  ["local clock notation", "Meet at 2:30.", "2시 30분에 만나요.", true],
  ["price notation", "The fee is $20.", "요금은 20달러예요.", true],
  ["written price notation", "The fee is twenty dollars.", "요금은 20달러예요.", true],
  ["rating notation", "It has 4.8 stars.", "별점은 4.8이에요.", true],
  ["rating synonym", "The rating is 4.8.", "평점은 4.8이에요.", true],
  ["rating reordered", "The rating is 4.8.", "4.8 평점이에요.", true],
  ["hyphenated rating", "It has a 4.8-star rating.", "평점은 4.8이에요.", true],
  ["percentage notation", "About 25 percent agreed.", "약 25퍼센트가 동의했어요.", true],
  ["person count notation", "Three friends joined.", "친구 세 명이 참여했어요.", true],
  ["written person count", "Seven friends joined.", "친구 일곱 명이 참여했어요.", true],
  ["written and numeric person count", "Ten people joined.", "10명이 참여했어요.", true],
  ["bare local hour", "Meet at 7:00.", "7시에 만나요.", true],
  ["review count notation", "It has 380 reviews.", "후기는 380개예요.", true],
  ["review count reordered", "It has 380 reviews.", "380개의 후기가 있어요.", true],
  ["review count colon", "Reviews: 380.", "후기: 380개예요.", true],
  ["duplicate review fact omitted", "Café A has 380 reviews and Café B has 380 reviews.", "카페 A는 후기 380개예요.", false],
  ["missing duration", "The wait is 25 minutes.", "대기 시간이 있어요.", false],
  ["different duration unit", "The class lasts 2 hours.", "수업은 2일 동안 진행돼요.", false],
  ["word duration versus different unit", "The class lasts two hours.", "수업은 두 주 동안 진행돼요.", false],
  ["different price", "The fee is $20.", "요금은 30달러예요.", false],
  ["different clock time", "Meet at 7 p.m.", "오후 8시에 만나요.", false],
  ["different day period", "Meet at 7 p.m.", "오전 7시에 만나요.", false],
  ["different review count", "It has 380 reviews.", "후기는 38개예요.", false]
];

assert.equal(typeof Simple.storyFactsMatch, "function", "storyFactsMatch must be exported for deterministic validation");
for (const [name, en, ko, expected] of cases) {
  assert.equal(Simple.storyFactsMatch(en, ko), expected, name);
}

const anchors = [
  { en: "4.8 stars", ko: "별점 4.8" },
  { en: "380 reviews", ko: "후기 380개" },
  { en: "25 minutes", ko: "25분" }
];
const fullEn = "Mina saw 4.8 stars from 380 reviews, but the wait was 25 minutes.";
const fullKo = "미나는 후기 380개의 별점 4.8을 봤지만 대기 시간은 25분이었어요.";
assert.equal(Simple.storyFactsMatch(fullEn, fullKo, anchors), true, "both Stories contain every anchor");
assert.equal(Simple.storyFactsMatch(fullEn, "미나는 후기 380개의 별점 4.8을 봤어요.", anchors), false, "KO missing one anchor fails");
assert.equal(Simple.storyFactsMatch("Mina saw 4.8 stars, but the wait was 25 minutes.", fullKo, anchors), false, "EN missing one anchor fails");

const planBase = { selectedTopic: { en: "A Fair Choice", ko: "공정한 선택" }, style: "story", questionAxes: ["recentExperience", "dailyHabit", "quickChoice", "personalStory", "evaluationCriteria", "tradeoff"], activity: "Choose and Defend", materialType: "conditions", groupResult: { en: "One decision with two reasons", ko: "결정 하나와 이유 두 가지" } };
assert.equal(Simple.validatePlan({ ...planBase, storyFacts: [{ en: "25 minutes", ko: "25분" }] }).ok, true, "matching Plan anchors pass");
assert.equal(Simple.validatePlan(planBase).ok, false, "missing Plan anchors fail closed");
assert.equal(Simple.validatePlan({ ...planBase, storyFacts: [{ en: "$20", ko: "30달러" }] }).ok, false, "mismatched Plan anchors fail closed");
const autoPrompt = Simple.buildPromptPayload({ stage: "plan", topic: { generationMode: "auto" } });
const guidedPrompt = Simple.buildPromptPayload({ stage: "plan", topic: { generationMode: "guided", topicHint: "여행" } });
assert.deepEqual(autoPrompt.generationRules, guidedPrompt.generationRules, "auto and guided share one bilingual fact rule");
assert.match(autoPrompt.generationRules[0], /storyFacts/, "canonical prompt requires shared Story facts");

console.log(`PASS: ${cases.length + 8} bilingual Story fact fixtures`);
