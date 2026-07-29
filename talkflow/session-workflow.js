(function () {
  "use strict";

  const activityByDate = {
    "2026-08-03": ["Spot the Fake","spot","Find the three reviews with useful evidence.",["Detailed three-month update","Photo-only five stars","Sizing details","One-word complaint","Delivery and seller response","Copy-pasted praise"]],
    "2026-08-06": ["Best Choice Challenge","choice","Build one delivery order that works for the whole group.",["One spicy main","One mild main","Vegetarian side","Shared dessert","Budget drink","Fast-delivery option"]],
    "2026-08-10": ["Advice Lab","advice","Choose the clearest response for each work-message situation.",["Ask for the deadline","Confirm the owner","Summarize the request","Move the issue to a call","Wait for more context","Send a short acknowledgement"]],
    "2026-08-13": ["Build a Plan","plan","Build a flexible one-day trip plan together.",["One must-see place","One local meal","One free hour","One backup plan","One transport choice","One budget limit"]],
    "2026-08-17": ["Mini Negotiation","negotiate","Agree on one café for a mixed group.",["Quiet zone","Large tables","Good coffee","Low prices","Near the station","Open late"]],
    "2026-08-20": ["Budget Challenge","budget","Keep only three subscriptions within a shared budget.",["Video","Music","Cloud storage","Delivery membership","News","Fitness"]],
    "2026-08-24": ["Role Cards","roles","Match each person with one useful recommendation.",["A busy beginner","A careful buyer","A social learner","A budget traveler","A homebody","An early adopter"]],
    "2026-08-27": ["Attention Designer","design","Redesign one phone screen to reduce interruptions.",["Calls","Messages","Social media","News","Calendar","Weather"]]
  };
  const fallbackActivity = ["Best Choice Challenge","choice","Choose the strongest option and explain why.",["Option A","Option B","Option C","Option D"]];
  const resetByType = {
    spot:{titleEn:"Fast Trust Vote",titleKo:"빠른 신뢰 투표",instructionEn:"Raise your hand for the review you trust first. Give one 20-second reason.",instructionKo:"가장 먼저 믿는 리뷰에 손을 들고 20초로 이유를 말하세요."},
    choice:{titleEn:"A/B Stand or Hand",titleKo:"A/B 선택",instructionEn:"Stand if possible, or raise your hand for A or B. Ask one person why.",instructionKo:"가능하면 이동하고, 아니면 손으로 A/B를 고른 뒤 한 명에게 이유를 물으세요."},
    advice:{titleEn:"Twenty-Second Reply",titleKo:"20초 답장",instructionEn:"Give a 20-second reply, then change partners once.",instructionKo:"20초로 답하고 파트너를 한 번 바꾸세요."},
    plan:{titleEn:"One-Word Relay",titleKo:"한 단어 릴레이",instructionEn:"Add one travel word each without repeating.",instructionKo:"겹치지 않게 여행 단어를 한 사람씩 말하세요."},
    negotiate:{titleEn:"Quick Corner",titleKo:"빠른 선택 위치",instructionEn:"Choose quiet, social, cheap, or convenient. Move if possible, or raise your hand.",instructionKo:"조용함·대화·가격·접근성 중 하나를 고르세요. 가능하면 이동하고 아니면 손을 드세요."},
    budget:{titleEn:"Keep or Cut",titleKo:"유지 또는 해지",instructionEn:"Show keep or cut with your hand, then give one reason.",instructionKo:"손으로 유지·해지를 표시하고 이유를 하나 말하세요."},
    roles:{titleEn:"Fast Recommendation",titleKo:"빠른 추천",instructionEn:"Recommend one thing to the person beside you in 20 seconds.",instructionKo:"옆 사람에게 20초 안에 하나를 추천하세요."},
    design:{titleEn:"Notification Vote",titleKo:"알림 투표",instructionEn:"Vote for the first notification you would mute and say why.",instructionKo:"가장 먼저 끌 알림에 투표하고 이유를 말하세요."}
  };

  const contextDefinitions = [
    {
      date:"2026-08-31",
      title:{en:"Can We Trust AI-Written Reviews?",ko:"AI가 쓴 리뷰를 믿어도 될까?"},
      source:{type:"article",url:"https://www.nist.gov/artificial-intelligence",title:"Artificial Intelligence Risk Management Framework",publisher:"NIST",publishedAt:"2023-01-26",qrEnabled:true,qrAsset:"./assets/nist-ai-source-qr.png"},
      briefEn:["AI can produce fluent reviews that sound personal.","A believable tone does not prove a real purchase.","Platforms and readers need evidence beyond writing style."],
      briefKo:["AI는 개인 경험처럼 자연스러운 리뷰를 만들 수 있습니다.","말투가 자연스럽다고 실제 구매가 증명되지는 않습니다.","플랫폼과 독자는 문체 외의 근거도 확인해야 합니다."],
      exampleEn:"A detailed review may still be generated from a product description.",
      exampleKo:"구체적인 리뷰도 상품 설명만 보고 생성됐을 수 있습니다.",
      keywords:["generated","evidence","verification"],
      activity:["Spot the Fake","spot","Compare six review clues and choose the three strongest signs of a real experience.",["Long personal story","Verified purchase","Specific use over time","Perfect grammar","Photo with matching detail","Repeated brand slogan"]]
    },
    {
      date:"2026-09-03",
      title:{en:"Why Are Unstaffed Stores Growing?",ko:"무인 매장이 늘어나는 이유"},
      source:{type:"webpage",url:"https://www.oecd.org/digital/",title:"Digital economy and services",publisher:"OECD",publishedAt:"2024-05-14",qrEnabled:false},
      briefEn:["Unstaffed stores use sensors, apps, or self-checkout.","They can stay open longer with fewer routine tasks.","Customers may trade convenience for privacy or support."],
      briefKo:["무인 매장은 센서·앱·셀프 계산대를 사용합니다.","반복 업무를 줄여 더 오래 운영할 수 있습니다.","편리함 대신 개인정보나 도움 부족을 걱정할 수 있습니다."],
      exampleEn:"A small shop can open late even when no cashier is present.",
      exampleKo:"계산원이 없어도 작은 매장이 늦게까지 운영될 수 있습니다.",
      keywords:["self-checkout","convenience","privacy"],
      activity:["Problem Solving","advice","Design three rules for an unstaffed store that feels safe and easy to use.",["Clear help button","Cash payment option","Visible privacy notice","Human support hours","Simple refund path","Accessible checkout"]]
    }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const activityFor = topic => activityByDate[topic.date] || fallbackActivity;
  function sessionTwo(topic, activityOverride) {
    const [titleEn,type,goal,options] = activityOverride || activityFor(topic);
    const reset = resetByType[type] || resetByType.choice;
    return {
      minutes:40,
      reset:{minutes:5,...reset},
      mainActivity:{
        minutes:20,type,titleEn,titleKo:"메인 활동",goalEn:goal,goalKo:"모두 말하며 하나의 결과를 만드세요.",
        steps:["Choose one facilitator.","Use every option or role.","Give each person one turn.","Compare reasons before deciding."],
        use:["I would choose... because...","I see one problem with...","Could we combine these ideas?"],
        options:[...options],
        result:"One shared result"
      },
      groupDecision:{minutes:10,resultType:type==="plan"?"plan":type==="spot"?"ranking":"choice",promptEn:"Record one final group result.",promptKo:"그룹의 최종 결과 하나를 정하세요.",everyoneSpeaksRule:"Do not finalize the result until everyone has spoken."},
      finalRound:{minutes:5,questionEn:"What is one idea you will remember?",questionKo:"기억에 남는 생각 하나는 무엇인가요?",sayFrame:"One idea I will remember is..."}
    };
  }
  function upgradeTopic(topic) {
    const upgraded=clone(topic),flow=upgraded.conversationFlow;
    if(!flow)return upgraded;
    upgraded.topicMode=upgraded.topicMode||"everyday";
    upgraded.sourceMaterial=upgraded.sourceMaterial||{type:"none",url:"",title:"",publisher:"",publishedAt:"",qrEnabled:false};
    upgraded.commonGround=upgraded.commonGround||{enabled:false,briefEn:[],briefKo:[],exampleEn:"",exampleKo:"",keywords:[]};
    upgraded.sessionOne=upgraded.sessionOne||{minutes:50,quickStarts:flow.quickStarts,storyPrompts:flow.storyPrompts,talkRounds:flow.talkRounds.slice(0,1),phrases:flow.topicPhrases};
    upgraded.sessionTwo=upgraded.sessionTwo||sessionTwo(upgraded);
    upgraded.operatorStatus=upgraded.operatorStatus||{generationStatus:"complete",reviewStatus:"review",printStatus:"unchecked",used:false};
    return upgraded;
  }
  function contextualFlow(definition) {
    const ai=definition.date==="2026-08-31";
    const subject=ai?"AI-written reviews":"unstaffed stores";
    const quickQuestions=ai?[
      ["What makes an online review feel real?","온라인 리뷰가 진짜처럼 느껴지는 이유는 무엇인가요?"],
      ["Have you ever doubted a review?","리뷰를 의심한 적이 있나요?"],
      ["Which clue would you check first?","어떤 단서를 먼저 확인하나요?"]
    ]:[
      ["Would you use an unstaffed store at night?","밤에 무인 매장을 이용하시겠어요?"],
      ["What feels convenient about self-checkout?","셀프 계산의 편리한 점은 무엇인가요?"],
      ["When would you want human help?","언제 사람의 도움이 필요할까요?"]
    ];
    const stories=ai?[
      ["Tell us about a review that changed your choice.","선택을 바꾼 리뷰 경험을 말해 보세요."],
      ["Describe a review that felt suspicious.","의심스러웠던 리뷰를 설명해 보세요."]
    ]:[
      ["Tell us about using self-checkout.","셀프 계산대를 이용한 경험을 말해 보세요."],
      ["Describe a time technology made shopping harder.","기술 때문에 쇼핑이 어려웠던 경험을 말해 보세요."]
    ];
    const talk=ai?[
      ["Which evidence is stronger than writing style?","문체보다 강한 근거는 무엇인가요?"],
      ["Who should label AI-written reviews?","AI 작성 리뷰는 누가 표시해야 할까요?"],
      ["What rule would protect shoppers best?","소비자를 가장 잘 보호할 규칙은 무엇인가요?"]
    ]:[
      ["What is the biggest benefit of unstaffed stores?","무인 매장의 가장 큰 장점은 무엇인가요?"],
      ["What support should every store provide?","모든 매장이 제공해야 할 도움은 무엇인가요?"],
      ["How can a store balance convenience and privacy?","편리함과 개인정보를 어떻게 조화시킬까요?"]
    ];
    return {
      quickStarts:quickQuestions.map((question,index)=>({questionEn:question[0],questionKo:question[1],options:index===2?["The source","The details","The account history"]:[],answerMode:index===2?"choice":"open",sayFrame:"I would say... because..."})),
      storyPrompts:stories.map(question=>({questionEn:question[0],questionKo:question[1],storySteps:["The situation was...","I noticed...","That made me...","In the end, I..."],askSomeone:"What would you have done?",noExperienceAlternative:`If you have no experience, imagine one situation with ${subject}.`})),
      talkRounds:talk.map((question,index)=>({role:["experience","criteria","group"][index],questionEn:question[0],questionKo:question[1],sayFrame:"My view is... because...",askPrompt:"What makes you say that?",reactionPrompts:["I agree because...","I see one risk..."]})),
      groupMission:{titleEn:definition.activity[0],titleKo:"그룹 미션",instructionEn:definition.activity[2],instructionKo:"근거를 비교하고 그룹의 결과 하나를 정하세요.",options:[...definition.activity[3]],resultType:"choice",contextTag:definition.date,everyoneSpeaksRule:"Do not finalize the result until everyone has spoken."},
      topicPhrases:(ai?[["How can we verify it?","어떻게 확인할 수 있나요?"],["The evidence is limited.","근거가 부족해요."],["It sounds convincing, but...","설득력 있어 보이지만…"],["We need a clear label.","명확한 표시가 필요해요."]]:[["It saves routine work.","반복 업무를 줄여요."],["I still need human help.","그래도 사람의 도움이 필요해요."],["The privacy trade-off is...","개인정보 측면의 대가는…"],["A clear fallback would help.","명확한 대안이 있으면 좋아요."]]).map(([en,ko])=>({en,ko})),
      reactionPhrases:["Really? What happened?","Why do you think so?","Can you give an example?","That makes sense.","I agree because...","I see it differently because..."],
      finalRound:{questionEn:`What is one idea you will remember about ${subject}?`,questionKo:"기억에 남는 생각 하나는 무엇인가요?",sayFrame:"One idea I will remember is..."},
      leaderGuide:{shortAnswerPrompts:["What makes you say that?"],noExperiencePrompts:["Imagine one possible situation."],turnTransitions:["Let's hear from someone new."],quietSpeakerPrompts:["Which option feels closest?"]}
    };
  }
  function contextTopic(base, definition) {
    const topic=upgradeTopic({...clone(base),date:definition.date,id:`talkflow-${definition.date}-context`,title:definition.title,quality:{status:"review",score:0,issues:[]}});
    topic.conversationFlow=contextualFlow(definition);
    topic.topicMode="context";
    topic.sourceMaterial=clone(definition.source);
    topic.commonGround={enabled:true,briefEn:definition.briefEn,briefKo:definition.briefKo,exampleEn:definition.exampleEn,exampleKo:definition.exampleKo,keywords:definition.keywords};
    topic.sessionOne={minutes:50,quickStarts:topic.conversationFlow.quickStarts.slice(0,2),storyPrompts:topic.conversationFlow.storyPrompts.slice(0,1),talkRounds:topic.conversationFlow.talkRounds.slice(0,2),phrases:topic.conversationFlow.topicPhrases};
    topic.sessionTwo=sessionTwo(topic,definition.activity);
    topic.operatorStatus={generationStatus:"complete",reviewStatus:"review",printStatus:"unchecked",used:false};
    topic.contextFixture=true;
    return topic;
  }
  function applyTopics(topics, includeContext=false) {
    const entries=Object.entries(topics).map(([date,topic])=>[date,upgradeTopic(topic)]);
    if(includeContext&&entries.length){
      const base=entries[0][1];
      contextDefinitions.forEach(definition=>entries.push([definition.date,contextTopic(base,definition)]));
    }
    return Object.fromEntries(entries);
  }
  function diagnostics(topic) {
    const found=[],add=(location,message,target,critical=false)=>found.push({location,message,target,critical});
    if(!topic.sessionOne||topic.sessionOne.minutes!==50)add("SESSION 1","50분 구성이 없습니다.","sessionOne",true);
    if(!topic.sessionTwo||topic.sessionTwo.minutes!==40)add("SESSION 2","40분 구성이 없습니다.","sessionTwo",true);
    if(!topic.sessionTwo?.reset)add("RESET","환기 활동이 없습니다.","sessionTwo.reset",true);
    if(!topic.sessionTwo?.mainActivity?.options?.length)add("MAIN ACTIVITY","활동 선택지가 없습니다.","sessionTwo.mainActivity",true);
    if(!topic.sessionTwo?.groupDecision?.everyoneSpeaksRule)add("GROUP DECISION","전원 발화 규칙이 없습니다.","sessionTwo.groupDecision",true);
    if(!topic.sessionTwo?.finalRound?.questionEn)add("FINAL ROUND","마무리 발화가 없습니다.","sessionTwo.finalRound",true);
    if(topic.topicMode==="context"){
      if(!topic.commonGround?.enabled||topic.commonGround.briefEn?.length!==3)add("60-SECOND BRIEF","핵심 내용은 3줄이어야 합니다.","commonGround",true);
      if(!topic.sourceMaterial?.publisher||!topic.sourceMaterial?.publishedAt)add("SOURCE","출처명과 날짜가 필요합니다.","sourceMaterial",true);
    }
    return found;
  }
  function operatingDates(prefix, weekdays=[1,4], excluded=[]) {
    const [year,month]=prefix.split("-").map(Number),days=new Date(year,month,0).getDate(),blocked=new Set(excluded);
    return Array.from({length:days},(_,index)=>`${prefix}-${String(index+1).padStart(2,"0")}`).filter(date=>weekdays.includes(new Date(`${date}T12:00:00`).getDay())&&!blocked.has(date));
  }

  window.TalkFlowSessions={applyTopics,upgradeTopic,diagnostics,operatingDates,contextDefinitions};
})();
