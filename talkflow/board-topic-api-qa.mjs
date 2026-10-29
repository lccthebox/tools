import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const store=require("../server/talkflow/topics-store");
const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,fetch:globalThis.fetch};
process.env.SUPABASE_URL="https://example.supabase.co";
process.env.SUPABASE_ANON_KEY="anon-test";
process.env.SUPABASE_SERVICE_ROLE_KEY="service-test";
const calls=[];
globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,status:200,json:async()=>[{date:"2026-10-01",topic:{topicVersion:"topic-v4.3",date:"2026-10-01",title:{en:"Topic from Talkflow"},page1:{},page2:{}}}]};
};

const topic=await store.boardTopic("2026-10-01");
assert.equal(topic.date,"2026-10-01");
assert.equal(topic.topicVersion,"topic-v4.3");
assert.match(calls[0].url,/talkflow_published_topics\?date=eq\.2026-10-01/);
assert.match(calls[0].url,/select=date%2Ctopic%2Cpublished_at/);
assert.equal(calls[0].options.method,"GET");
assert.equal(calls[0].options.headers.authorization,"Bearer service-test");

globalThis.fetch=previous.fetch;
for(const[name,value]of [["SUPABASE_URL",previous.url],["SUPABASE_ANON_KEY",previous.anon],["SUPABASE_SERVICE_ROLE_KEY",previous.service]]){if(value===undefined)delete process.env[name];else process.env[name]=value}
console.log("PASS board-topic-api-qa: approved Talkflow topic is available to the board integration");
