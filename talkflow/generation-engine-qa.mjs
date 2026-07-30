import assert from "node:assert/strict";
import "./generation-engine.js";

const Engine = globalThis.TalkFlowGeneration;
assert.ok(Engine, "generation engine is available");

const validPlan = () => ({
  centralTopic: {
    en: "Choosing dinner delivery",
    ko: "배달 저녁 메뉴 고르기"
  },
  questionAxes: ["habit", "recentExperience", "evaluation", "decision"],
  materialType: "priceConditions",
  sessionTwoActivity: "informationGap",
  speakingMechanisms: [
    "personalArtifact",
    "timedTurn",
    "informationGap",
    "openEndedDecision"
  ],
  finalGroupResult: {
    en: "One delivery choice with two reasons",
    ko: "두 가지 이유를 포함한 배달 메뉴 하나"
  }
});

const question = (axis, en, ko, frames) => ({
  axis,
  questionEn: en,
  questionKo: ko,
  speakingHelp: frames.map((frame, index) => ({
    en: frame,
    ko: index === 0 ? "제 선택은 이렇습니다." : "그 이유는 이렇습니다."
  }))
});

const validContent = () => ({
  title: {
    en: "What Should We Order Tonight?",
    ko: "오늘 저녁, 무엇을 주문할까?"
  },
  quickStart: question(
    "habit",
    "How often do you order dinner?",
    "저녁 배달을 얼마나 자주 주문하나요?",
    ["I order dinner about ...", "I usually choose ..."]
  ),
  personalExperience: {
    ...question(
      "recentExperience",
      "What happened the last time you ordered food?",
      "최근 배달 주문에서 어떤 일이 있었나요?",
      ["The last time, I ordered ...", "The best or worst part was ..."]
    ),
    alternativeEn: "If you have no recent experience, describe a meal you would order.",
    alternativeKo: "최근 경험이 없다면 주문하고 싶은 식사를 설명하세요."
  },
  evidenceDecision: question(
    "evaluation",
    "Which order gives the best value for this group?",
    "이 그룹에는 어떤 주문이 가장 합리적인가요?",
    ["Option two gives us ...", "The condition that matters is ...", "I disagree because ..."]
  ),
  shortWrapUp: question(
    "decision",
    "What is your first choice now?",
    "지금 첫 번째 선택은 무엇인가요?",
    ["My first choice is ...", "I changed my mind because ..."]
  ),
  conversationMaterials: [{
    type: "priceConditions",
    title: {
      en: "Three dinner offers",
      ko: "저녁 메뉴 세 가지"
    },
    items: [
      { en: "Chicken set: ₩22,000, arrives in 25 minutes, serves two.", ko: "치킨 세트: 22,000원, 25분 도착, 2인분." },
      { en: "Noodle set: ₩17,000, arrives in 45 minutes, serves three.", ko: "면 세트: 17,000원, 45분 도착, 3인분." },
      { en: "Rice bowls: ₩24,000, arrives in 30 minutes, one vegetarian option.", ko: "덮밥: 24,000원, 30분 도착, 채식 선택 가능." }
    ],
    decisionPrompt: {
      en: "Choose one offer and quote two conditions.",
      ko: "메뉴 하나를 고르고 조건 두 가지를 근거로 말하세요."
    }
  }],
  reset: {
    titleEn: "Fast Reset",
    titleKo: "빠른 리셋",
    instructionEn: "In order, name your current first choice in one sentence.",
    instructionKo: "순서대로 현재 첫 번째 선택을 한 문장으로 말하세요."
  },
  mainActivity: {
    titleEn: "Split the Information",
    titleKo: "정보 나누기",
    goalEn: "Build one complete comparison without showing your card.",
    goalKo: "카드를 보여 주지 않고 완전한 비교표를 만드세요.",
    steps: [
      { en: "Read only your assigned offer for two minutes.", ko: "2분 동안 자신에게 배정된 메뉴만 읽으세요." },
      { en: "Take a timed turn and share two conditions.", ko: "제한시간 순번에 조건 두 가지를 말하세요." },
      { en: "Ask one follow-up before writing the comparison.", ko: "비교표를 쓰기 전에 후속 질문을 하나 하세요." }
    ],
    participantOutput: {
      en: "Each person contributes two verified conditions.",
      ko: "각자 확인된 조건 두 가지를 제공합니다."
    }
  },
  roleChallenge: {
    titleEn: "Defend a Different Priority",
    titleKo: "서로 다른 우선순위 변호하기",
    ruleEn: "The budget, speed, and inclusion roles must challenge one another.",
    ruleKo: "예산·속도·포용 역할은 서로의 선택에 반론해야 합니다.",
    roles: [
      { nameEn: "Budget keeper", nameKo: "예산 담당", briefEn: "Keep the total under ₩20,000.", briefKo: "총액을 20,000원 아래로 유지하세요." },
      { nameEn: "Time keeper", nameKo: "시간 담당", briefEn: "Avoid any wait over 35 minutes.", briefKo: "35분이 넘는 대기는 피하세요." },
      { nameEn: "Inclusion keeper", nameKo: "포용 담당", briefEn: "Include the vegetarian diner.", briefKo: "채식 참여자를 포함하세요." }
    ]
  },
  finalDecision: {
    promptEn: "Agree on one order and give two reasons.",
    promptKo: "주문 하나에 합의하고 이유 두 가지를 말하세요.",
    everyoneSpeaksRuleEn: "Everyone must state a position before the final vote.",
    everyoneSpeaksRuleKo: "최종 투표 전에 모두 자신의 입장을 말해야 합니다.",
    resultLabelEn: "Our order and two reasons",
    resultLabelKo: "우리의 주문과 두 가지 이유"
  },
  speakingFrames: [
    { purpose: "position", en: "My first choice is ...", ko: "제 첫 번째 선택은 ...입니다." },
    { purpose: "evidence", en: "The condition that matters is ...", ko: "중요한 조건은 ...입니다." },
    { purpose: "challenge", en: "I see it differently because ...", ko: "저는 ... 때문에 다르게 봅니다." },
    { purpose: "followUp", en: "What makes that condition important?", ko: "그 조건이 왜 중요한가요?" }
  ],
  leaderGuide: {
    timingEn: "Quick Start 10, Experience 15, Evidence 20, Wrap-up 5; Reset 5, Main 20, Role 10, Decision 5.",
    timingKo: "빠른 시작 10분, 경험 15분, 근거 20분, 마무리 5분; 리셋 5분, 본 활동 20분, 역할 10분, 결정 5분.",
    supportEn: "Give each participant one card and enforce the timed turn.",
    supportKo: "각 참여자에게 카드 하나를 주고 제한시간 순번을 지키세요."
  },
  bilingualInstructions: {
    orderEn: "Prepare, share, challenge, then decide.",
    orderKo: "준비하고, 공유하고, 반론한 뒤 결정하세요.",
    rolesEn: "Use the assigned budget, time, or inclusion role.",
    rolesKo: "배정된 예산·시간·포용 역할을 사용하세요.",
    timeEn: "Follow the printed time for every section.",
    timeKo: "각 섹션에 표시된 시간을 따르세요.",
    finalResultEn: "Write one order and two reasons.",
    finalResultKo: "주문 하나와 이유 두 가지를 적으세요.",
    alternativeParticipationEn: "If speaking first is difficult, read one condition and then add an opinion.",
    alternativeParticipationKo: "먼저 말하기 어렵다면 조건 하나를 읽고 의견을 덧붙이세요."
  }
});

