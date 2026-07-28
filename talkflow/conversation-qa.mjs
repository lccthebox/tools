import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

let playwright;
try { playwright=createRequire(import.meta.url)("playwright"); }
catch { playwright=createRequire(join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules","playwright","index.js"))("playwright"); }
const {chromium}=playwright;
const root=fileURLToPath(new URL(".",import.meta.url));
const evidence=join(root,"..",".omo","evidence","talkflow-conversation");
await mkdir(evidence,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript"};
const server=createServer(async(request,response)=>{
  try{
    const pathname=new URL(request.url,"http://localhost").pathname;
    const path=normalize(join(root,pathname==="/"?"index.html":pathname));
    if(!path.startsWith(normalize(root)))throw new Error("invalid path");
    response.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");
    response.end(await readFile(path));
  }catch{response.statusCode=404;response.end("Not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port,browser=await chromium.launch({headless:true});
const checks=[],check=(name,pass,detail="")=>{checks.push({name,pass:Boolean(pass),detail});if(!pass)throw new Error(`${name}: ${detail}`)};
try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation`,{waitUntil:"networkidle"});
  const fixtureResult=await page.evaluate(()=>Object.values(TalkFlow.getTopics()).map(topic=>({fixture:topic.conversationFixture,counts:{
    quick:topic.conversationFlow.quickStarts.length,story:topic.conversationFlow.storyPrompts.length,rounds:topic.conversationFlow.talkRounds.length,phrases:topic.conversationFlow.topicPhrases.length,reactions:topic.conversationFlow.reactionPhrases.length
  },review:TalkFlow.conversation.evaluate(topic.conversationFlow)})));
  check("8 separate conversation fixtures",fixtureResult.length===8&&fixtureResult.every(item=>item.fixture));
  check("conversation schema exact counts",fixtureResult.every(item=>JSON.stringify(item.counts)===JSON.stringify({quick:3,story:2,rounds:3,phrases:5,reactions:6})),JSON.stringify(fixtureResult));
  check("8 fixtures score 80/80",fixtureResult.every(item=>item.review.total===80&&item.review.status==="ready"),JSON.stringify(fixtureResult));
  check("operator has five steps",await page.locator(".workflow-steps li").count()===5);
  check("technical settings not expanded",await page.locator(".advanced-editor[open]").count()===0);
  const legacyContext=await browser.newContext(),legacyPage=await legacyContext.newPage();
  await legacyPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:"networkidle"});
  await legacyPage.getByRole("button",{name:"관리",exact:true}).click();
  await legacyPage.getByRole("button",{name:"회화형 구조로 변환"}).click();
  check("legacy conversion is explicit",await legacyPage.evaluate(()=>Boolean(Object.values(TalkFlow.getTopics())[0].conversationFlow)));
  check("conversion preserves a version",await legacyPage.evaluate(()=>Object.values(TalkFlow.getVersions()).flat().length===1));
  await legacyPage.getByRole("button",{name:"이전 버전 복원"}).click();
  check("previous legacy version restores",await legacyPage.evaluate(()=>!Object.values(TalkFlow.getTopics())[0].conversationFlow));
  await legacyPage.getByRole("button",{name:"일별 관리",exact:true}).click();
  await legacyPage.locator("#operator-date").fill("2026-08-01");
  await legacyPage.locator("#operator-topic").fill("Weekend plans");
  await legacyPage.getByRole("button",{name:"회화 토픽 만들기"}).click();
  check("operator creates without overwriting another date",await legacyPage.evaluate(()=>Boolean(TalkFlow.getTopics()["2026-08-01"]?.conversationFlow)&&Object.keys(TalkFlow.getTopics()).length===9));
  const beforeRegeneration=await legacyPage.evaluate(()=>JSON.stringify(TalkFlow.getTopics()["2026-08-01"].conversationFlow.talkRounds));
  await legacyPage.getByRole("button",{name:"질문만 다시 만들기"}).click();
  check("failed partial generation preserves content",await legacyPage.evaluate(before=>JSON.stringify(TalkFlow.getTopics()["2026-08-01"].conversationFlow.talkRounds)===before,beforeRegeneration));
  let autoGistCalls=0;
  await legacyPage.route("https://api.github.com/gists",async route=>{autoGistCalls++;await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:"approve-test-gist"})})});
  await legacyPage.evaluate(key=>localStorage.setItem(key,JSON.stringify({gistToken:"test-token"})),await legacyPage.evaluate(()=>TalkFlow.KEYS.settings));
  await legacyPage.reload({waitUntil:"networkidle"});
  await legacyPage.getByRole("button",{name:"관리",exact:true}).click();
  await legacyPage.getByRole("button",{name:"승인하고 저장"}).first().click();
  await legacyPage.waitForFunction(()=>TalkFlow.getTopics()["2026-08-01"].quality.status==="approved");
  check("approve saves locally and auto-syncs connected Gist",autoGistCalls===1,String(autoGistCalls));
  await legacyContext.close();
  const viewports=[[360,800],[390,844],[430,900],[768,900],[1024,900],[1440,1000]];
  for(const [width,height] of viewports){
    await page.setViewportSize({width,height});
    await page.getByRole("button",{name:"일별 관리",exact:true}).click();
    check(`${width}px operator no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    await page.screenshot({path:join(evidence,`operator-${width}.png`),fullPage:true});
    await page.getByRole("button",{name:"학생",exact:true}).click();
    check(`${width}px student no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    check(`${width}px conversation sequence visible`,await page.locator(".conversation-path b").count()===6);
    await page.screenshot({path:join(evidence,`student-${width}.png`),fullPage:true});
  }
  await page.getByRole("button",{name:"리더",exact:true}).click();
  check("leader support and feedback visible",await page.locator(".leader-support,.feedback-card").count()===2);
  await page.locator("[data-feedback-form] input[type=checkbox]").first().check();
  await page.locator("[data-feedback-form] button[type=submit]").click();
  const feedback=await page.evaluate(()=>TalkFlow.getFeedback());
  check("anonymous local feedback stored",Object.values(feedback).flat().length===1&&!JSON.stringify(feedback).match(/name|email|phone/i),JSON.stringify(feedback));
  await page.getByRole("button",{name:"관리",exact:true}).click();
  check("conversation review actions visible",await page.locator(".review-actions").isVisible());
  check("legacy technical editor hidden",await page.locator(".conversation-editor-summary").evaluate(node=>getComputedStyle(node).display==="none"));
  await page.locator("[data-open$=':print']").first().click();
  check("student handout exactly two DOM pages",await page.locator(".a4-page").count()===2);
  const studentText=await page.locator(".a4-topic").innerText();
  check("student handout required order",["HOW TO USE","START NOW","TELL YOUR STORY","WORDS TO USE","TALK TOGETHER","GROUP MISSION","KEEP IT GOING","FINAL ROUND"].every((label,index,all)=>studentText.indexOf(label)>=0&&(index===0||studentText.indexOf(label)>studentText.indexOf(all[index-1]))),studentText);
  check("legacy print labels absent",!/TODAY'S GOAL|TOPIC HOOK|EXAMPLE FOLLOW-UP|DEEPER FOLLOW-UP/.test(studentText));
  const overflows=await page.locator(".a4-page").evaluateAll(nodes=>nodes.map(node=>({x:node.scrollWidth-node.clientWidth,y:node.scrollHeight-node.clientHeight})));
  check("student A4 DOM has no overflow",overflows.every(item=>item.x<=1&&item.y<=1),JSON.stringify(overflows));
  await page.screenshot({path:join(evidence,"student-print-screen.png"),fullPage:true});
  await page.getByRole("button",{name:"리더용 A4"}).click();
  check("leader handout exactly two DOM pages",await page.locator(".a4-page").count()===2);
  check("leader handout has both guidance strips",await page.locator(".leader-strip").count()===2);
  const leaderOverflows=await page.locator(".a4-page").evaluateAll(nodes=>nodes.map(node=>({x:node.scrollWidth-node.clientWidth,y:node.scrollHeight-node.clientHeight})));
  check("leader A4 DOM has no overflow",leaderOverflows.every(item=>item.x<=1&&item.y<=1),JSON.stringify(leaderOverflows));
  await page.emulateMedia({media:"print"});
  await page.screenshot({path:join(evidence,"leader-print-1024.png"),fullPage:true});
  await page.emulateMedia({media:"screen"});
  check("no browser console errors",errors.length===0,errors.join("; "));
  const report={pass:true,checks:checks.length,generatedAt:new Date().toISOString(),evidence,results:checks};
  await writeFile(join(evidence,"qa-results.json"),`${JSON.stringify(report,null,2)}\n`,"utf8");
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
