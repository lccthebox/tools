import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "./generation-engine.js";

const Engine = globalThis.TalkFlowGeneration;
const fixture = JSON.parse(await readFile(new URL("./fixtures/topic-2026-08-10.json", import.meta.url), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

const validPlan = () => ({
  centralTopic: { en: "Work message reply habits", ko: "업무 메시지 답장 습관" },
  questionAxes: ["habit", "recentExperience", "evaluation", "decision"],
  materialType: "messages",
  sessionTwoActivity: "openDecisionChallenge",
  speakingMechanisms: ["personalArtifact", "timedTurn", "assignedOpposition", "openEndedDecision"],
  finalGroupResult: { en: "One response rule", ko: "답장 규칙 하나" }
});

const ids = (result, severity) => result.issues.filter((item) => item.severity === severity).map((item) => item.id);
const expectBlocker = (id, mutate) => {
  const topic = clone(fixture);
  mutate(topic);
  const result = Engine.validateContent(topic, validPlan());
  assert.ok(ids(result, "blocker").includes(id), `${id}: ${JSON.stringify(result.issues)}`);
  assert.equal(result.ok, false, `${id} must block approval`);
};
const expectWarning = (id, mutate, allTopics = []) => {
  const topic = clone(fixture);
  mutate(topic);
  const result = Engine.validateContent(topic, validPlan(), allTopics);
  assert.ok(ids(result, "warning").includes(id), `${id}: ${JSON.stringify(result.issues)}`);
  assert.equal(result.ok, true, `${id} must allow approval when no blocker exists`);
};

assert.ok(Engine, "generation engine is available");
assert.deepEqual(Engine.SKELETON.session1.map((item) => item.id), ["why", "popQuiz", "icebreakers", "bingo"]);
assert.deepEqual(Engine.SKELETON.session2.map((item) => item.id), ["game", "situation", "discussion", "expressions"]);
assert.equal(Engine.validatePlan(validPlan()).ok, true);

const valid = Engine.validateContent(fixture, validPlan());
assert.equal(valid.ok, true, JSON.stringify(valid.issues));
assert.equal(valid.blockers.length, 0);

const topic = Engine.buildTopic({ date: fixture.date, keyword: fixture.title.ko, mood: "경험 중심" }, validPlan(), fixture);
assert.equal(Engine.evaluate(topic).ready, true, JSON.stringify(Engine.evaluate(topic).issues));
assert.deepEqual(topic.session2.game, fixture.session2.game, "game must be copied without post-processing");
assert.equal("conversationFlow" in topic, false);

// T1: every starter remains bound to its own question object.
assert.deepEqual(topic.session1.icebreakers.map((item) => item.starter), fixture.session1.icebreakers.map((item) => item.starter));
assert.ok(topic.session2.discussion.every((item) => !topic.session1.icebreakers.some((ice) => ice.starter === item.starter)));

// T2-T8 blocker behavior.
expectBlocker("B1", (value) => { delete value.session1.popQuiz; });
expectBlocker("B2", (value) => { value.session2.games = [clone(value.session2.game), clone(value.session2.game)]; });
expectBlocker("B3", (value) => { value.session2.discussion[0].starter = value.session1.icebreakers[0].starter; });
expectBlocker("B4", (value) => { value.session2.game.rules[1].ko = value.session2.game.rules[0].ko; });
expectBlocker("B5", (value) => { value.title.en = "메시지는 읽었는데 답장이 없다"; });
expectBlocker("B6", (value) => { value.session2.game.options[0].label = "Option A"; });
expectBlocker("B7", (value) => { value.leader.timeCut[2].block = "Write the Fake"; });
expectBlocker("B8", (value) => { value.title = { en: "Choosing a Jacket", ko: "재킷 고르기" }; value.session2.situation.en = "The jacket froze and restarted twice."; });
expectBlocker("B9", (value) => { value.session2.game.rules[0].en = "Use a different REACT before deciding."; });
expectBlocker("B10", (value) => { value.session2.game.inputs = [{ label: "TRUE sentence:", lines: 1 }, { label: "FAKE sentence:", lines: 1 }]; });
expectBlocker("B11", (value) => { value.session2.game.rules[0].en = "Stand and move around the room."; });

// Warning behavior.
expectWarning("W1", (value) => { value.session2.discussion[1].followup = value.session2.discussion[0].followup; });
expectWarning("W2", (value) => { value.session2.expressions.pop(); });
expectWarning("W3", (value) => { value.session2.expressions[1].fn = value.session2.expressions[0].fn; });
expectWarning("W4", (value) => { value.session2.expressions.forEach((item) => { item.en = "I think this is the best choice."; }); });
expectWarning("W5", (value) => { value.session2.game.rules[0].ko = "진행자를 정합니다. 그리고 바로 시작해요."; });
expectWarning("W6", (value) => { value.session1.bingo.words[0] = { en: "follow up", pos: "v.", ko: "후속 질문" }; });
expectWarning("W7", (value) => { value.session1.bingo.words.forEach((item) => { item.pos = "n."; }); });
expectWarning("W8", (value) => { value.session1.minutes = 45; });
expectWarning("W9", (value) => { value.session2.discussion[1].en = value.session2.discussion[0].en; });
expectWarning("W10", (value) => { value.session1.icebreakers[0].starter = "저는 I usually…라고 말해요"; });
expectWarning("W11", (value) => { value.session2.discussion[0].starter = "For me, the best approach is…"; });

const sameMonth = [clone(fixture), clone(fixture), clone(fixture)];
sameMonth[1].date = "2026-08-13";
sameMonth[2].date = "2026-08-17";
expectWarning("W12", () => {}, sameMonth);

const schema = Engine.GENERATED_TOPIC_SCHEMA;
for (const required of ["date", "weekday", "category", "title", "session1", "session2", "leader"]) {
  assert.ok(schema.required.includes(required), `schema requires ${required}`);
}
assert.equal(Engine.CONTENT_TOOL.input_schema.additionalProperties, false);

console.log("generation-engine-qa: PASS");

const validContent = () => clone(fixture);
export { validPlan, validContent };
