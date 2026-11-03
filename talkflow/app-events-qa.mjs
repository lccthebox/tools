import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readdir,readFile} from "node:fs/promises";

const require=createRequire(import.meta.url);
Object.assign(process.env,{SUPABASE_URL:"https://example.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"service",TALKFLOW_APP_EVENTS:"on"});
const {withAppEvents,__test}=require("../server/talkflow/app-events.js");

function response(){
  const res={statusCode:200,headers:{},body:"",ended:false,setHeader(name,value){this.headers[name]=value},end(chunk=""){this.body+=chunk;this.ended=true}};
  return res;
}
const request=(method="POST")=>({method,headers:{"user-agent":"Mozilla/5.0 (iPhone) KAKAOTALK"}});
const logged=[];
const fakeFetch=async(url,init)=>{logged.push({url,body:JSON.parse(init.body),headers:init.headers});return{ok:true}};

// A rejected call records its error type, never the body.
const rejected=withAppEvents("member.login",async(req,res)=>{res.statusCode=401;res.end(JSON.stringify({error:{type:"invalid_credentials",message:"이름 홍길동 확인"}}))},fakeFetch);
const res1=response();await rejected(request(),res1);
assert.equal(res1.ended,true,"the response is still sent");
assert.equal(logged.length,1);
assert.match(logged[0].url,/\/rest\/v1\/talkflow_app_events$/);
assert.equal(logged[0].headers.authorization,"Bearer service");
assert.deepEqual({kind:logged[0].body.kind,outcome:logged[0].body.outcome,status:logged[0].body.status_code,error:logged[0].body.error_type,client:logged[0].body.client},{kind:"member.login",outcome:"rejected",status:401,error:"invalid_credentials",client:"mobile/kakaotalk"});
assert.doesNotMatch(JSON.stringify(logged[0].body),/홍길동/,"messages and bodies are not logged");

// Success and thrown errors.
logged.length=0;
await withAppEvents("board.topic",async(req,res)=>{res.end("{}")},fakeFetch)(request("GET"),response());
assert.equal(logged[0].body.outcome,"ok");
assert.equal(logged[0].body.error_type,null);
logged.length=0;
await assert.rejects(withAppEvents("ai.messages",async()=>{throw new TypeError("boom")},fakeFetch)(request(),response()),/boom/);
assert.deepEqual([logged[0].body.outcome,logged[0].body.status_code,logged[0].body.error_type],["failed",500,"TypeError"]);

// A failing log write never breaks the response.
const res2=response();
await withAppEvents("member.topics",async(req,res)=>{res.end("{}")},async()=>{throw new Error("network")})(request(),res2);
assert.equal(res2.ended,true);

// Disabled with TALKFLOW_APP_EVENTS=off.
process.env.TALKFLOW_APP_EVENTS="off";logged.length=0;
await withAppEvents("member.topics",async(req,res)=>{res.end("{}")},fakeFetch)(request(),response());
assert.equal(logged.length,0);

assert.equal(__test.errorTypeFrom("not json"),null);
assert.equal(__test.outcomeFor(503),"failed");

// Every API route except status/logout is wrapped.
const files=(await readdir(new URL("../api/talkflow/",import.meta.url))).filter(name=>name.endsWith(".js"));
for(const name of files){
  const source=await readFile(new URL(`../api/talkflow/${name}`,import.meta.url),"utf8");
  if(["status.js","logout.js"].includes(name))continue;
  assert.match(source,/module\.exports=withAppEvents\("[a-z_.]+",module\.exports\);\s*$/,`${name} must record app events`);
}
console.log("PASS app-events-qa: one row per API call, error type only, never blocks the response");
