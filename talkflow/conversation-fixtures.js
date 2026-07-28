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
    const extraPhrases = [
      {en:cleanFrame(easy[0]?.starter),ko:"내 생각을 시작할 때"},
      {en:cleanFrame(topic.finalRound?.starter),ko:"마지막 의견을 말할 때"}
    ];
    return {
      quickStarts:(topic.smallTalk || []).slice(0,3).map((item,index)=>({
        questionEn:item.questionEn,
        questionKo:item.questionKo,
        options:(quick.options || []).slice(index * 2,index * 2 + 2),
        sayFrame:cleanFrame(easy[index]?.starter || `I choose... because...`)
      })),
      storyPrompts:easy.slice(0,2).map((item,index)=>({
        questionEn:item.questionEn,
        questionKo:item.questionKo,
        storySteps:[
          cleanFrame(item.starter),
          index ? "The situation was..." : "At first, I...",
          index ? "I decided to..." : "Then...",
          "In the end..."
        ],
        askSomeone:item.followUp || "Has that ever happened to you?",
        noExperienceAlternative:"If it hasn't happened to you: What would you do in that situation?"
      })),
      talkRounds:main.slice(0,3).map(item=>({
        questionEn:item.questionEn,
        questionKo:item.questionKo,
        sayFrame:cleanFrame(item.starter),
        askPrompt:item.exampleFollowUp || "What about you?",
        reactionPrompts:["I agree because...", "I see it differently because...", item.deeperFollowUp || "Can you give an example?"]
      })),
      groupMission:{
        titleEn:mission.titleEn,
        titleKo:mission.titleKo,
        instructionEn:mission.instructionEn,
        instructionKo:mission.instructionKo,
        options:[...(mission.options || [])],
        resultType:mission.type === "ranking" ? "ranking" : mission.type === "design" ? "plan" : "choice",
        everyoneSpeaksRule:"Do not finalize the result until everyone has spoken."
      },
      topicPhrases:[...basePhrases,...extraPhrases].slice(0,5),
      reactionPhrases:[
        ...commonReactions.slice(0,3),
        main[0]?.exampleFollowUp || commonReactions[3],
        main[1]?.exampleFollowUp || commonReactions[4],
        main[2]?.exampleFollowUp || commonReactions[5]
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
  }
  function issues(flow) {
    const found = [];
    if(!flow) return ["Conversation Flow가 없습니다."];
    if(flow.quickStarts?.length !== 3) found.push("Start Now 질문은 3개여야 합니다.");
    if(flow.storyPrompts?.length !== 2) found.push("Tell Your Story 질문은 2개여야 합니다.");
    if(flow.talkRounds?.length !== 3) found.push("Talk Together 질문은 3개여야 합니다.");
    (flow.quickStarts || []).forEach((item,index)=>{
      if(!item.questionEn || !item.sayFrame) found.push(`Start Now ${index + 1}의 질문 또는 Say가 비어 있습니다.`);
      if(item.questionEn?.trim().split(/\s+/).length > 18) found.push(`Start Now ${index + 1} 질문이 너무 깁니다.`);
    });
    (flow.storyPrompts || []).forEach((item,index)=>{
      if(item.storySteps?.length < 3 || !item.askSomeone || !item.noExperienceAlternative) found.push(`Tell Your Story ${index + 1}의 Story Path 또는 대체 경로가 부족합니다.`);
    });
    (flow.talkRounds || []).forEach((item,index)=>{
      if(!item.sayFrame || !item.askPrompt || item.reactionPrompts?.length < 2) found.push(`Talk Together ${index + 1}의 SAY·ASK·REACT가 부족합니다.`);
    });
    if(!flow.groupMission?.instructionEn || flow.groupMission?.options?.length < 3) found.push("Group Mission의 설명 또는 선택지가 부족합니다.");
    if(!flow.groupMission?.everyoneSpeaksRule) found.push("Everyone Speaks Rule이 없습니다.");
    if(flow.topicPhrases?.length !== 5) found.push("Topic Phrases는 5개여야 합니다.");
    if(flow.reactionPhrases?.length !== 6) found.push("Reaction Phrases는 6개여야 합니다.");
    if(!flow.finalRound?.questionEn || !flow.finalRound?.sayFrame) found.push("Final Round가 불완전합니다.");
    return found;
  }
  function evaluate(flow) {
    const found = issues(flow);
    const deduction = Math.min(2,found.length);
    const scores = Object.fromEntries(scoreLabels.map(label=>[label,10 - deduction]));
    return {
      status:found.length === 0 ? "ready" : found.length <= 2 ? "review" : "regenerate",
      label:found.length === 0 ? "CONVERSATION READY" : found.length <= 2 ? "REVIEW REQUIRED" : "REGENERATE",
      scores,
      total:Object.values(scores).reduce((sum,value)=>sum + value,0),
      issues:found
    };
  }
  function applyFixtures(topics) {
    return Object.fromEntries(Object.entries(topics).map(([date,topic])=>[
      date,
      {...topic,conversationFlow:fromLegacy(topic),conversationFixture:true}
    ]));
  }
  window.TalkFlowConversation = {fromLegacy,issues,evaluate,applyFixtures};
})();
