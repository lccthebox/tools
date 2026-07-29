(function () {
  "use strict";
  const commonReactions = [
    "Really? What happened?",
    "Why do you think so?",
    "That happened to me too.",
    "I've never thought about that.",
    "I see it differently because...",
    "What about you?"
  ];
  const scoreLabels = ["첫 발화 용이성","대화 지속성","혼합 레벨 적합성","상호작용 유도","실생활 연관성","영어 자연스러움","인쇄 가독성","담당자 사용성"];
  const cleanFrame = value => value || "I think... because...";
  const storyPaths = {
    "2026-08-03":[
      ["First, I check...","Then I look at...","If something feels strange, I...","In the end, I decide..."],
      ["The review said...","The detail felt...","That made me...","So I decided to..."]
    ],
    "2026-08-06":[
      ["I ordered...","I expected...","When it arrived...","Next time, I would..."],
      ["Our group wanted...","We could not agree on...","We compared...","Finally, we chose..."]
    ],
    "2026-08-10":[
      ["The message was about...","The key detail was...","I understood it when...","Then I replied..."],
      ["The message arrived...","I needed time because...","I replied when...","The result was..."]
    ],
    "2026-08-13":[
      ["First, I book...","Then I plan...","I leave room for...","That helps me..."],
      ["The plan included...","I felt stress when...","We changed...","After that..."]
    ],
    "2026-08-17":[
      ["I went there to...","I ordered...","I stayed because...","I left when..."],
      ["The café had...","There were no reviews, so...","I decided to...","It turned out..."]
    ],
    "2026-08-20":[
      ["I use it for...","It saves me...","I keep paying because...","I would cancel if..."],
      ["I signed up because...","I forgot about it when...","I noticed the cost...","Then I decided to..."]
    ],
    "2026-08-24":[
      ["The person enjoys...","I considered...","I recommended...","They responded..."],
      ["Someone recommended...","At first, I thought...","After I tried it...","In the end..."]
    ],
    "2026-08-27":[
      ["I use my phone to...","It helps when...","I save time by...","Without it, I would..."],
      ["The interruption was...","I noticed it when...","I changed...","Now I..."]
    ]
  };
  const fourthPhrases = {
    "2026-08-03":{en:"It looked different in person.",ko:"실제로 보니 달랐어요."},
    "2026-08-06":{en:"It does not travel well.",ko:"배달하면 맛이 떨어져요."},
    "2026-08-10":{en:"Could you clarify the deadline?",ko:"마감 시간을 다시 알려 주시겠어요?"},
    "2026-08-13":{en:"Let's leave some room to wander.",ko:"즉흥적으로 움직일 시간을 남겨요."},
    "2026-08-17":{en:"It has a comfortable atmosphere.",ko:"분위기가 편안해요."},
    "2026-08-20":{en:"I am not getting enough value from it.",ko:"가격만큼 활용하지 못하고 있어요."},
    "2026-08-24":{en:"It might suit your taste.",ko:"당신 취향에 맞을 수도 있어요."},
    "2026-08-27":{en:"I turned off non-essential notifications.",ko:"불필요한 알림을 껐어요."}
  };
  const topicPhrase = (item, index) => ({
    en:item?.en || item || `Useful phrase ${index + 1}`,
    ko:item?.ko || ""
  });
  function fromLegacy(topic) {
    const easy = topic.easyEntry || [];
    const main = topic.mainDiscussion || [];
    const quick = topic.quickActivity || {options:[]};
    const mission = topic.midGame || quick;
    const basePhrases = (topic.usefulPhrases || []).map(topicPhrase);
    const paths = storyPaths[topic.date] || [];
    const flow = {
      quickStarts:(topic.smallTalk || []).slice(0,3).map((item,index)=>({
        questionEn:item.questionEn,
        questionKo:item.questionKo,
        options:[],
        answerMode:"open",
        sayFrame:cleanFrame(easy[index]?.starter || "My answer is... because...")
      })),
      storyPrompts:easy.slice(0,2).map((item,index)=>({
        questionEn:item.questionEn,
        questionKo:item.questionKo,
        storySteps:paths[index] || [cleanFrame(item.starter),"One detail was...","That changed...","So I decided to..."],
        askSomeone:item.followUp || "Has that ever happened to you?",
        noExperienceAlternative:"If it hasn't happened to you: What would you do in that situation?"
      })),
      talkRounds:[easy[2],main[0],main[1]].filter(Boolean).map((item,index)=>({
        role:["experience","criteria","group"][index],
        questionEn:item.questionEn,
        questionKo:item.questionKo,
        sayFrame:cleanFrame(item.starter),
        askPrompt:item.exampleFollowUp || item.followUp || "What did you decide?",
        reactionPrompts:index===0?["That sounds familiar.","I would have reacted differently."]:["I agree because...","I see it differently because..."]
      })),
      groupMission:{
        titleEn:mission.titleEn,
        titleKo:mission.titleKo,
        instructionEn:mission.instructionEn,
        instructionKo:mission.instructionKo,
        options:[...(mission.options || [])],
        resultType:mission.type === "ranking" ? "ranking" : mission.type === "design" ? "plan" : "choice",
        contextTag:topic.date,
        everyoneSpeaksRule:"Do not finalize the result until everyone has spoken."
      },
      topicPhrases:[...basePhrases,fourthPhrases[topic.date]||{en:"That works well for me.",ko:"저에게는 잘 맞아요."}].slice(0,4),
      reactionPhrases:[
        "Really? What happened?",
        "Why do you think so?",
        "Can you give us an example?",
        "That happened to me too.",
        "I agree because...",
        "I see it differently because..."
      ],
      finalRound:{
        questionEn:topic.finalRound?.questionEn || "Share one final thought.",
        questionKo:topic.finalRound?.questionKo || "마지막 생각을 한 문장으로 말해 보세요.",
        sayFrame:cleanFrame(topic.finalRound?.starter)
      },
      leaderGuide:{
        shortAnswerPrompts:["What makes you say that?","Can you give one example?"],
        noExperiencePrompts:["What would you do?","Which option seems most realistic?"],
        turnTransitions:["Let's hear one new voice.","Could you pass the question to someone?"],
        quietSpeakerPrompts:["Would you like to choose one option?","Which answer feels closest to you?"],
        missionSteps:["Choose a facilitator.","Give everyone one turn.","Compare the answers.","Agree on one result."],
        commonErrors:[...(topic.leaderNotes?.commonErrors || [])],
        optionalSections:["Skip one story prompt when the group needs more time for the mission."]
      }
    };
    if(topic.date==="2026-08-03"){
      flow.quickStarts=[
        {questionEn:"What was the last thing you checked reviews for?",questionKo:"최근 무엇의 리뷰를 확인했나요?",options:[],answerMode:"open",sayFrame:"The last thing I checked was..."},
        {questionEn:"Which do you check first?",questionKo:"무엇을 가장 먼저 확인하나요?",options:["Star rating","Photo reviews","Written comments"],answerMode:"choice",sayFrame:"I check ______ first because ______."},
        {questionEn:"Would you trust a review with no photo?",questionKo:"사진이 없는 리뷰를 믿을 수 있나요?",options:["Yes, usually.","Sometimes.","No, not really."],answerMode:"scale",sayFrame:"I might trust it if..."}
      ];
      flow.talkRounds=[
        {role:"experience",questionEn:"Tell us about a review that changed your mind.",questionKo:"생각을 바꾸게 한 리뷰 경험을 말해 보세요.",sayFrame:"One review changed my mind because...",askPrompt:"What did you decide in the end?",reactionPrompts:["That sounds reasonable.","I would have chosen differently."]},
        {role:"criteria",questionEn:"What makes a review feel trustworthy to you?",questionKo:"어떤 리뷰가 믿을 만하게 느껴지나요?",sayFrame:"I trust a review more when...",askPrompt:"What kind of review do you avoid?",reactionPrompts:["I agree because...","I'm not sure because..."]},
        {role:"group",questionEn:"Should platforms remove reviews they suspect are fake?",questionKo:"플랫폼은 가짜로 의심되는 리뷰를 삭제해야 할까요?",sayFrame:"Platforms should...",askPrompt:"What evidence should they require?",reactionPrompts:["I agree because...","I see it differently because..."]}
      ];
      flow.groupMission={
        titleEn:"Online Review Detective",titleKo:"온라인 리뷰 탐정",
        instructionEn:"Choose the three most believable product reviews and underline the detail that earns your trust.",
        instructionKo:"가장 믿을 만한 상품 리뷰 3개를 고르고 신뢰하게 만든 세부 내용을 찾으세요.",
        options:[
          "The color was slightly darker, but the size was accurate.",
          "It arrived two days late, but the seller replied quickly.",
          "Five stars. Perfect.",
          "The fabric felt thinner than it looked in the photos.",
          "Not good.",
          "I have used it for three months and it still works well."
        ],
        resultType:"ranking",contextTag:topic.date,everyoneSpeaksRule:"Do not finalize the result until everyone has spoken."
      };
      flow.topicPhrases=[
        {en:"I take that rating with a grain of salt.",ko:"그 평점을 그대로 믿지는 않아요."},
        {en:"The details make it sound believable.",ko:"구체적인 내용이 있어서 믿을 만해요."},
        {en:"It looked different in person.",ko:"실제로 보니 달랐어요."},
        {en:"That would be a deal-breaker for me.",ko:"그렇다면 저는 사지 않을 거예요."}
      ];
    }
    return flow;
  }
  function diagnostics(flow) {
    const found = [],add=(location,message,target,critical=false)=>found.push({location,message,target,critical});
    if(!flow) return [{location:"CONVERSATION FLOW",message:"회화 흐름이 없습니다.",target:"conversationFlow",critical:true}];
    if(flow.quickStarts?.length !== 3) add("START NOW","질문은 3개여야 합니다.","conversationFlow.quickStarts",true);
    if(flow.storyPrompts?.length !== 2) add("TELL YOUR STORY","질문은 2개여야 합니다.","conversationFlow.storyPrompts",true);
    if(flow.talkRounds?.length !== 3) add("TALK TOGETHER","질문은 3개여야 합니다.","conversationFlow.talkRounds",true);
    (flow.quickStarts || []).forEach((item,index)=>{
      const location=`START NOW ${index+1}`,yesNo=/^(would|do|does|is|are|can|should)\b/i.test(item.questionEn||"");
      if(!item.questionEn || !item.sayFrame) add(location,"질문 또는 SAY가 비어 있습니다.",`conversationFlow.quickStarts.${index}`,true);
      if(item.questionEn?.trim().split(/\s+/).length > 18) add(location,"질문이 너무 깁니다.",`conversationFlow.quickStarts.${index}`);
      if(item.answerMode==="open"&&item.options?.length) add(location,"경험형 질문에는 선택지를 사용하지 마세요.",`conversationFlow.quickStarts.${index}.options`,true);
      if(yesNo&&item.options?.length&&item.answerMode!=="scale") add(location,"Yes/No 질문의 선택지 형식이 질문과 맞지 않습니다.",`conversationFlow.quickStarts.${index}.options`,true);
      if(item.answerMode==="choice"&&item.options?.length<2) add(location,"질문에 바로 답할 수 있는 선택지가 부족합니다.",`conversationFlow.quickStarts.${index}.options`,true);
    });
    (flow.storyPrompts || []).forEach((item,index)=>{
      const generic=(item.storySteps||[]).filter(step=>/^(at first|then|in the end)/i.test(step)).length;
      if(item.storySteps?.length < 3 || !item.askSomeone || !item.noExperienceAlternative) add(`TELL YOUR STORY ${index+1}`,"Story Path 또는 대체 경로가 부족합니다.",`conversationFlow.storyPrompts.${index}`,true);
      if(generic>=3) add(`TELL YOUR STORY ${index+1}`,"범용 연결어가 반복됩니다. 질문에 맞는 말문으로 바꾸세요.",`conversationFlow.storyPrompts.${index}.storySteps`);
    });
    (flow.talkRounds || []).forEach((item,index)=>{
      if(!item.sayFrame || !item.askPrompt || item.reactionPrompts?.length < 2) add(`TALK TOGETHER ${index+1}`,"SAY·ASK·REACT가 부족합니다.",`conversationFlow.talkRounds.${index}`,true);
    });
    if(new Set((flow.talkRounds||[]).map(item=>item.role)).size!==3) add("TALK TOGETHER","경험·개인 기준·그룹 판단 역할이 각각 필요합니다.","conversationFlow.talkRounds");
    if(!flow.groupMission?.instructionEn || flow.groupMission?.options?.length < 3) add("GROUP MISSION","설명 또는 선택지가 부족합니다.","conversationFlow.groupMission",true);
    if(!flow.groupMission?.everyoneSpeaksRule) add("GROUP MISSION","전원 발화 규칙이 없습니다.","conversationFlow.groupMission.everyoneSpeaksRule",true);
    if(flow.groupMission?.contextTag==="2026-08-03"&&/\b(soup|restaurant|lunch|tables|staff)\b/i.test(flow.groupMission.options?.join(" ")||"")) add("GROUP MISSION","온라인 상품 리뷰에 음식점 상황이 섞여 있습니다.","conversationFlow.groupMission.options",true);
    if(flow.topicPhrases?.length !== 4) add("SAY THIS","토픽 표현은 중복 없이 4개여야 합니다.","conversationFlow.topicPhrases");
    const normalize=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const actionText=new Set([
      ...(flow.storyPrompts||[]).flatMap(item=>item.storySteps||[]),
      ...(flow.talkRounds||[]).flatMap(item=>[item.sayFrame,item.askPrompt]),
      flow.finalRound?.sayFrame
    ].map(normalize).filter(Boolean));
    if((flow.topicPhrases||[]).some(item=>actionText.has(normalize(item.en)))) add("SAY THIS","Story·Talk·Final의 문장틀과 중복되는 표현이 있습니다.","conversationFlow.topicPhrases");
    const askText=new Set((flow.talkRounds||[]).map(item=>normalize(item.askPrompt)));
    if((flow.reactionPhrases||[]).some(item=>askText.has(normalize(item)))) add("USE ONE NOW","Talk Together의 ASK 문장이 반복됩니다.","conversationFlow.reactionPhrases");
    if(flow.reactionPhrases?.length !== 6) add("USE ONE NOW","반응 표현은 ASK 3개와 REACT 3개여야 합니다.","conversationFlow.reactionPhrases");
    if(!flow.finalRound?.questionEn || !flow.finalRound?.sayFrame) add("FINAL ROUND","마무리 질문이 불완전합니다.","conversationFlow.finalRound",true);
    return found;
  }
  function issues(flow) {return diagnostics(flow).map(item=>`${item.location}: ${item.message}`)}
  function evaluate(flow) {
    const details=diagnostics(flow),found=details.map(item=>`${item.location}: ${item.message}`);
    const deduction = Math.min(2,found.length);
    const scores = Object.fromEntries(scoreLabels.map(label=>[label,10 - deduction]));
    return {
      status:found.length === 0 ? "ready" : found.length <= 2 ? "review" : "regenerate",
      label:found.length === 0 ? "CONVERSATION READY" : found.length <= 2 ? "REVIEW REQUIRED" : "REGENERATE",
      scores,
      total:Object.values(scores).reduce((sum,value)=>sum + value,0),
      issues:found,
      diagnostics:details,
      critical:details.some(item=>item.critical)
    };
  }
  function applyFixtures(topics) {
    return Object.fromEntries(Object.entries(topics).map(([date,topic])=>[
      date,
      {...topic,conversationFlow:fromLegacy(topic),conversationFixture:true}
    ]));
  }
  window.TalkFlowConversation = {fromLegacy,issues,diagnostics,evaluate,applyFixtures};
})();
