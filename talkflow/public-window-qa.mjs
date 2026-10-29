import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {PUBLIC_START_DATE,PUBLIC_START_MONTH,isPublicMonth,isPublicTopicDate}=require("../server/talkflow/public-window");

assert.equal(PUBLIC_START_DATE,"2026-10-01");
assert.equal(PUBLIC_START_MONTH,"2026-10");
assert.equal(isPublicTopicDate("2026-09-30"),false);
assert.equal(isPublicTopicDate("2026-10-01"),true);
assert.equal(isPublicTopicDate("2026-10-31"),true);
assert.equal(isPublicTopicDate("not-a-date"),false);
assert.equal(isPublicMonth("2026-09"),false);
assert.equal(isPublicMonth("2026-10"),true);
console.log("PASS public-window-qa: October 2026 member visibility boundary");
