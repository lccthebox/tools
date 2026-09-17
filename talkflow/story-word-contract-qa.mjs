import assert from "node:assert/strict";
import { createRequire } from "node:module";

const Simple = createRequire(import.meta.url)("./simple-generation.js");
const sentenceSchema = Simple.CONTENT_OUTPUT_SCHEMA.properties.storySentences.items.properties.en;
assert.equal(typeof sentenceSchema.pattern, "string", "Story word budget must be enforced by provider grammar, not prompt alone");
const pattern = new RegExp(sentenceSchema.pattern);
const sentence = count => Array.from({ length: count }, (_, index) => `word${index}`).join(" ") + ".";
for (const count of [0, 1, 13, 22, 91]) assert.equal(pattern.test(sentence(count)), false, `${count} words must fail`);
for (const count of [14, 15, 20, 21]) assert.equal(pattern.test(sentence(count)), true, `${count} words must pass`);
const words = value => (value.match(/[A-Za-z0-9’'-]+/g) || []).length;
for (const count of [14, 21]) {
  const story = Array.from({ length: 4 }, () => sentence(count)).join(" ");
  assert.ok(words(story) >= 55 && words(story) <= 90);
}
assert.equal(pattern.test("Mina's ₩30,000 dinner booking allowed twenty-five minutes before her friends had to decide together."), true);
assert.equal(pattern.test("Mina paid 89000 won."), false, "Short numeric anchor alone is not a complete Story scene");
assert.deepEqual(Simple.qualityRules.story, { weight: 15, floor: 11 }, "Quality threshold remains unchanged");
assert.equal(Simple.assertContentFillSchemaComplexity().properties, 44);
console.log("Story word contract QA PASS: boundaries, tokenization, grammar projection, unchanged Quality and complexity.");
