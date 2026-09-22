(function(root){
  "use strict";
  const VERSION="v4-topic";
  const STANDARD_VERSION="4";
  const TEMPLATE_VERSION="topic-v4";
  const STARS=["BTS","BLACKPINK","Stray Kids","ATEEZ","EXO","SEVENTEEN","aespa","IU","Son Heung-min","Kim Yuna","Rosé"];
  const THEMES=["rest","relationships","work-life","habits","choices","community"];
  const text={type:"string"};
  const keyword={type:"object",required:["en","ko"],properties:{en:text,ko:text},additionalProperties:false};
  const bilingual={type:"object",required:["en","ko"],properties:{en:text,ko:text},additionalProperties:false};
  const PLAN_TOOL=Object.freeze({name:"submit_topic_v4_plan",description:"Choose one universal fictional topic featuring an approved Korean star name.",input_schema:{type:"object",required:["titleEn","titleKo","star","theme","categoryEn","categoryKo"],properties:{titleEn:text,titleKo:text,star:{type:"string",enum:STARS},theme:{type:"string",enum:THEMES},categoryEn:text,categoryKo:text},additionalProperties:false}});
  const CONTENT_TOOL=Object.freeze({name:"submit_topic_v4_content",description:"Return the two-page TheBox Topic content matching the approved mockup. Do not return HTML.",input_schema:{type:"object",required:["storyEn","storyKo","keyWords","quickVoteQuestion","quickVoteOptions","easyTalk","realTalk","todayEnglish","randomQuestions","randomWords"],properties:{storyEn:text,storyKo:text,keyWords:{type:"array",items:keyword},quickVoteQuestion:text,quickVoteOptions:{type:"array",items:text},easyTalk:{type:"array",items:text},realTalk:{type:"array",items:text},todayEnglish:{type:"array",items:bilingual},randomQuestions:{type:"array",items:bilingual},randomWords:{type:"array",items:keyword}},additionalProperties:false}});
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clean=value=>String(value??"").trim();
  const issue=(location,message)=>({severity:"blocker",id:"V4",group:"content",location,message});
  function buildPromptPayload({stage,topic,approvedPlan=null}){
    return{contract:"TheBox Topic v4 mockup contract. Create only the fields in the selected tool. Never create sessions, leaders, activities, juries, verdicts, balance games, or facilitation documents.",stage,topic,approvedPlan,visualContract:{page1:["TODAY'S STORY","KEY WORDS","QUICK VOTE","EASY TALK","REAL TALK","TODAY'S ENGLISH","STORY 해석"],page2:["ROUND TWO","RANDOM QUESTIONS","RANDOM WORDS"]},contentRules:["Use exactly one approved Korean K-pop or K-sports star name in an explicitly fictional everyday situation.","The English Story must begin with 'Imagine {star}'. Never imply a real event, quote, interview, report, schedule, relationship, purchase, opinion, or behavior.","Write one vivid 75-110 word English Story with a decision, tension, or gentle humor. The Korean Story must preserve every concrete fact.","The story must remain understandable to someone who does not know the star. Avoid fandom, album, concert, chart, trainee, agency, award, or celebrity-industry knowledge.","Use a universal topic that adults in their 20s through 60s can discuss from experience.","Return exactly 4 Key Words, 3 Quick Vote options, 3 Easy Talk questions, 3 Real Talk questions, 4 bilingual Today's English expressions, 5 bilingual Random Questions, and 10 Random Words.","Easy Talk question 1 must invite a personal story. Real Talk question 3 must work as a culture-swap prompt about the speaker's country or workplace.","Korean appears only in word meanings, Today's English meanings, Random Question support, and the Story translation."]};
  }
  function validatePlan(plan,request={}){
    const issues=[];
    if(!clean(plan?.titleEn)||!clean(plan?.titleKo))issues.push(issue("plan.title","영문·한글 제목이 필요합니다."));
    if(!STARS.includes(plan?.star))issues.push(issue("plan.star","승인된 한국 K-POP 또는 K-SPORTS STAR만 사용할 수 있습니다."));
    if(!THEMES.includes(plan?.theme))issues.push(issue("plan.theme","보편적인 생활 주제를 선택해야 합니다."));
    if(!clean(plan?.categoryEn)||!clean(plan?.categoryKo))issues.push(issue("plan.category","영문·한글 카테고리가 필요합니다."));
    if(request.generationMode==="guided"&&clean(request.topicHint)&&![clean(plan?.titleEn),clean(plan?.titleKo)].some(value=>value.toLowerCase().includes(clean(request.topicHint).toLowerCase())||clean(request.topicHint).toLowerCase().includes(value.toLowerCase())))issues.push(issue("plan.title","직접 지정한 주제를 제목에 반영해야 합니다."));
    return{ok:!issues.length,ready:!issues.length,issues,blockers:issues,warnings:[]};
  }
  function adaptStructuredContentTransport(value,plan,request){
    return{topicVersion:TEMPLATE_VERSION,date:request.date,weekday:request.weekday||"",category:{en:clean(plan.categoryEn),ko:clean(plan.categoryKo)},title:{en:clean(plan.titleEn),ko:clean(plan.titleKo)},page1:{story:{star:plan.star,fictional:true,en:clean(value.storyEn),ko:clean(value.storyKo)},keyWords:clone(value.keyWords||[]),quickVote:{question:clean(value.quickVoteQuestion),options:(value.quickVoteOptions||[]).map(clean)},easyTalk:(value.easyTalk||[]).map(clean),realTalk:(value.realTalk||[]).map(clean),todayEnglish:clone(value.todayEnglish||[])},page2:{randomQuestions:clone(value.randomQuestions||[]),randomWords:clone(value.randomWords||[])}};
  }
  function normalizeContent(value){return clone(value)}
  function validateContent(topic,plan){
    const issues=[],story=topic?.page1?.story,allText=clean(story?.en),bannedActual=/\b(?:according to|reported|revealed|interview|true story|real story|actually happened)\b/i,bannedFandom=/\b(?:comeback|fandom|bias|album|concert|trainee|agency|chart|award)\b/i;
    if(topic?.topicVersion!==TEMPLATE_VERSION)issues.push(issue("topicVersion","v4 토픽 형식이 아닙니다."));
    if(story?.star!==plan?.star||!STARS.includes(story?.star))issues.push(issue("page1.story.star","Plan의 승인된 STAR와 일치해야 합니다."));
    if(story?.fictional!==true)issues.push(issue("page1.story.fictional","명확한 가상 상황이어야 합니다."));
    if(!allText||!clean(story?.ko))issues.push(issue("page1.story","영문 Story와 한국어 해석이 필요합니다."));
    if(!allText.toLowerCase().startsWith(`imagine ${clean(plan?.star).toLowerCase()}`))issues.push(issue("page1.story.en","첫 문장은 Imagine + 승인된 STAR로 시작해야 합니다."));
    const storyWords=allText.split(/\s+/).filter(Boolean).length;if(storyWords<75||storyWords>110)issues.push(issue("page1.story.en","Story 영어는 75~110단어여야 합니다."));
    if(bannedActual.test(allText))issues.push(issue("page1.story","실제 사건처럼 보이는 표현을 사용할 수 없습니다."));
    if(bannedFandom.test(allText))issues.push(issue("page1.story","유명인을 몰라도 이해할 수 있는 일상 상황이어야 합니다."));
    const exact=(value,count,path)=>{if(!Array.isArray(value)||value.length!==count||value.some(item=>typeof item==="string"?!clean(item):!item||Object.values(item).some(entry=>!clean(entry))))issues.push(issue(path,`정확히 ${count}개의 완성된 항목이 필요합니다.`))};
    exact(topic?.page1?.keyWords,4,"page1.keyWords");exact(topic?.page1?.quickVote?.options,3,"page1.quickVote.options");exact(topic?.page1?.easyTalk,3,"page1.easyTalk");exact(topic?.page1?.realTalk,3,"page1.realTalk");exact(topic?.page1?.todayEnglish,4,"page1.todayEnglish");exact(topic?.page2?.randomQuestions,5,"page2.randomQuestions");exact(topic?.page2?.randomWords,10,"page2.randomWords");
    if(!clean(topic?.page1?.quickVote?.question))issues.push(issue("page1.quickVote.question","Quick Vote 질문이 필요합니다."));
    if(["session1","session2","leader","facilitation","activity"].some(key=>Object.prototype.hasOwnProperty.call(topic||{},key)))issues.push(issue("topic","이전 토픽 구조를 포함할 수 없습니다."));
    return{ok:!issues.length,ready:!issues.length,issues,blockers:issues,warnings:[],quality:{total:issues.length?0:100,status:issues.length?"fail":"pass"}};
  }
  function parseStructuredContentResponse(payload){
    if(payload?.stop_reason!=="end_turn"){const error=new Error("Content response did not finish normally.");error.type="incomplete_response";throw error}
    const blocks=(payload.content||[]).filter(item=>item.type==="tool_use"&&item.name===CONTENT_TOOL.name);
    if(blocks.length!==1||!blocks[0].input){const error=new Error("Content tool result is missing or duplicated.");error.type="structured_content_error";throw error}
    return clone(blocks[0].input);
  }
  function buildTopic(request,plan,content){
    const candidate=content?.topicVersion===TEMPLATE_VERSION?normalizeContent(content):adaptStructuredContentTransport(content,plan,{...request,weekday:request.weekday});
    const planResult=validatePlan(plan,request),contentResult=validateContent(candidate,plan);
    if(!planResult.ok||!contentResult.ok){const error=new Error("TheBox Topic v4 validation failed.");error.issues=[...planResult.issues,...contentResult.issues];throw error}
    const now=new Date().toISOString();return{...candidate,id:`topic-${request.date}-${crypto.randomUUID()}`,generatedConversation:true,generationEngine:VERSION,standardVersion:STANDARD_VERSION,templateVersion:TEMPLATE_VERSION,topicPlan:clone(plan),generationRequest:clone(request),quality:{status:"review",score:100,issues:[]},operatorStatus:{generationStatus:"complete",reviewStatus:"review",printStatus:"unchecked",used:false},hidden:false,createdAt:now,updatedAt:now};
  }
  function evaluate(topic){if(topic?.generationEngine!==VERSION){const blockers=[issue("generationEngine","TheBox Topic v4 형식이 아닙니다.")];return{ok:false,ready:false,issues:blockers,blockers,warnings:[]}}return validateContent(topic,topic.topicPlan)}
  const api=Object.freeze({VERSION,STANDARD_VERSION,TEMPLATE_VERSION,STARS,THEMES,PLAN_TOOL,CONTENT_TOOL,buildPromptPayload,parseStructuredContentResponse,adaptStructuredContentTransport,normalizeContent,validatePlan,validateContent,buildTopic,evaluate});
  root.TalkFlowTopicV4=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window==="undefined"?globalThis:window);
