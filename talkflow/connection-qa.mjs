import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url),runtime=join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules");
let playwright;try{playwright=require("playwright")}catch{playwright=createRequire(join(runtime,"playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),evidence=join(root,"..",".omo","evidence","talkflow-connection"),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript"};await mkdir(evidence,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,"http://localhost").pathname,path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error("invalid path");res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
await new Promise(resolve=>server.listen(4183,"127.0.0.1",resolve));
const browser=await playwright.chromium.launch({headless:true}),checks=[];
const check=(name,pass,detail="")=>{checks.push(name);if(!pass)throw new Error(`${name}: ${detail}`)};
try{
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem("tb_talkflow_settings_v1",JSON.stringify({apiKey:"qa-only-key"})));
  const page=await context.newPage(),requests={models:0,messages:0,pending:0,body:null},errors=[];let failMessages=false,expectedHttpFailure=false;
  page.on("pageerror",error=>errors.push(error.message));page.on("console",message=>{if(message.type()==="error"&&!expectedHttpFailure)errors.push(message.text())});
  await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
  await page.route("https://api.anthropic.com/v1/models",async route=>{requests.models++;requests.pending++;try{await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:[{id:"claude-sonnet-4-6",display_name:"Claude Sonnet 4.6",created_at:"2026-02-17T00:00:00Z"}]})})}finally{requests.pending--}});
  await page.route("https://api.anthropic.com/v1/messages",async route=>{requests.messages++;requests.pending++;requests.body=route.request().postDataJSON();try{await new Promise(resolve=>setTimeout(resolve,80));await route.fulfill(failMessages?{status:401,contentType:"application/json",body:JSON.stringify({type:"error",error:{type:"authentication_error",message:"invalid key"}})}:{status:200,contentType:"application/json",body:JSON.stringify({content:[{type:"text",text:"OK"}]})})}finally{requests.pending--}});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator("#settings-button").click();
  const button=page.locator("#test-ai-connection");
  await button.evaluate(element=>{element.click();element.click()});
  await page.getByText("AI 연결 정상",{exact:false}).waitFor({timeout:3000});
  check("one model request",requests.models===1,String(requests.models));
  check("one messages request",requests.messages===1,String(requests.messages));
  check("short non-streaming request",requests.body?.stream===false&&requests.body?.max_tokens===8,JSON.stringify({stream:requests.body?.stream,maxTokens:requests.body?.max_tokens}));
  check("selected model shown",await page.getByText("Claude Sonnet 4.6",{exact:false}).count()>0);
  check("button loading released",await button.isEnabled()&&await button.textContent()==="연결 테스트");
  await page.locator("#settings-dialog button[value='cancel']").click();await page.locator("#settings-button").click();
  check("success survives reopen",await page.getByText("AI 연결 정상",{exact:false}).count()>0);
  await page.screenshot({path:join(evidence,"connection-success.png"),fullPage:true});
  requests.models=0;requests.messages=0;await button.click();await page.waitForFunction(()=>document.querySelector("#test-ai-connection")?.disabled===false);
  check("second test is not duplicated",requests.models===1&&requests.messages===1,JSON.stringify(requests));
  check("pending request zero",requests.pending===0,String(requests.pending));
  failMessages=true;expectedHttpFailure=true;await button.click();await page.waitForFunction(()=>document.querySelector("#test-ai-connection")?.disabled===false);expectedHttpFailure=false;
  check("failure shows HTTP and error type",await page.getByText("연결 실패 · HTTP 401 · authentication_error",{exact:true}).count()===1);
  await page.screenshot({path:join(evidence,"connection-failure.png"),fullPage:true});
  check("console error zero",errors.length===0,errors.join(" | "));
  console.log(`connection-qa: PASS (${checks.length} checks)`);
}finally{await browser.close();server.close()}
