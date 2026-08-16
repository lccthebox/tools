import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Simple = require("./simple-generation.js");

const session1 = {
  minutes: 50,
  story: { heading: "TODAY’S STORY", id: "story-fixture", en: ["A", "B", "C", "D"], ko: ["가", "나", "다"] },
  easyTalk: Array.from({ length: 3 }, (_, index) => ({ en: `Easy ${index}`, ko: `쉬운 질문 ${index}`, axis: ["recentExperience", "dailyHabit", "quickChoice"][index], starter: "I think…", reasonPrompt: "Because…", longAnswerPrompt: "For example…" })), realTalk: Array.from({ length: 3 }, (_, index) => ({ en: `Real ${index}`, ko: `진짜 질문 ${index}`, axis: ["personalStory", "evaluationCriteria", "tradeoff"][index], starter: "For me…", reasonPrompt: "My reason…", longAnswerPrompt: "One exception…" })), expressions: Array.from({ length: 4 }, (_, index) => ({ en: `Expression ${index}`, ko: `표현 ${index}`, useIn: index === 0 ? ["activity"] : ["story"] })),
  quickVote: { en: "Choose.", ko: "선택하세요.", options: ["A", "B"], noReasonKo: "이유 전에 선택하세요." }
};
const session2 = {
  minutes: 40,
  reset: { en: "Look at the facts.", ko: "정보를 살펴봐요." },
  activity: { name: "Review Jury", instructionKo: "비교해요.", materials: [{ en: "A", ko: "가" }, { en: "B", ko: "나" }], stepsKo: ["선택해요.", "근거를 말해요.", "질문해요.", "선택을 바꿀지 정해요."], phrases: ["Expression 0", "Ask why.", "I agree.", "We decide."], participationKo: "모든 사람이 말해요.", sourceRef: "story-fixture", disagreementKo: "기준이 달라요.", listeningKo: "요약해요.", estimatedMinutes: 20 },
  groupResult: { en: "One decision with two reasons", ko: "결정과 이유", type: "decision" },
  thinkHarder: { en: "What makes this difficult?", ko: "무엇이 어려워요?" },
  finalQuestion: { en: "What will you do?", ko: "무엇을 할 거예요?" }
};
const content = { date: "2026-08-31", weekday: "월", category: { en: "LIFE", ko: "생활" }, title: { en: "A Gift", ko: "선물" }, style: "story", session1, session2, leader: { story: "s", easyTalk: "e", realTalk: "r", activity: "a", final: "f", emergency: ["1", "2", "3", "4"], timeCutKo: "줄여요.", easyTalkFollowups: ["1", "2", "3"], realTalkFollowups: ["1", "2", "3"], activitySupport: { demoKo: "d", quietKo: "q", longKo: "l", timeCutKo: "t", fastAgreementKo: "f" } } };

const normalize = value => Simple.normalizeContent(structuredClone(value));
const fails = (value, field) => assert.throws(() => normalize(value), error => error?.type === "structured_content_error" && error?.malformedField === field);

assert.equal(typeof normalize(content).session2, "object", "normal object sessions pass");
assert.equal(typeof normalize({ ...content, session2: JSON.stringify(session2) }).session2, "object", "session2 unwraps exactly once");
assert.equal(typeof normalize({ ...content, session1: JSON.stringify(session1) }).session1, "object", "session1 unwraps exactly once");
const both = normalize({ ...content, session1: JSON.stringify(session1), session2: JSON.stringify(session2) });
assert.equal(typeof both.session1, "object"); assert.equal(typeof both.session2, "object");
fails({ ...content, session2: "{bad" }, "session2");
fails({ ...content, session2: "[]" }, "session2");
fails({ ...content, session2: "42" }, "session2");
const missing = normalize({ ...content, session2: JSON.stringify({ minutes: 40 }) });
assert.equal(Simple.validateContent(missing, null, [], true).ok, false, "missing required fields still fail validation");
fails({ ...content, session2: JSON.stringify({ ...session2, unknown: true }) }, "session2");
fails({ ...content, session2: '{"__proto__":{"polluted":true}}' }, "session2");
fails({ ...content, session2: JSON.stringify(JSON.stringify(session2)) }, "session2");
const qualityFailure = normalize({ ...content, session2: JSON.stringify({ ...session2, activity: { ...session2.activity, materials: [] } }) });
assert.equal(Simple.validateContent(qualityFailure, null, [], true).ok, false, "quality validation runs after unwrap");
const bilingualFailure = normalize({ ...content, session2: JSON.stringify(session2), session1: { ...session1, story: { ...session1.story, en: ["The wait is 25 minutes.", "B", "C", "D"], ko: ["대기 시간은 30분이에요.", "나", "다"] } } });
assert.equal(Simple.validateContent(bilingualFailure, null, [], true).issues.some(item => item.id === "Q7" && item.location === "session1.story.ko"), true, "bilingual validation runs after unwrap");

