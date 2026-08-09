import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url),runtime=join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules");
let playwright;try{playwright=require("playwright")}catch{playwright=createRequire(join(runtime,"playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),evidence=join(root,"..",".omo","evidence","talkflow-auth"),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript"};await mkdir(evidence,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,"http://localhost").pathname,path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error("invalid path");res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});await new Promise(resolve=>server.listen(4184,"127.0.0.1",resolve));
const browser=await playwright.chromium.launch({headless:true}),checks=[],check=(name,pass,detail="")=>{checks.push(name);if(!pass)throw new Error(`${name}: ${detail}`)};
try{
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem("tb_talkflow_settings_v1",JSON.stringify({apiKey:"legacy-browser-secret",gistId:"preserved-gist"})));
  const page=await context.newPage(),calls={status:0,login:0,models:0,messages:0,direct:0},bodies=[];let authenticated=false;
  page.on("request",request=>{if(request.url().startsWith("https://api.anthropic.com/"))calls.direct++});
  await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
  await page.route("**/api/talkflow/status",route=>{calls.status++;return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({configured:true,authenticated,model:"Claude Sonnet 4.6"})})});
  await page.route("**/api/talkflow/login",route=>{calls.login++;bodies.push(route.request().postDataJSON());authenticated=true;return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({authenticated:true})})});
  await page.route("**/api/talkflow/models",route=>{calls.models++;return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:[{id:"claude-sonnet-4-6",display_name:"Claude Sonnet 4.6"}]})})});
  await page.route("**/api/talkflow/messages",route=>{calls.messages++;bodies.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({content:[{type:"text",text:"OK"}]})})});
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:"networkidle"});await page.locator("#settings-button").click();
  check("Anthropic key input removed",await page.locator("#api-key,#change-api-key,#api-key-editor").count()===0);
  check("legacy key is absent from DOM",!(await page.locator("body").innerText()).includes("legacy-browser-secret")&&await page.locator("input").evaluateAll(items=>items.every(item=>item.value!=="legacy-browser-secret")));
  check("legacy migration is offered once",await page.locator("#legacy-key-migration").isVisible(),JSON.stringify({element:await page.locator("#legacy-key-migration").evaluate(element=>({hidden:element.hidden,parentHidden:element.closest("[data-settings-panel]")?.hidden,text:element.textContent})),storage:await page.evaluate(()=>localStorage.getItem("tb_talkflow_settings_v1"))}));
  await page.locator("#remove-legacy-api-key").click();
  check("migration removes only old API key",await page.evaluate(()=>{const value=JSON.parse(localStorage.getItem("tb_talkflow_settings_v1")||"{}");return !Object.hasOwn(value,"apiKey")&&value.gistId==="preserved-gist"}));
  check("migration prompt disappears",await page.locator("#legacy-key-migration").isVisible()===false);
  check("login form is shown",await page.locator("#admin-login-form").isVisible());
  for(const width of [375,768,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(evidence,`server-login-required-${width}.png`),fullPage:true})}
  await page.setViewportSize({width:1280,height:900});
  await page.locator("#admin-password").fill("qa-admin-password");await page.locator("#admin-login").click();await page.waitForFunction(()=>document.querySelector("#ai-server-badge")?.textContent==="정상");
  check("one login request",calls.login===1,String(calls.login));check("password is not retained in DOM",await page.locator("#admin-password").inputValue()==="");
  check("password is not stored",await page.evaluate(()=>![...Array(localStorage.length)].map((_,i)=>localStorage.getItem(localStorage.key(i))).some(value=>value?.includes("qa-admin-password"))));
  calls.models=0;await page.locator("#refresh-models").click();await page.getByText("사용 가능한 모델을 확인했습니다.",{exact:true}).waitFor();check("one proxy models request",calls.models===1,String(calls.models));
  calls.models=0;calls.messages=0;await page.locator("#test-ai-connection").click();await page.getByText("AI 연결 정상",{exact:false}).waitFor();check("connection uses proxy once each",calls.models===1&&calls.messages===1,JSON.stringify(calls));
  check("client direct Anthropic requests zero",calls.direct===0,String(calls.direct));
  check("client request has no x-api-key",await page.evaluate(()=>performance.getEntriesByType("resource").every(entry=>!entry.name.includes("api.anthropic.com"))));
  for(const width of [375,768,1280]){await page.setViewportSize({width,height:900});check(`${width}px settings has no horizontal overflow`,await page.locator("#settings-dialog").evaluate(element=>element.scrollWidth<=element.clientWidth+1));await page.screenshot({path:join(evidence,`server-auth-${width}.png`),fullPage:true})}
  console.log(`auth-regression-qa: PASS (${checks.length} checks)`);
}finally{await browser.close();server.close()}
