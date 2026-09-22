import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Simple = require("./simple-generation.js");

const session1 = {
  minutes: 50,
  story: { heading: "TODAY’S STORY", id: "story-fixture", en: ["Mina paid ₩30,000 for a dinner reservation that allowed only 25 minutes for arrival.", "She expected her two friends to arrive on time, but one friend was delayed by work.", "The restaurant offered a later table with a smaller menu while another nearby place cost less.", "Should the group wait, change restaurants, or keep the booking without their late friend?"], ko: ["미나는 도착까지 25분만 허용되는 저녁 예약에 3만 원을 냈어요.", "친구 두 명이 제시간에 오길 기대했지만 한 명은 일 때문에 늦었어요.", "식당은 메뉴가 더 적은 늦은 시간 자리를 제안했고 근처 다른 식당은 비용이 더 적었어요.", "그룹은 기다릴지, 식당을 바꿀지, 늦는 친구 없이 예약을 유지할지 선택해야 해요."] },
  easyTalk: Array.from({ length: 3 }, (_, index) => ({ en: `Easy ${index}`, ko: `쉬운 질문 ${index}`, axis: ["recentExperience", "dailyHabit", "quickChoice"][index], starter: "I think…", reasonPrompt: "Because…", longAnswerPrompt: "For example…" })), realTalk: Array.from({ length: 3 }, (_, index) => ({ en: `Real ${index}`, ko: `진짜 질문 ${index}`, axis: ["personalStory", "evaluationCriteria", "tradeoff"][index], starter: "For me…", reasonPrompt: "My reason…", longAnswerPrompt: "One exception…" })), expressions: Array.from({ length: 5 }, (_, index) => ({ en: `Expression ${index} ___`, ko: `표현 ${index}`, useIn: index === 0 ? ["activity"] : ["story"] })),
  quickVote: { en: "Choose.", ko: "선택하세요.", options: ["A", "B", "C"], noReasonKo: "이유 전에 선택하세요." }
};
const session2 = {
  minutes: 40,
  reset: { en: "For the dinner reservation, I prefer ___ because ___.", ko: "저녁 예약에서는 ___ 때문에 ___을 선호해요." },
  activity: { name: "Review Jury", instructionKo: "시간과 비용을 비교해요.", materials: [{ en: "Mina paid ₩30,000 for a dinner reservation that allowed only 25 minutes for arrival.", ko: "미나는 도착까지 25분만 허용되는 저녁 예약에 3만 원을 냈어요." }, { en: "One friend can arrive earlier but needs a quiet table to take a work call.", ko: "한 친구는 일찍 올 수 있지만 업무 전화를 받을 조용한 자리가 필요해요." }, { en: "Another friend prefers the later table because everyone can eat together.", ko: "다른 친구는 모두 함께 먹을 수 있어서 늦은 시간 자리를 선호해요." }, { en: "A nearby restaurant has more seats but cannot keep the reservation after 7 p.m.", ko: "근처 식당은 자리가 더 많지만 오후 7시 이후에는 예약을 유지할 수 없어요." }, { en: "The group can wait outside, but rain is expected before the late friend arrives.", ko: "그룹은 밖에서 기다릴 수 있지만 늦는 친구가 오기 전에 비가 올 예정이에요." }], stepsKo: ["선택해요.", "카드를 받아요.", "근거를 듣고 질문해요.", "선택을 바꿀지 정하고 평결을 써요.", "평결을 공유해요."], phrases: ["Expression 0 ___", "Ask why.", "I agree.", "We decide."], participationKo: "모든 사람이 말해요.", sourceRef: "story-fixture", disagreementKo: "시간, 비용, 함께 식사하는 것의 우선순위가 달라요.", listeningKo: "다른 사람의 근거를 요약해요.", estimatedMinutes: 20 },
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
  quickVoteOptions: value.session1.quickVote.options,
  activityInstructionKo: value.session2.activity.instructionKo, materials: value.session2.activity.materials.slice(1), activityPhrases: value.session2.activity.phrases, disagreementKo: value.session2.activity.disagreementKo, listeningKo: value.session2.activity.listeningKo,
  thinkHarderEn: value.session2.thinkHarder.en, thinkHarderKo: value.session2.thinkHarder.ko, finalQuestionEn: value.session2.finalQuestion.en, finalQuestionKo: value.session2.finalQuestion.ko,
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
assert.equal("participationKo" in Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties, false, "participationKo is server-owned, not provider-generated");
assert.equal("quickVoteEn" in Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties, false, "Quick Vote instructions are server-owned, not provider-generated");
assert.equal("stepsKo" in Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties, false, "Jury steps are server-owned, not provider-generated");
assert.equal("resetEn" in Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties, false, "Say It Kindly is server-owned, not provider-generated");
assert.deepEqual(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.expressions.items.properties.useIn.items.enum,["story","easyTalk","realTalk","activity"],"provider schema constrains expression use locations before the adapter");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.storySentences.minItems, 4, "transport contract requires four Story pairs");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.storySentences.maxItems, 4, "transport contract caps Story pairs at four");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.leaderEmergency.minItems, 4, "transport contract requires four emergency prompts");
assert.equal(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.leaderEmergency.maxItems, 4, "transport contract caps emergency prompts at four");
assert.match(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.easyTalk.description, /12 English words or fewer/);
assert.match(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.easyTalk.description, /then humor/i);
assert.match(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.materials.description, /30 English words or fewer/);
assert.match(Simple.CONTENT_FILL_TRANSPORT_SCHEMA.properties.materials.description, /ratings? or scores?/i);
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
const productionAdapted = Simple.normalizeContent(adapted);
assert.equal(Simple.validateContent(productionAdapted, plan, [], true).issues.some(item => item.location === "facilitation.practice"), false, "server-owned Say It Kindly accepts a topic title containing Gift in the production validation path");
const shortTitlePlan = { ...plan, selectedTopic: { en: "A Day Off", ko: "쉬는 날" } };
const shortTitleAdapted = Simple.adaptStructuredContentTransport(validTransport, shortTitlePlan, request);
const productionShortTitleAdapted = Simple.normalizeContent(shortTitleAdapted);
assert.equal(Simple.validateContent(productionShortTitleAdapted, shortTitlePlan, [], true).issues.some(item => item.location === "facilitation.practice"), false, "server-owned Say It Kindly accepts a title made of short words in the production validation path");
const overwrittenPractice = structuredClone(productionAdapted);
overwrittenPractice.facilitation.practice.promptEn = "I prefer ___ because ___.";
assert.equal(Simple.validateContent(overwrittenPractice, plan, [], true).issues.some(item => item.location === "facilitation.practice"), true, "arbitrary Say It Kindly text cannot replace the server-owned topic frame");
assert.equal(adapted.facilitationVersion, "self-running-v2.2", "new topics use the Core v2.2 facilitation contract");
assert.equal(adapted.facilitation.totalMinutes, 90);
assert.equal(adapted.facilitation.transitionBufferMinutes, 10);
assert.equal(adapted.facilitation.setup.minutes, 2);
assert.deepEqual(Object.values(adapted.facilitation.rounds).map(round => round.minutes), [5, 15, 20, 25, 10, 3]);
assert.equal(adapted.facilitation.setup.minutes + Object.values(adapted.facilitation.rounds).reduce((sum, round) => sum + round.minutes, 0) + adapted.facilitation.transitionBufferMinutes, 90);
assert.match(adapted.facilitation.informationGapKo, /카드 시트/);
assert.match(adapted.facilitation.informationGapKo, /자기 말/);
assert.match(adapted.facilitation.setup.goldenRuleEn, /Everyone speaks once/i);
assert.match(adapted.facilitation.setup.hostRuleKo, /Host/);
assert.match(adapted.facilitation.setup.timerRuleKo, /Timer/);
assert.match(adapted.facilitation.informationGapKo, /다른 카드 내용을 보지 말고/);
assert.match(adapted.facilitation.minorityFirstKo, /다른 선택/);
assert.match(adapted.facilitation.verdictTemplateEn, /One person disagrees/);
assert.match(adapted.facilitation.practice.promptEn, /A Gift/);
assert.match(adapted.facilitation.wrap.stemEn, /Next time/);
assert.deepEqual(Object.keys(adapted.facilitation.levelSupport), ["starterKo", "coreKo", "deepKo"]);
assert.equal(adapted.session2.activity.estimatedMinutes, 25);
const contractStressTransport=structuredClone(validTransport);
contractStressTransport.storySentences=[
  {en:"Mina booked dinner for three people and paid ₩30,000 before checking the arrival policy carefully.",ko:"미나는 도착 규칙을 자세히 확인하기 전에 3명 저녁 식사를 예약하고 3만 원을 냈어요."},
  {en:"The restaurant allowed only 25 minutes for arrival, but one friend was delayed unexpectedly at work.",ko:"식당은 도착 시간을 20분만 허용했지만 친구 한 명이 직장에서 예상치 못하게 늦었어요."},
  {en:"A later table would keep everyone together, although the smaller menu disappointed Mina and changed what she expected from the evening.",ko:"늦은 시간 자리는 모두 함께 앉게 해 주지만 작은 메뉴는 미나를 실망하게 했어요."},
  {en:"She must now choose whether to wait, change restaurants, or keep the original booking without her late friend.",ko:"이제 미나는 기다릴지, 식당을 바꿀지, 늦는 친구 없이 기존 예약을 유지할지 선택해야 해요."}
];
contractStressTransport.materials[0]={en:"Option A gives the group a quieter table near the back window, and the manager can hold it while the late friend travels across town after finishing an unexpected work call.",ko:"선택 A는 뒤쪽 창가의 조용한 자리를 제공하고 관리자는 늦는 친구가 업무 전화를 마치고 오는 동안 자리를 유지해 줄 수 있어요."};
const scrambledPlan={...plan,questionAxes:["prediction","policy","comparison","groupDecision","problemSolving","tradeoff"]};
const contractStressAdapted=Simple.adaptStructuredContentTransport(contractStressTransport,scrambledPlan,request);
assert.deepEqual(contractStressAdapted.session1.quickVote,{en:"Choose one option. Show 1, 2, or 3 at the same time.",ko:"세 선택지 중 하나를 고르고 손가락 1·2·3으로 동시에 표시하세요.",options:validTransport.quickVoteOptions,noReasonKo:"이유는 말하지 말고 먼저 하나만 선택하세요."},"adapter owns the Quick Vote action contract");
assert.deepEqual([...contractStressAdapted.session1.easyTalk,...contractStressAdapted.session1.realTalk].map(item=>item.axis),["recentExperience","dailyHabit","quickChoice","personalStory","evaluationCriteria","tradeoff"],"adapter owns semantic question axes instead of trusting arbitrary Plan order");
assert.equal(Simple.validateContent(contractStressAdapted,scrambledPlan,[],true).issues.some(item=>["session2.activity.stepsKo","session1.story.en","session2.activity.materials","facilitation.practice","session1.story.ko"].includes(item.location)),false,JSON.stringify(Simple.validateContent(contractStressAdapted,scrambledPlan,[],true).issues));
assert.equal(Simple.storyFactsMatch(contractStressAdapted.session1.story.en.join(" "),contractStressAdapted.session1.story.ko.join(" "),scrambledPlan.storyFacts),true,"adapter aligns quantitative Story facts across languages");
assert.equal(contractStressAdapted.session1.story.en.join(" ").match(/[A-Za-z0-9’'-]+/g).length>=60&&contractStressAdapted.session1.story.en.join(" ").match(/[A-Za-z0-9’'-]+/g).length<=70,true,"adapter guarantees the 60–70 word Story budget");
assert.equal(contractStressAdapted.session2.activity.materials.slice(1).every(item=>(item.en.match(/[A-Za-z0-9’'-]+/g)||[]).length<=30),true,"adapter caps private cards at 30 English words");
assert.match(contractStressAdapted.session2.activity.stepsKo[3],/선택을 바꿀지/);
assert.match(contractStressAdapted.facilitation.practice.promptEn,/A Gift/i);
assert.doesNotMatch(contractStressAdapted.facilitation.practice.promptEn,/gift, but I hoped/i);
assert.equal(Simple.validateContent(adapted, plan, [], true).issues.some(item => item.id === "S11"), false, JSON.stringify(Simple.validateContent(adapted, plan, [], true).issues));
const noHost = structuredClone(adapted); delete noHost.facilitation.setup.hostRuleKo;
assert.equal(Simple.validateContent(noHost, plan, [], true).issues.some(item => item.location === "facilitation.setup"), true, "missing Host rule fails closed");
const noGap = structuredClone(adapted); delete noGap.facilitation.informationGapKo;
assert.equal(Simple.validateContent(noGap, plan, [], true).issues.some(item => item.location === "facilitation.activity"), true, "missing information gap fails closed");
const noWrap = structuredClone(adapted); delete noWrap.facilitation.wrap.stemEn;
assert.equal(Simple.validateContent(noWrap, plan, [], true).issues.some(item => item.location === "facilitation.closing"), true, "missing wrap fails closed");
assert.equal(adapted.session1.story.id, adapted.session2.activity.sourceRef, "sourceRef is deterministic");
assert.deepEqual(adapted.title, plan.selectedTopic, "Story title is authoritative from Plan");
assert.equal(adapted.session1.story.en.length, 4, "adapter returns four Story EN sentences");
assert.equal(adapted.session1.story.ko.length, 4, "adapter returns four Story KO sentences");
assert.equal(adapted.session2.activity.materials[0].en, adapted.session1.story.en[0], "adapter copies the selected Story sentence exactly");
assert.equal(adapted.session2.activity.materials[0].ko, adapted.session1.story.ko[0], "adapter copies the selected Story translation exactly");
assert.deepEqual(adapted.title, plan.selectedTopic, "title comes from Plan"); assert.equal(adapted.style, plan.style, "style comes from Plan"); assert.equal(adapted.session1.minutes, 50); assert.equal(adapted.session2.minutes, 40);
assert.deepEqual(adapted.session1.easyTalk.map(item => item.en), session1.easyTalk.map(item => item.en), "Easy Talk maps through the adapter");
assert.deepEqual(adapted.session1.realTalk.map(item => item.en), session1.realTalk.map(item => item.en), "Real Talk maps through the adapter");
assert.deepEqual(adapted.session1.expressions.map(({topicSpecific,...item})=>item), session1.expressions, "Today’s English maps through the adapter"); assert.deepEqual(adapted.session1.expressions.map(item=>item.topicSpecific),[true,true,true,false,false],"three expressions are marked topic-specific");
assert.deepEqual(adapted.session1.quickVote,{en:"Choose one option. Show 1, 2, or 3 at the same time.",ko:"세 선택지 중 하나를 고르고 손가락 1·2·3으로 동시에 표시하세요.",options:session1.quickVote.options,noReasonKo:"이유는 말하지 말고 먼저 하나만 선택하세요."},"Quick Vote instructions are deterministic while options map through the adapter");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, quickVoteKo: "Claude override" }, plan, request), error => error?.schemaValidationType === "additional_property", "provider output cannot override deterministic Quick Vote instructions");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, stepsKo: ["Claude override"] }, plan, request), error => error?.schemaValidationType === "additional_property", "provider output cannot override deterministic Jury steps");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, resetEn: "Claude override" }, plan, request), error => error?.schemaValidationType === "additional_property", "provider output cannot override deterministic Say It Kindly");
assert.deepEqual(adapted.session2.activity.materials, session2.activity.materials, "adapter prepends the selected Story pair to judgment materials");
assert.deepEqual(adapted.session2.activity.stepsKo, ["두 선택지 중 하나를 먼저 고르세요.","비밀 카드 한 장을 받고, 다른 사람에게 보여 주지 않은 채 자기 말로 설명하세요.","서로 다른 근거를 듣고 궁금한 점을 하나 질문하세요.","선택을 바꿀지 정한 뒤, 우리 팀의 최종 선택과 이유를 적으세요.","우리 팀의 선택과 이유를 함께 나누세요."], "adapter owns the natural Korean Jury step contract");
assert.doesNotMatch(adapted.session2.activity.stepsKo.join(" "), /PRIVATE CARD|평결문|평결/, "member-facing Jury steps do not expose internal or legalistic wording");
assert.deepEqual(adapted.session2.thinkHarder, session2.thinkHarder, "Think Harder maps through the adapter");
assert.deepEqual(adapted.session2.finalQuestion, session2.finalQuestion, "Final Question maps through the adapter");
assert.deepEqual(adapted.leader.activitySupport, content.leader.activitySupport, "leader notes map through the adapter");
const participationIssue = value => Simple.validateContent(value, plan, [], true).issues.some(item => item.location === "session2.activity.participationKo");
const speechOnly = structuredClone(adapted); speechOnly.session2.activity.participationKo = "모든 사람이 한 번씩 자신의 의견을 말하세요."; speechOnly.session2.activity.listeningKo = "";
assert.equal(participationIssue(speechOnly), true, "speaking without listening fails the participation contract");
const listeningOnly = structuredClone(adapted); listeningOnly.session2.activity.participationKo = "다른 사람의 의견을 잘 듣고 반응하세요.";
assert.equal(participationIssue(listeningOnly), true, "listening without every-person speech fails the participation contract");
const speechAndListening = structuredClone(adapted); speechAndListening.session2.activity.participationKo = "모든 사람이 한 번씩 자신의 의견을 말하세요.";
assert.equal(participationIssue(speechAndListening), false, "the current validator accepts every-person speech plus a listening step");
assert.equal(participationIssue(adapted), false, "deterministic speaking, listening, and response flow passes");
assert.equal(adapted.session2.activity.participationKo, "모든 사람이 한 번씩 자신의 의견을 말하세요. 그다음 다른 사람의 의견을 잘 듣고, 한 가지를 골라 질문하거나 이유를 덧붙여 반응하세요.", "adapter owns the natural participation flow");
const liveFailureCandidate = structuredClone(adapted); liveFailureCandidate.session2.activity.participationKo = "아직 말하지 않은 분, 이 후기에 대해 어떻게 생각하세요?"; liveFailureCandidate.session2.activity.listeningKo = "방금 들은 의견 중에서 가장 공감되는 부분이 있었나요?";
assert.equal(participationIssue(liveFailureCandidate), true, "the latest live candidate reproduces the participation failure offline");
assert.equal(participationIssue(Simple.adaptStructuredContentTransport(validTransport, plan, request)), false, "the same candidate transport passes after deterministic adaptation");
assert.throws(() => Simple.adaptStructuredContentTransport({ ...validTransport, participationKo: "Claude override" }, plan, request), error => error?.schemaValidationType === "additional_property", "provider output cannot override deterministic participationKo");
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
const oversizedSchema = structuredClone(Simple.CONTENT_FILL_TRANSPORT_SCHEMA); Object.assign(oversizedSchema.properties, Object.fromEntries(Array.from({length:10},(_,index)=>[`extra${index}`,{type:"string"}])));
assert.throws(() => Simple.assertContentFillSchemaComplexity(oversizedSchema), error => error?.type === "CONTENT_FILL_SCHEMA_TOO_COMPLEX_PRECHECK", "project complexity gate fails before provider dispatch");
assert.throws(() => Simple.parseStructuredContentResponse({ ...structuredPayload(validTransport), stop_reason: "max_tokens" }), error => error?.type === "incomplete_response" && error?.stopReason === "max_tokens", "max_tokens fails without retry");
assert.throws(() => Simple.parseStructuredContentResponse({ content: [{ type: "text", text: "I cannot help." }], stop_reason: "refusal" }), error => error?.type === "refusal" && error?.stopReason === "refusal", "refusal fails without parsing");
console.log("structured-content-qa: PASS (shallow transport, deterministic adapter, and fail-closed validation)");
