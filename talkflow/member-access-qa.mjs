import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url),store=require("../server/talkflow/topics-store");
const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,fetch:globalThis.fetch};
process.env.SUPABASE_URL="https://example.supabase.co";process.env.SUPABASE_ANON_KEY="anon-test";process.env.SUPABASE_SERVICE_ROLE_KEY="service-test";
const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return{ok:true,status:200,json:async()=>url.includes("conversation_member_portal")?{token:"member-token"}:url.includes("conversation_member_topics")?{topics:[{date:"2026-09-24"}]}:[{date:"2026-09-24"}]}};

assert.equal(store.configuration().configured,true);
assert.equal((await store.memberLogin({name:"홍길동",phone:"01012345678",birth:"19900101"})).token,"member-token");
const memberLoginCall=calls.at(-1);assert.equal(JSON.parse(memberLoginCall.options.body).p_action,"verify");
assert.equal((await store.memberTopics("member-token","2026-09")).topics.length,1);
const topic={id:"topic-1",date:"2026-09-24",title:{en:"A topic",ko:"토픽"},category:{en:"LIFE",ko:"생활"},quality:{status:"approved"},leader:{private:"must not publish"},topicPlan:{private:true},session1:{story:{en:["One"],ko:["하나"]},easyTalk:[],realTalk:[],expressions:[]},session2:{activity:{name:"Jury"},groupResult:{en:"Decision"},finalQuestion:{en:"Why?"}}};
const published=store.publishableTopic(topic);assert.equal("leader" in published,false);assert.equal("topicPlan" in published,false);assert.equal(published.session2.activity.name,"Jury");
await store.publishTopic(topic);const publishCall=calls.at(-1);assert.match(publishCall.url,/talkflow_published_topics/);assert.equal(publishCall.options.headers.authorization,"Bearer service-test");assert.equal(JSON.parse(publishCall.options.body).topic.leader,undefined);

const html=fs.readFileSync(new URL("./member.html",import.meta.url),"utf8"),admin=fs.readFileSync(new URL("./index.html",import.meta.url),"utf8"),app=fs.readFileSync(new URL("./app.js",import.meta.url),"utf8"),migration=fs.readFileSync(new URL("../supabase/migrations/20260922130000_talkflow_published_topics.sql",import.meta.url),"utf8");
assert.doesNotMatch(html,/학생용|리더용|일괄 인쇄/);assert.doesNotMatch(admin,/data-view="batch"|id="leader-view"|id="student-view"|<option value="leader"/);assert.doesNotMatch(app,/function renderLeader|function renderBatchWorkspace|view==="student"|view==="leader"/);assert.match(migration,/security definer[\s\S]*set search_path=''/i);assert.match(migration,/revoke all on table public\.talkflow_published_topics from public, anon, authenticated/i);assert.match(migration,/grant select, insert, update on table public\.talkflow_published_topics to service_role/i);
const member=fs.readFileSync(new URL("./member.js",import.meta.url),"utf8"),memberCss=fs.readFileSync(new URL("./member.css",import.meta.url),"utf8");
assert.match(member,/cleanStoryLine/,"member renderer removes internal Story repair labels");
assert.match(member,/normalizeMemberKo/,"member renderer normalizes legacy Korean operating copy");
assert.match(memberCss,/\.step\{display:grid;[^}]*border:0;[^}]*border-bottom:1px/,"mobile activity steps render as compact editorial rows instead of five heavy cards");

globalThis.fetch=previous.fetch;for(const[name,value]of [["SUPABASE_URL",previous.url],["SUPABASE_ANON_KEY",previous.anon],["SUPABASE_SERVICE_ROLE_KEY",previous.service]]){if(value===undefined)delete process.env[name];else process.env[name]=value}
console.log("Talk Flow member access QA passed.");
