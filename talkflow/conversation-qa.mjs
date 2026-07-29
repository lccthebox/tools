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
  check("conversation schema exact counts",fixtureResult.every(item=>JSON.stringify(item.counts)===JSON.stringify({quick:3,story:2,rounds:3,phrases:4,reactions:6})),JSON.stringify(fixtureResult));
  check("8 fixtures score 80/80",fixtureResult.every(item=>item.review.total===80&&item.review.status==="ready"),JSON.stringify(fixtureResult));
  const sessionContext=await browser.newContext(),sessionPage=await sessionContext.newPage();
  await sessionPage.goto(`http://127.0.0.1:${port}/?fixtures=sessions`,{waitUntil:"networkidle"});
  const sessionFixtures=await sessionPage.evaluate(()=>Object.values(TalkFlow.getTopics()).map(topic=>({
    mode:topic.topicMode,
    source:topic.sourceMaterial,
    common:topic.commonGround,
    one:topic.sessionOne,
    two:topic.sessionTwo,
    operator:topic.operatorStatus
  })));
  check("10 two-session fixtures",sessionFixtures.length===10);
  check("8 everyday and 2 context fixtures",sessionFixtures.filter(item=>item.mode==="everyday").length===8&&sessionFixtures.filter(item=>item.mode==="context").length===2);
  check("session one fixed at 50 minutes",sessionFixtures.every(item=>item.one?.minutes===50));
  check("session two fixed at 40 minutes",sessionFixtures.every(item=>item.two?.minutes===40&&item.two.reset&&item.two.mainActivity&&item.two.groupDecision&&item.two.finalRound));
  check("context fixtures have source-backed brief",sessionFixtures.filter(item=>item.mode==="context").every(item=>item.common?.enabled&&item.common.briefEn.length===3&&item.common.keywords.length===3&&item.source.publisher&&item.source.publishedAt));
  check("generated fixtures require review",sessionFixtures.every(item=>item.operator?.reviewStatus==="review"));
  await sessionContext.close();
  check("calendar is monthly seven-column default",await page.locator(".month-calendar").isVisible()&&await page.locator(".weekday-row span").count()===7);
  check("month toolbar has one-click actions",await page.getByRole("button",{name:"이번 달 자동 구성"}).isVisible()&&await page.getByRole("button",{name:"고급 설정",exact:true}).isVisible());
  check("written dates expose PDF and edit",await page.locator(".calendar-day [data-open$=':print']").count()===8&&await page.locator(".calendar-day [data-open$=':admin']").count()===8);
  check("empty operating dates expose two generation paths",await page.locator("[data-auto-date]").count()>0&&await page.locator("[data-custom-date]").count()>0);
  const alignmentCritical=await page.evaluate(()=>{
    const flow=TalkFlow.getTopics()["2026-08-03"].conversationFlow;
    flow.quickStarts[0].options=["Reviewer history"];
    return TalkFlow.conversation.evaluate(flow).critical;
  });
  check("question-option mismatch is critical",alignmentCritical);
  const legacyContext=await browser.newContext(),legacyPage=await legacyContext.newPage();
  await legacyPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:"networkidle"});
  await legacyPage.getByRole("button",{name:"관리",exact:true}).click();
  await legacyPage.getByRole("button",{name:"회화형 구조로 변환"}).click();
  check("legacy conversion is explicit",await legacyPage.evaluate(()=>Boolean(Object.values(TalkFlow.getTopics())[0].conversationFlow)));
  check("conversion preserves a version",await legacyPage.evaluate(()=>Object.values(TalkFlow.getVersions()).flat().length===1));
  await legacyPage.locator(".advanced-editor summary").click();
  await legacyPage.getByRole("button",{name:"이전 버전 복원"}).click();
  check("previous legacy version restores",await legacyPage.evaluate(()=>!Object.values(TalkFlow.getTopics())[0].conversationFlow));
  await legacyPage.getByRole("button",{name:"일별 관리",exact:true}).click();
  await legacyPage.locator("[data-custom-date='2026-08-31']").click();
  await legacyPage.locator("#custom-keyword").fill("Weekend plans");
  await legacyPage.getByRole("button",{name:"토픽 생성하기"}).click();
  check("operator creates without overwriting another date",await legacyPage.evaluate(()=>Boolean(TalkFlow.getTopics()["2026-08-31"]?.conversationFlow)&&Object.keys(TalkFlow.getTopics()).length===9));
  const beforeRegeneration=await legacyPage.evaluate(()=>JSON.stringify(TalkFlow.getTopics()["2026-08-31"].conversationFlow.talkRounds));
  await legacyPage.getByRole("button",{name:"질문만 다시 만들기"}).click();
  check("failed partial generation preserves content",await legacyPage.evaluate(before=>JSON.stringify(TalkFlow.getTopics()["2026-08-31"].conversationFlow.talkRounds)===before,beforeRegeneration));
  const statusBeforePreview=await legacyPage.evaluate(()=>TalkFlow.getTopics()["2026-08-31"].quality.status);
  await legacyPage.getByRole("button",{name:"학생용 A4 미리보기"}).first().click();
  check("preview does not approve topic",await legacyPage.evaluate(before=>TalkFlow.getTopics()["2026-08-31"].quality.status===before,statusBeforePreview));
  await legacyPage.getByRole("button",{name:"관리",exact:true}).click();
  let autoGistCalls=0;
  await legacyPage.route("https://api.github.com/gists",async route=>{autoGistCalls++;await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:"approve-test-gist"})})});
  await legacyPage.evaluate(key=>localStorage.setItem(key,JSON.stringify({gistToken:"test-token"})),await legacyPage.evaluate(()=>TalkFlow.KEYS.settings));
  await legacyPage.reload({waitUntil:"networkidle"});
  await legacyPage.getByRole("button",{name:"관리",exact:true}).click();
  await legacyPage.getByRole("button",{name:"승인하고 저장"}).first().click();
  await legacyPage.waitForFunction(()=>TalkFlow.getTopics()["2026-08-31"].quality.status==="approved");
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
    await page.getByRole("button",{name:"관리",exact:true}).click();
    check(`${width}px operator review no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    check(`${width}px preview and approval controls separated`,await page.evaluate(()=>{
      const preview=document.querySelector(".preview-button")?.getBoundingClientRect(),approve=document.querySelector(".approve-button")?.getBoundingClientRect();
      if(!preview||!approve)return false;
      return Math.abs(approve.top-preview.top)>8||approve.left-preview.right>=8;
    }));
    check(`${width}px both review pages scroll-accessible`,await page.locator(".review-preview").evaluate(node=>{
      const pages=[...node.querySelectorAll(".a4-page")];
      return pages.length===2&&pages.every(page=>getComputedStyle(page).display!=="none")&&node.scrollHeight>node.clientHeight;
    }));
    await page.screenshot({path:join(evidence,`admin-${width}.png`),fullPage:true});
    await page.locator(".review-preview").evaluate(node=>{node.scrollTop=node.scrollHeight;});
    await page.screenshot({path:join(evidence,`admin-${width}-page2.png`),fullPage:true});
    await page.locator(".review-preview").evaluate(node=>{node.scrollTop=0;node.scrollLeft=0;});
  }
  await page.getByRole("button",{name:"리더",exact:true}).click();
  check("leader support and feedback visible",await page.locator(".leader-support,.feedback-card").count()===2);
  await page.locator("[data-feedback-form] input[type=checkbox]").first().check();
  await page.locator("[data-feedback-form] button[type=submit]").click();
  const feedback=await page.evaluate(()=>TalkFlow.getFeedback());
  check("anonymous local feedback stored",Object.values(feedback).flat().length===1&&!JSON.stringify(feedback).match(/name|email|phone/i),JSON.stringify(feedback));
  await page.getByRole("button",{name:"관리",exact:true}).click();
  check("conversation review actions visible",await page.locator(".review-actions").isVisible());
  check("scaled A4 review preview visible",await page.locator(".review-preview .a4-page").count()===2);
  check("legacy technical editor hidden",await page.locator(".conversation-editor-summary").evaluate(node=>getComputedStyle(node).display==="none"));
  await page.locator("[data-open$=':print']").first().click();
  check("student handout exactly two DOM pages",await page.locator(".a4-page").count()===2);
  const studentText=await page.locator(".a4-topic").innerText();
  check("student handout required session order",["SESSION 1","HOW TO USE","START NOW","TELL YOUR STORY","TALK TOGETHER","SAY THIS","SESSION 2","RESET","MAIN ACTIVITY","GROUP DECISION","FINAL ROUND"].every((label,index,all)=>studentText.indexOf(label)>=0&&(index===0||studentText.indexOf(label)>studentText.indexOf(all[index-1]))),studentText);
  check("each conversation prompt has five action cues",["START","SAY","ADD","ASK","REACT"].every(label=>studentText.includes(label)));
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
