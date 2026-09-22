import assert from "node:assert/strict";
import { createRequire } from "node:module";

const Simple = createRequire(import.meta.url)("./simple-generation.js");

assert.equal(
  Simple.storyFactComparison("6", "6명").match,
  true,
  "a same-valued generic number should inherit the opposite language's person-count unit",
);
assert.equal(
  Simple.storyFactComparison("twice in 3 weeks", "3주 동안 2").match,
  true,
  "a same-valued generic number should inherit the opposite language's occurrence-count unit",
);
assert.equal(Simple.storyFactComparison("5", "6명").match, false, "different values must still fail");
assert.equal(Simple.storyFactComparison("6", "6주").match, false, "duration units must not be inferred from generic numbers");
assert.equal(Simple.storyFactComparison("6 dollars", "6명").match, false, "conflicting explicit units must still fail");

const plan = {
  selectedTopic: { en: "A Group Habit", ko: "그룹 습관" },
  style: Simple.STYLES[0],
  questionAxes: Simple.AXES.slice(0, 6),
  activity: Simple.ACTIVITIES[0],
  materialType: "cases",
  groupResult: { en: "One choice", ko: "한 가지 선택" },
  storyFacts: [
    { en: "6", ko: "6명" },
    { en: "twice in 3 weeks", ko: "3주 동안 2" },
    { en: "20 minutes", ko: "20분" },
  ],
};

assert.deepEqual(Simple.validatePlan(plan), { ok: true, issues: [], blockers: [], warnings: [] });
console.log("Plan fact unit normalization QA PASS");
