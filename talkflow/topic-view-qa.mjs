import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url),store=require("../server/talkflow/topics-store");
const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,fetch:globalThis.fetch};
process.env.SUPABASE_URL="https://example.supabase.co";
process.env.SUPABASE_ANON_KEY="anon-test";
process.env.SUPABASE_SERVICE_ROLE_KEY="service-test";
const calls=[];
globalThis.fetch=async(url,options)=>{calls.push({url,options});return{ok:true,status:200,json:async()=>url.includes("conversation_member_topic_view")?{view:{date:"2026-10-01",counted:true}}:{views:{"2026-10-01":3}}}};

const opened=await store.memberTopicView("member-token","2026-10-01");
assert.equal(opened.view.counted,true);
const openCall=calls.at(-1);
assert.match(openCall.url,/rpc\/conversation_member_topic_view$/);
assert.deepEqual(JSON.parse(openCall.options.body),{p_payload:{token:"member-token",date:"2026-10-01"}});
assert.equal(openCall.options.headers.authorization,"Bearer anon-test");

const summary=await store.managerTopicViews("2026-10");
assert.equal(summary.views["2026-10-01"],3);
const summaryCall=calls.at(-1);
assert.match(summaryCall.url,/rpc\/conversation_talkflow_view_summary$/);
assert.deepEqual(JSON.parse(summaryCall.options.body),{p_month:"2026-10"});
assert.equal(summaryCall.options.headers.authorization,"Bearer service-test");

const member=fs.readFileSync(new URL("./member.js",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("./app.js",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../supabase/migrations/20260929153000_talkflow_topic_views.sql",import.meta.url),"utf8");
assert.match(member,/action:"view"/);
assert.doesNotMatch(member,/열람\s*\$?\{/);
assert.match(app,/\/api\/talkflow\/published-topics\?month=/);
assert.match(app,/열람\s*\$?\{/);
assert.doesNotMatch(app,/!topic\?\.publishedAt\|\|topicViewsMonth/);
assert.match(migration,/primary key \(member_id, topic_date\)/i);
assert.match(migration,/on conflict \(member_id, topic_date\)/i);
assert.match(migration,/grant execute on function public\.conversation_talkflow_view_summary\(text\) to service_role/i);
assert.doesNotMatch(migration,/grant execute on function public\.conversation_talkflow_view_summary\(text\) to anon/i);

globalThis.fetch=previous.fetch;
for(const[name,value]of [["SUPABASE_URL",previous.url],["SUPABASE_ANON_KEY",previous.anon],["SUPABASE_SERVICE_ROLE_KEY",previous.service]]){if(value===undefined)delete process.env[name];else process.env[name]=value}
console.log("Talk Flow topic view QA passed.");
