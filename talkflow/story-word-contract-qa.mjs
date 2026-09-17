import assert from "node:assert/strict";
import { createRequire } from "node:module";

const Simple = createRequire(import.meta.url)("./simple-generation.js");
const sentenceSchema = Simple.CONTENT_OUTPUT_SCHEMA.properties.storySentences.items.properties.en;
assert.equal(sentenceSchema.pattern, undefined, "Do not send the range-quantified Story regex rejected by Anthropic");
assert.match(sentenceSchema.description, /14–21/);
assert.match(sentenceSchema.description, /56–84/);
const story = count => ({ session1: { story: {
  en: [["Mina", "paid", "89000", "won", "but", "should", "you", ...Array.from({ length: count - 7 }, () => "consider")].join(" ")],
  ko: ["하지만 어떻게 선택할까요"]
} } });
for (const count of [54, 91]) assert.equal(Simple.contentQuality(story(count)).scores.story, 10, `${count} words retains the original failure penalty`);
for (const count of [55, 56, 84, 90]) assert.equal(Simple.contentQuality(story(count)).scores.story, 15, `${count} words retains the original valid range`);
assert.deepEqual(Simple.qualityRules.story, { weight: 15, floor: 11 }, "Quality threshold remains unchanged");
assert.equal(Simple.assertContentFillSchemaComplexity().properties, 44);
console.log("Story word contract QA PASS: rejected provider regex absent, descriptive budget retained, original 55–90 Quality boundaries unchanged.");
