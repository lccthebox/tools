import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Simple = require("./simple-generation.js");

const session1 = {
  minutes: 50,
  story: { heading: "TODAY’S STORY", id: "story-fixture", en: ["Mina paid ₩30,000 for a dinner reservation that allowed only 25 minutes for arrival.", "She expected her two friends to arrive on time, but one friend was delayed by work.", "The restaurant offered a later table with a smaller menu while another nearby place cost less.", "Should the group wait, change restaurants, or keep the booking without their late friend?"], ko: ["미나는 도착까지 25분만 허용되는 저녁 예약에 3만 원을 냈어요.", "친구 두 명이 제시간에 오길 기대했지만 한 명은 일 때문에 늦었어요.", "식당은 메뉴가 더 적은 늦은 시간 자리를 제안했고 근처 다른 식당은 비용이 더 적었어요.", "그룹은 기다릴지, 식당을 바꿀지, 늦는 친구 없이 예약을 유지할지 선택해야 해요."] },
  easyTalk: Array.from({ length: 3 }, (_, index) => ({ en: `Easy ${index}`, ko: `쉬운 질문 ${index}`, axis: ["recentExperience", "dailyHabit", "quickChoice"][index], starter: "I think…", reasonPrompt: "Because…", longAnswerPrompt: "For example…" })), realTalk: Array.from({ length: 3 }, (_, index) => ({ en: `Real ${index}`, ko: `진짜 질문 ${index}`, axis: ["personalStory", "evaluationCriteria", "tradeoff"][index], starter: "For me…", reasonPrompt: "My reason…", longAnswerPrompt: "One exception…" })), expressions: Array.from({ length: 4 }, (_, index) => ({ en: `Expression ${index}`, ko: `표현 ${index}`, useIn: index === 0 ? ["activity"] : ["story"] })),
  quickVote: { en: "Choose.", ko: "선택하세요.", options: ["A", "B"], noReasonKo: "이유 전에 선택하세요." }
};
const session2 = {
  minutes: 40,
  reset: { en: "Look at the facts.", ko: "정보를 살펴봐요." },
  activity: { name: "Review Jury", instructionKo: "시간과 비용을 비교해요.", materials: [{ en: "Mina paid ₩30,000 for a dinner reservation that allowed only 25 minutes for arrival.", ko: "미나는 도착까지 25분만 허용되는 저녁 예약에 3만 원을 냈어요." }, { en: "The later table keeps the group together but offers a smaller menu.", ko: "늦은 시간 자리는 그룹이 함께할 수 있지만 메뉴가 더 적어요." }], stepsKo: ["선택해요.", "근거를 말해요.", "질문해요.", "선택을 바꿀지 정해요."], phrases: ["Expression 0", "Ask why.", "I agree.", "We decide."], participationKo: "모든 사람이 말해요.", sourceRef: "story-fixture", disagreementKo: "시간, 비용, 함께 식사하는 것의 우선순위가 달라요.", listeningKo: "다른 사람의 근거를 요약해요.", estimatedMinutes: 20 },
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
  categoryEn: value.category.en, categoryKo: value.category.ko, storySentences: value.session1.story.en.map((en, index) => ({ en, ko: value.session1.story.ko[index] })), activityStorySentenceIndex: 0,
  easyTalk: value.session1.easyTalk.map(({ en, ko, starter, reasonPrompt, longAnswerPrompt }) => ({ en, ko, starter, reasonPrompt, longAnswerPrompt })),
  realTalk: value.session1.realTalk.map(({ en, ko, starter, reasonPrompt, longAnswerPrompt }) => ({ en, ko, starter, reasonPrompt, longAnswerPrompt })),
  expressions: value.session1.expressions.map(({ en, ko, useIn }) => ({ en, ko, useIn })),
  quickVoteEn: value.session1.quickVote.en, quickVoteKo: value.session1.quickVote.ko, quickVoteOptions: value.session1.quickVote.options, quickVoteNoReasonKo: value.session1.quickVote.noReasonKo,
  activityInstructionKo: value.session2.activity.instructionKo, materials: value.session2.activity.materials.slice(1), stepsKo: value.session2.activity.stepsKo, activityPhrases: value.session2.activity.phrases, participationKo: value.session2.activity.participationKo, disagreementKo: value.session2.activity.disagreementKo, listeningKo: value.session2.activity.listeningKo,
  resetEn: value.session2.reset.en, resetKo: value.session2.reset.ko, thinkHarderEn: value.session2.thinkHarder.en, thinkHarderKo: value.session2.thinkHarder.ko, finalQuestionEn: value.session2.finalQuestion.en, finalQuestionKo: value.session2.finalQuestion.ko,
  leaderNotes: [value.leader.story, value.leader.easyTalk, value.leader.realTalk, value.leader.activity, value.leader.final, value.leader.timeCutKo, value.leader.activitySupport.demoKo, value.leader.activitySupport.quietKo, value.leader.activitySupport.longKo, value.leader.activitySupport.timeCutKo, value.leader.activitySupport.fastAgreementKo], leaderEmergency: value.leader.emergency, easyTalkFollowups: value.leader.easyTalkFollowups, realTalkFollowups: value.leader.realTalkFollowups
});
const plan = { selectedTopic: content.title, style: content.style, questionAxes: ["recentExperience", "dailyHabit", "quickChoice", "personalStory", "evaluationCriteria", "tradeoff"], activity: content.session2.activity.name, materialType: "reviews", groupResult: { en: "One decision with two concrete reasons", ko: "구체적인 이유 두 개가 있는 결정 하나" }, storyFacts: [{ en: "25 minutes", ko: "25분" }, { en: "₩30,000", ko: "3만 원" }, { en: "two friends", ko: "친구 두 명" }] };
const request = { date: content.date, generationMode: "auto", topicHint: "" };
const validTransport = toTransport(content);
const transportComplexity = Simple.assertContentFillSchemaComplexity();
assert.equal(transportComplexity.objects <= 6, true, `transport objects must be <= 6: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.properties <= 45, true, `transport properties must be <= 45: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.maxDepth <= 4, true, `transport depth must be <= 4: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.optional <= 4, true, `transport optional fields must be <= 4: ${JSON.stringify(transportComplexity)}`);
assert.equal(transportComplexity.unions, 0, `transport unions must be zero: ${JSON.stringify(transportComplexity)}`);
assert.equal(typeof Simple.adaptStructuredContentTransport, "function", "transport adapter is exported");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.type, "object", "server-owned transport schema is exported");
assert.deepEqual(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.expressions.items.properties.useIn.items.enum,["story","easyTalk","realTalk","activity"],"provider schema constrains expression use locations before the adapter");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.storySentences.minItems, 4, "transport contract requires four Story pairs");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.storySentences.maxItems, 4, "transport contract caps Story pairs at four");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.leaderEmergency.minItems, 4, "transport contract requires four emergency prompts");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.leaderEmergency.maxItems, 4, "transport contract caps emergency prompts at four");
const providerMinItems = [];
const collectProviderMinItems = value => { if (!value || typeof value !== "object") return; if (Number.isInteger(value.minItems)) providerMinItems.push(value.minItems); Object.values(value).forEach(collectProviderMinItems); };
collectProviderMinItems(Simple.CONTENT_OUTPUT_SCHEMA);
assert.equal(providerMinItems.every(value => value === 0 || value === 1), true, `provider schema must omit unsupported minItems: ${JSON.stringify(providerMinItems)}`);
const providerMaxItems = [];
const collectProviderMaxItems = value => { if (!value || typeof value !== "object") return; if (Number.isInteger(value.maxItems)) providerMaxItems.push(value.maxItems); Object.values(value).forEach(collectProviderMaxItems); };
collectProviderMaxItems(Simple.CONTENT_OUTPUT_SCHEMA);
assert.deepEqual(providerMaxItems, [], `provider schema must omit unsupported maxItems: ${JSON.stringify(providerMaxItems)}`);
const providerMinLengths = [];
const collectProviderMinLengths = value => { if (!value || typeof value !== "object") return; if (Number.isInteger(value.minLength)) providerMinLengths.push(value.minLength); Object.values(value).forEach(collectProviderMinLengths); };
collectProviderMinLengths(Simple.CONTENT_OUTPUT_SCHEMA);
assert.deepEqual(providerMinLengths, [], `provider schema must omit unsupported minLength: ${JSON.stringify(providerMinLengths)}`);
assert.deepEqual(Simple.parseStructuredContentResponse(structuredPayload(validTransport)), validTransport, "one top-level JSON parse returns the transport object");
const adapted = Simple.adaptStructuredContentTransport(validTransport, plan, request);
assert.equal(typeof adapted.session1, "object"); assert.equal(typeof adapted.session2, "object");
assert.equal(adapted.session1.story.id, adapted.session2.activity.sourceRef, "sourceRef is deterministic");
assert.deepEqual(adapted.title, plan.selectedTopic, "Story title is authoritative from Plan");
assert.equal(adapted.session1.story.en.length, 4, "adapter returns four Story EN sentences");
assert.equal(adapted.session1.story.ko.length, 4, "adapter returns four Story KO sentences");
assert.equal(adapted.session2.activity.materials[0].en, adapted.session1.story.en[0], "adapter copies the selected Story sentence exactly");
assert.equal(adapted.session2.activity.materials[0].ko, adapted.session1.story.ko[0], "adapter copies the selected Story translation exactly");
assert.deepEqual(adapted.title, plan.selectedTopic, "title comes from Plan"); assert.equal(adapted.style, plan.style, "style comes from Plan"); assert.equal(adapted.session1.minutes, 50); assert.equal(adapted.session2.minutes, 40);
assert.deepEqual(adapted.session1.easyTalk.map(item => item.en), session1.easyTalk.map(item => item.en), "Easy Talk maps through the adapter");
assert.deepEqual(adapted.session1.realTalk.map(item => item.en), session1.realTalk.map(item => item.en), "Real Talk maps through the adapter");
assert.deepEqual(adapted.session1.expressions, session1.expressions, "Today’s English maps through the adapter");
assert.deepEqual(adapted.session1.quickVote, session1.quickVote, "Quick Vote maps through the adapter");
assert.deepEqual(adapted.session2.activity.materials, session2.activity.materials, "adapter prepends the selected Story pair to judgment materials");
assert.deepEqual(adapted.session2.activity.stepsKo, session2.activity.stepsKo, "activity steps map through the adapter");
assert.deepEqual(adapted.session2.thinkHarder, session2.thinkHarder, "Think Harder maps through the adapter");
assert.deepEqual(adapted.session2.finalQuestion, session2.finalQuestion, "Final Question maps through the adapter");
assert.deepEqual(adapted.leader.activitySupport, content.leader.activitySupport, "leader notes map through the adapter");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, session2: JSON.stringify(session2) })), error => error?.type === "structured_content_error", "nested stringified domain objects fail");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "{bad" }], stop_reason: "end_turn" }), error => error?.type === "structured_content_error", "malformed top-level JSON fails closed");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, unknown: true })), error => error?.type === "structured_content_error", "unknown fields fail schema validation");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, storySentences: "not an array" })), error => error?.type === "structured_content_error", "wrong transport types fail");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, storySentences: validTransport.storySentences.slice(0, 3) })), error => error?.schemaValidationType === "cardinality", "three Story pairs fail");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, storySentences: [...validTransport.storySentences, validTransport.storySentences[0]] })), error => error?.schemaValidationType === "cardinality", "five Story pairs fail");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, storySentences: validTransport.storySentences.map((pair, index) => index ? pair : { en: pair.en }) })), error => error?.schemaValidationType === "required", "missing Story translation fails");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, storySentences: validTransport.storySentences.map((pair, index) => index ? pair : { en: "", ko: pair.ko }) })), error => error?.schemaValidationType === "min_length", "blank Story sentence fails");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, leaderEmergency: validTransport.leaderEmergency.slice(0, 3) })), error => error?.schemaValidationType === "cardinality", "three emergency prompts fail");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, leaderEmergency: [...validTransport.leaderEmergency, "5"] })), error => error?.schemaValidationType === "cardinality", "five emergency prompts fail");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, activityStorySentenceIndex: 4 }, plan, request), error => error?.malformedField === "activityStorySentenceIndex", "invalid Story sentence index fails");
const paraphrased = structuredClone(adapted); paraphrased.session2.activity.materials[0].en = "Mina paid for dinner and had little time.";
assert.equal(Simple.validateContent(paraphrased, plan, [], true).issues.some(item => item.id === "Q7" && item.location === "session2.activity.sourceRef"), true, "a paraphrase still fails Q7");
const sameRefWithoutCopy = structuredClone(adapted); sameRefWithoutCopy.session2.activity.materials = sameRefWithoutCopy.session2.activity.materials.slice(1);
assert.equal(sameRefWithoutCopy.session2.activity.sourceRef, sameRefWithoutCopy.session1.story.id, "Q7 negative fixture keeps the same sourceRef");
assert.equal(Simple.validateContent(sameRefWithoutCopy, plan, [], true).issues.some(item => item.id === "Q7" && item.location === "session2.activity.sourceRef"), true, "sourceRef without exact Story text fails Q7");
const exactReuseValidation = Simple.validateContent(adapted, plan, [], true);
assert.equal(exactReuseValidation.issues.some(item => item.id === "Q7" && item.location === "session2.activity.sourceRef"), false, "exact copy plus sourceRef passes Q7");
assert.equal(exactReuseValidation.issues.some(item => ["S2", "S6", "Q7", "Q9"].includes(item.id)), false, JSON.stringify(exactReuseValidation.issues));
assert.equal(exactReuseValidation.quality.scores.story >= Simple.qualityRules.story.floor, true, JSON.stringify(exactReuseValidation.quality));
assert.equal(exactReuseValidation.quality.scores.connection >= Simple.qualityRules.connection.floor, true, JSON.stringify(exactReuseValidation.quality));
assert.equal(exactReuseValidation.quality.ready, true, JSON.stringify(exactReuseValidation.quality));
assert.throws(() => Simple.adaptStructuredContentTransport(validTransport, { ...plan, selectedTopic: { en: "", ko: plan.selectedTopic.ko } }, request), error => error?.schemaValidationType === "approved_plan", "missing authoritative Plan title fails");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, easyTalk: [] }, plan, request), error => error?.schemaValidationType === "cardinality", "adapter rejects missing semantic content at the transport boundary");
const missingTransport = { ...validTransport }; delete missingTransport.finalQuestionKo;
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload(missingTransport)), error => error?.schemaValidationType === "required", "missing required transport fields fail");
assert.throws(() => Simple.parseStructuredContentResponse(structuredPayload({ ...validTransport, easyTalk: JSON.stringify(validTransport.easyTalk) })), error => error?.schemaValidationType === "type", "nested JSON strings fail");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: '{"__proto__":{"polluted":true}}' }], stop_reason: "end_turn" }), error => error?.type === "structured_content_error", "prototype pollution fails");
const oversizedSchema = structuredClone(Simple.CONTENT_FILL_TRANSPORT_SCHEMA); Object.assign(oversizedSchema.properties, { extraA: { type: "string" }, extraB: { type: "string" }, extraC: { type: "string" } });
assert.throws(() => Simple.assertContentFillSchemaComplexity(oversizedSchema), error => error?.type === "CONTENT_FILL_SCHEMA_TOO_COMPLEX_PRECHECK", "project complexity gate fails before provider dispatch");
assert.throws(() => Simple.parseStructuredContentResponse({ ...structuredPayload(validTransport), stop_reason: "max_tokens" }), error => error?.type === "incomplete_response" && error?.stopReason === "max_tokens", "max_tokens fails without retry");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "I cannot help." }], stop_reason: "refusal" }), error => error?.type === "refusal" && error?.stopReason === "refusal", "refusal fails without parsing");
console.log("structured-content-qa: PASS (shallow transport, deterministic adapter, and fail-closed validation)");
