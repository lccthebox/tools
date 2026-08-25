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
  ["written one-star rating", "It deserves a one-star rating.", "평점 1점이에요.", true],
  ["written one-star review", "She may leave a one-star review.", "별점 1점 후기를 남길 수 있어요.", true],
  ["rating missing in English", "She may leave a review.", "평점 1점 후기를 남길 수 있어요.", false],
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

for (const [name, ko] of [
  ["one room", "방 한 개"],
  ["one request", "한 번 요청했다"],
  ["one problem", "한 가지 문제가 있었다"],
  ["one night", "1박"],
  ["one person", "1명"]
]) {
  const facts = Simple.storyFactComparison("No rating marker.", ko).koFacts;
  assert.equal(facts.some(fact => fact.startsWith("rating:")), false, `${name} must not create a rating fact`);
}
for (const [ko, expected] of [["별 1개", "rating:1"], ["별점 1점", "rating:1"], ["평점 1점", "rating:1"]]) {
  assert.equal(Simple.storyFactComparison("No rating marker.", ko).koFacts.includes(expected), true, `${ko} must create ${expected}`);
}
const mixedFacts = Simple.storyFactComparison(
  "At 7 p.m., one person paid $20 after a 25-minute wait and left a 4.5-star rating.",
  "오후 7시에 한 명이 25분 기다린 뒤 20달러를 내고 별점 4.5점을 남겼어요."
);
assert.equal(mixedFacts.match, true, "count, price, time, duration, and decimal rating stay type-separated");

const liveStoryEn = [
  "Jiyeon paid ₩180,000 for one night at a city hotel and expected a high-floor room with a view.",
  "The room was on the 2nd floor, not the 10th floor she booked, and the window faced a wall.",
  "Check-in was at 3 p.m., but the room wasn't ready until 5 p.m., so she waited in the lobby for two hours.",
  "Now Jiyeon must decide whether to complain at the front desk, leave a one-star review online, or accept the situation and say nothing."
];
const liveStoryKo = [
  "지연은 도심 호텔에서 하룻밤에 18만 원을 냈고, 전망 좋은 고층 방을 기대했어요.",
  "방은 예약한 10층이 아니라 2층이었고, 창문은 벽을 향하고 있었어요.",
  "체크인은 오후 3시였지만, 방은 오후 5시가 되어서야 준비됐고, 그녀는 두 시간을 로비에서 기다렸어요.",
  "지금 지연은 프런트에 항의할지, 온라인에 별점 1점 후기를 남길지, 아니면 그냥 받아들일지 결정해야 해요."
];
const livePlanFacts = [
  { en: "Jiyeon paid ₩180,000 for one night.", ko: "지연은 하룻밤에 18만 원을 냈어요." },
  { en: "The room was on the 2nd floor, not the 10th floor she booked.", ko: "방은 예약한 10층이 아니라 2층이었어요." },
  { en: "Check-in was at 3 p.m., but the room wasn't ready until 5 p.m.", ko: "체크인은 오후 3시였지만, 방은 오후 5시가 되어서야 준비됐어요." }
];
const liveComparison = Simple.storyFactComparison(liveStoryEn, liveStoryKo, livePlanFacts);
assert.equal(liveComparison.match, true, `saved Live candidate must align: ${JSON.stringify(liveComparison)}`);
assert.deepEqual(liveComparison.missingInEn, [], "saved Live candidate has no missing EN fact");

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

console.log("PASS: 48 existing + 13 rating forensic bilingual Story fact fixtures");
