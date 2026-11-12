import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import TopicV4 from "./topic-v4-generation.js";

const fixture=JSON.parse(await readFile(new URL("./fixtures/member-topic.json",import.meta.url),"utf8"));
const topic={...fixture,topicVersion:"topic-v4.3",generationEngine:TopicV4.VERSION,page2:{...fixture.page2,title:"Should Cities Limit Outdoor Screens?",category:"CULTURE",categoryColor:TopicV4.CATEGORIES.CULTURE,source:{publisher:"Example News",category:"CULTURE",title:"Cities rethink digital billboards",titleKey:"cities rethink digital billboards",subjectKey:"cities digital billboards public space",url:"https://example.com/city-screens",excerpt:"Cities are reconsidering how bright outdoor screens shape shared public spaces.",popularityScore:72,publishedAt:"2026-10-01T00:00:00.000Z"},article:"Bright digital screens now shape many city streets after dark. Supporters say they help businesses and make public areas feel lively. Critics worry that constant advertising changes how people use shared space. Some cities have started limiting screen brightness or location. The deeper question is whether public attention should be treated as a resource for sale. The choice can shape how people feel in the street.",keyWords:[{en:"public space",ko:"공공 공간"},{en:"brightness",ko:"밝기"},{en:"shared attention",ko:"공유된 주의"},{en:"limit",ko:"제한하다"},{en:"resource",ko:"자원"}],stance:{question:"Should cities limit outdoor digital screens?",options:["Yes, more limits","No, keep them open","It depends on the area"]},discussion:["How do screens change a street?","Who benefits from bright displays?","Should quiet spaces be protected?","What rule would be fair?","What belongs in shared public space?"],quiz:{question:"What is the article mainly asking?",options:["Who owns public attention?","How to sell more screens?","Which city is brightest?"],answer:0}}};
const plan={titleEn:topic.page1.title.en,titleKo:topic.page1.title.ko,star:topic.page1.story.star,category:topic.page1.category,page1Template:"A",page1Premise:"late-night workplace messages and personal boundaries",articleTitle:topic.page2.title,articleCategory:topic.page2.category,page2Premise:"digital advertising in public city spaces"};
assert.equal(TopicV4.TEMPLATE_VERSION,"topic-v4.3");
assert.ok(Array.isArray(TopicV4.PARTICIPANT_ORDER_RULES),"participant-order rules must be available to the generator");
assert.ok(TopicV4.PARTICIPANT_ORDER_RULES.length>=20,"the generator needs a varied set of participant-order rules");
{
  // Stars were taken in list order, so every month's first week was all BTS. Each date now draws from the whole list.
  const first=TopicV4.selectStarForDate("2026-10-01",[]);
  assert.ok(TopicV4.STARS.includes(first)&&first!=="RM","a date picks a listed display name, not RM");
  assert.equal(TopicV4.selectStarForDate("2026-10-01",[]),first,"the same date and variant keep the same star so a plan is stable");
  assert.notEqual(TopicV4.selectStarForDate("2026-10-01",[first]),first,"a star already used this month is skipped");
  const BTS=new Set(["Namjoon","Yoongi","Hoseok","Seokjin","Jimin","Taehyung","Jungkook"]);
  for(const month of ["2026-10","2026-11","2026-12","2027-01"]){
    const used=[];for(let day=1;day<=7;day++){used.push(TopicV4.selectStarForDate(`${month}-0${day}`,used))}
    assert.equal(new Set(used).size,7,`${month} first week has seven different stars`);
    assert.ok(used.filter(star=>BTS.has(star)).length<=3,`${month} first week must not be mostly BTS: ${used.join(", ")}`);
  }
}
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
{
  // Published 11/4 story: the friend Taehyung was renamed to the main star, printing "His friend Jimin".
  const story="Taehyung opened the fridge and found one last piece of his favorite strawberry cake. His friend Jimin was coming over soon. Taehyung cut it in half and waited. When Jimin arrived, he laughed and said he had already eaten cake. Taehyung smiled and ate both pieces himself.";
  const twoStars={...topic,date:"2026-11-04",topicPlan:{...plan,star:"Taehyung"},page1:{...topic.page1,story:{...topic.page1.story,star:"Taehyung",en:story}}};
  for(const usedStars of [[],["Taehyung"]]){
    const repaired=TopicV4.migrateLegacyRmTopic(twoStars,{usedStars}),star=repaired.page1.story.star,text=repaired.page1.story.en;
    assert.doesNotMatch(text,new RegExp(`friend,?\\s+${star}\\b`),`the friend must not take the main star's name (${star})`);
    const friend=text.match(/His friend (\w+) was coming over/)?.[1];
    assert.ok(friend&&friend!==star&&!TopicV4.STARS.includes(friend),`the friend gets an ordinary name different from the main star (${friend})`);
    assert.match(text,new RegExp(`When ${friend} arrived`),"every mention of the friend uses the same new name");
    assert.equal(TopicV4.validateContent(repaired,{...plan,star}).issues.filter(item=>item.location==="page1.starConsistency").length,0,"the friend's new name passes the one-star rule");
    assert.ok(text.startsWith(`${star} opened the fridge`)&&text.endsWith(`${star} smiled and ate both pieces himself.`),"the main character keeps one star name");
  }
  const collapsed={...twoStars,topicPlan:{...plan,star:"Jimin"},page1:{...twoStars.page1,story:{...twoStars.page1.story,star:"Jimin",en:story.replace(/Taehyung/g,"Jimin")}}};
  const collapsedValidation=TopicV4.validateContent(collapsed,{...plan,star:"Jimin"});
  assert.ok(collapsedValidation.issues.some(item=>item.location==="page1.story.en"&&/다른 인물/.test(item.message)),"a story calling the friend by the main star's name must be blocked");
}
{
  // Published November quizzes asked for a place, a number or a show name instead of the main idea.
  const quizIssue=question=>TopicV4.validateContent({...topic,page2:{...topic.page2,quiz:{...topic.page2.quiz,question}}},plan).issues.some(item=>item.location==="page2.quiz.question");
  for(const question of ["Where was the AI-generated show Castle Walls produced?","How long did the driver stop in the red zone at Leeds Bradford Airport?","According to the article, how many Microsoft workers were offered a buyout?","What is the name of the new campaign for trains mentioned in the article?","Which TV show is mentioned as helping bring the British heritage fashion look back into style?"])assert.ok(quizIssue(question),`a detail-recall quiz must be blocked: ${question}`);
  for(const question of ["Why are many reviewers unhappy with Castle Walls?","What does the new train campaign ask passengers to do?","According to the article, why can rail travel be as fast as flying?"])assert.ok(!quizIssue(question),`a main-idea quiz must pass: ${question}`);
}
{
  // Real published story that mixed three names on Page 1.
  const story="Donghae keeps the desk beside him clear every single day. New colleagues assume it belongs to someone important. One afternoon, Ji-yeon finally asks him directly. Donghae pauses. Ji-yeon stares at the desk, then nods slowly.";
  const mixed={...topic,date:"2026-10-20",topicPlan:{...plan,star:"RM"},page1:{...topic.page1,title:{en:"The Extra Seat",ko:"빈자리"},story:{...topic.page1.story,star:"RM",en:story},quickVote:{...topic.page1.quickVote,question:"What do you think RM's empty desk is really about?"},easyTalk:["What brings you joy at work?",...topic.page1.easyTalk.slice(1)]}};
  const repaired=TopicV4.migrateLegacyRmTopic(mixed),star=repaired.page1.story.star,text=`${repaired.page1.story.en} ${repaired.page1.quickVote.question}`;
  assert.ok(TopicV4.STARS.includes(star)&&star!=="Donghae"&&!/\bRM\b|Ji-yeon|Donghae/.test(text)&&text.includes(`${star}'s empty desk`),"a mixed-name Page 1 must use one star name everywhere");
  assert.match(repaired.page1.story.en,/New colleagues assume/,"the ordinary word New must not be replaced by a star name");
  assert.equal(repaired.page1.easyTalk[0],"What brings you joy at work?","the ordinary word joy must not be replaced by a star name");
  assert.match(repaired.page1.story.en,/\. A colleague stares/,"a replaced name at the start of a sentence must be capitalized");
  assert.ok(!["Taeyeon","Lalisa","Jennie","Jisoo","Yuna"].includes(star),"a story about him must not receive a female star name");
  const titleMismatch={...topic,page1:{...topic.page1,title:{...topic.page1.title,en:"The Garden Party"}}};
  const titleCheck=TopicV4.validateContent(titleMismatch,plan);
  assert.ok(titleCheck.warnings.some(item=>item.location==="page1.title")&&!titleCheck.issues.some(item=>item.location==="page1.title"),"a title the story never mentions is a review warning, not a blocker, so figurative titles stay usable");
  // One month must not repeat a star: earlier dates keep theirs, later repeats are renamed consistently.
  const monthTopic=(day,star)=>({...topic,date:`2026-10-${String(day).padStart(2,"0")}`,topicPlan:{...plan,star},page1:{...topic.page1,story:{...topic.page1.story,star,en:`${star} keeps the desk beside him clear every day.`},quickVote:{...topic.page1.quickVote,question:`What should ${star} do?`}}});
  const month=TopicV4.migrateMonthTopics([12,17,19,20,24,25,26].map(day=>monthTopic(day,"Jungsu")));
  const monthStars=month.map(item=>item.page1.story.star);
  assert.equal(new Set(monthStars).size,monthStars.length,`stars must not repeat within a month: ${monthStars.join(",")}`);
  assert.equal(monthStars[0],"Jungsu","the earliest date keeps its original star");
  assert.ok(month.every(item=>item.page1.quickVote.question===`What should ${item.page1.story.star} do?`&&item.topicPlan.star===item.page1.story.star),"a renamed star is applied to the plan, story and Quick Vote together");
  // English hyphenated words are not romanized names; real published titles were damaged by this ("A a colleague Hour").
  const compound={...topic,page1:{...topic.page1,title:{...topic.page1.title,en:"A Screen-Free Hour"},story:{...topic.page1.story,en:`${topic.page1.story.star} tries a screen-free evening. Ji-yeon laughs. Go-to snacks wait on the desk.`},quickVote:{...topic.page1.quickVote,options:["A Down-filled jacket","A wool coat","Nothing"]}}};
  const compoundMigrated=TopicV4.migrateLegacyRmTopic(compound);
  assert.equal(compoundMigrated.page1.title.en,"A Screen-Free Hour","Screen-Free must not become a colleague");
  assert.equal(compoundMigrated.page1.quickVote.options[0],"A Down-filled jacket","Down-filled must not become a colleague");
  assert.match(compoundMigrated.page1.story.en,/A colleague laughs\. Go-to snacks/,"a romanized name is replaced while Go-to stays");
  assert.equal(TopicV4.validateContent(compound,plan).issues.find(item=>item.location==="page1.starConsistency")?.message.includes("Screen-Free"),false,"English compounds are not reported as other people's names");
  // A month of automatic topics must not run out of Page 1 titles and fall back to repeats or "X: Y" variants.
  const monthPlans=[];
  for(let day=1;day<=26;day++)monthPlans.push(TopicV4.buildStablePlan({date:`2026-11-${String(day).padStart(2,"0")}`,page1Template:"A",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:monthPlans.map(item=>({titleEn:item.titleEn,premise:item.page1Premise}))}));
  assert.equal(new Set(monthPlans.map(item=>item.titleEn)).size,26,"26 days of story topics get 26 different titles");
  assert.equal(monthPlans.filter(item=>item.titleEn.includes(":")).length,0,"a month never needs fallback title variants");
  const icePlans=[];
  for(let day=1;day<=12;day++)icePlans.push(TopicV4.buildStablePlan({date:`2026-11-${String(day).padStart(2,"0")}`,page1Template:"B",selectedStar:"Namjoon",articleSource:topic.page2.source,recentPageOnes:icePlans.map(item=>({titleEn:item.titleEn,premise:item.page1Premise}))}));
  assert.equal(new Set(icePlans.map(item=>item.titleEn)).size,12,"12 icebreaker topics get 12 different titles");
  assert.ok(TopicV4.buildPromptPayload({stage:"content",topic:{date:"2026-11-01"}}).rules.some(rule=>/quiz checks understanding of the main idea/.test(rule)&&/never ask for a number/.test(rule)),"the content prompt keeps quizzes on the main idea, not trivia");
  assert.ok(TopicV4.buildPromptPayload({stage:"content",topic:{date:"2026-12-01"}}).rules.some(rule=>/Never compare countries or nationalities/.test(rule)&&/prisons, politics, taxes/.test(rule)),"the content prompt rules out country comparisons and controversial themes");
  for(const title of ["When prison looks like a hotel","Racism in casting","Tariffs hit car makers","Gender stereotypes at work"])assert.equal(TopicV4.isSafeArticleSource({...topic.page2.source,title}),false,`"${title}" is a controversial Article source`);
  const sourceWith=title=>({...topic.page2.source,title});
  assert.equal(TopicV4.isSafeArticleSource(sourceWith("Flood risk is a time bomb for insurers")),true,"the idiom time bomb is not a violence signal");
  assert.equal(TopicV4.isSafeArticleSource(sourceWith("Attackers exploit an old browser bug")),true,"exploiting a software bug is not exploitation of people");
  assert.equal(TopicV4.isSafeArticleSource(sourceWith("A bomb exploded downtown")),false,"real violence stays blocked");
  assert.equal(TopicV4.isSafeArticleSource(sourceWith("Sexual exploitation case reopened")),false,"exploitation of people stays blocked");
  const flagged={...topic,generationEngine:TopicV4.VERSION,topicPlan:plan,page2:{...topic.page2,article:`${topic.page2.article} Early chat rooms were also full of harassment.`}};
  flagged.reviewCard=TopicV4.reviewCard(flagged);
  assert.equal(TopicV4.evaluate(flagged).ready,false,"an unapproved draft with a sensitive word is blocked");
  const approvedFlagged={...flagged,quality:{status:"approved"}},approvedResult=TopicV4.evaluate(approvedFlagged);
  assert.ok(approvedResult.ready&&approvedResult.warnings.some(item=>item.location==="page2.safety"),"an operator-approved topic keeps printing and shows the sensitive word as a warning");
  const rmStars=[12,15,17,19,20].map(day=>TopicV4.migrateLegacyRmTopic(monthTopic(day,"RM")).page1.story.star);
  assert.equal(new Set(rmStars).size,rmStars.length,`legacy RM stories on different days must not collapse onto one star: ${rmStars.join(",")}`);
  assert.equal(TopicV4.validateContent({...topic,page1:{...topic.page1,story:{...topic.page1.story,en:`${topic.page1.story.en} It brings her joy and something new.`}}},plan).issues.some(item=>item.location==="page1.starConsistency"),false,"ordinary words like joy and new must not count as other people's names");
}
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
const proseCollision={...topic,page1:{...topic.page1,title:{...topic.page1.title,en:"A Quiet Evening"},story:{...topic.page1.story,en:`${topic.page1.story.star} is making a daily community decision about a quiet evening at home. He considers calls, messages, and a small personal routine before sleep. The choice feels important because people often need calm time after a busy day. He listens to a friend and wonders whether to answer one more message or keep the evening simple and quiet.`},keyWords:[{en:"quiet evening",ko:"조용한 저녁"},{en:"personal routine",ko:"개인 루틴"},{en:"calm time",ko:"휴식 시간"},{en:"kind choice",ko:"배려 있는 선택"}]},page2:{...topic.page2,title:"City Bus Routes",source:{...topic.page2.source,title:"Community bus routes change",titleKey:"community bus routes change",subjectKey:"city bus routes commuter transport"},article:"A daily community decision can change city bus routes for commuters. Riders need reliable transport for work, school, and appointments. Officials must balance cost, frequency, and neighborhood access. Some residents want more service while others prefer lower spending. The central question is how a city should plan public transport fairly.",keyWords:[{en:"bus route",ko:"버스 노선"},{en:"commuter",ko:"통근자"},{en:"transport",ko:"교통"},{en:"neighborhood access",ko:"지역 접근성"},{en:"service frequency",ko:"운행 빈도"}]}};
const proseCollisionPlan={...plan,titleEn:"A Quiet Evening",page1Premise:"A daily community decision about protecting a quiet personal evening.",articleTitle:"City Bus Routes",page2Premise:"A daily community decision about redesigning city bus routes for commuters."};
proseCollision.page2.article+=" A clear schedule helps people plan each part of their day.";
assert.equal(TopicV4.validateContent(proseCollision,proseCollisionPlan).ready,true,"generic prose overlap must not reject unrelated approved subjects");
{
  // Members could not tell what Page 1 was about: 44 of 48 published stories ended with the choice made or a moral.
  const withEnding=last=>({...topic,page1:{...topic.page1,story:{...topic.page1.story,en:topic.page1.story.en.replace(/[^.!?]+[.!?]+$/,` ${last}`)}}});
  const endingIssue=last=>TopicV4.validateContent(withEnding(last),plan).issues.some(item=>item.location==="page1.story.en"&&/결론 없이/.test(item.message));
  for(const last of ["She takes a deep breath and walks toward the exhibition hall.","Nothing went to waste.","He sighs and makes a decision.","Small steps, but the skill is growing."])assert.ok(endingIssue(last),`a story that resolves itself must be rewritten: ${last}`);
  for(const last of ["Should she stay for the exhibition or head home before it gets dark?","Yuna must decide whether to reply now, set a boundary, or wait until morning."])assert.ok(!endingIssue(last),`a story ending on the open dilemma passes: ${last}`);
  const noPoint={...topic,page1:{...topic.page1,point:{situation:"",talk:""}}};
  assert.ok(TopicV4.validateContent(noPoint,plan).issues.some(item=>item.location==="page1.point"),"Page 1 needs the Korean point line");
  const approvedOld={...noPoint,generationEngine:TopicV4.VERSION,topicPlan:plan,quality:{status:"approved"},reviewCard:{final:{status:"공개 가능"}}};
  assert.ok(!TopicV4.evaluate(approvedOld).blockers.some(item=>item.location==="page1.point"),"approved topics made before the point line keep printing");
  assert.ok(TopicV4.CONTENT_TOOL.input_schema.required.includes("pointSituationKo")&&TopicV4.CONTENT_TOOL.input_schema.required.includes("pointTalkKo"),"the model must return the point line");
}
{
  // TheBox topic criteria 8-11, with real published questions (2026-11-12 check of 61 topics).
  const locations=changes=>TopicV4.validateContent({...topic,page1:{...topic.page1,...changes.page1},page2:{...topic.page2,...changes.page2}},plan).issues.map(item=>item.location);
  const easy=topic.page1.easyTalk;
  for(const question of ["What is your biggest monthly expense?","How much do you spend on lunch in a week?","What is your salary like?"])assert.ok(locations({page1:{easyTalk:[question,...easy.slice(1)]}}).includes("criteria.privacy"),`private question must be blocked: ${question}`);
  assert.ok(!locations({page1:{easyTalk:["Is it easy or hard to stick to a savings goal? Why?",...easy.slice(1)]}}).includes("criteria.privacy"),"an opinion about saving is not private");
  for(const question of ["How do you usually spend your commute?","Has your team ever taken a group photo together?","How do you protect your personal time at work?"])assert.ok(locations({page1:{easyTalk:[question,...easy.slice(1)]}}).includes("criteria.lifestyle"),`a job or family assumption must be blocked: ${question}`);
  for(const question of ["Have you ever felt like that in a group or at work?","What helps you switch off after work or school?"])assert.ok(!locations({page1:{easyTalk:[question,...easy.slice(1)]}}).includes("criteria.lifestyle"),`a question with an alternative passes: ${question}`);
  const closed=["Do you like museums?","Is it fun?","Do you go often?"],open=["What do you enjoy about museums?","Why do some people stay longer?","What would you skip if time were short?"];
  assert.ok(locations({page1:{easyTalk:closed,realTalk:[closed[0],...open.slice(1)]}}).includes("criteria.openQuestions"),"mostly yes/no Easy and Real Talk must be rewritten");
  assert.ok(!locations({page1:{easyTalk:["Have you ever stayed longer than planned? What happened?","Do you think free time alone matters? Why?",open[0]],realTalk:open}}).includes("criteria.openQuestions"),"a yes/no opener followed by why/what still counts as open");
  assert.ok(locations({page1:{realTalk:["Do you like art?","Is art important?","Can art help you relax?"]}}).includes("criteria.realTalk"),"Real Talk needs a why or what-if question");
  assert.ok(locations({page2:{title:"Mega mega mega, going back to Romford! How an outer London suburb became a metropolis for 90s dance music"}}).includes("page2.title"),"a long source headline must become a short Article title");
  const rules=TopicV4.buildPromptPayload({stage:"content",topic:{date:"2026-12-20",page1Template:"A"},approvedPlan:null}).rules.join(" ");
  // Long options are flagged for the operator but no longer discard a topic: 12/1 regeneration failed on one 9-word option.
  const optionWarnings=options=>TopicV4.validateContent({...topic,page1:{...topic.page1,quickVote:{...topic.page1.quickVote,options}}},plan);
  const longResult=optionWarnings(["Ask the shopkeeper to hold the books and come back later","Leave","Call a friend"]);
  assert.ok(longResult.warnings.some(item=>item.location==="criteria.options")&&!longResult.issues.some(item=>item.location==="criteria.options"),"long options are a warning, not a blocker");
  assert.ok(!optionWarnings(["It sounds nice but I would feel a bit shy","Sounds relaxing","Maybe for a weekend"]).warnings.some(item=>item.location==="criteria.options"),"a nine-word plain option passes");
  // 12/3 review: "Do you have a drawer like this?" stops anyone who answers no; "When did you last clean it?" ends in one fact.
  assert.ok(locations({page1:{easyTalk:["Do you have a drawer like Hoseok's?",...easy.slice(1)]}}).includes("criteria.gate"),"a first question that gates on owning something must be widened");
  assert.ok(!locations({page1:{easyTalk:["Where do small things pile up for you — a drawer, a bag, or your phone?",...easy.slice(1)]}}).includes("criteria.gate"),"a widened first question passes");
  // 12/1 re-review: "What would Hanni leave behind?" asks for a prediction about the character, not the member's own choice.
  const star=topic.page1.story.star.split(" ")[0];
  assert.ok(locations({page1:{quickVote:{...topic.page1.quickVote,question:`What would ${star} leave behind?`}}}).includes("criteria.voteSelf"),"the vote must ask the member, not predict the character");
  assert.ok(!locations({page1:{quickVote:{...topic.page1.quickVote,question:"What would you leave behind?"}}}).includes("criteria.voteSelf"),"a vote that asks the member passes");
  // 11/12 live test: this vote asks the member, yet it was blocked and two repairs could not clear it.
  assert.ok(!locations({page1:{quickVote:{...topic.page1.quickVote,question:`What would you do in ${star}'s situation?`}}}).includes("criteria.voteSelf"),"naming the character while asking the member passes");
  const shortStory=TopicV4.validateContent({...topic,page1:{...topic.page1,story:{...topic.page1.story,en:"Too short a story."}}},plan).issues.find(item=>item.location==="page1.story.en"&&item.message.includes("55~85"));
  assert.match(shortStory?.message||"",/지금 4단어.*add 51 or more words/,"the length issue tells the repair the current count and what to change");
  // 11/12 live test: an 88-word story (3 over) discarded the whole topic after two repairs; a near miss is only a warning.
  const lengthCheck=words=>{const base=topic.page1.story.en.split(/\s+/).filter(Boolean).slice(-words),pad=Array.from({length:Math.max(0,words-base.length)},()=>"quietly");const result=TopicV4.validateContent({...topic,page1:{...topic.page1,story:{...topic.page1.story,en:[...pad,...base].join(" ")}}},plan),hit=list=>list.some(item=>item.location==="page1.story.en"&&item.message.includes("55~85"));return{blocks:hit(result.issues),warns:hit(result.warnings)}};
  assert.deepEqual(lengthCheck(88),{blocks:false,warns:true},"an 88-word story is a warning, not a blocker");
  assert.deepEqual(lengthCheck(101),{blocks:true,warns:false},"a story over 100 words still blocks");
  // 12/10 review: judging a relative and loneliness are disclosures; a neutral seat preference is fine.
  for(const question of ["Who is the trickiest person to seat at your family table?","Have you ever felt like an outsider in a group? How did you handle it?"])assert.ok(locations({page1:{easyTalk:[question,...easy.slice(1)]}}).includes("criteria.privacy"),`must not be asked: ${question}`);
  assert.ok(!locations({page1:{easyTalk:["Where do you like to sit in a café, and why?",...easy.slice(1)]}}).includes("criteria.privacy"),"a seat preference is not private");
  // 12/8 review: "Person who had coffee today" can match several people; every order rule needs a tie-breaker,
  // and rules that assume a job or reveal phone numbers or family details are gone.
  for(const rule of TopicV4.PARTICIPANT_ORDER_RULES.filter(item=>item.id!=="rock-paper-scissors"))assert.ok(rule.en.includes("If tied, play rock-paper-scissors.")&&rule.ko.includes("같으면 가위바위보로 정하고"),`order rule needs a tie-breaker: ${rule.id}`);
  for(const id of ["longest-current-job","highest-phone-ending","most-siblings","nearby-relatives"])assert.ok(!TopicV4.PARTICIPANT_ORDER_RULES.some(item=>item.id===id),`order rule clashes with the criteria: ${id}`);
  // 12/7 review: asking about an embarrassing home is a disclosure; asking how to get back into an account is not.
  assert.ok(locations({page2:{discussion:[...topic.page2.discussion.slice(0,4),"Have you ever felt embarrassed to let someone see your kitchen or home? What happened?"]}}).includes("criteria.privacy"),"embarrassing home experiences must not be asked");
  assert.ok(!locations({page1:{easyTalk:["What do you usually do when you forget your password?",...easy.slice(1)]}}).includes("criteria.privacy"),"asking how people get back in is not a security disclosure");
  // 12/6 review: the first Article question gated on owning houseplants.
  assert.ok(locations({page2:{discussion:["Do you have any houseplants at home? How do you look after them?",...topic.page2.discussion.slice(1)]}}).includes("criteria.gate"),"a first discussion question that gates on a possession must be widened");
  // 12/4 review: password habits are private security details.
  assert.ok(locations({page1:{easyTalk:["Do you use the same password for many things?",...easy.slice(1)]}}).includes("criteria.privacy"),"password habits must not be asked");
  assert.ok(locations({page1:{easyTalk:["When did you last clean your drawer?","When was the last time you tidied up?","Do you tidy often?"]}}).includes("criteria.openQuestions"),"one-fact when-did-you-last questions count as closed");
  for(const phrase of ["TOPIC CRITERIA","TEMPLATE A CRITERIA","NO MODEL ANSWER","ARTICLE CRITERIA","12/2 REVIEW","12/3 REVIEW","12/4 REVIEW","12/6 REVIEW","12/7 REVIEW","12/8 REVIEW","12/10 REVIEW","12/1 RE-REVIEW","11/12 REVIEW"])assert.ok(rules.includes(phrase),`the prompt carries ${phrase}`);
}
{
  // Self-review (2026-11-12): first drafts scored 84/74 even with every rule in the prompt, so the model now scores
  // its own draft like the editor and rewrites below 96.
  assert.equal(TopicV4.REVIEW_PASS_SCORE,96,"the self-review uses the editor's pass line");
  // 11/12 live test: rewrites started from scratch and stayed at 91/88-94; a review rewrite now edits the previous draft.
  const editIssues=[{location:"page1.realTalk",message:"Editor review: replace question 1."}];
  const edit=TopicV4.buildPromptPayload({stage:"content",topic:{date:"2026-12-19",page1Template:"A"},approvedPlan:null,repairIssues:editIssues,repairDraft:{...topic,generationRequest:{topicHint:"secret hint"}}});
  assert.deepEqual(Object.keys(edit.repair),["issues","previousDraft"],"the rewrite carries the previous draft");
  assert.equal(edit.repair.previousDraft.page1.story.en,topic.page1.story.en);
  assert.ok(!JSON.stringify(edit).includes("secret hint"),"only the printed pages are sent as the previous draft");
  assert.ok(edit.rules.some(rule=>rule.startsWith("EDIT MODE")),"the model is told to change only what the issues name");
  const fresh=TopicV4.buildPromptPayload({stage:"content",topic:{date:"2026-12-19",page1Template:"A"},approvedPlan:null,repairDraft:topic});
  assert.equal(fresh.repair,null,"without issues a draft is ignored");
  assert.ok(!fresh.rules.some(rule=>rule.startsWith("EDIT MODE")));
  // 11/12 live test: the review schema had maxItems, which structured output rejects (400), so every review was skipped.
  // Structured-output schemas use only the keywords the working Content schema uses.
  const schemaKeywords=(schema,found=new Set())=>{if(schema&&typeof schema==="object"&&!Array.isArray(schema))for(const [key,value] of Object.entries(schema)){if(key==="properties"){Object.values(value).forEach(child=>schemaKeywords(child,found));continue}found.add(key);if(key==="items")schemaKeywords(value,found)}return found};
  for(const tool of [TopicV4.CONTENT_TOOL,TopicV4.REVIEW_TOOL])for(const key of schemaKeywords(tool.input_schema))assert.ok(["type","required","properties","items","additionalProperties","description"].includes(key),`${tool.name} schema uses unsupported keyword ${key}`);
  const payload=TopicV4.buildReviewPayload({draft:{...topic,generationRequest:{topicHint:"secret hint"},operatorStatus:{reviewStatus:"approved"}}});
  assert.equal(payload.stage,"review");
  assert.deepEqual(Object.keys(payload.draft),["page1","page2"],"only the two printed pages are reviewed");
  assert.ok(!JSON.stringify(payload).includes("secret hint"),"generation settings are not sent to the reviewer");
  assert.equal(payload.draft.page1.story.en,topic.page1.story.en,"the reviewer reads the real story");
  const reviewRules=payload.rules.join("\n");
  for(const phrase of ["TOPIC CRITERIA","TEMPLATE A CRITERIA","11/12 REVIEW","12/1 RE-REVIEW","Article quiz","96 or more"])assert.ok(reviewRules.includes(phrase),`the reviewer knows ${phrase}`);
  const asText=TopicV4.parseReviewResponse({content:[{type:"text",text:JSON.stringify({scorePage1:84,scorePage2:140,issues:[{location:"page1.story",message:"Remove the single-thumbtack limit."}]})}]});
  assert.deepEqual([asText.scorePage1,asText.scorePage2,asText.issues[0].location],[84,100,"page1.story"],"structured output is read and scores are clamped");
  const asTool=TopicV4.parseReviewResponse({content:[{type:"tool_use",name:TopicV4.REVIEW_TOOL.name,input:{scorePage1:97,scorePage2:74,issues:[]}}]});
  assert.equal(asTool.scorePage2,74);
  assert.throws(()=>TopicV4.parseReviewResponse({content:[{type:"text",text:"not json"}]}),/Self-review result is missing/);
}
{
  assert.ok(TopicV4.CONTENT_TOOL.input_schema.required.includes("articleTitleEn"),"the model returns a short Article title");
}
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
  pointSituationKo:topic.page1.point.situation,
  pointTalkKo:topic.page1.point.talk,
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
