import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url),runtime=join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules");
let playwright;try{playwright=require("playwright")}catch{playwright=createRequire(join(runtime,"playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),evidence=join(root,"..",".omo","evidence","talkflow-auth"),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript"};await mkdir(evidence,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,"http://localhost").pathname,path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error("invalid path");res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
await new Promise(resolve=>server.listen(4184,"127.0.0.1",resolve));
const browser=await playwright.chromium.launch({headless:true}),checks=[];
const check=(name,pass,detail="")=>{checks.push(name);if(!pass)throw new Error(`${name}: ${detail}`)};
try{
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem("tb_talkflow_settings_v1",JSON.stringify({apiKey:"stored-test-secret",gistId:"preserved-gist"})));
  const page=await context.newPage(),calls={models:0,messages:0,headers:[]};let modelsStatus=200;
  await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
  await page.route("https://api.anthropic.com/v1/models",route=>{calls.models++;calls.headers.push(route.request().headers());return route.fulfill(modelsStatus===401?{status:401,contentType:"application/json",body:JSON.stringify({type:"error",error:{type:"authentication_error",message:"invalid key"}})}:{status:200,contentType:"application/json",body:JSON.stringify({data:[{id:"claude-sonnet-4-6",display_name:"Claude Sonnet 4.6"}]})})});
  await page.route("https://api.anthropic.com/v1/messages",route=>{calls.messages++;calls.headers.push(route.request().headers());return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({content:[{type:"text",text:"OK"}]})})});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator("#settings-button").click();
  check("stored key is not copied into DOM",await page.locator("#api-key").inputValue()==="");
  check("configured status is shown",await page.getByText("API 키가 저장되어 있습니다.",{exact:true}).count()===1);
  check("key editor stays hidden until requested",await page.locator("#api-key-editor").isVisible()===false);
  await page.getByRole("button",{name:"설정 저장"}).click();
  check("open and save preserves key",await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_talkflow_settings_v1")||"{}").apiKey)==="stored-test-secret");
  await page.locator("#settings-button").click();await page.locator("#change-api-key").click();check("key editor opens empty",await page.locator("#api-key-editor").isVisible()&&await page.locator("#api-key").inputValue()==="");await page.locator("#api-key").fill("");await page.getByRole("button",{name:"설정 저장"}).click();
  check("blank draft does not erase key",await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_talkflow_settings_v1")||"{}").apiKey)==="stored-test-secret");
  await page.locator("#settings-button").click();await page.locator("#change-api-key").click();await page.locator("#api-key").fill("••••••••");await page.getByRole("button",{name:"설정 저장"}).click();
  check("masked draft is rejected",await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_talkflow_settings_v1")||"{}").apiKey)==="stored-test-secret");
  await page.locator("#settings-button").click();await page.locator("#change-api-key").click();await page.locator("#api-key").fill("replacement-test-secret");await page.getByRole("button",{name:"설정 저장"}).click();
  check("replacement key is stored",await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_talkflow_settings_v1")||"{}").apiKey)==="replacement-test-secret");
  await page.locator("#settings-button").click();calls.models=0;calls.messages=0;calls.headers=[];await page.locator("#refresh-models").click();await page.getByText("사용 가능한 모델을 확인했습니다.",{exact:true}).waitFor();check("one models request per refresh click",calls.models===1&&calls.messages===0,JSON.stringify({models:calls.models,messages:calls.messages}));
  calls.models=0;calls.messages=0;calls.headers=[];await page.locator("#test-ai-connection").click();await page.getByText("AI 연결 정상",{exact:false}).waitFor();
  check("models and messages share stored key",calls.models===1&&calls.messages===1&&calls.headers.every(headers=>headers["x-api-key"]==="replacement-test-secret"));
  check("success has no stale authentication guidance",await page.locator("#api-key-guidance").isVisible()===false);
  check("required Anthropic headers are present",calls.headers.every(headers=>headers["anthropic-version"]==="2023-06-01"&&headers["content-type"]==="application/json"&&headers["anthropic-dangerous-direct-browser-access"]==="true"));
  for(const width of [375,768,1280]){await page.setViewportSize({width,height:900});const dialog=page.locator("#settings-dialog"),metrics=await dialog.evaluate(element=>({clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,overflowY:getComputedStyle(element).overflowY}));check(`${width}px dialog stays scrollable`,metrics.clientHeight<=872&&metrics.scrollHeight>=metrics.clientHeight&&metrics.overflowY==="auto",JSON.stringify(metrics));await page.screenshot({path:join(evidence,`configured-success-${width}.png`),fullPage:true});await dialog.evaluate(element=>{element.scrollTop=element.scrollHeight});await page.screenshot({path:join(evidence,`configured-success-${width}-bottom.png`),fullPage:true})}
  modelsStatus=401;calls.models=0;calls.messages=0;calls.headers=[];await page.locator("#refresh-models").click();await page.waitForFunction(()=>document.querySelector("#ai-connection-status")?.textContent==="API 키를 확인할 수 없습니다.");
  check("401 models is not retried",calls.models===1,String(calls.models));check("401 blocks messages",calls.messages===0,String(calls.messages));
  await page.waitForFunction(()=>document.querySelector("#model-diagnostics pre")?.textContent);const diagnostic=JSON.parse(await page.locator("#model-diagnostics pre").textContent());check("401 diagnostic is redacted",diagnostic.httpStatus===401&&diagnostic.type==="authentication_error"&&Object.keys(diagnostic).length===2);
  check("Gist setting is preserved",await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_talkflow_settings_v1")||"{}").gistId)==="preserved-gist");
  console.log(`auth-regression-qa: PASS (${checks.length} checks)`);
}finally{await browser.close();server.close()}
