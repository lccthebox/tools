import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import {Readable} from "node:stream";

const require=createRequire(import.meta.url);
Object.assign(process.env,{SUPABASE_URL:"https://example.supabase.co",SUPABASE_ANON_KEY:"anon",SUPABASE_SERVICE_ROLE_KEY:"service",TALKFLOW_SESSION_SECRET:"qa-session-secret"});
const Security=require("../server/talkflow/security.js");
const Topics=require("../server/talkflow/topics-store.js");
const handler=require("../api/talkflow/admin-topics.js");

const calls=[];
globalThis.fetch=async(url,init)=>{calls.push({url:String(url),method:init.method,body:init.body?JSON.parse(init.body):undefined,headers:init.headers});return new Response(init.method==="GET"?JSON.stringify([{date:"2026-11-03",topic:{date:"2026-11-03",updatedAt:"2026-11-02T00:00:00Z"},updated_at:"2026-11-02T00:00:01Z"},{date:"bad",topic:{}}]):"",{status:200,headers:{"content-type":"application/json"}})};

// Store: reads, upserts on date and deletes only the listed dates, always with the service key.
const listed=await Topics.listAdminTopicBackups();
assert.deepEqual(listed.map(item=>item.date),["2026-11-03"],"rows without a valid date are dropped");
assert.match(calls[0].url,/talkflow_admin_topic_backups\?select=date%2Ctopic%2Cupdated_at/);
assert.equal(calls[0].headers.authorization,"Bearer service");
calls.length=0;
await Topics.saveAdminTopicBackups([{date:"2026-11-03",topic:{date:"2026-11-03"}}]);
assert.match(calls[0].url,/on_conflict=date/);
assert.equal(calls[0].method,"POST");
assert.equal(calls[0].body[0].date,"2026-11-03");
calls.length=0;
await Topics.deleteAdminTopicBackups(["2026-11-03","2026-11-04"]);
assert.equal(calls[0].method,"DELETE");
assert.match(decodeURIComponent(calls[0].url),/date=in\.\(2026-11-03,2026-11-04\)/,"delete is limited to the listed dates");
calls.length=0;
await Topics.deleteAdminTopicBackups([]);
assert.equal(calls.length,0,"an empty delete never reaches the table");

// API: login required, same-origin header required, payload validated.
function request(method,{body,cookie,appHeader=true}={}){
  const raw=body===undefined?"":JSON.stringify(body);
  const req=Readable.from(raw?[Buffer.from(raw)]:[]);
  req.method=method;req.query={};req.headers={host:"thebox-talkflow.vercel.app","content-length":String(Buffer.byteLength(raw)),...(cookie?{cookie}:{}),...(appHeader?{"x-talkflow-request":"app"}:{})};
  req.socket={remoteAddress:"127.0.0.1"};
  return req;
}
function response(){
  const res={statusCode:0,headers:{},body:"",setHeader(name,value){this.headers[name.toLowerCase()]=value},getHeader(name){return this.headers[name.toLowerCase()]},writeHead(status,headers={}){this.statusCode=status;Object.assign(this.headers,headers);return this},end(chunk=""){this.body+=chunk;this.ended=true}};
  Object.defineProperty(res,"status",{value(code){this.statusCode=code;return this}});
  return res;
}
async function call(method,options){const res=response();await handler(request(method,options),res);return{status:res.statusCode,json:res.body?JSON.parse(res.body):null}}
const cookie=`__Host-talkflow_session=${encodeURIComponent(Security.createSession())}`;

assert.equal((await call("GET")).status,401,"reading backups needs an admin session");
assert.equal((await call("PUT",{body:{upserts:[{date:"2026-11-03",topic:{date:"2026-11-03"}}]}})).status,401,"writing backups needs an admin session");
assert.equal((await call("PUT",{cookie,appHeader:false,body:{upserts:[{date:"2026-11-03",topic:{date:"2026-11-03"}}]}})).status,403,"writes need the app header");
assert.equal((await call("PUT",{cookie,body:{upserts:[]}})).status,400,"an empty write is rejected");
assert.equal((await call("PUT",{cookie,body:{upserts:[{date:"2026-11-03",topic:{date:"2026-11-04"}}]}})).status,400,"topic date must match the row date");
assert.equal((await call("PUT",{cookie,body:{deletes:["all"]}})).status,400,"deletes take dates only");
assert.equal((await call("DELETE",{cookie})).status,405,"there is no bulk delete endpoint");
const read=await call("GET",{cookie});
assert.equal(read.status,200);
assert.equal(read.json.topics.length,1);
calls.length=0;
const write=await call("PUT",{cookie,body:{upserts:[{date:"2026-11-03",topic:{date:"2026-11-03"}}],deletes:["2026-11-05"]}});
assert.equal(write.status,200);
assert.deepEqual(write.json,{saved:1,deleted:1});
assert.deepEqual(calls.map(item=>item.method),["POST","DELETE"]);

// App: saves push changed dates, login restores missing topics before publishing sync.
const app=await readFile(new URL("./app.js",import.meta.url),"utf8");
assert.match(app,/render\(\);scheduleServerBackup\(\)\}/,"every successful local save schedules a server backup");
assert.match(app,/await restoreServerBackup\(\);await syncApprovedTopicsForCurrentMonth\(\)/,"login restores server topics before the publish sync");
assert.match(app,/String\(row\.topic\.updatedAt\|\|""\)>String\(local\.updatedAt\|\|""\)/,"a local topic is replaced only by a newer server copy");
console.log("PASS admin-topic-backup-qa: admin-only backup API, date-scoped deletes, save pushes and login restore");
