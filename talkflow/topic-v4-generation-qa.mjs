import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import TopicV4 from "./topic-v4-generation.js";

const topic=JSON.parse(await readFile(new URL("./fixtures/member-topic.json",import.meta.url),"utf8"));
const plan={titleEn:topic.page1.title.en,titleKo:topic.page1.title.ko,star:topic.page1.story.star,category:topic.page1.category,page1Template:"A",articleTitle:topic.page2.title,articleCategory:topic.page2.category};
assert.equal(TopicV4.TEMPLATE_VERSION,"topic-v4.1");
assert.equal(TopicV4.validatePlan(plan,{date:topic.date,page1Template:"A"}).ready,true);
assert.equal(TopicV4.validateContent(topic,plan).ready,true);
assert.equal(TopicV4.CATEGORIES[topic.page1.category],topic.page1.categoryColor);
assert.notEqual(topic.page1.category,topic.page2.category);
assert.equal(topic.page2.template,"ARTICLE");
assert.equal(topic.page2.discussion.length,5);
assert.equal(topic.page2.quiz.options.length,3);
assert.equal(TopicV4.validateContent({...topic,page2:{...topic.page2,category:topic.page1.category}},plan).ready,false);
assert.equal(TopicV4.validateContent({...topic,page1:{...topic.page1,story:{...topic.page1.story,fictional:false}}},plan).ready,false);
assert.equal(TopicV4.validateContent({...topic,page2:{...topic.page2,discussion:topic.page2.discussion.slice(0,4)}},plan).ready,false);
console.log("PASS topic-v4-generation-qa: v4.1 A/B + fixed Article contract");
