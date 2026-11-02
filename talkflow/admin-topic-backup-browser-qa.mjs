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
const draft=(date,updatedAt)=>({...fixture,id:`backup-qa-${date}`,date,updatedAt,quality:{status:"draft",score:0,issues:[]},operatorStatus:{generationStatus:"complete",reviewStatus:"draft",printStatus:"unchecked"}});
const serverTopic=draft("2026-11-20","2026-11-02T01:00:00.000Z"),localOnly=draft("2026-11-21","2026-11-02T02:00:00.000Z");
const browser=await playwright.chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],puts=[];
const check=(name,pass,detail="")=>{if(!pass)throw new Error(`${name}: ${detail}`)};
await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
await page.route("**/api/talkflow/status/",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({configured:true,authenticated:true,model:"Claude Sonnet 4.6"})}));
await page.route("**/api/talkflow/published-topics**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(route.request().method()==="GET"?{views:{}}:{deleted:true,legacy:true})}));
await page.route("**/api/talkflow/models/",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:[{id:"claude-sonnet-4-6",display_name:"Claude Sonnet 4.6",created_at:"2026-01-01T00:00:00Z"}]})}));
await page.route("**/api/talkflow/admin-topics/",route=>{
  if(route.request().method()==="GET"){route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({topics:[{date:serverTopic.date,topic:serverTopic,updatedAt:serverTopic.updatedAt}]})});return}
  const body=route.request().postDataJSON();puts.push(body);
  route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({saved:body.upserts?.length||0,deleted:body.deletes?.length||0})});
});
page.on("pageerror",error=>errors.push(error.message));
page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
const storedDates=()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}")).sort());
try{
  // 1. A cleared browser gets the server copy back after login.
  await page.goto(origin,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>Boolean(JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}")["2026-11-20"]),null,{timeout:8000});
  check("empty browser restores the server topic",(await storedDates()).includes("2026-11-20"),JSON.stringify(await storedDates()));
  check("restore notice shown",await page.getByText("서버 백업에서 1개 토픽을 불러왔습니다.",{exact:false}).count()>0);

  // 2. A topic that exists only in this browser is pushed to the server after login.
  await page.evaluate(value=>{const map=JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}");map[value.date]=value;localStorage.setItem("tb_talkflow_v1",JSON.stringify(map))},localOnly);
  puts.length=0;
  await page.reload({waitUntil:"networkidle"});
  const deadline=Date.now()+6000;while(Date.now()<deadline&&!puts.some(body=>body.upserts?.some(item=>item.date===localOnly.date)))await page.waitForTimeout(200);
  check("local-only topic is backed up",puts.some(body=>body.upserts?.some(item=>item.date===localOnly.date&&item.topic.date===localOnly.date)),JSON.stringify(puts.map(body=>({upserts:body.upserts?.map(item=>item.date),deletes:body.deletes}))));
  check("nothing is deleted on the server",puts.every(body=>!body.deletes?.length),JSON.stringify(puts.map(body=>body.deletes)));
  check("browser keeps both topics",JSON.stringify(await storedDates())===JSON.stringify(["2026-11-20","2026-11-21"]),JSON.stringify(await storedDates()));

  // 3. A newer local edit is not overwritten by an older server copy.
  const editedAt="2026-11-02T05:00:00.000Z";
  await page.evaluate(([date,stamp])=>{const map=JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}");map[date].updatedAt=stamp;map[date].qaMarker="local-edit";localStorage.setItem("tb_talkflow_v1",JSON.stringify(map))},["2026-11-20",editedAt]);
  await page.reload({waitUntil:"networkidle"});await page.waitForTimeout(2500);
  check("newer local edit survives login",await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_talkflow_v1")||"{}")["2026-11-20"]?.qaMarker)==="local-edit");
  check("console error zero",errors.length===0,errors.join(" | "));
  console.log("PASS admin-topic-backup-browser-qa: restore into a cleared browser, backfill local-only topics, keep newer local edits");
}finally{await browser.close();server.close()}
