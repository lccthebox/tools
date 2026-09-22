import assert from "node:assert/strict";
import {Readable} from "node:stream";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url),Topics=require("../server/talkflow/topics-store"),handler=require("../api/talkflow/member-progress");
const previous={url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,memberProgress:Topics.memberProgress};
process.env.SUPABASE_URL="https://example.supabase.co";process.env.SUPABASE_ANON_KEY="anon-test";process.env.SUPABASE_SERVICE_ROLE_KEY="service-test";

function response(){return{statusCode:0,headers:{},body:"",setHeader(name,value){this.headers[name]=value},end(value){this.body=value||""}}}
function request(method,{query={},body,token="member-token"}={}){const stream=Readable.from(body===undefined?[]:[JSON.stringify(body)]);stream.method=method;stream.query=query;stream.headers={host:"example.test","x-forwarded-for":`${Math.random()}`,"x-talkflow-member-session":token,...(method==="POST"?{"x-talkflow-request":"app",origin:"https://example.test"}:{})};return stream}

Topics.memberProgress=async(token,action,payload)=>action==="list"?{progress:[{date:"2026-09-24",reflection:"기억에 남은 생각"}]}:{progress:{date:payload.date,reflection:payload.reflection,completedAt:"2026-09-22T00:00:00Z",updatedAt:"2026-09-22T00:00:00Z"}};
let res=response();await handler(request("GET",{query:{month:"2026-09"}}),res);assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).progress.length,1);
res=response();await handler(request("POST",{body:{date:"2026-09-24",reflection:"  오늘의 생각  "}}),res);assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).progress.reflection,"오늘의 생각");
res=response();await handler(request("POST",{body:{date:"2026-09-24",reflection:""}}),res);assert.equal(res.statusCode,400);
Topics.memberProgress=async()=>({expired:true});res=response();await handler(request("GET",{query:{month:"2026-09"}}),res);assert.equal(res.statusCode,401);

Topics.memberProgress=previous.memberProgress;for(const[name,value]of [["SUPABASE_URL",previous.url],["SUPABASE_ANON_KEY",previous.anon],["SUPABASE_SERVICE_ROLE_KEY",previous.service]]){if(value===undefined)delete process.env[name];else process.env[name]=value}
console.log("Talk Flow member progress QA passed.");
