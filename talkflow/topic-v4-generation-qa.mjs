import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import TopicV4 from "./topic-v4-generation.js";

const fixture=JSON.parse(await readFile(new URL("./fixtures/member-topic.json",import.meta.url),"utf8"));
const topic={...fixture,topicVersion:"topic-v4.3",generationEngine:TopicV4.VERSION,page2:{...fixture.page2,title:"Should Cities Limit Outdoor Screens?",category:"CULTURE",categoryColor:TopicV4.CATEGORIES.CULTURE,source:{publisher:"Example News",category:"CULTURE",title:"Cities rethink digital billboards",titleKey:"cities rethink digital billboards",subjectKey:"cities digital billboards public space",url:"https://example.com/city-screens",excerpt:"Cities are reconsidering how bright outdoor screens shape shared public spaces.",popularityScore:72,publishedAt:"2026-10-01T00:00:00.000Z"},article:"Bright digital screens now shape many city streets after dark. Supporters say they help businesses and make public areas feel lively. Critics worry that constant advertising changes how people use shared space. Some cities have started limiting screen brightness or location. The deeper question is whether public attention should be treated as a resource for sale. The choice can shape how people feel in the street.",keyWords:[{en:"public space",ko:"공공 공간"},{en:"brightness",ko:"밝기"},{en:"shared attention",ko:"공유된 주의"},{en:"limit",ko:"제한하다"},{en:"resource",ko:"자원"}],stance:{question:"Should cities limit outdoor digital screens?",options:["Yes, more limits","No, keep them open","It depends on the area"]},discussion:["How do screens change a street?","Who benefits from bright displays?","Should quiet spaces be protected?","What rule would be fair?","What belongs in shared public space?"],quiz:{question:"What is the article mainly asking?",options:["Who owns public attention?","How to sell more screens?","Which city is brightest?"],answer:0}}};
const plan={titleEn:topic.page1.title.en,titleKo:topic.page1.title.ko,star:topic.page1.story.star,category:topic.page1.category,page1Template:"A",page1Premise:"late-night workplace messages and personal boundaries",articleTitle:topic.page2.title,articleCategory:topic.page2.category,page2Premise:"digital advertising in public city spaces"};
assert.equal(TopicV4.TEMPLATE_VERSION,"topic-v4.3");
assert.ok(Array.isArray(TopicV4.PARTICIPANT_ORDER_RULES),"participant-order rules must be available to the generator");
assert.ok(TopicV4.PARTICIPANT_ORDER_RULES.length>=20,"the generator needs a varied set of participant-order rules");
assert.equal(TopicV4.selectStarForDate("2026-10-01",[]),"Namjoon","the first day uses the requested display name, not RM");
assert.equal(TopicV4.selectStarForDate("2026-10-02",[]),"Yoongi","different calendar days rotate through distinct stars even before generated topics are saved");
assert.equal(TopicV4.selectStarForDate("2026-10-01",["Namjoon"]),"Yoongi","a star already used this month is skipped");
const legacyRmTopic={...topic,date:"2026-10-02",topicPlan:{...plan,star:"RM"},page1:{...topic.page1,story:{...topic.page1.story,star:"RM",en:"Imagine RM has a free afternoon and must choose one small plan.",ko:"RM이 여유로운 오후에 작은 계획 하나를 골라야 한다고 상상해 보세요."}}};
const migratedRmTopic=TopicV4.migrateLegacyRmTopic(legacyRmTopic);
assert.equal(migratedRmTopic.page1.story.star,"Yoongi","published RM-only legacy stories rotate to the date's selected star");
assert.equal(migratedRmTopic.topicPlan.star,"Yoongi","the saved plan stays aligned with the migrated story");
assert.doesNotMatch(`${migratedRmTopic.page1.story.en} ${migratedRmTopic.page1.story.ko}`,/\bRM\b/,"the visible fictional story uses the migrated display name");
assert.doesNotMatch(`${migratedRmTopic.page1.story.en} ${migratedRmTopic.page1.story.ko}`,/Imagine|상상해 보세요/i,"legacy stories do not retain an imagine-the-scenario opening");
assert.equal(legacyRmTopic.page1.story.star,"RM","legacy migration does not mutate the source record");
const mixedIdentityTopic={...topic,page1:{...topic.page1,story:{...topic.page1.story,en:`${topic.page1.story.star} keeps an empty desk beside him every day. Ji-yeon asks why the desk stays open, but he only smiles and says it helps him think. After work, he writes a short note and leaves the chair empty. The routine feels quiet, yet it makes the whole office wonder what he is waiting for.`},quickVote:{...topic.page1.quickVote,question:"What do you think RM's empty desk is really about?"}}};
const mixedIdentityValidation=TopicV4.validateContent(mixedIdentityTopic,plan);
assert.equal(mixedIdentityValidation.ready,false,"a Page 1 that carries over another draft's name must be blocked");
assert.ok(mixedIdentityValidation.issues.some(item=>item.location==="page1.starConsistency"),"the name conflict must point to Page 1 identity consistency");
const migratedMixedIdentity=TopicV4.migrateLegacyRmTopic(mixedIdentityTopic);
assert.doesNotMatch(`${migratedMixedIdentity.page1.story.en} ${migratedMixedIdentity.page1.quickVote.question}`,/\bRM\b|Ji-yeon/,"saved mixed-name topics are normalized on load so members do not see the old name mix");
for(const field of ["keyWords","easyTalk","realTalk","todayEnglish"])assert.ok(Array.isArray(migratedMixedIdentity.page1[field]),`legacy name migration must keep page1.${field} as an array so print and member views can render it`);
assert.ok(Array.isArray(migratedMixedIdentity.page1.quickVote.options),"legacy name migration must keep Quick Vote options as an array");
for(const star of ["Yuna Kim","Yoo Jimin","Heung-min Son"]){
  const named=JSON.parse(JSON.stringify({...topic,page1:{...topic.page1,story:{...topic.page1.story,star,en:`${star} is choosing a quiet plan for the evening.`}},topicPlan:{...plan,star}}));
  const migrated=TopicV4.migrateLegacyRmTopic(named);
  assert.equal(migrated.page1.story.star,star,`${star} must survive migration even though a shorter star name is part of it`);
  assert.ok(migrated.page1.story.en.startsWith(`${star} is choosing`),`${star} must not gain a repeated surname in the story`);
  const corrupted=JSON.parse(JSON.stringify(named).replaceAll(star,`${star} ${star.split(" ").pop()}`));
  assert.equal(TopicV4.migrateLegacyRmTopic(corrupted).page1.story.star,star,`a previously duplicated surname on ${star} must be repaired`);
}
assert.equal(TopicV4.validatePlan(plan,{date:topic.date,page1Template:"A"}).ready,true);
const stablePlan=TopicV4.buildStablePlan({date:topic.date,page1Template:"A",selectedStar:"Namjoon",articleSource:topic.page2.source});
assert.equal(TopicV4.validatePlan(stablePlan,{date:topic.date,page1Template:"A",selectedStar:"Namjoon",articleSource:topic.page2.source}).ready,true,"automatic topics must receive a locally validated plan before one Content Fill call");
const businessSource={...topic.page2.source,category:"Business"};
assert.equal(TopicV4.sourceReference(businessSource).category,"CONSUMER & ECONOMY","RSS Business sources must map to the fixed Article category palette");
const businessPlan=TopicV4.buildStablePlan({date:topic.date,page1Template:"A",selectedStar:"Namjoon",articleSource:businessSource});
assert.equal(TopicV4.validatePlan(businessPlan,{date:topic.date,page1Template:"A",selectedStar:"Namjoon",articleSource:businessSource}).ready,true,"an RSS Business label must not block automatic local Plan generation");
assert.equal(stablePlan.articleTitle,topic.page2.source.title,"the local plan must retain the selected RSS article title");
assert.equal(stablePlan.articleCategory,topic.page2.source.category,"the local plan must retain the selected RSS article category");
const selectedCategoryPlan=TopicV4.buildStablePlan({date:"2026-11-10",page1Template:"A",page1Category:"LIFE",selectedStar:"Namjoon",articleSource:topic.page2.source});
assert.equal(selectedCategoryPlan.category,"LIFE","an operator-selected Page 1 category must determine the local plan category");
assert.equal(TopicV4.validatePlan(selectedCategoryPlan,{date:"2026-11-10",page1Template:"A",page1Category:"LIFE",articleSource:topic.page2.source}).ready,true,"the selected Page 1 category must pass validation when it differs from the Article");
assert.equal(TopicV4.validatePlan({...selectedCategoryPlan,category:"CULTURE"},{date:"2026-11-10",page1Template:"A",page1Category:"LIFE",articleSource:topic.page2.source}).ready,false,"the Plan must not silently replace an operator-selected Page 1 category");
assert.equal(TopicV4.validatePlan(selectedCategoryPlan,{date:"2026-11-10",page1Template:"A",page1Category:"LIFE",articleCategory:"CULTURE",articleSource:topic.page2.source}).ready,true,"an operator-selected Article category must match the selected RSS source");
assert.equal(TopicV4.validatePlan(selectedCategoryPlan,{date:"2026-11-10",page1Template:"A",page1Category:"LIFE",articleCategory:"SOCIAL TRENDS",articleSource:topic.page2.source}).ready,false,"the Plan must not silently replace an operator-selected Article category");
const repeatedPageOnePlan=TopicV4.buildStablePlan({date:"2026-11-12",page1Template:"A",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:[{date:"2026-11-05",titleEn:"The Shared Plan",premise:"Finding a fair way for friends to choose a simple weekend activity."}]});
assert.notEqual(repeatedPageOnePlan.titleEn,"The Shared Plan","automatic regeneration must skip an already-used Page 1 title and premise");
const icebreakerPlans=["2026-11-08","2026-11-12","2026-11-16","2026-11-20"].map(date=>TopicV4.buildStablePlan({date,page1Template:"B",selectedStar:"Namjoon",articleSource:topic.page2.source}));
assert.ok(new Set(icebreakerPlans.map(plan=>plan.titleEn)).size>1,"automatic Template B must rotate Page 1 titles instead of repeating Little Choices, Big Talk");
const repeatedIcebreakerPlan=TopicV4.buildStablePlan({date:"2026-11-12",page1Template:"B",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:[{date:"2026-11-05",titleEn:"Little Choices, Big Talk",premise:"Light questions about everyday preferences and simple choices."}]});
assert.notEqual(repeatedIcebreakerPlan.titleEn,"Little Choices, Big Talk","automatic Template B must skip a recently used Page 1 title and premise");
const genericIcebreakerHistory=Array.from({length:8},(_,index)=>({titleEn:`Earlier Icebreaker ${index + 1}`,premise:"Light questions about ordinary choices and daily preferences."}));
const genericHistoryIcebreakerPlan=TopicV4.buildStablePlan({date:"2026-11-17",page1Template:"B",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:genericIcebreakerHistory});
assert.ok(genericHistoryIcebreakerPlan,"generic wording in previous B premises must not block every automatic local Plan candidate");
const allStoryTitles=["A Calm Morning","A Small Favor","Dinner, Later","One More Chapter","The Quiet Queue","Worth Keeping?","The Helpful Note","A Screen-Free Hour","A Weekend Walk","The Shared Plan","The Last Slice","A New Hobby"].map(titleEn=>({titleEn,premise:""}));
const refreshedStoryPlan=TopicV4.buildStablePlan({date:"2026-11-21",page1Template:"A",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:allStoryTitles});
assert.ok(refreshedStoryPlan,"automatic generation must keep a distinct Page 1 title after its base title pool is used");
assert.ok(!allStoryTitles.some(item=>item.titleEn===refreshedStoryPlan.titleEn),"a Page 1 title must not be reused even after the usual story titles are exhausted");
const allIcebreakerTitles=["The Perfect Break","A Favourite Spot","Weekend, Your Way","The Small Win","A Simple Plan","One Thing to Try","Home or Out?","Everyday Favourites"].map(titleEn=>({titleEn,premise:""}));
const refreshedIcebreakerPlan=TopicV4.buildStablePlan({date:"2026-11-21",page1Template:"B",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:allIcebreakerTitles});
assert.ok(refreshedIcebreakerPlan,"automatic generation must keep a distinct Template B title after its base title pool is used");
assert.ok(!allIcebreakerTitles.some(item=>item.titleEn===refreshedIcebreakerPlan.titleEn),"a Template B title must not be reused after the usual title pool is exhausted");
assert.equal(TopicV4.validateContent(topic,plan).ready,true);
const fiveSentenceArticle={...topic,page2:{...topic.page2,article:topic.page2.article.split(/(?<=[.!?])\s+/).slice(0,5).join(" ").replace("for sale.","for sale in everyday life today.")}};
assert.equal(TopicV4.validateContent(fiveSentenceArticle,plan).ready,true,"A full-length five-sentence Article must not fail generation");
const sevenSentenceArticle={...topic,page2:{...topic.page2,article:`${topic.page2.article} It can also affect ordinary conversations after work.`}};
assert.equal(TopicV4.validateContent(sevenSentenceArticle,plan).ready,true,"A full-length Article must not fail solely because sentence punctuation produces seven sentences");
// Given a generated Article with a campus civil lawsuit source, when the content is reviewed,
// then it is blocked even if the model removed explicit crime terms from its summary.
const unsafeArticleTopic={...topic,page2:{...topic.page2,title:"When Institutions Are Forced to Listen",source:{...topic.page2.source,title:"Cornell University faces a civil lawsuit over a campus case",excerpt:"The institution is responding to a legal complaint.",subjectKey:"cornell university civil lawsuit campus case legal complaint"},article:"A university is responding after a civil lawsuit brings a closed campus case back into public view. The question is whether formal systems should change when legal pressure appears. Some observers support civil accountability while others worry about outside pressure. The discussion asks how institutions respond to difficult complaints. It ends by considering whether formal action creates meaningful change.",keyWords:[{en:"civil lawsuit",ko:"민사 소송"},{en:"accountability",ko:"책임"},{en:"institution",ko:"기관"},{en:"legal complaint",ko:"법적 민원"},{en:"formal action",ko:"공식 조치"}]}};
assert.equal(TopicV4.validateContent(unsafeArticleTopic,plan).ready,false,"crime-adjacent campus legal coverage must never be approved as a discussion Article");
const imagineStoryTopic={...topic,page1:{...topic.page1,story:{...topic.page1.story,en:`Imagine ${topic.page1.story.star} ${topic.page1.story.en}`}}};
assert.equal(TopicV4.validateContent(imagineStoryTopic,plan).ready,false,"stories may not begin by asking readers to imagine a scenario");
assert.equal(TopicV4.CATEGORIES[topic.page1.category],topic.page1.categoryColor);
const sameCategoryPlan={...plan,articleCategory:plan.category};
assert.equal(TopicV4.validatePlan(sameCategoryPlan,{date:topic.date,page1Template:"A"}).ready,false,"Page 1 and Article categories must differ");
assert.equal(TopicV4.validatePlan({...plan,articleCategory:"TECH & DIGITAL"},{date:topic.date,page1Template:"A",articleSource:{category:"TECH & DIGITAL"}}).ready,true,"the selected RSS category must be retained");
assert.equal(TopicV4.validatePlan({...plan,articleCategory:"CULTURE"},{date:topic.date,page1Template:"A",articleSource:{category:"TECH & DIGITAL"}}).ready,false,"the Plan may not relabel the selected RSS category");
const sourceOverlapPlan={...plan,page1Premise:"Choosing whether digital billboards belong in shared city public spaces."};
assert.equal(TopicV4.validatePlan(sourceOverlapPlan,{date:topic.date,page1Template:"A",articleSource:topic.page2.source}).ready,false,"the Plan must reject Page 1 premises that reuse the selected Article subject before Content Fill");
const selectedStarPlan={...plan,star:"Namjoon"};
assert.equal(TopicV4.validatePlan(selectedStarPlan,{date:topic.date,page1Template:"A",recentStars:["Jieun"],selectedStar:"Namjoon"}).ready,true,"the deterministic monthly star may be used");
assert.equal(TopicV4.validatePlan({...selectedStarPlan,star:"Jieun"},{date:topic.date,page1Template:"A",recentStars:["Jieun"],selectedStar:"Namjoon"}).ready,false,"a repeated or substituted star must not pass");
const broadWordPlan={...plan,page1Premise:"A daily decision about protecting a quiet personal evening.",page2Premise:"A daily decision about redesigning city bus routes for commuters."};
assert.equal(TopicV4.validatePlan(broadWordPlan,{date:topic.date,page1Template:"A"}).ready,true,"two broad words alone must not be mistaken for the same subject");
const proseCollision={...topic,page1:{...topic.page1,title:{...topic.page1.title,en:"A Quiet Evening"},story:{...topic.page1.story,en:`${topic.page1.story.star} is making a daily community decision about a quiet evening at home. He considers calls, messages, and a small personal routine before sleep. The choice feels important because people often need calm time after a busy day. He listens to a friend, decides kindly, and keeps the evening simple without discussing transport or public services.`},keyWords:[{en:"quiet evening",ko:"조용한 저녁"},{en:"personal routine",ko:"개인 루틴"},{en:"calm time",ko:"휴식 시간"},{en:"kind choice",ko:"배려 있는 선택"}]},page2:{...topic.page2,title:"City Bus Routes",source:{...topic.page2.source,title:"Community bus routes change",titleKey:"community bus routes change",subjectKey:"city bus routes commuter transport"},article:"A daily community decision can change city bus routes for commuters. Riders need reliable transport for work, school, and appointments. Officials must balance cost, frequency, and neighborhood access. Some residents want more service while others prefer lower spending. The central question is how a city should plan public transport fairly.",keyWords:[{en:"bus route",ko:"버스 노선"},{en:"commuter",ko:"통근자"},{en:"transport",ko:"교통"},{en:"neighborhood access",ko:"지역 접근성"},{en:"service frequency",ko:"운행 빈도"}]}};
const proseCollisionPlan={...plan,titleEn:"A Quiet Evening",page1Premise:"A daily community decision about protecting a quiet personal evening.",articleTitle:"City Bus Routes",page2Premise:"A daily community decision about redesigning city bus routes for commuters."};
proseCollision.page2.article+=" A clear schedule helps people plan each part of their day.";
assert.equal(TopicV4.validateContent(proseCollision,proseCollisionPlan).ready,true,"generic prose overlap must not reject unrelated approved subjects");
// A personal routine can mention the same broad technology words as an Article without
// becoming the Article's concrete subject. Two shared signals are not enough evidence.
const twoSignalTopic={...topic,page1:{...topic.page1,title:{...topic.page1.title,en:"A Digital Evening"},keyWords:[{en:"digital",ko:"디지털"},{en:"screens",ko:"화면들"},{en:"evening",ko:"저녁"},{en:"rest",ko:"휴식"}]}};
assert.equal(TopicV4.validateContent(twoSignalTopic,plan).ready,true,"two broad source signals alone must not reject a distinct Page 1 routine");
const duplicateSubjectTopic={...topic,page1:{...topic.page1,title:{...topic.page1.title,en:"Baby Bank Donations"},keyWords:[{en:"baby bank",ko:"아기용품 은행"},{en:"donation",ko:"기부"},{en:"essential items",ko:"필수 물품"},{en:"families in need",ko:"도움이 필요한 가족"}]},page2:{...topic.page2,title:"Baby Banks Need Donations",source:{...topic.page2.source,title:"Baby banks need donations",titleKey:"baby banks need donations",subjectKey:"baby banks donation essential items families"},keyWords:[{en:"baby bank",ko:"아기용품 은행"},{en:"donation",ko:"기부"},{en:"essential items",ko:"필수 물품"},{en:"families",ko:"가족"},{en:"charity",ko:"자선 단체"}]}};
const duplicateSubjectPlan={...plan,titleEn:"Baby Bank Donations",page1Premise:"Donating essential baby items to baby banks for families.",articleTitle:"Baby Banks Need Donations",page2Premise:"Baby banks need donations of essential items for families."};
const duplicateSubjectValidation=TopicV4.validateContent(duplicateSubjectTopic,duplicateSubjectPlan);
assert.equal(duplicateSubjectValidation.ready,false,"shared article subject identifiers must still be rejected");
assert.ok(duplicateSubjectValidation.issues.some(item=>item.location==="content.separation"),"the duplicate must fail specifically as a shared article subject");
const requiredCounts={keyWords:4,quickVoteOptions:3,easyTalk:3,realTalk:3,todayEnglish:4,randomQuestions:6,balanceGame:6,articleKeyWords:5,stanceOptions:3,discussion:5,quizOptions:3};
for(const [field,count] of Object.entries(requiredCounts)){
  assert.equal(TopicV4.CONTENT_TOOL.input_schema.properties[field].minItems,undefined,`${field} must omit Anthropic-incompatible minimum cardinality`);
  assert.equal(TopicV4.CONTENT_TOOL.input_schema.properties[field].maxItems,undefined,`${field} must omit transport-only maximum cardinality`);
}
// Given Anthropic's JSON Schema dialect, when Story length is validated, then it must use the app validator rather than an unsupported regex range quantifier.
assert.equal(TopicV4.CONTENT_TOOL.input_schema.properties.storyEn.pattern,undefined,"Anthropic-compatible Story schema must omit unsupported range regex");
const shortStory={...topic,page1:{...topic.page1,story:{...topic.page1.story,en:Array.from({length:54},()=>"word").join(" ")}}};
assert.equal(TopicV4.validateContent(shortStory,plan).ready,false,"Story validator must reject 54 words after transport schema compatibility change");
const contentPrompt=TopicV4.buildPromptPayload({stage:"content",topic:{date:topic.date,page1Template:"A"},approvedPlan:plan});
assert.match(contentPrompt.rules.join(" "),/exact required count/);
assert.match(contentPrompt.rules.join(" "),/articleSource/);
assert.match(contentPrompt.rules.join(" "),/CEFR A2-B1/,"Article output must target low-intermediate learners");
assert.match(contentPrompt.rules.join(" "),/short, direct sentences and familiar daily vocabulary/,"Article output must avoid dense source-style prose");
assert.match(contentPrompt.rules.join(" "),/SOCIAL TRENDS, CULTURE, and LIFE/);
assert.match(contentPrompt.rules.join(" "),/only personal name/,"Template A must forbid carried-over celebrity and invented names");
assert.match(contentPrompt.rules.join(" "),/one approvedPlan\.page1Premise situation/,"Template A title, story, and questions must stay on one approved situation");
assert.equal(contentPrompt.repair,null,"a first Content Fill must not be marked as a repair");
const repairPrompt=TopicV4.buildPromptPayload({stage:"content",topic:{date:topic.date,page1Template:"A"},approvedPlan:plan,repairIssues:[{location:"page1.keyWords",message:"정확히 4개의 완성된 항목이 필요합니다."}]});
assert.deepEqual(repairPrompt.repair,{issues:[{location:"page1.keyWords",message:"정확히 4개의 완성된 항목이 필요합니다."}]},"a bounded repair must carry only canonical validation feedback");
assert.match(repairPrompt.rules.join(" "),/REPAIR MODE/);
const planRepairPrompt=TopicV4.buildPromptPayload({stage:"plan",topic:{date:topic.date,page1Template:"A",articleSource:{category:"CULTURE"}},repairIssues:[{location:"plan.premise",message:"1페이지와 Article 소재가 겹칩니다."},{location:"plan.articleCategory",message:"두 페이지 카테고리는 달라야 합니다."}]});
assert.equal(planRepairPrompt.repair?.issues.length,2,"a failed Plan must pass its canonical separation feedback into the automatic retry");
assert.match(planRepairPrompt.rules.join(" "),/REPAIR MODE/);
assert.equal(topic.page2.template,"ARTICLE");
assert.equal(topic.page2.discussion.length,5);
assert.equal(topic.page2.quiz.options.length,3);
assert.equal(TopicV4.sourceReference(topic.page2.source).url,topic.page2.source.url);
const transport={
  storyEn:topic.page1.story.en,
  storyKo:topic.page1.story.ko,
  keyWords:topic.page1.keyWords,
  quickVoteQuestion:topic.page1.quickVote.question,
  quickVoteOptions:topic.page1.quickVote.options,
  easyTalk:topic.page1.easyTalk,
  realTalk:topic.page1.realTalk,
  todayEnglish:topic.page1.todayEnglish,
  randomQuestions:[],
  balanceGame:[],
  articleBody:topic.page2.article,
  articleKeyWords:topic.page2.keyWords,
  stanceQuestion:topic.page2.stance.question,
  stanceOptions:topic.page2.stance.options,
  discussion:topic.page2.discussion,
  quizQuestion:topic.page2.quiz.question,
  quizOptions:topic.page2.quiz.options,
  quizAnswer:topic.page2.quiz.answer
};
// Given the proxy requests JSON Schema output, when Anthropic returns one JSON text block, then it is the Content transport.
assert.deepEqual(TopicV4.parseStructuredContentResponse({stop_reason:"end_turn",content:[{type:"text",text:JSON.stringify(transport)}]}),transport);
assert.equal(TopicV4.validateContent({...topic,page2:{...topic.page2,category:topic.page1.category,categoryColor:topic.page1.categoryColor}},sameCategoryPlan).ready,false,"A completed topic may not reuse Page 1's category");
assert.equal(TopicV4.validateContent({...topic,page2:{...topic.page2,source:{...topic.page2.source,url:"javascript:alert(1)"}}},plan).ready,false,"Article source must be HTTPS");
assert.equal(TopicV4.validateContent({...topic,page1:{...topic.page1,story:{...topic.page1.story,fictional:false}}},plan).ready,false);
assert.equal(TopicV4.validateContent({...topic,page2:{...topic.page2,discussion:topic.page2.discussion.slice(0,4)}},plan).ready,false);
const articleInstructionInDiscussion={...topic,page2:{...topic.page2,discussion:["#1 reads the first sentence aloud; the group continues one sentence at a time, then votes without giving reasons.",...topic.page2.discussion.slice(1)]}};
assert.equal(TopicV4.validateContent(articleInstructionInDiscussion,plan).ready,false,"Article DISCUSSION must reject a read-aloud instruction in place of its first question");
const recentParticipantOrders=TopicV4.PARTICIPANT_ORDER_RULES.slice(0,4).map((rule,index)=>({date:`2026-10-0${index+1}`,participantOrder:{id:rule.id}}));
const generatedTopic=TopicV4.buildTopic({date:"2026-10-05",page1Template:"A"},plan,topic,recentParticipantOrders);
assert.ok(TopicV4.PARTICIPANT_ORDER_RULES.some(rule=>rule.id===generatedTopic.participantOrder?.id),"new topics must persist one participant-order rule");
assert.equal(recentParticipantOrders.some(item=>item.participantOrder.id===generatedTopic.participantOrder.id),false,"the last four participant-order rules must not repeat");
assert.ok(TopicV4.PARTICIPANT_ORDER_RULES.some(rule=>rule.id===generatedTopic.participantOrders?.page1?.id),"new topics must persist a Page 1 participant-order rule");
assert.ok(TopicV4.PARTICIPANT_ORDER_RULES.some(rule=>rule.id===generatedTopic.participantOrders?.article?.id),"new topics must persist an Article participant-order rule");
assert.notEqual(generatedTopic.participantOrders?.page1?.id,generatedTopic.participantOrders?.article?.id,"Page 1 and Article participant-order rules must differ");
// Given participant orders already used on either printable page this month, when a new topic is created,
// then neither page may reuse one until the available pool is exhausted.
const monthOrders=TopicV4.PARTICIPANT_ORDER_RULES.slice(1,6).map((rule,index)=>({date:`2026-10-0${index+1}`,participantOrders:{page1:rule,article:TopicV4.PARTICIPANT_ORDER_RULES[index===0?0:index+6]}}));
const originalCrypto=globalThis.crypto;
Object.defineProperty(globalThis,"crypto",{configurable:true,value:{getRandomValues(values){values[0]=0;return values},randomUUID:originalCrypto.randomUUID.bind(originalCrypto)}});
const monthTopic=TopicV4.buildTopic({date:"2026-10-10",page1Template:"A"},plan,topic,monthOrders);
Object.defineProperty(globalThis,"crypto",{configurable:true,value:originalCrypto});
const usedMonthOrderIds=new Set(monthOrders.flatMap(item=>[item.participantOrders.page1.id,item.participantOrders.article.id]));
assert.equal(usedMonthOrderIds.has(monthTopic.participantOrders.page1.id),false,"Page 1 instruction must not repeat anywhere in the same month");
assert.equal(usedMonthOrderIds.has(monthTopic.participantOrders.article.id),false,"Article instruction must not repeat anywhere in the same month");
assert.ok(TopicV4.participantOrderFor({date:"2026-10-06"})?.id,"older topics need a stable participant-order fallback");
console.log("PASS topic-v4-generation-qa: v4.3 A/B + fixed Article contract");
