import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

let playwright;
try{playwright=createRequire(import.meta.url)("playwright")}catch{playwright=createRequire(join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules","playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json"};
const server=createServer(async(req,res)=>{try{const requestedPath=new URL(req.url,"http://localhost").pathname;if(requestedPath==="/api/talkflow/status/"){res.setHeader("Content-Type","application/json");res.end(JSON.stringify({configured:false,authenticated:false,model:"Claude Sonnet 4.6"}));return}const pathname=requestedPath.replace(/^\/talkflow\//,"/"),path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error("invalid path");res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`,fixture=JSON.parse(await readFile(join(root,"fixtures","member-topic.json"),"utf8")),topic={...fixture,id:"topic-v4-browser-qa",generatedConversation:true,generationEngine:"v4-topic",standardVersion:"4.1",templateVersion:"topic-v4.1",topicPlan:{titleEn:fixture.title.en,titleKo:fixture.title.ko,star:fixture.page1.story.star,category:fixture.page1.category,page1Template:"A",articleTitle:fixture.page2.title,articleCategory:fixture.page2.category},quality:{status:"approved",score:100,issues:[]},operatorStatus:{generationStatus:"complete",reviewStatus:"approved",printStatus:"unchecked",used:false},hidden:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
const browser=await playwright.chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],anthropic=[];
await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
page.on("requestfailed",request=>errors.push(`${request.failure()?.errorText||"request failed"}: ${request.url()}`));
page.on("response",response=>{if(response.status()>=400)errors.push(`${response.status()}: ${response.url()}`)});
page.on("request",request=>{if(/api\.anthropic\.com|\/api\/talkflow\/(?:messages|models)\/?(?:[?#]|$)/i.test(request.url()))anthropic.push(request.url())});
try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});await page.evaluate(value=>localStorage.setItem("tb_talkflow_v1",JSON.stringify({[value.date]:value})),topic);
  for(const width of [375,768,1280]){
    await page.setViewportSize({width,height:900});await page.goto(`${origin}/?section=topics&view=month&month=2026-09&date=${topic.date}&tab=review`,{waitUntil:"networkidle"});
    await page.locator(`[data-open="${topic.date}:admin"]`).click();
    const handout=page.locator(".topic-v4-handout").first();if(!await handout.count())throw new Error(`${width}: v4 handout missing`);
    if(await handout.locator(".a4-page").count()!==2)throw new Error(`${width}: two pages required`);
    const pageOverflow=await handout.locator(".a4-page").evaluateAll(pages=>pages.map(page=>page.scrollHeight-page.clientHeight));
    if(pageOverflow.some(value=>value>1))throw new Error(`${width}: A4 content overflow ${pageOverflow.join(",")}`);
    if(await handout.locator(".v41-header").count()!==2)throw new Error(`${width}: page headers missing`);
    if(await handout.locator(".v41-columns").count()!==1)throw new Error(`${width}: Easy/Real columns missing`);
    if(await handout.innerText().then(value=>/SESSION|JURY|LEADER|ACTIVITY|VERDICT|ROUND TWO|RANDOM WORDS/.test(value)))throw new Error(`${width}: legacy content leaked`);
    if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))throw new Error(`${width}: horizontal overflow`);
    if(width===1280){
      await handout.screenshot({path:join(root,"artifacts","topic-v4-mockup-admin.png")});
      await handout.locator(".a4-page").nth(0).screenshot({path:join(root,"artifacts","topic-v4-mockup-page-1.png")});
      await handout.locator(".a4-page").nth(1).screenshot({path:join(root,"artifacts","topic-v4-mockup-page-2.png")});
    }
  }
  await page.setViewportSize({width:375,height:900});await page.goto(`${origin}/member.html?fixtures=1`,{waitUntil:"networkidle"});
  if(await page.locator(".month-controls").count()!==1||await page.locator("#member-browser").count()!==1)throw new Error("calendar navigation missing");
  if(await page.locator(".topic-accordions>details").count()!==2)throw new Error("two topic accordions required");
  if(await page.locator(".member-completion").count()!==2)throw new Error("two completion modes required");
  if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))throw new Error("member horizontal overflow");
  const mobileReading=await page.evaluate(()=>({story:parseFloat(getComputedStyle(document.querySelector(".member-story")).fontSize),question:parseFloat(getComputedStyle(document.querySelector(".member-questions li")).fontSize),clipped:[...document.querySelectorAll("#topic *")].filter(node=>{const rect=node.getBoundingClientRect();return rect.right>document.documentElement.clientWidth+1||rect.left<-1}).length}));
  if(mobileReading.story<13||mobileReading.question<13)throw new Error(`member type too small: ${JSON.stringify(mobileReading)}`);
  if(mobileReading.clipped)throw new Error(`member clipped elements: ${mobileReading.clipped}`);
  await page.screenshot({path:join(root,"artifacts","topic-v4-mobile-final.png"),fullPage:true});
  if(errors.length)throw new Error(`console errors: ${errors.join(" | ")}`);
  if(anthropic.length)throw new Error(`AI calls: ${anthropic.join(" | ")}`);
  console.log("PASS topic-v4-browser-qa: admin 375/768/1280, member 375, AI calls 0");
}finally{await browser.close();server.close()}
