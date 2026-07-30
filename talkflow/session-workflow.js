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
      activity:["Evidence Role Debate","roles","Assign platform, seller, and shopper roles. Defend one verification rule, challenge another role, then agree on a policy.",["Verified purchase record","Specific use over time","Matching photo detail","Account history","Clear AI label","Appeal process"]]
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
  const materialByDate = {
    "2026-08-06": ["scenario","One person wants spicy food, one avoids meat, and one has a 45-minute delivery limit. The group has ₩45,000 for dinner.","한 명은 매운 음식을 원하고, 한 명은 고기를 먹지 않으며, 한 명은 45분 안에 배달받아야 합니다. 저녁 예산은 45,000원입니다."],
    "2026-08-10": ["message","Could you update the client deck today? I need the numbers checked before the 3 p.m. call, but Mina may have the latest file.","오늘 고객 발표 자료를 수정해 주실 수 있나요? 오후 3시 통화 전에 수치를 확인해야 하지만 최신 파일은 미나에게 있을 수 있습니다."],
    "2026-08-13": ["schedule","09:00 market · 11:30 museum booking · 14:00 rain forecast · 18:30 dinner. Budget: ₩90,000. Keep at least two hours free.","09:00 시장 · 11:30 박물관 예약 · 14:00 비 예보 · 18:30 저녁. 예산은 90,000원이며 자유 시간 두 시간을 남겨야 합니다."],
    "2026-08-17": ["options","Cafe Pine is quiet but closes at 7. Metro Cup is crowded but beside the station. Table Lab costs more but takes reservations.","카페 파인은 조용하지만 7시에 닫습니다. 메트로 컵은 붐비지만 역 옆입니다. 테이블 랩은 비싸지만 예약할 수 있습니다."],
    "2026-08-20": ["statistic","Video ₩17,000, music ₩11,000, cloud ₩9,000, delivery ₩8,000, news ₩12,000, fitness ₩24,000. The group budget is ₩40,000.","영상 17,000원, 음악 11,000원, 클라우드 9,000원, 배달 8,000원, 뉴스 12,000원, 운동 24,000원. 그룹 예산은 40,000원입니다."],
    "2026-08-24": ["scenario","Jisu has little free time, dislikes crowds, wants to spend under ₩30,000, and prefers something she can try alone first.","지수는 시간이 적고 붐비는 곳을 싫어하며 30,000원 이하를 원합니다. 먼저 혼자 해볼 수 있는 것을 선호합니다."],
    "2026-08-27": ["schedule","A phone shows 24 chat alerts, 8 news alerts, 5 shopping alerts, 3 calendar alerts, and two missed calls during one work morning.","한 업무 시간 동안 휴대폰에 채팅 24개, 뉴스 8개, 쇼핑 5개, 일정 3개, 부재중 전화 2개가 표시됐습니다."],
    "2026-08-31": ["statistic","Review A has a verified purchase but no details. Review B has no purchase badge but describes three months of use. Review C gives a photo and one specific problem.","리뷰 A는 구매 인증이 있지만 세부 내용이 없습니다. 리뷰 B는 인증이 없지만 3개월 사용 경험을 설명합니다. 리뷰 C는 사진과 구체적인 문제 하나를 제시합니다."],
    "2026-09-03": ["scenario","Store A is open 24 hours with camera support. Store B closes at midnight but has remote staff. Store C accepts cash but stores face data for entry.","A 매장은 카메라 지원으로 24시간 운영합니다. B 매장은 자정에 닫지만 원격 직원이 있습니다. C 매장은 현금을 받지만 입장용 얼굴 데이터를 저장합니다."]
  };
  const onlineReviews = [
    {type:"reviewText",title:"REVIEW A",contentEn:"The color was darker than the photos, but the size chart was accurate. Delivery was one day late, and the seller answered my question within an hour.",contentKo:"색상은 사진보다 어두웠지만 사이즈표는 정확했어요. 배송은 하루 늦었고 판매자는 한 시간 안에 질문에 답했습니다.",hasSingleCorrectAnswer:false},
    {type:"reviewText",title:"REVIEW B",contentEn:"It worked well at first, then froze once after a week. It restarted normally, and the price was low enough that I might keep it.",contentKo:"처음에는 잘 작동했지만 일주일 뒤 한 번 멈췄어요. 다시 켜니 정상 작동했고 가격이 저렴해서 계속 쓸지 고민 중입니다.",hasSingleCorrectAnswer:false},
    {type:"reviewText",title:"REVIEW C",contentEn:"The fabric felt thinner than I expected, but it kept its shape after two washes. At the same price, I am not sure I would buy it again.",contentKo:"소재는 예상보다 얇았지만 두 번 세탁한 뒤에도 모양이 유지됐어요. 같은 가격이라면 다시 살지는 잘 모르겠습니다.",hasSingleCorrectAnswer:false}
  ];
  const axesByDate = {
    "2026-08-03":["recentExperience","evaluationCriteria","personalStory","conflict","decision"],
    "2026-08-06":["personalHabit","evaluationCriteria","conflict","solution","decision"],
    "2026-08-10":["recentExperience","comparison","conflict","systemPolicy","solution"],
    "2026-08-13":["personalHabit","personalStory","comparison","conflict","decision"],
    "2026-08-17":["recentExperience","evaluationCriteria","comparison","conflict","decision"],
    "2026-08-20":["personalHabit","trustBreakers","comparison","conflict","decision"],
    "2026-08-24":["recentExperience","evaluationCriteria","comparison","conflict","solution"],
    "2026-08-27":["personalHabit","trustBreakers","comparison","systemPolicy","solution"],
    "2026-08-31":["evaluationCriteria","trustBreakers","comparison","systemPolicy","decision"],
    "2026-09-03":["recentExperience","comparison","conflict","systemPolicy","solution"]
  };
  function conversationMaterial(topic) {
    if(topic.date==="2026-08-03")return clone(onlineReviews);
    const [type,contentEn,contentKo]=materialByDate[topic.date]||["scenario","Two people want different results from the same choice. Compare their conditions and make one fair plan.","두 사람이 같은 선택에서 서로 다른 결과를 원합니다. 조건을 비교해 공정한 계획 하나를 만드세요."];
    return [{type,title:"USE THIS EVIDENCE",contentEn,contentKo,hasSingleCorrectAnswer:false}];
  }
  function speakingFields(topic) {
    const assigned=["advice","negotiate","roles"].includes(activityFor(topic)[1])||topic.date==="2026-08-03";
    return {
      speakingMechanisms:{informationGap:true,personalArtifact:topic.date==="2026-08-03",timedTurn:true,assignedOpposition:assigned,openEndedDecision:true},
      conversationMaterials:conversationMaterial(topic),
      promptAxes:axesByDate[topic.date]||["recentExperience","comparison","conflict","decision"],
      turnProtocol:{secondsPerPerson:topic.date==="2026-08-03"?60:45,followUpRequired:true,everyoneBeforeNextStep:true},
      activityEvidence:{expectedMinutes:20,requiresDisagreement:true,requiresParticipantOutput:true,finalResultType:topic.date==="2026-08-03"?"rating":activityFor(topic)[1]}
    };
  }
  function linkSpeakingPrompts(topic) {
    const flow=topic.conversationFlow,targets=[...(flow?.quickStarts||[]),...(flow?.storyPrompts||[]),...(flow?.talkRounds||[])];
    const fixture=Boolean(topic.conversationFixture||topic.contextFixture||topic.generatedConversation);
    targets.forEach((item,index)=>{
      if(fixture||!item.axis)item.axis=topic.promptAxes[index%topic.promptAxes.length];
      if(fixture||!item.reactionPrompts?.length)item.reactionPrompts=[flow.reactionPhrases[index%flow.reactionPhrases.length],flow.reactionPhrases[(index+1)%flow.reactionPhrases.length]];
    });
  }
  const activityFor = topic => activityByDate[topic.date] || fallbackActivity;
  function sessionTwo(topic, activityOverride) {
    const [titleEn,type,goal,options] = activityOverride || activityFor(topic);
    const reset = resetByType[type] || resetByType.choice;
    const assignedOpposition=["advice","negotiate","roles"].includes(type);
    return {
      minutes:40,
      reset:{minutes:5,...reset},
      mainActivity:{
        minutes:20,type,titleEn,titleKo:"메인 활동",goalEn:goal,goalKo:"모두 말하며 하나의 결과를 만드세요.",
        steps:["Prepare one private choice.","Take one timed turn each.","Ask the next person one question.","Defend or challenge one reason.","Compare the evidence before deciding."],
        use:["I would choose... because...","I see one problem with...","Can you change my mind?","I disagree because..."],
        options:[...options],
        roles:assignedOpposition?[{name:"SIDE A",brief:`Defend ${options[0]||"the first option"} with one fact.`},{name:"SIDE B",brief:`Challenge ${options[0]||"the first option"} and defend ${options[1]||"another option"}.`}]:[],
        result:"One shared result",participantOutput:"One defended choice from every person"
      },
      groupDecision:{minutes:10,resultType:type==="plan"?"plan":type==="spot"?"ranking":"choice",promptEn:"Record one final group result.",promptKo:"그룹의 최종 결과 하나를 정하세요.",everyoneSpeaksRule:"Don't decide until everyone has spoken."},
      finalRound:{minutes:5,questionEn:"What is one line you will remember today?",questionKo:"오늘 기억에 남는 말 하나는?",sayFrame:"One line I will remember is..."}
    };
  }
  function onlineReviewSession(topic) {
    topic.conversationFlow.quickStarts[0]=
      {axis:"recentExperience",questionEn:"What was the last thing you bought online?",questionKo:"가장 최근에 온라인으로 산 물건이 뭐예요?",options:[],answerMode:"open",sayFrame:"I bought... It had... stars."};
    topic.conversationFlow.storyPrompts[0]={
      axis:"personalStory",questionEn:"Tell us about a purchase that did not match the reviews.",questionKo:"리뷰와 달랐던 구매 경험을 말해 보세요.",
      storySteps:["I bought...","The reviews said...","But when I received it...","So I..."],askSomeone:"What happened next?",noExperienceAlternative:"If that has never happened, describe the least useful review you have seen."
    };
    topic.conversationFlow.talkRounds[0]=
      {axis:"evaluationCriteria",role:"evidence",questionEn:"Which review gives you the strongest reason to buy or skip?",questionKo:"어떤 리뷰가 구매 여부를 판단할 가장 강한 근거를 주나요?",sayFrame:"I would buy it because...",askPrompt:"Can you change my mind?",reactionPrompts:["I still disagree because...","That detail matters to me too."]}
    ;
    topic.conversationFlow.topicPhrases=[
      {en:"I don't fully trust that rating.",ko:"그 평점을 완전히 믿지는 않아요."},
      {en:"The details sound believable.",ko:"세부 내용이 믿을 만해요."},
      {en:"That would stop me from buying it.",ko:"그렇다면 사지 않을 거예요."},
      {en:"I would still give it a chance.",ko:"그래도 한 번은 사볼 수 있어요."}
    ];
    topic.conversationFlow.reactionPhrases=["Really? What happened next?","Same here.","I had a different experience.","I'd say the opposite.","Why do you think that?","Can you give one example?"];
    topic.sessionOne={
      minutes:50,format:"evidenceRounds",
      rounds:[
        {type:"personalArtifact",title:"REAL ITEM ROUND",minutes:12,instructionEn:"Open one recent purchase on your phone. If you cannot use your phone, remember one item. Share only the item name if you prefer.",instructionKo:"최근 구매 내역 하나를 보세요. 휴대폰 사용이 어렵다면 기억나는 물건을 떠올리세요. 원하면 물건명만 말해도 됩니다.",prompts:["What did you buy?","How many stars did it have?","How many reviews did you read?","What detail did you check first?"]},
        {type:"evidence",title:"EVIDENCE ROUND",minutes:18,instructionEn:"Choose BUY or DON'T BUY. Mark one detail, explain for 30 seconds, ask someone with the opposite choice, then decide whether to change.",instructionKo:"구매 또는 비구매를 고르고 근거 하나를 표시하세요. 30초로 설명한 뒤 반대 선택자에게 질문하고 선택을 바꿀지 정하세요."},
        {type:"story",title:"STORY ROUND",minutes:20,instructionEn:"Speak for 60 seconds. The next person must ask one follow-up question.",instructionKo:"60초 동안 말하세요. 다음 사람은 반드시 후속 질문을 하나 하세요."}
      ],
      quickStarts:topic.conversationFlow.quickStarts.slice(0,1),storyPrompts:topic.conversationFlow.storyPrompts.slice(0,1),talkRounds:topic.conversationFlow.talkRounds.slice(0,1),phrases:topic.conversationFlow.topicPhrases
    };
    topic.sessionTwo={
      minutes:40,
      reset:{minutes:5,titleEn:"RESET VOTE",titleKo:"손들기 투표",instructionEn:"Which is more useful: a detailed three-star review or a short five-star review? One person from each side gives a 20-second reason.",instructionKo:"자세한 3점 리뷰와 짧은 5점 리뷰 중 더 유용한 쪽에 손을 드세요. 각 그룹 한 명이 20초로 이유를 말합니다."},
      mainActivity:{minutes:20,type:"informationGap",titleEn:"WRITE THE FAKE",titleKo:"진짜 한 문장, 가짜 한 문장",goalEn:"Write one true purchase sentence and one invented sentence. Mix the order, read both, hear guesses, defend both, then reveal.",goalKo:"실제 경험 한 문장과 지어낸 문장 한 개를 순서를 섞어 읽고, 추측과 변호 뒤 정답을 공개하세요.",steps:["Prepare two private sentences for 3 minutes.","Read both in a mixed order.","Everyone chooses the fake and gives a reason.","The writer defends both sentences.","Reveal only after everyone has spoken."],use:["I think this one is fake because...","This one sounds more believable.","Let me defend that sentence.","What made you suspicious?"],options:["TRUE sentence: ____________________","FAKE sentence: ____________________"],result:"The group records its strongest clue.",participantOutput:"Two sentences and one defended guess per person"},
      secondaryActivity:{minutes:10,titleEn:"STAR FIGHT",titleKo:"별점 대결",scenarioEn:"Low price · one-day delay · darker color · accurate size · fast seller reply",scenarioKo:"저렴한 가격 · 하루 배송 지연 · 어두운 색상 · 정확한 사이즈 · 빠른 판매자 답변",roles:[{name:"TEAM A",brief:"Give it five stars."},{name:"TEAM B",brief:"Give it one star."}],rule:"Use facts, give every person one sentence, and challenge the other team once.",use:["I would still give it five stars because...","One star is fair because...","That does not outweigh...","I disagree with that rating because..."]},
      groupDecision:{minutes:5,resultType:"rating",promptEn:"Our group gives it ______ stars because ______.",promptKo:"우리 그룹의 최종 별점과 이유를 정하세요.",everyoneSpeaksRule:"Don't decide until everyone has spoken."},
      finalRound:{minutes:0,questionEn:"",questionKo:"",sayFrame:""}
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
    Object.entries(speakingFields(upgraded)).forEach(([key,value])=>{if(!upgraded[key])upgraded[key]=value});
    if(upgraded.date==="2026-08-03"&&upgraded.conversationFixture)onlineReviewSession(upgraded);
    linkSpeakingPrompts(upgraded);
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
    Object.assign(topic,speakingFields(topic));
    linkSpeakingPrompts(topic);
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
    if(!topic.sessionTwo?.finalRound?.questionEn&&!topic.sessionTwo?.secondaryActivity)add("FINAL ROUND","마무리 발화가 없습니다.","sessionTwo.finalRound",true);
    if(topic.topicMode==="context"){
      if(!topic.commonGround?.enabled||topic.commonGround.briefEn?.length!==3)add("60-SECOND BRIEF","핵심 내용은 3줄이어야 합니다.","commonGround",true);
      if(!topic.sourceMaterial?.publisher||!topic.sourceMaterial?.publishedAt)add("SOURCE","출처명과 날짜가 필요합니다.","sourceMaterial",true);
    }
    return found;
  }
  function speakingDiagnostics(topic) {
    const found=[],add=(location,message,target,critical=false)=>found.push({location,message,target,critical});
    const mechanisms=topic.speakingMechanisms||{},mechanismCount=Object.values(mechanisms).filter(Boolean).length;
    if(mechanismCount<3)add("발화 장치","발화 강제 장치가 3종 미만입니다.","speakingMechanisms",true);
    if(!mechanisms.timedTurn&&!mechanisms.assignedOpposition)add("순번·역할","순번 또는 반대 역할 장치가 없습니다.","speakingMechanisms",true);
    if(!mechanisms.openEndedDecision)add("그룹 결론","정답 없는 최종 결정이 없습니다.","speakingMechanisms.openEndedDecision",true);
    const axisTargets=[...(topic.conversationFlow?.quickStarts||[]),...(topic.conversationFlow?.storyPrompts||[]),...(topic.conversationFlow?.talkRounds||[])];
    const axes=axisTargets.map(item=>item.axis).filter(Boolean),axisCounts=axes.reduce((counts,axis)=>(counts[axis]=(counts[axis]||0)+1,counts),{});
    if(axes.length!==axisTargets.length)add("질문 축","질문 또는 활동에 발화 축이 연결되지 않았습니다.","conversationFlow",true);
    if(new Set(axes).size<3)add("질문 축","서로 다른 발화 축이 3개 미만입니다.","promptAxes",true);
    if(Object.values(axisCounts).some(count=>count>2))add("질문 축","같은 발화 축이 2회를 초과합니다.","promptAxes",true);
    const materials=topic.conversationMaterials||[];
    const completeMaterial=item=>{
      const en=(item.contentEn||"").trim(),ko=(item.contentKo||"").trim();
      return en.split(/\s+/).length>=8&&/[.!?]$/.test(en)&&ko.length>=12&&/[.?!요다]$/.test(ko);
    };
    if(!materials.length||materials.some(item=>!completeMaterial(item)))add("대화 재료","영문·국문으로 판단할 수 있는 완전한 문장이나 데이터가 없습니다.","conversationMaterials",true);
    if(materials.some(item=>item.hasSingleCorrectAnswer))add("대화 재료","정답이 표시된 자료가 있습니다.","conversationMaterials",true);
    if(!topic.turnProtocol?.followUpRequired||!topic.turnProtocol?.everyoneBeforeNextStep)add("순번 규칙","후속 질문 또는 전원 발화 규칙이 없습니다.","turnProtocol",true);
    if(topic.sessionTwo?.mainActivity?.steps?.length<5||!topic.sessionTwo?.mainActivity?.participantOutput)add("20분 활동","추측·변호·산출물이 있는 20분 단계가 부족합니다.","sessionTwo.mainActivity",true);
    if(!topic.activityEvidence?.requiresDisagreement||!topic.activityEvidence?.requiresParticipantOutput)add("활동 지속성","이견 또는 참가자 산출물이 필요하지 않습니다.","activityEvidence",true);
    const renderedRoles=[...(topic.sessionTwo?.mainActivity?.roles||[]),...(topic.sessionTwo?.secondaryActivity?.roles||[])];
    if(mechanisms.assignedOpposition&&(renderedRoles.length<2||renderedRoles.some(role=>!(role.name||"").trim()||!(role.brief||"").trim())))add("반대 역할","서로 다른 역할명과 행동 지시가 인쇄 활동에 없습니다.","sessionTwo",true);
    const decision=topic.sessionTwo?.groupDecision;
    if(mechanisms.openEndedDecision&&(!(decision?.promptEn||"").trim()||!(decision?.promptKo||"").trim()||!(decision?.everyoneSpeaksRule||"").trim()))add("그룹 결론","인쇄 가능한 정답 없는 결정 문항과 전원 발화 규칙이 없습니다.","sessionTwo.groupDecision",true);
    const pageOneMechanisms=[materials.length>0,Boolean(topic.turnProtocol?.secondsPerPerson),Boolean(topic.turnProtocol?.followUpRequired),Boolean(mechanisms.personalArtifact)].filter(Boolean).length;
    const pageTwoMechanisms=[Boolean(topic.sessionTwo?.mainActivity?.steps?.length>=5),renderedRoles.length>=2,Boolean(decision?.everyoneSpeaksRule),Boolean(topic.sessionTwo?.mainActivity?.participantOutput)].filter(Boolean).length;
    if(pageOneMechanisms<2||pageTwoMechanisms<2)add("페이지별 발화 장치","각 페이지에 실제 발화 강제 장치가 2종 이상 필요합니다.","sessionOne",true);
    const reactions=topic.conversationFlow?.reactionPhrases||[],normalized=reactions.map(item=>item.toLowerCase()),counts=normalized.reduce((all,item)=>(all[item]=(all[item]||0)+1,all),{});
    if(Object.values(counts).some(count=>count>2))add("REACT","같은 반응 표현이 2회를 초과합니다.","conversationFlow.reactionPhrases");
    if(!reactions.some(item=>/(disagree|opposite|different)/i.test(item)))add("REACT","반박형 반응 표현이 없습니다.","conversationFlow.reactionPhrases",true);
    if(!reactions.some(item=>/\?|why|what made|example/i.test(item)))add("REACT","이유 요청형 반응 표현이 없습니다.","conversationFlow.reactionPhrases",true);
    const renderedReactions=axisTargets.map(item=>item.reactionPrompts?.[0]).filter(Boolean).map(item=>item.toLowerCase()),renderedCounts=renderedReactions.reduce((all,item)=>(all[item]=(all[item]||0)+1,all),{});
    if(Object.values(renderedCounts).some(count=>count>2))add("REACT","인쇄되는 동일 반응 표현이 2회를 초과합니다.","conversationFlow",true);
    return found;
  }
  function speakingEvaluate(topic) {
    const diagnostics=speakingDiagnostics(topic);
    const linkedAxes=[...(topic.conversationFlow?.quickStarts||[]),...(topic.conversationFlow?.storyPrompts||[]),...(topic.conversationFlow?.talkRounds||[])].map(item=>item.axis).filter(Boolean);
    return {
      status:diagnostics.some(item=>item.critical)?"fail":diagnostics.length?"review":"ready",
      label:diagnostics.some(item=>item.critical)?"SPEAKING FAIL":diagnostics.length?"SPEAKING REVIEW REQUIRED":"SPEAKING READY",
      diagnostics,
      checks:{
        material:(topic.conversationMaterials||[]).length>0&&!diagnostics.some(item=>item.target==="conversationMaterials"),
        axes:new Set(linkedAxes).size>=3&&!diagnostics.some(item=>item.target==="conversationFlow"),
        turns:Boolean(topic.turnProtocol?.everyoneBeforeNextStep),
        opposition:!diagnostics.some(item=>item.location==="반대 역할")&&Boolean(topic.activityEvidence?.requiresDisagreement),
        decision:!diagnostics.some(item=>item.target==="sessionTwo.groupDecision")&&Boolean(topic.speakingMechanisms?.openEndedDecision)
      }
    };
  }
  function operatingDates(prefix, weekdays=[1,4], excluded=[]) {
    const [year,month]=prefix.split("-").map(Number),days=new Date(year,month,0).getDate(),blocked=new Set(excluded);
    return Array.from({length:days},(_,index)=>`${prefix}-${String(index+1).padStart(2,"0")}`).filter(date=>weekdays.includes(new Date(`${date}T12:00:00`).getDay())&&!blocked.has(date));
  }

  window.TalkFlowSessions={applyTopics,upgradeTopic,diagnostics,speakingDiagnostics,speakingEvaluate,operatingDates,contextDefinitions};
})();
