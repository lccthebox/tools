import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Simple = require("./simple-generation.js");

const session1 = {
  minutes: 50,
  story: { heading: "TODAY’S STORY", id: "story-fixture", en: ["A", "B", "C", "D"], ko: ["가", "나", "다"] },
  easyTalk: [], realTalk: [], expressions: [],
  quickVote: { en: "Choose.", ko: "선택하세요.", options: ["A", "B"], noReasonKo: "이유 전에 선택하세요." }
};
const session2 = {
  minutes: 40,
  activity: { name: "Review Jury", instructionKo: "비교해요.", materials: [], stepsKo: [], phrases: [], participationKo: "모든 사람이 말해요.", sourceRef: "story-fixture", disagreementKo: "기준이 달라요.", listeningKo: "요약해요.", estimatedMinutes: 20 },
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
assert.equal(Simple.CONTENT_OUTPUT_SCHEMA.type, "object", "server-owned output schema is exported from the validator source of truth");
assert.deepEqual(Simple.parseStructuredContentResponse(structuredPayload(content)), content, "one top-level JSON parse returns the full object");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...content, session2: JSON.stringify(session2) })), error => error?.type === "structured_content_error" && error?.malformedField === "session2", "new structured responses reject nested stringified sessions");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "{bad" }], stop_reason: "end_turn" }), error => error?.type === "structured_content_error", "malformed top-level JSON fails closed");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...content, session2: { ...session2, unknown: true } })), error => error?.type === "structured_content_error", "unknown fields fail schema validation");
assert.throws(() => Simple.parseStructuredContentResponse({ ...structuredPayload(content), stop_reason: "max_tokens" }), error => error?.type === "incomplete_response" && error?.stopReason === "max_tokens", "max_tokens fails without retry");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "I cannot help." }], stop_reason: "refusal" }), error => error?.type === "refusal" && error?.stopReason === "refusal", "refusal fails without parsing");
console.log("structured-content-qa: PASS (one-level object normalization and fail-closed validation)");
