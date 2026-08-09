import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url),runtime=join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules");
let playwright;try{playwright=require("playwright")}catch{playwright=createRequire(join(runtime,"playwright","index.js"))("playwright")}
const base=(process.argv[2]||"https://thebox-talkflow-preview.vercel.app/talkflow/").replace(/\/?$/,"/"),root=fileURLToPath(new URL(".",import.meta.url)),evidence=join(root,"..",".omo","evidence","talkflow-preview"),checks=[];await mkdir(evidence,{recursive:true});
const check=(name,pass,detail="")=>{checks.push({name,pass:Boolean(pass),detail});if(!pass)throw new Error(`${name}: ${detail}`)};
const browser=await playwright.chromium.launch({headless:true});
try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[],failed=[],direct=[];
  const visit=async url=>{try{await page.goto(url,{waitUntil:"domcontentloaded"})}catch(error){if(!String(error).includes("ERR_ABORTED"))throw error}await page.locator(".app-shell").waitFor({state:"visible"})};
  page.on("pageerror",error=>errors.push(error.message));page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});page.on("requestfailed",request=>failed.push(`${request.method()} ${request.url()} ${request.failure()?.errorText||"failed"}`));page.on("request",request=>{if(request.url().startsWith("https://api.anthropic.com/"))direct.push(request.url())});
  for(const width of [375,768,1280,1600]){
    await page.setViewportSize({width,height:900});await visit(base);
    check(`${width}px task-first opens`,await page.locator(".task-home").isVisible());
    check(`${width}px AI generation disabled without secrets`,await page.locator("[data-auto-date],[data-custom-date],[data-new-topic-date]").evaluateAll(items=>items.filter(item=>item.offsetParent!==null).every(item=>item.disabled)));
    check(`${width}px no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    await page.locator("#settings-button").click();await page.locator("#settings-dialog").waitFor({state:"visible"});await page.waitForFunction(()=>document.querySelector("#ai-server-badge")?.textContent!=="확인 중");
    check(`${width}px server setup state`,await page.locator("#ai-server-badge").textContent()==="설정 필요");
    check(`${width}px no API key UI`,await page.locator("#api-key,#change-api-key,#api-key-editor").count()===0);
    check(`${width}px settings no overflow`,await page.locator("#settings-dialog").evaluate(element=>element.scrollWidth<=element.clientWidth+1));
    await page.screenshot({path:join(evidence,`settings-${width}.png`),fullPage:true});await page.locator("#settings-dialog button[value='cancel']").click();
  }
  await page.setViewportSize({width:1280,height:900});await visit(`${base}?section=topics&view=month&month=2026-08`);await page.locator(".compact-month").waitFor({state:"visible"});await page.locator(".month-row [data-open$=':student']").first().click();check("student preview remains available",await page.locator("#student-view .flow-card,#student-view .a4-page").count()>=1);await page.getByRole("button",{name:"리더용",exact:true}).click();check("leader preview remains available",await page.locator("#leader-view .leader-toolbar,#leader-view .a4-page").count()>=1);await page.goBack();check("History restore remains available",new URL(page.url()).searchParams.get("tab")==="student");
  await visit(`${base}?section=print&date=2026-08-03&role=student`);check("print remains exactly two pages",await page.locator(".a4-page").count()===2);
  const actionableFailures=failed.filter(item=>!item.endsWith("net::ERR_ABORTED"));check("client direct Anthropic requests zero",direct.length===0,JSON.stringify(direct));check("browser console errors zero",errors.length===0,errors.join(" | "));check("network failures zero",actionableFailures.length===0,actionableFailures.join(" | "));
  const storage=await page.evaluate(()=>({local:[...Array(localStorage.length)].map((_,index)=>[localStorage.key(index),localStorage.getItem(localStorage.key(index))]),session:[...Array(sessionStorage.length)].map((_,index)=>[sessionStorage.key(index),sessionStorage.getItem(sessionStorage.key(index))])}));check("browser storage contains no Anthropic key",!/sk-ant-|x-api-key/i.test(JSON.stringify(storage)));
  const report={pass:true,url:base,checks:checks.length,generatedAt:new Date().toISOString(),results:checks};await writeFile(join(evidence,"report.json"),JSON.stringify(report,null,2));console.log(`preview-qa: PASS (${checks.length} checks) ${base}`);
}finally{await browser.close()}
