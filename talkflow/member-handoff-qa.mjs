import assert from "node:assert/strict";
import {Readable} from "node:stream";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";

const require=createRequire(import.meta.url),Topics=require("../server/talkflow/topics-store"),handler=require("../api/talkflow/member-handoff");
const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,fetch:globalThis.fetch,memberHandoff:Topics.memberHandoff};
process.env.SUPABASE_URL="https://example.supabase.co";process.env.SUPABASE_ANON_KEY="anon-test";process.env.SUPABASE_SERVICE_ROLE_KEY="service-test";

function response(){return{statusCode:0,headers:{},body:"",setHeader(name,value){this.headers[name]=value},end(value){this.body=value||""}}}
function request(method,body){const stream=Readable.from(body===undefined?[]:[JSON.stringify(body)]);stream.method=method;stream.query={};stream.headers={host:"example.test",origin:"https://example.test","x-talkflow-request":"app","x-forwarded-for":`${Math.random()}`};return stream}

let rpcRequest;
globalThis.fetch=async(url,options)=>{rpcRequest={url,options,body:JSON.parse(options.body)};return{ok:true,json:async()=>({session:"rpc-topic-session",expiresAt:"2026-09-24T00:00:00Z"})}};
assert.deepEqual(await Topics.memberHandoff("12345678-1234-1234-1234-123456789abc"),{token:"rpc-topic-session",expiresAt:"2026-09-24T00:00:00Z"});
assert.equal(rpcRequest.url,"https://example.supabase.co/rest/v1/rpc/conversation_topic_sso");
assert.deepEqual(rpcRequest.body,{p_action:"exchange",p_payload:{handoff:"12345678-1234-1234-1234-123456789abc"}});
globalThis.fetch=previous.fetch;

let calls=0,received="";
Topics.memberHandoff=async code=>{calls+=1;received=code;return{token:"topic-session-token",expiresAt:"2026-09-23T12:00:00Z"}};
let res=response();await handler(request("GET"),res);assert.equal(res.statusCode,405);
res=response();await handler(request("POST",{code:"short"}),res);assert.equal(res.statusCode,400);assert.equal(calls,0);
const code="A".repeat(48);res=response();await handler(request("POST",{code}),res);assert.equal(res.statusCode,200);assert.equal(received,code);assert.deepEqual(JSON.parse(res.body),{token:"topic-session-token",expiresAt:"2026-09-23T12:00:00Z"});
Topics.memberHandoff=async()=>({});res=response();await handler(request("POST",{code:"B".repeat(48)}),res);assert.equal(res.statusCode,401);assert.ok(!res.body.includes("B".repeat(48)));

const source=await readFile(new URL("./member.js",import.meta.url),"utf8"),strip=source.indexOf("history.replaceState"),exchange=source.indexOf('request("/api/talkflow/member-handoff"');
assert.ok(strip>0&&exchange>strip,"handoff code must be removed before the server exchange");
assert.ok(source.includes('url.searchParams.delete("handoff")'));
assert.ok(!source.includes("sessionStorage.setItem(\"handoff\""));

Topics.memberHandoff=previous.memberHandoff;globalThis.fetch=previous.fetch;for(const[name,value]of [["SUPABASE_URL",previous.url],["SUPABASE_ANON_KEY",previous.anon],["SUPABASE_SERVICE_ROLE_KEY",previous.service]]){if(value===undefined)delete process.env[name];else process.env[name]=value}
console.log("Talk Flow member handoff QA passed.");
