import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
const systemChrome="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port=server.address().port,browser=await chromium.launch({headless:true,...(existsSync(systemChrome)?{executablePath:systemChrome}:{})});
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
    topic,
    mode:topic.topicMode,
    source:topic.sourceMaterial,
    common:topic.commonGround,
    one:topic.sessionOne,
    two:topic.sessionTwo,
    operator:topic.operatorStatus,
    mechanisms:topic.speakingMechanisms,
    materials:topic.conversationMaterials,
    axes:topic.promptAxes,
    turns:topic.turnProtocol,
    activity:topic.activityEvidence,
    speaking:TalkFlow.sessions.speakingEvaluate(topic)
  })));
  check("10 two-session fixtures",sessionFixtures.length===10);
  check("8 everyday and 2 context fixtures",sessionFixtures.filter(item=>item.mode==="everyday").length===8&&sessionFixtures.filter(item=>item.mode==="context").length===2);
  check("session one fixed at 50 minutes",sessionFixtures.every(item=>item.one?.minutes===50));
  check("session two fixed at 40 minutes",sessionFixtures.every(item=>item.two?.minutes===40&&item.two.reset&&item.two.mainActivity&&item.two.groupDecision&&item.two.finalRound));
  check("context fixtures have source-backed brief",sessionFixtures.filter(item=>item.mode==="context").every(item=>item.common?.enabled&&item.common.briefEn.length===3&&item.common.keywords.length===3&&item.source.publisher&&item.source.publishedAt));
  check("generated fixtures require review",sessionFixtures.every(item=>item.operator?.reviewStatus==="review"));
  check("10 fixtures are speaking ready",sessionFixtures.every(item=>item.speaking.status==="ready"),JSON.stringify(sessionFixtures.map(item=>item.speaking)));
  const mutantResults=await sessionPage.evaluate(()=>{
    const topics=Object.values(TalkFlow.getTopics()),clone=value=>structuredClone(value);
    const incomplete=clone(topics[0]);
    incomplete.conversationMaterials=[{contentEn:"This is only a short placeholder label",contentKo:"짧은 라벨",hasSingleCorrectAnswer:false}];
    const missingRoles=clone(topics.find(topic=>topic.speakingMechanisms.assignedOpposition));
    missingRoles.sessionTwo.mainActivity.roles=[];
    if(missingRoles.sessionTwo.secondaryActivity)missingRoles.sessionTwo.secondaryActivity.roles=[];
    const missingDecision=clone(topics[0]);
    missingDecision.sessionTwo.groupDecision={...missingDecision.sessionTwo.groupDecision,promptEn:"",promptKo:""};
    return [incomplete,missingRoles,missingDecision].map(topic=>TalkFlow.sessions.speakingEvaluate(topic).status);
  });
  check("speaking QA rejects label-like material",mutantResults[0]==="fail");
  check("speaking QA rejects declared opposition without rendered roles",mutantResults[1]==="fail");
  check("speaking QA rejects declared decision without prompt",mutantResults[2]==="fail");
  check("all fixtures have three speaking mechanisms",sessionFixtures.every(item=>Object.values(item.mechanisms).filter(Boolean).length>=3));
  check("all fixtures have complete conversation material",sessionFixtures.every(item=>item.materials.length&&item.materials.every(material=>material.contentEn.trim().split(/\s+/).length>=8&&!material.hasSingleCorrectAnswer)));
  check("all fixtures have three distinct axes with no axis over two",sessionFixtures.every(item=>new Set(item.axes).size>=3&&Math.max(...Object.values(item.axes.reduce((counts,axis)=>(counts[axis]=(counts[axis]||0)+1,counts),{})))<=2));
  check("all fixtures require turns and follow-up",sessionFixtures.every(item=>item.turns.secondsPerPerson>=45&&item.turns.followUpRequired&&item.turns.everyoneBeforeNextStep));
  check("all fixtures require disagreement output and open decision",sessionFixtures.every(item=>item.activity.expectedMinutes===20&&item.activity.requiresDisagreement&&item.activity.requiresParticipantOutput&&item.mechanisms.openEndedDecision));
  const onlineSession=sessionFixtures.find(item=>item.one?.format==="evidenceRounds");
  check("online review uses 12 18 20 minute evidence rounds",onlineSession?.one.rounds.map(round=>round.minutes).join(",")==="12,18,20"&&onlineSession.materials.length===3);
  check("online review replaces Spot the Fake with Write the Fake and Star Fight",onlineSession?.two.mainActivity.titleEn==="WRITE THE FAKE"&&onlineSession.two.secondaryActivity?.titleEn==="STAR FIGHT"&&!JSON.stringify(onlineSession).includes("Spot the Fake"));
  check("online reviews describe one jacket in complete 25–45 word texts",onlineSession?.materials.every(material=>material.product==="jacket"&&material.contentEn.trim().split(/\s+/).length>=25&&material.contentEn.trim().split(/\s+/).length<=45),JSON.stringify(onlineSession?.materials));
  check("hidden answers use numbered sentences without answer labels",onlineSession?.two.mainActivity.options?.every(option=>/^SENTENCE [12]/.test(option))&&onlineSession.two.mainActivity.privateAnswer?.choices?.join(",")==="1,2"&&!/TRUE sentence|FAKE sentence/i.test(JSON.stringify(onlineSession.two.mainActivity.options)));
  check("student and leader rules have complete Korean pairs",onlineSession?.two.mainActivity.stepsKo?.length===onlineSession.two.mainActivity.steps?.length&&onlineSession.two.secondaryActivity?.roles?.every(role=>role.nameKo&&role.briefKo)&&onlineSession.two.groupDecision?.everyoneSpeaksRuleKo);
  const onlineMutants=await sessionPage.evaluate(()=>{
    const online=structuredClone(Object.values(TalkFlow.getTopics()).find(topic=>topic.sessionOne?.format==="evidenceRounds"));
    const mismatch=structuredClone(online); mismatch.conversationMaterials[1].product="shoes";
    const exposed=structuredClone(online); exposed.sessionTwo.mainActivity.options[0]="TRUE sentence";
    const broken=structuredClone(online); broken.sessionOne.rounds[2].instructionEn="USE A DIFFERENT REACT";
    const missingKo=structuredClone(online); missingKo.sessionTwo.mainActivity.stepsKo.pop();
    return [mismatch,exposed,broken,missingKo].map(topic=>TalkFlow.sessions.speakingEvaluate(topic).status);
  });
  check("speaking QA rejects material mismatch answer exposure broken reference and missing Korean",onlineMutants.every(status=>status==="fail"),JSON.stringify(onlineMutants));
  await sessionContext.close();
  check("task-first home is the default workspace",await page.locator(".task-home").isVisible()&&await page.locator(".task-row").count()<=8);
  check("global navigation has exactly three destinations",await page.locator(".view-tabs .tab").allTextContents().then(items=>items.join("|")==="토픽 준비|일괄 인쇄|설정"));
  check("each task row exposes one primary action",await page.locator(".task-row").evaluateAll(rows=>rows.every(row=>row.querySelectorAll(".row-primary button").length===1)));
  await page.getByRole("button",{name:"달력",exact:true}).click();
  check("secondary calendar has seven columns and no internal work actions",await page.locator(".simple-month-grid").isVisible()&&await page.locator(".weekday-row span").count()===7&&await page.locator(".simple-month-grid [data-action]").count()===0);
  check("non-operating dates expose no generation action",await page.locator(".simple-calendar-cell.off[data-auto-date],.simple-calendar-cell.off[data-custom-date]").count()===0);
  const alignmentCritical=await page.evaluate(()=>{
    const flow=TalkFlow.getTopics()["2026-08-03"].conversationFlow;
    flow.quickStarts[0].options=["Reviewer history"];
    return TalkFlow.conversation.evaluate(flow).critical;
  });
  check("question-option mismatch is critical",alignmentCritical);
  const legacyContext=await browser.newContext();
  await legacyContext.addInitScript(()=>localStorage.setItem("tb_talkflow_settings_v1",JSON.stringify({apiKey:"qa-intercept-key",gistToken:"test-token"})));
  const legacyPage=await legacyContext.newPage();
  await legacyPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:"networkidle"});
  await legacyPage.getByRole("button",{name:"전체 월",exact:true}).click();
  await legacyPage.locator("[data-drawer-date='2026-08-03']").click();
  await legacyPage.getByRole("button",{name:"내용 검수",exact:true}).click();
  await legacyPage.getByRole("button",{name:"회화형 구조로 변환"}).click();
  check("legacy conversion is explicit",await legacyPage.evaluate(()=>Boolean(Object.values(TalkFlow.getTopics())[0].conversationFlow)));
  check("conversion preserves a version",await legacyPage.evaluate(()=>Object.values(TalkFlow.getVersions()).flat().length===1));
  await legacyPage.locator(".advanced-editor summary").click();
  await legacyPage.getByRole("button",{name:"이전 버전 복원"}).click();
  check("previous legacy version restores",await legacyPage.evaluate(()=>!Object.values(TalkFlow.getTopics())[0].conversationFlow));
  await legacyContext.close();
  const viewports=[[360,800],[390,844],[430,900],[768,900],[1024,900],[1440,1000]];
  for(const [width,height] of viewports){
    await page.setViewportSize({width,height});
    await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&section=topics&view=month&month=2026-08&date=2026-08-03&tab=review`,{waitUntil:"networkidle"});
    await page.getByRole("button",{name:"내용 검수",exact:true}).click();
    check(`${width}px operator no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    await page.screenshot({path:join(evidence,`operator-${width}.png`),fullPage:true});
    await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&section=topics&view=month&month=2026-08&date=2026-08-03&tab=student&page=1`,{waitUntil:"networkidle"});
    check(`${width}px student no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    check(`${width}px conversation sequence visible`,await page.locator(".conversation-path b").count()===6);
    await page.screenshot({path:join(evidence,`student-${width}.png`),fullPage:true});
    await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&section=topics&view=month&month=2026-08&date=2026-08-03&tab=review`,{waitUntil:"networkidle"});
    await page.getByRole("button",{name:"내용 검수",exact:true}).click();
    check(`${width}px operator review no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    check(`${width}px preview and approval controls separated`,await page.evaluate(()=>{
      const preview=document.querySelector(".preview-button")?.getBoundingClientRect(),approve=document.querySelector(".approve-button")?.getBoundingClientRect();
      if(!preview||!approve)return false;
      return Math.abs(approve.top-preview.top)>8||approve.left-preview.right>=8;
    }));
    check(`${width}px both review page thumbnails visible`,await page.locator(".review-preview-grid .a4-page").evaluateAll(pages=>pages.length===2&&pages.every(item=>getComputedStyle(item).display!=="none")));
    check(`${width}px one primary approval action`,await page.locator("[data-action='approve-save']").count()===1);
    check(`${width}px regeneration and overflow menus visible`,await page.locator(".regeneration-menu,.admin-overflow").count()===2);
    await page.screenshot({path:join(evidence,`admin-${width}.png`),fullPage:true});
    await page.locator("[data-preview-modal]").click();
    check(`${width}px large preview dialog contains both pages`,await page.locator(".a4-preview-dialog[open] .a4-page").count()===2);
    await page.screenshot({path:join(evidence,`admin-${width}-page2.png`),fullPage:true});
    await page.locator("[data-preview-close]").click();
  }
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&section=topics&view=month&month=2026-08&date=2026-08-03&tab=leader&page=1`,{waitUntil:"networkidle"});
  check("leader support and feedback visible",await page.locator(".leader-support,.feedback-card").count()===2);
  await page.locator("[data-feedback-form] input[type=checkbox]").first().check();
  await page.locator("[data-feedback-form] button[type=submit]").click();
  const feedback=await page.evaluate(()=>TalkFlow.getFeedback());
  check("anonymous local feedback stored",Object.values(feedback).flat().length===1&&!JSON.stringify(feedback).match(/name|email|phone/i),JSON.stringify(feedback));
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&section=topics&view=month&month=2026-08&date=2026-08-03&tab=review`,{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"내용 검수",exact:true}).click();
  check("conversation review actions visible",await page.locator(".review-actions").isVisible());
  check("structure speaking and print readiness are separately visible",await page.locator(".readiness-split").innerText().then(text=>text.includes("STRUCTURE READY")&&text.includes("SPEAKING READY")&&text.includes("PRINT REVIEW")));
  check("five plain-language speaking checks are visible",await page.locator(".speaking-checks li").count()===5&&await page.locator(".speaking-checks").innerText().then(text=>["실제 말할 재료","서로 다른 내용","참가자의 순번","반대 의견","정답 없는 그룹 결론"].every(label=>text.includes(label))));
  check("scaled A4 two-page review preview visible",await page.locator(".review-preview-grid .a4-page").count()===2);
  check("legacy technical editor hidden",await page.locator(".conversation-editor-summary").evaluate(node=>getComputedStyle(node).display==="none"));
  await page.locator("[data-open$=':print']").first().click();
  check("student handout exactly two DOM pages",await page.locator(".a4-page").count()===2);
  check("student renderer uses v4 contract",await page.locator(".v4-handout[data-talkflow-standard='v2'][data-template-version='student-v4']").count()===1);
  const studentText=await page.locator(".a4-topic").innerText();
  check("online review Q1 Q2 Q3 corrections are rendered",studentText.includes("What do you check first: □ Reviews · □ Photos · □ Price")&&studentText.includes("what made you decide to buy it?")&&studentText.includes("Three reviews aren’t enough.")&&!/press buy|Three reviews is too few/i.test(studentText));
  check("student handout required evidence round order",["SESSION 1","REAL ITEM ROUND","EVIDENCE ROUND","STORY ROUND","SAY THIS","SESSION 2","RESET VOTE","WRITE THE FAKE","STAR FIGHT","FINAL DECISION"].every((label,index,all)=>studentText.indexOf(label)>=0&&(index===0||studentText.indexOf(label)>studentText.indexOf(all[index-1]))),studentText);
  check("student handout includes timed turns ask react and full materials",studentText.includes("45 SEC EACH")&&studentText.includes("NEXT PERSON MUST ASK")&&studentText.includes("I still disagree because")&&["REVIEW A","REVIEW B","REVIEW C"].every(label=>studentText.includes(label)));
  const sentenceOptionsText=await page.locator(".sentence-options").innerText();
  check("student handout contains bilingual numbered evidence and hidden-answer rules",await page.locator(".evidence-round .bilingual-steps li").count()===6&&studentText.includes("For each review, choose BUY or DON'T BUY.")&&studentText.includes("각 리뷰마다 살지 말지 고르세요.")&&sentenceOptionsText.includes("SENTENCE 1")&&sentenceOptionsText.includes("SENTENCE 2")&&!/TRUE sentence|FAKE sentence/i.test(sentenceOptionsText));
  check("legacy print labels absent",!/TODAY'S GOAL|TOPIC HOOK|EXAMPLE FOLLOW-UP|DEEPER FOLLOW-UP/.test(studentText));
  const overflows=await page.locator(".a4-page").evaluateAll(nodes=>nodes.map(node=>({x:node.scrollWidth-node.clientWidth,y:node.scrollHeight-node.clientHeight})));
  check("student A4 DOM has no overflow",overflows.every(item=>item.x<=1&&item.y<=1),JSON.stringify(overflows));
  await page.screenshot({path:join(evidence,"student-print-screen.png"),fullPage:true});
  await page.goto(`http://127.0.0.1:${port}/?fixtures=conversation&section=print&date=2026-08-03&role=leader`,{waitUntil:"networkidle"});
  check("leader handout exactly two DOM pages",await page.locator(".a4-page").count()===2);
  check("leader renderer uses v4 contract",await page.locator(".v4-handout[data-talkflow-standard='v2'][data-template-version='leader-v4']").count()===1);
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
