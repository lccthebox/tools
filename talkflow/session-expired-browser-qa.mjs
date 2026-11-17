// The admin session lasts 8 hours. On 2026-11-16 it ran out while the screen stayed open: the screen kept showing
// "logged in", the login form stayed hidden, and generation (401 x3) and the topic backup (401) failed until a reload.
// This checks that a 401 login_required brings the login form back and that logging in again sends the pending backup.
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

let playwright;
try{playwright=createRequire(import.meta.url)("playwright")}catch{playwright=createRequire(join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules","playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json"};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,"http://localhost").pathname,path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error("invalid path");res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`,fixture=JSON.parse(await readFile(join(root,"fixtures","member-topic.json"),"utf8"));
const localOnly={...fixture,id:"session-qa-2026-11-21",date:"2026-11-21",updatedAt:"2026-11-16T10:24:00.000Z",quality:{status:"draft",score:0,issues:[]},operatorStatus:{generationStatus:"complete",reviewStatus:"draft",printStatus:"unchecked"}};
const browser=await playwright.chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],puts=[];
const check=(name,pass,detail="")=>{if(!pass)throw new Error(`${name}: ${detail}`)};
const reply=(route,status,body)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
const loginRequired={error:{type:"login_required",message:"관리자 로그인이 필요합니다."}};
// The server session: the status endpoint still says "logged in" on load, as it did before the session ran out.
let sessionValid=false,logins=0;
await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
await page.route("**/api/talkflow/status/",route=>reply(route,200,{configured:true,authenticated:true,model:"Claude Sonnet 4.6"}));
await page.route("**/api/talkflow/login/",route=>{logins++;sessionValid=true;reply(route,200,{authenticated:true})});
await page.route("**/api/talkflow/published-topics**",route=>reply(route,200,route.request().method()==="GET"?{views:{}}:{deleted:true,legacy:true}));
await page.route("**/api/talkflow/models/",route=>sessionValid?reply(route,200,{data:[{id:"claude-sonnet-4-6",display_name:"Claude Sonnet 4.6",created_at:"2026-01-01T00:00:00Z"}]}):reply(route,401,loginRequired));
await page.route("**/api/talkflow/admin-topics/",route=>{
  if(route.request().method()==="GET"){reply(route,200,{topics:[]});return}
  if(!sessionValid){reply(route,401,loginRequired);return}
  const body=route.request().postDataJSON();puts.push(body);reply(route,200,{saved:body.upserts?.length||0,deleted:body.deletes?.length||0});
});
page.on("pageerror",error=>errors.push(error.message));
// A 401 response is the scenario under test; the browser reports it as a console error on its own.
page.on("console",message=>{if(message.type()==="error"&&!/401/.test(message.text()))errors.push(message.text())});
const loginFormHidden=()=>page.evaluate(()=>document.querySelector("#admin-login-form").hidden);
const badge=()=>page.evaluate(()=>document.querySelector("#ai-server-badge").textContent);
const waitFor=async(test,ms=8000)=>{const deadline=Date.now()+ms;while(Date.now()<deadline){if(await test())return true;await page.waitForTimeout(150)}return false};
try{
  // 1. The backup PUT comes back 401: the screen stops saying "logged in" and offers the login form.
  await page.goto(origin,{waitUntil:"networkidle"});
  await page.evaluate(value=>{const map=JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}");map[value.date]=value;localStorage.setItem("tb_talkflow_v1",JSON.stringify(map))},localOnly);
  await page.reload({waitUntil:"networkidle"});
  check("expired backup shows the login form",await waitFor(async()=>!(await loginFormHidden())),`badge=${await badge()}`);
  check("badge says login is needed",await badge()==="로그인 필요",await badge());
  check("expiry notice names the fix",await page.getByText("관리자 로그인이 만료됐습니다.",{exact:false}).count()>0);
  check("topic stays in this browser",await page.evaluate(()=>Boolean(JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}")["2026-11-21"])));
  check("nothing was saved while expired",puts.length===0,JSON.stringify(puts.length));

  // 2. Logging in again on the same screen sends the topic that could not be backed up.
  await page.evaluate(()=>{document.querySelector("#admin-password").value="qa-only-password";document.querySelector("#admin-login").click()});
  check("login request sent",await waitFor(async()=>logins===1),String(logins));
  check("pending topic is backed up after login",await waitFor(async()=>puts.some(body=>body.upserts?.some(item=>item.date===localOnly.date))),JSON.stringify(puts.map(body=>body.upserts?.map(item=>item.date))));
  check("login form hidden again",await loginFormHidden());
  check("badge back to normal",await badge()==="정상",await badge());

  // 3. Any AI request answered with 401 login_required (generation, models, articles) does the same.
  sessionValid=false;
  const type=await page.evaluate(()=>window.TalkFlowAiClient.listModels().then(()=>"ok",error=>error.type));
  check("expired AI request is rejected",type==="login_required",type);
  check("expired AI request shows the login form",await waitFor(async()=>!(await loginFormHidden())),`badge=${await badge()}`);
  check("console error zero",errors.length===0,errors.join(" | "));
  console.log("PASS session-expired-browser-qa: 401 login_required reopens the login form; logging in again sends the pending backup");
}finally{await browser.close();server.close()}
