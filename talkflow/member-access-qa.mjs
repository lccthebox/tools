import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url),store=require("../server/talkflow/topics-store");
const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,fetch:globalThis.fetch};
process.env.SUPABASE_URL="https://example.supabase.co";process.env.SUPABASE_ANON_KEY="anon-test";process.env.SUPABASE_SERVICE_ROLE_KEY="service-test";
const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return{ok:true,status:200,json:async()=>url.includes("conversation_member_portal")?{token:"member-token"}:url.includes("conversation_member_topics")?{topics:[{date:"2026-09-24"}]}:url.includes("conversation_member_topic_progress")?{progress:[{date:"2026-09-24",reflection:"기억에 남은 생각"}]}:[{date:"2026-09-24"}]}};

assert.equal(store.configuration().configured,true);
assert.equal((await store.memberLogin({name:"홍길동",phone:"01012345678",birth:"19900101"})).token,"member-token");
const memberLoginCall=calls.at(-1);assert.equal(JSON.parse(memberLoginCall.options.body).p_action,"verify");
assert.equal((await store.memberTopics("member-token","2026-09")).topics.length,1);
assert.equal((await store.memberProgress("member-token","list",{month:"2026-09"})).progress.length,1);
let progressCall=calls.at(-1);assert.equal(JSON.parse(progressCall.options.body).p_payload.token,"member-token");assert.equal(JSON.parse(progressCall.options.body).p_payload.month,"2026-09");
await store.memberProgress("member-token","save",{date:"2026-09-24",reflection:"기억에 남은 생각"});progressCall=calls.at(-1);assert.equal(JSON.parse(progressCall.options.body).p_action,"save");assert.equal(JSON.parse(progressCall.options.body).p_payload.reflection,"기억에 남은 생각");
const topic={id:"topic-1",date:"2026-09-24",title:{en:"A topic",ko:"토픽"},category:{en:"LIFE",ko:"생활"},quality:{status:"approved"},leader:{private:"must not publish"},topicPlan:{private:true},session1:{story:{en:["One"],ko:["하나"]},easyTalk:[],realTalk:[],expressions:[]},session2:{activity:{name:"Jury"},groupResult:{en:"Decision"},finalQuestion:{en:"Why?"}}};
const published=store.publishableTopic(topic);assert.equal("leader" in published,false);assert.equal("topicPlan" in published,false);assert.equal(published.session2.activity.name,"Jury");
await store.publishTopic(topic);const publishCall=calls.at(-1);assert.match(publishCall.url,/talkflow_published_topics/);assert.equal(publishCall.options.headers.authorization,"Bearer service-test");assert.equal(JSON.parse(publishCall.options.body).topic.leader,undefined);
const topicV4={id:"topic-v4-1",topicVersion:"topic-v4",date:"2026-09-24",title:{en:"A v4 topic",ko:"v4 토픽"},category:{en:"LIFE",ko:"생활"},quality:{status:"approved"},leader:{private:"must not publish"},topicPlan:{private:true},page1:{story:{en:"Story",ko:"이야기"},easyTalk:["Question"]},page2:{randomQuestions:[{en:"Why?",ko:"왜요?"}],randomWords:[{en:"Rest",ko:"휴식"}]}};
const publishedV4=store.publishableTopic(topicV4);assert.equal(publishedV4.topicVersion,"topic-v4");assert.deepEqual(publishedV4.page1,topicV4.page1);assert.deepEqual(publishedV4.page2,topicV4.page2);assert.equal("leader" in publishedV4,false);assert.equal("topicPlan" in publishedV4,false);assert.equal("session1" in publishedV4,false);
await store.publishTopic(topicV4);const publishV4Call=calls.at(-1),publishV4Body=JSON.parse(publishV4Call.options.body);assert.equal(publishV4Body.topic.topicVersion,"topic-v4");assert.deepEqual(publishV4Body.topic.page2,topicV4.page2);

const html=fs.readFileSync(new URL("./member.html",import.meta.url),"utf8"),admin=fs.readFileSync(new URL("./index.html",import.meta.url),"utf8"),app=fs.readFileSync(new URL("./app.js",import.meta.url),"utf8"),migration=fs.readFileSync(new URL("../supabase/migrations/20260922130000_talkflow_published_topics.sql",import.meta.url),"utf8"),progressMigration=fs.readFileSync(new URL("../supabase/migrations/20260922171000_talkflow_topic_progress.sql",import.meta.url),"utf8");
assert.doesNotMatch(html,/학생용|리더용|일괄 인쇄/);assert.doesNotMatch(admin,/data-view="batch"|id="leader-view"|id="student-view"|<option value="leader"/);assert.doesNotMatch(app,/function renderLeader|function renderBatchWorkspace|view==="student"|view==="leader"/);assert.match(migration,/security definer[\s\S]*set search_path=''/i);assert.match(migration,/revoke all on table public\.talkflow_published_topics from public, anon, authenticated/i);assert.match(migration,/grant select, insert, update on table public\.talkflow_published_topics to service_role/i);
const member=fs.readFileSync(new URL("./member.js",import.meta.url),"utf8"),memberCss=fs.readFileSync(new URL("./member.css",import.meta.url),"utf8");
assert.match(member,/cleanStoryLine/,"member renderer removes internal Story repair labels");
assert.match(member,/normalizeMemberKo/,"member renderer normalizes legacy Korean operating copy");
assert.match(memberCss,/\.step\{display:grid;[^}]*border:0;[^}]*border-bottom:1px/,"mobile activity steps render as compact editorial rows instead of five heavy cards");
assert.match(html,/내 토픽 기록/);assert.match(member,/읽었어요 · 기록하기/);assert.match(member,/\/api\/talkflow\/member-progress/);
assert.match(progressMigration,/primary key \(member_id, topic_date\)/i);assert.match(progressMigration,/enable row level security/i);assert.match(progressMigration,/revoke all on table conversation_member_private\.talkflow_topic_progress from public, anon, authenticated/i);assert.match(progressMigration,/security definer[\s\S]*set search_path=''/i);

globalThis.fetch=previous.fetch;for(const[name,value]of [["SUPABASE_URL",previous.url],["SUPABASE_ANON_KEY",previous.anon],["SUPABASE_SERVICE_ROLE_KEY",previous.service]]){if(value===undefined)delete process.env[name];else process.env[name]=value}
console.log("Talk Flow member access QA passed.");
