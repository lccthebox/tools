import assert from "node:assert/strict";
import Store from "./topics-store.js";

process.env.SUPABASE_URL="https://example.supabase.co";
let attempts=0;
const response=(ok,status,payload)=>({ok,status,json:async()=>payload});
const result=await Store.__test.supabaseRequest("rpc/example",{key:"test",retries:1},async()=>{
  attempts+=1;
  return attempts===1?response(false,503,{message:"temporary"}):response(true,200,{ok:true});
});
assert.equal(attempts,2,"transient upstream failure retries once");
assert.deepEqual(result,{ok:true},"successful retry returns the upstream payload");
let networkAttempts=0;
const networkResult=await Store.__test.supabaseRequest("rpc/example",{key:"test",retries:1},async()=>{
  networkAttempts+=1;
  if(networkAttempts===1)throw new TypeError("fetch failed");
  return response(true,200,{recovered:true});
});
assert.equal(networkAttempts,2,"network failures retry once");
assert.deepEqual(networkResult,{recovered:true},"network retry returns the recovered payload");
await assert.rejects(
  Store.__test.supabaseRequest("rpc/example",{key:"test",timeoutMs:1},async(_url,request)=>new Promise((_resolve,reject)=>request.signal.addEventListener("abort",()=>reject(Object.assign(new Error("aborted"),{name:"AbortError"}))))),
  error=>error?.code==="upstream_timeout",
  "a stalled upstream request times out with a safe classified error"
);
let permanentAttempts=0;
await assert.rejects(
  Store.__test.supabaseRequest("rpc/example",{key:"test",retries:1},async()=>{
    permanentAttempts+=1;
    return response(false,400,{message:"invalid"});
  }),
  error=>error?.status===400,
  "permanent upstream errors do not retry"
);
assert.equal(permanentAttempts,1,"permanent error is attempted once");
let failureLog="";
const originalConsoleError=console.error;
console.error=value=>{failureLog=String(value)};
Store.__test.recordFailure("member-login",{status:503,message:"sensitive upstream detail"});
console.error=originalConsoleError;
const failureEvent=JSON.parse(failureLog);
assert.equal(failureEvent.event,"talkflow_upstream_failure","upstream failures emit a structured event");
assert.equal(failureEvent.route,"member-login","failure event names the safe route identifier");
assert.equal(failureEvent.status,503,"failure event keeps the upstream status");
assert.equal(failureEvent.code,"upstream_request_failed","failure event categorizes the failure safely");
assert.doesNotMatch(failureLog,/sensitive upstream detail/,"failure event never logs upstream details");
console.log("topics-store retry QA passed");
