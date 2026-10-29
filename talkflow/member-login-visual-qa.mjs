import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

let playwright;
try{playwright=createRequire(import.meta.url)("playwright")}catch{playwright=createRequire(join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules","playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript"};
let loginRequests=0;const server=createServer(async(req,res)=>{const requestPath=new URL(req.url,"http://localhost").pathname;if(requestPath==="/api/talkflow/member-login"){loginRequests+=1;res.statusCode=401;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify({error:{type:"member_not_found",message:"등록 정보를 확인해 주세요."}}));return}try{const pathname=requestPath.replace(/^\/talkflow\//,"/"),path=normalize(join(root,pathname==="/member/"?"member.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error();res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await playwright.chromium.launch({headless:true}),artifacts=join(root,"artifacts"),errors=[];
await mkdir(artifacts,{recursive:true});
try{
  for(const width of [375,768,1280]){
    const height=width===375?812:900,page=await browser.newPage({viewport:{width,height}});
    await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
    page.on("console",message=>{if(message.type()==="error")errors.push(`${width}: ${message.text()}`)});
    await page.goto(`${origin}/talkflow/member/`,{waitUntil:"networkidle"});
    const result=await page.evaluate(()=>{const form=document.querySelector("#member-login-form"),title=document.querySelector("#login-title").getBoundingClientRect();return{overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,formTop:form?.getBoundingClientRect().top,formBottom:form?.getBoundingClientRect().bottom,titleTop:title.top,directInputs:document.querySelectorAll("#member-login-view input").length,topicHidden:document.querySelector("#member-topic-view").hidden,brand:getComputedStyle(document.querySelector(".member-brand span")).backgroundColor,canvas:getComputedStyle(document.body).backgroundColor,button:form?getComputedStyle(form.querySelector(".primary-button")).backgroundColor:""}});
    if(result.overflow>1)throw new Error(`${width}: horizontal overflow ${result.overflow}`);
    if(result.directInputs!==3||!result.topicHidden||result.formTop===undefined)throw new Error(`${width}: direct entry form is unavailable ${JSON.stringify(result)}`);
    if(width===375&&(result.titleTop>180||result.formTop>390||result.formBottom>height+160))throw new Error(`${width}: entry flow is vertically displaced ${JSON.stringify(result)}`);
    if(result.brand!=="rgb(169, 48, 46)"||result.button!=="rgb(43, 89, 64)")throw new Error(`${width}: palette mismatch ${JSON.stringify(result)}`);
    if(width===375){await page.locator("#member-name").fill("홍길동");await page.locator("#member-phone").fill("01012345678");await page.locator("#member-birth").fill("19900101");await page.evaluate(()=>{const form=document.querySelector("#member-login-form");form.requestSubmit();form.requestSubmit()});await page.getByText("등록 정보를 확인해 주세요.").waitFor();assert.equal(loginRequests,1,"double submit must make one member-login request");assert.equal(await page.getByRole("button",{name:"멤버 확인"}).isEnabled(),true,"login button must recover after a failed request");errors.length=0}
    await page.screenshot({path:join(artifacts,`member-login-${width}.png`),fullPage:true});
    await page.close();
  }
  if(errors.length)throw new Error(errors.join(" | "));
  console.log("PASS member-login-visual-qa: 375/768/1280 direct entry, alignment, palette, overflow 0");
}finally{await browser.close();server.close()}