const spaced = normalize({ ...content, session2: `  ${JSON.stringify(session2)}  ` });
assert.equal(spaced.session2.activity.name, "Review Jury", "surrounding whitespace is accepted");
fails({ ...content, session2: null }, "session2");
fails({ ...content, session1: JSON.stringify({ ...session1, unknown: true }) }, "session1");
fails({ ...content, session2: '{"minutes":40,"activity":{"constructor":{"polluted":true}}}' }, "session2");

const structuredPayload = value => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  stop_reason: "end_turn"
});
const toTransport = value => ({
  categoryEn: value.category.en, categoryKo: value.category.ko, storyEn: value.session1.story.en, storyKo: value.session1.story.ko,
  easyTalkEn: value.session1.easyTalk.map(item => item.en), easyTalkKo: value.session1.easyTalk.map(item => item.ko), easyTalkStarters: value.session1.easyTalk.map(item => item.starter), easyTalkReasonPrompts: value.session1.easyTalk.map(item => item.reasonPrompt), easyTalkLongPrompts: value.session1.easyTalk.map(item => item.longAnswerPrompt),
  realTalkEn: value.session1.realTalk.map(item => item.en), realTalkKo: value.session1.realTalk.map(item => item.ko), realTalkStarters: value.session1.realTalk.map(item => item.starter), realTalkReasonPrompts: value.session1.realTalk.map(item => item.reasonPrompt), realTalkLongPrompts: value.session1.realTalk.map(item => item.longAnswerPrompt),
  expressionsEn: value.session1.expressions.map(item => item.en), expressionsKo: value.session1.expressions.map(item => item.ko), expressionsUseIn: value.session1.expressions.map(item => item.useIn.join("|")),
  quickVoteEn: value.session1.quickVote.en, quickVoteKo: value.session1.quickVote.ko, quickVoteOptions: value.session1.quickVote.options, quickVoteNoReasonKo: value.session1.quickVote.noReasonKo,
  activityInstructionKo: value.session2.activity.instructionKo, materialsEn: value.session2.activity.materials.map(item => item.en), materialsKo: value.session2.activity.materials.map(item => item.ko), stepsKo: value.session2.activity.stepsKo, activityPhrases: value.session2.activity.phrases, participationKo: value.session2.activity.participationKo, disagreementKo: value.session2.activity.disagreementKo, listeningKo: value.session2.activity.listeningKo,
  resetEn: value.session2.reset.en, resetKo: value.session2.reset.ko, thinkHarderEn: value.session2.thinkHarder.en, thinkHarderKo: value.session2.thinkHarder.ko, finalQuestionEn: value.session2.finalQuestion.en, finalQuestionKo: value.session2.finalQuestion.ko,
  leaderStory: value.leader.story, leaderEasy: value.leader.easyTalk, leaderReal: value.leader.realTalk, leaderActivity: value.leader.activity, leaderFinal: value.leader.final, leaderEmergency: value.leader.emergency, leaderTimeCutKo: value.leader.timeCutKo, easyTalkFollowups: value.leader.easyTalkFollowups, realTalkFollowups: value.leader.realTalkFollowups, activityDemoKo: value.leader.activitySupport.demoKo, activityQuietKo: value.leader.activitySupport.quietKo, activityLongKo: value.leader.activitySupport.longKo, activityTimeCutKo: value.leader.activitySupport.timeCutKo, activityFastAgreementKo: value.leader.activitySupport.fastAgreementKo
});
const plan = { selectedTopic: content.title, style: content.style, questionAxes: ["recentExperience", "dailyHabit", "quickChoice", "personalStory", "evaluationCriteria", "tradeoff"], activity: content.session2.activity.name, materialType: "reviews", groupResult: { en: "One decision", ko: "결정 하나" }, storyFacts: [{ en: "25 minutes", ko: "25분" }] };
const request = { date: content.date, generationMode: "auto", topicHint: "" };
const validTransport = toTransport(content);
const schemaComplexity = schema => {
  const stats = { objects: 0, properties: 0, optional: 0, unions: 0, arrays: 0, maxDepth: 0 };
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== "object") return;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    if (value.type === "object") {
      stats.objects += 1;
      const properties = value.properties || {};
      stats.properties += Object.keys(properties).length;
      stats.optional += Object.keys(properties).filter(key => !(value.required || []).includes(key)).length;
    }
    if (value.type === "array") stats.arrays += 1;
    if (Array.isArray(value.type)) stats.unions += 1;
    for (const [key, child] of Object.entries(value)) {
      if (["required", "enum"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(item => visit(item, depth + 1));
      else visit(child, depth + 1);
    }
  };
  visit(schema);
  return stats;
};
const transportComplexity = schemaComplexity(Simple.CONTENT_FILL_TRANSPORT_SCHEMA);
assert.equal(transportComplexity.objects <= 10, true, `transport objects must be <= 10: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.properties <= 50, true, `transport properties must be <= 50: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.maxDepth <= 4, true, `transport depth must be <= 4: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.optional <= 4, true, `transport optional fields must be <= 4: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.unions, 0, `transport unions must be zero: ${JSON.stringify(transportComplexity)}`);
assert.equal(typeof Simple.adaptStructuredContentTransport, "function", "transport adapter is exported");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.type, "object", "server-owned transport schema is exported");
assert.deepEqual(Simple.parseStructuredContentResponse(structuredPayload(validTransport)), validTransport, "one top-level JSON parse returns the transport object");
const adapted = Simple.adaptStructuredContentTransport(validTransport, plan, request);
assert.equal(typeof adapted.session1, "object"); assert.equal(typeof adapted.session2, "object");
assert.equal(adapted.session1.story.id, adapted.session2.activity.sourceRef, "sourceRef is deterministic");
assert.deepEqual(adapted.title, plan.selectedTopic, "title comes from Plan"); assert.equal(adapted.style, plan.style, "style comes from Plan"); assert.equal(adapted.session1.minutes, 50); assert.equal(adapted.session2.minutes, 40);
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, session2: JSON.stringify(session2) })), error => error?.type === "structured_content_error", "nested stringified domain objects fail");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "{bad" }], stop_reason: "end_turn" }), error => error?.type === "structured_content_error", "malformed top-level JSON fails closed");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, unknown: true })), error => error?.type === "structured_content_error", "unknown fields fail schema validation");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, storyEn: "not an array" })), error => error?.type === "structured_content_error", "wrong transport types fail");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, easyTalkEn: [] }, plan, request), error => error?.schemaValidationType === "cardinality", "adapter fails on missing semantic content");
assert.throws(() => Simple.parseStructuredContentResponse({ ...structuredPayload(validTransport), stop_reason: "max_tokens" }), error => error?.type === "incomplete_response" && error?.stopReason === "max_tokens", "max_tokens fails without retry");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "I cannot help." }], stop_reason: "refusal" }), error => error?.type === "refusal" && error?.stopReason === "refusal", "refusal fails without parsing");
console.log("structured-content-qa: PASS (shallow transport, deterministic adapter, and fail-closed validation)");
