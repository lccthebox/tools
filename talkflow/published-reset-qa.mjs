import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";

const require=createRequire(import.meta.url);
Object.assign(process.env,{SUPABASE_URL:"https://example.supabase.co",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service"});
const Topics=require("../server/talkflow/topics-store.js");
const calls=[];
globalThis.fetch=async(url,init)=>{calls.push({url:String(url),method:init.method});return new Response("[]",{status:200,headers:{"content-type":"application/json"}})};

assert.equal(typeof Topics.deleteAllPublishedTopics,"undefined","the store must not expose an unfiltered delete of every published topic");
await Topics.deleteLegacyPublishedTopics();
assert.equal(calls.length,1);
assert.equal(calls[0].method,"DELETE");
const query=decodeURIComponent(new URL(calls[0].url).search);
assert.match(query,/or=\(topic->>topicVersion\.is\.null,topic->>topicVersion\.neq\.topic-v4\.3\)/,"the reset may delete only rows that are not v4.3 topics");
assert.doesNotMatch(query,/date=not\.is\.null/,"the reset must never match every row");

const app=await readFile(new URL("./app.js",import.meta.url),"utf8"),api=await readFile(new URL("../api/talkflow/published-topics.js",import.meta.url),"utf8");
assert.doesNotMatch(app,/DELETE_ALL_PUBLISHED_TOPICS|all:true,confirm/,"a new admin browser must not request deletion of every published topic");
assert.match(app,/legacy:true,confirm:"DELETE_LEGACY_PUBLISHED_TOPICS"/);
assert.doesNotMatch(api,/body\.all===true/,"the API must not accept an unfiltered delete-all request");
assert.match(app,/KEYS\.resetBackup/,"the local v4.3 reset must keep a backup of the previous topics before clearing them");
console.log("PASS published-reset-qa: legacy-only shared reset, local backup before reset");
