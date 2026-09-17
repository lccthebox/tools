import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Simple = require("./simple-generation.js");

const cases = [
  ["actual September Plan rating denominator order", "The product photo showed a rating of 4.8 out of 5.", "상품 사진 옆 평점은 5점 만점에 4.8점이었어요.", true],
  ["changed rating still fails", "The rating is 4.8 out of 5.", "평점은 5점 만점에 4.7점이에요.", false],
  ["changed rating scale still fails", "The rating is 4.8 out of 5.", "평점은 10점 만점에 4.8점이에요.", false],
  ["omitted rating scale still fails", "The rating is 4.8 out of 5.", "평점은 4.8이에요.", false],
  ["rating and scale swapped still fail", "The rating is 4.8 out of 5.", "평점은 4.8점 만점에 5점이에요.", false],
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
for (const en of ["Mia used the bag 1 time.", "Mia used the bag one time.", "Mia used the bag once."]) {
  for (const ko of ["미아는 가방을 한 번 사용했어요.", "미아는 가방을 1번 사용했어요."]) {
    assert.equal(Simple.storyFactsMatch(en, ko), true, `${en} / ${ko}`);
    assert.equal(Simple.storyFactsMatch(en, "미아는 가방을 두 번 사용했어요."), false, "different occurrence counts fail closed");
  }
}
assert.equal(Simple.storyFactsMatch("Mia used the bag twice.", "미아는 가방을 두 번 사용했어요."), true);
assert.equal(Simple.storyFactsMatch("Mia used the bag two times.", "미아는 가방을 2회 사용했어요."), true);
assert.deepEqual(Simple.storyFactComparison("Mia used it once.", "미아는 한 번 사용했어요.").enFacts, ["occurrenceCount:1"]);
assert.equal(Simple.storyFactComparison("Once the shop opens, Mia will return it.", "매장이 열리면 미아는 돌려줄 거예요.").enFacts.length, 0, "conditional once is not a count");
assert.equal(Simple.storyFactComparison("twenty-one times", "스물한 번").enFacts.includes("occurrenceCount:1"), false, "compound number must not become one");
assert.equal(Simple.storyFactComparison("1.5 times", "1.5번").enFacts.includes("occurrenceCount:5"), false, "decimal must not become a partial integer count");
assert.equal(Simple.storyFactsMatch("Mia used the bag 1 time.", "미아는 한 명을 만났어요."), false, "count units remain separated");
const giftFacts = [
  { en: "The bag cost ₩180,000.", ko: "가방 가격은 18만 원이에요." },
  { en: "Mia's friend spent 3 weeks choosing it.", ko: "미아 친구는 3주 동안 골랐어요." },
  { en: "The store allows returns within 14 days.", ko: "매장은 14일 이내에 반품이 가능해요." },
  { en: "Mia has used the bag only 1 time.", ko: "미아는 그 가방을 딱 한 번 사용했어요." }
];
assert.equal(Simple.validatePlan({ ...planBase, storyFacts: giftFacts }).ok, true, "saved gift Plan replay passes without provider repair");
assert.equal(Simple.validatePlan({ ...planBase, storyFacts: giftFacts.map((fact, index) => index === 3 ? { ...fact, ko: "미아는 그 가방을 두 번 사용했어요." } : fact) }).ok, false, "saved Plan with changed count still fails");
const autoPrompt = Simple.buildPromptPayload({ stage: "plan", topic: { generationMode: "auto" } });
const guidedPrompt = Simple.buildPromptPayload({ stage: "plan", topic: { generationMode: "guided", topicHint: "여행" } });
const qualitativePlan = { ...planBase, storyFacts: [
  { en: "The gift cost ₩85,000.", ko: "선물 가격은 85,000원이었어요." },
  { en: "The gift was the wrong color — navy instead of white.", ko: "선물은 색이 잘못됐어요 — 흰색이 아닌 네이비였어요." }
] };
const qualitativeFailure = Simple.validatePlan(qualitativePlan);
assert.equal(qualitativeFailure.ok, false, "qualitative-only anchor must not bypass the quantitative contract");
assert.equal(qualitativeFailure.issues[0].location, "plan.storyFacts[1]", "diagnostic identifies the exact rejected anchor");
assert.match(qualitativeFailure.issues[0].message, /정량/, "unsupported anchor is not mislabeled a translation mismatch");
assert.equal(Simple.validatePlan({ ...qualitativePlan, storyFacts: qualitativePlan.storyFacts.slice(0, 1) }).ok, true, "quantitative anchor list passes without changing any anchor text");
assert.match(autoPrompt.generationRules[0], /Do not put qualitative/, "generation contract explicitly excludes qualitative anchors");
assert.match(Simple.PLAN_TOOL.input_schema.properties.storyFacts.items.properties.en.description, /quantitative/, "item-level schema conveys the same contract");
const mismatchedPlan = Simple.validatePlan({ ...planBase, storyFacts: [{ en: "$20", ko: "30달러" }] });
assert.equal(mismatchedPlan.ok, false);
assert.equal(mismatchedPlan.issues[0].location, "plan.storyFacts[0]");
assert.match(mismatchedPlan.issues[0].message, /priceUsd:20.*priceUsd:30/, "diagnostic preserves the actual typed value mismatch");
assert.deepEqual(autoPrompt.generationRules, guidedPrompt.generationRules, "auto and guided share one bilingual fact rule");
assert.match(autoPrompt.generationRules[0], /storyFacts/, "canonical prompt requires shared Story facts");

console.log("PASS: existing bilingual/rating fixtures, occurrence counts, and saved gift Plan replay");