const expectFailure = (label, mutate, includes) => {
  const content = validContent();
  mutate(content);
  const result = Engine.validateContent(content, validPlan());
  assert.equal(result.ok, false, label);
  assert.ok(result.issues.some((issue) => issue.message.includes(includes)), `${label}: ${includes}`);
};

assert.deepEqual(
  Engine.SKELETON.sessionOne.map(({ id, minutes }) => [id, minutes]),
  [["quickStart", 10], ["personalExperience", 15], ["evidenceDecision", 20], ["shortWrapUp", 5]]
);
assert.deepEqual(
  Engine.SKELETON.sessionTwo.map(({ id, minutes }) => [id, minutes]),
  [["reset", 5], ["mainActivity", 20], ["roleChallenge", 10], ["finalDecision", 5]]
);
assert.equal(Engine.validatePlan(validPlan()).ok, true);

const duplicatePlan = validPlan();
duplicatePlan.questionAxes = ["habit", "habit", "habit"];
assert.equal(Engine.validatePlan(duplicatePlan).ok, false, "three distinct axes are required");

expectFailure("blank option", (content) => { content.conversationMaterials[0].items[0].en = ""; }, "비어");
expectFailure("English title language", (content) => { content.title.en = "오늘 저녁 메뉴"; }, "영문 제목");
expectFailure("English title without Latin text", (content) => { content.title.en = "2026 ★"; }, "영문 제목");
expectFailure("Korean title language", (content) => { content.title.ko = "Dinner Choice"; }, "한국어 제목");
expectFailure("duplicate title", (content) => { content.title.ko = content.title.en; }, "제목");
expectFailure("placeholder", (content) => { content.mainActivity.goalEn = "TBD"; }, "placeholder");
expectFailure("repeated starter", (content) => { content.shortWrapUp.speakingHelp[0].en = content.quickStart.speakingHelp[0].en; }, "반복");
expectFailure("rephrased question", (content) => {
  content.quickStart.questionEn = "What dinner do you choose?";
  content.shortWrapUp.questionEn = "Which dinner would you choose now?";
}, "표현만 바꾼");
expectFailure("missing bilingual", (content) => { content.bilingualInstructions.rolesKo = ""; }, "한국어");
expectFailure("missing session two activity", (content) => { content.mainActivity.steps = []; }, "Session 2");
expectFailure("missing real material", (content) => { content.conversationMaterials = []; }, "자료");
expectFailure("unknown schema field", (content) => { content.quickStart.extraField = "not allowed"; }, "JSON Schema");

const topic = Engine.buildTopic({
  date: "2026-10-01",
  keyword: "최근 배달 음식 선택",
  mood: "경험 중심"
}, validPlan(), validContent());
const evaluation = Engine.evaluate(topic);
assert.equal(evaluation.ready, true, JSON.stringify(evaluation.issues));
assert.equal(topic.generationEngine, Engine.VERSION);
assert.equal("conversationFlow" in topic, false, "v1 fallback must not be present");
assert.equal(topic.sessionOne.sections.length, 4);
assert.equal(topic.sessionTwo.sections.length, 4);
assert.equal(Engine.isLegacyOrInvalidDraft({ generatedConversation: true, conversationFlow: {} }), true);

const schema = Engine.GENERATED_TOPIC_SCHEMA;
for (const required of ["title", "sessionOne", "sessionTwo", "conversationMaterials", "speakingFrames", "leaderGuide", "bilingualInstructions"]) {
  assert.ok(schema.required.includes(required), `schema requires ${required}`);
}
assert.equal(Engine.PLAN_TOOL.input_schema.additionalProperties, false);
assert.equal(Engine.CONTENT_TOOL.input_schema.additionalProperties, false);

console.log("generation-engine-qa: PASS");

export { validPlan, validContent };
