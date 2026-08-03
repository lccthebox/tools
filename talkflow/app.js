(function () {
  "use strict";
  const KEYS={data:"tb_talkflow_v1",settings:"tb_talkflow_settings_v1",drafts:"tb_talkflow_drafts_v1",versions:"tb_talkflow_versions_v1",feedback:"tb_talkflow_feedback_v1"};
  const STANDARD={version:"2",studentTemplate:"student-v4",leaderTemplate:"leader-v4"};
  const SECTION_KEYS=["hook","goal","smallTalk","quickActivity","easyEntry","mainDiscussion","midGame","usefulPhrases","finalRound"];
  const SECTION_LABELS=["Topic Hook","Today's Goal","Small Talk","Quick Activity","Easy Entry","Main Discussion","Mid-game","Useful Phrases","Final Round"];
  const BAD_ENGLISH=["say the truth","different with","go spontaneous","star point","if nobody would know"];
  const SENSITIVE=["big secret","income","salary","work mistake","dating conflict","family problem","disease","political view","religion","appearance","trauma","큰 비밀","소득","연봉","직장 실수","연애 갈등","가족 문제","질병","정치 성향","종교","외모","트라우마"];
  const Generation=window.TalkFlowGeneration;
  const Simple=window.TalkFlowSimpleGeneration;
  const $=s=>document.querySelector(s);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const koTitle=value=>esc(value).replace(/ (?=\S+$)/,"&nbsp;");
  const clone=value=>JSON.parse(JSON.stringify(value));
  let topics=loadTopics(),settings=loadSettings(),activeDate=Object.keys(topics).sort()[0]||today(),cursor=new Date("2026-08-01T12:00:00"),view="calendar",dirty=false;
  let printDates=new Set(),printLeader=false;
  let timerSeconds=0,timerHandle=null;

  function today(){return new Date().toISOString().slice(0,10)}
  function loadTopics(){
    try{
      const raw=localStorage.getItem(KEYS.data),fixture=new URLSearchParams(location.search).get("fixtures");
      if(!raw){
        const samples=clone(window.TALKFLOW_SAMPLE_TOPICS||{});
        if(!fixture)return samples;
        const conversations=window.TalkFlowConversation.applyFixtures(samples);
        return window.TalkFlowSessions.applyTopics(conversations,fixture==="sessions");
      }
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
        if(fixture==="conversation"||fixture==="sessions")return window.TalkFlowSessions.applyTopics(window.TalkFlowConversation.applyFixtures(parsed),fixture==="sessions");
        return window.TalkFlowSessions.applyTopics(parsed);
      }
      return clone(window.TALKFLOW_SAMPLE_TOPICS||{});
    }catch(error){setTimeout(()=>notify(`저장 데이터 복원 실패: ${error.message}`,true));return clone(window.TALKFLOW_SAMPLE_TOPICS||{})}
  }
  function loadSettings(){try{return JSON.parse(localStorage.getItem(KEYS.settings)||"{}")}catch{return{}}}
  function saveTopics(message="저장했습니다."){
    try{localStorage.setItem(KEYS.data,JSON.stringify(topics));dirty=false;localStorage.removeItem(KEYS.drafts);notify(message);render()}
    catch(error){notify(`저장 실패: ${error.message}`,true)}
  }
  function saveDraft(){if(!dirty)return;try{localStorage.setItem(KEYS.drafts,JSON.stringify({activeDate,topic:topics[activeDate],savedAt:new Date().toISOString()}))}catch{}}
  function loadRecord(key){try{return JSON.parse(localStorage.getItem(key)||"{}")}catch{return{}}}
  function preserveVersion(topic){
    const versions=loadRecord(KEYS.versions),list=versions[topic.id]||[];
    versions[topic.id]=[{savedAt:new Date().toISOString(),topic:clone(topic)},...list].slice(0,5);
    localStorage.setItem(KEYS.versions,JSON.stringify(versions));
  }
  function notify(message,isError=false){const el=$("#notice");if(!el)return;el.textContent=message;el.className=`notice show${isError?" error":""}`;clearTimeout(notify.handle);notify.handle=setTimeout(()=>el.className="notice",3400)}
  function monthPrefix(){return `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}`}
  function monthFile(kind="json"){return `thebox-talkflow-${monthPrefix()}${kind==="viewer"?"-viewer.html":".json"}`}
  function current(){return topics[activeDate]}
function canPreviewTopic(topic){return Boolean(topic)&&(!topic.generatedConversation||topic.generationEngine===Simple.VERSION&&Simple.evaluate(topic,Object.values(topics)).ready||topic.generationEngine===Generation.VERSION&&Generation.evaluate(topic,Object.values(topics)).ready)&&topic.operatorStatus?.generationStatus!=="failed"}
  function operationConfig(){
    const knownHolidays=["2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-10-03","2026-10-05","2026-10-09"];
    return{weekdays:settings.operatingWeekdays||[1,4],included:settings.additionalDates||[],excluded:[...(settings.excludedDates||[]),...(settings.excludePublicHolidays?knownHolidays:[])]}
  }
  function operatingDates(){
    const config=operationConfig(),scheduled=window.TalkFlowSessions.operatingDates(monthPrefix(),config.weekdays,config.excluded);
    return [...new Set([...scheduled,...config.included.filter(date=>date.startsWith(monthPrefix())&&!config.excluded.includes(date))])].sort()
  }
  function lifecycleState(topic){
    if(!topic)return{key:"empty",label:"토픽 미작성",action:"자동 생성"};
    if(topic.operatorStatus?.generationStatus==="failed")return{key:"generation-failed",label:"GENERATION FAILED",action:"문제 확인"};
    if(topic.generationEngine!==Simple.VERSION&&Generation.isLegacyOrInvalidDraft(topic))return{key:"invalid",label:"LEGACY OR INVALID DRAFT",action:"문제 확인"};
    if(topic.operatorStatus?.used)return{key:"completed",label:"사용 완료",action:"학생용 PDF"};
    if(topic.quality?.status==="approved"&&["checked","printed"].includes(topic.operatorStatus?.printStatus)&&topic.operatorStatus?.printValidation?.status==="ready")return{key:"print-ready",label:"인쇄 준비 완료",action:"학생용 PDF"};
    if(topic.quality?.status==="approved")return{key:"approved",label:"승인 완료",action:"PDF 확인"};
    if(topic.operatorStatus?.generationStatus==="running"||topic.quality?.status==="draft")return{key:"draft",label:topic.operatorStatus?.generationStatus==="running"?"생성 중":"초안",action:"수정"};
    return{key:"review",label:"확인 필요",action:"확인하기"};
  }
  function workState(topic){const state=lifecycleState(topic);return[state.key,state.label]}

  function validateTopic(topic,allTopics=topics){
    const issues=[];
    if(!topic||typeof topic!=="object")return{status:"regenerate",score:0,issues:["토픽 데이터가 객체가 아닙니다."]};
    if(topic.generationEngine===Simple.VERSION){
      const evaluation=Simple.evaluate(topic,Object.values(allTopics)),messages=evaluation.issues.map(item=>`${item.id} · ${item.location}: ${item.message}`);
      return{status:evaluation.ready?"approved":"regenerate",score:evaluation.ready?100:Math.max(0,100-messages.length*10),issues:messages,evaluation};
    }
    if(topic.generationEngine===Generation.VERSION){
      const evaluation=Generation.evaluate(topic,Object.values(allTopics)),messages=evaluation.issues.map(item=>`${item.id} · ${item.location}: ${item.message}`);
      return{status:evaluation.ready?"approved":"regenerate",score:evaluation.ready?100:Math.max(0,100-messages.length*10),issues:messages,evaluation};
    }
    if(topic.generatedConversation){
      return{status:"regenerate",score:0,issues:["generationEngine: 구형 v1 fallback 또는 지원하지 않는 자동 생성 초안입니다."],evaluation:{ready:false,statuses:{structure:"fail",content:"fail",speaking:"fail"}}};
    }
    const required=["id","date","title","hook","goal","smallTalk","quickActivity","easyEntry","mainDiscussion","midGame","usefulPhrases","finalRound","leaderNotes"];
    required.forEach(key=>{if(!topic[key])issues.push(`필수 섹션 누락: ${key}`)});
    if(topic.smallTalk?.length!==3)issues.push("Small Talk은 정확히 3개여야 합니다.");
    if(topic.easyEntry?.length!==3)issues.push("Easy Entry는 정확히 3개여야 합니다.");
    if(topic.mainDiscussion?.length!==4)issues.push("Main Discussion은 정확히 4개여야 합니다.");
    if(topic.usefulPhrases?.length!==3)issues.push("Useful Phrases는 정확히 3개여야 합니다.");
    [...(topic.easyEntry||[]),...(topic.mainDiscussion||[])].forEach((q,i)=>{
      if(!q.questionEn||!q.questionKo||!q.starter)issues.push(`질문 ${i+1}의 영문·한글·Starter가 비어 있습니다.`);
    });
    (topic.mainDiscussion||[]).forEach((q,i)=>{
      if(!q.exampleFollowUp||!q.deeperFollowUp)issues.push(`Main Discussion ${i+1}의 후속 질문이 누락되었습니다.`);
    });
    [topic.quickActivity,topic.midGame].forEach((activity,i)=>{
      if(!activity?.type||!activity?.titleEn||!activity?.instructionEn)issues.push(`${i?"Mid-game":"Quick Activity"} 설명이 불완전합니다.`);
      if(!Array.isArray(activity?.options)||activity.options.length<2)issues.push(`${i?"Mid-game":"Quick Activity"} 선택지가 부족합니다.`);
    });
    const text=JSON.stringify(topic).toLowerCase();
    BAD_ENGLISH.forEach(term=>{if(text.includes(term))issues.push(`부자연스러운 영어 표현 감지: ${term}`)});
    SENSITIVE.forEach(term=>{if(text.includes(term))issues.push(`민감 소재 검토 필요: ${term}`)});
    Object.values(allTopics).forEach(other=>{if(other.date!==topic.date&&other.id===topic.id)issues.push("중복 ID가 있습니다.")});
    const normalizedTitle=(topic.title?.en||"").toLowerCase().replace(/[^a-z0-9]/g,"");
    Object.values(allTopics).forEach(other=>{if(other.date!==topic.date&&(other.title?.en||"").toLowerCase().replace(/[^a-z0-9]/g,"")===normalizedTitle)issues.push("월간 제목이 중복됩니다.")});
    if(topic.conversationFlow)issues.push(...window.TalkFlowConversation.issues(topic.conversationFlow));
    if(topic.sessionOne||topic.sessionTwo){
      issues.push(...window.TalkFlowSessions.diagnostics(topic).map(item=>`${item.location}: ${item.message}`));
      issues.push(...window.TalkFlowSessions.speakingDiagnostics(topic).map(item=>`${item.location}: ${item.message}`));
    }
    const score=Math.max(0,100-issues.length*9);
    return{status:issues.length===0?"approved":issues.length<=3?"review":"regenerate",score,issues:[...new Set(issues)]};
  }
  function validateAll(){Object.values(topics).forEach(t=>{const result=validateTopic(t);t.quality={status:result.status==="approved"?"approved":"review",score:result.score,issues:result.issues}});saveTopics("월간 품질검사를 완료했습니다.")}

  function render(){
    $("#month-label").textContent=new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long"}).format(cursor);
    renderList();
    $(".app-shell").classList.toggle("wide-mode",view==="calendar"||view==="print");
    $("#calendar-view").innerHTML=view==="calendar"?renderCalendar():"";
    $("#student-view").innerHTML=view==="student"?renderStudent(current()):"";
    $("#leader-view").innerHTML=view==="leader"?renderLeader(current()):"";
    $("#admin-view").innerHTML=view==="admin"?renderAdmin(current()):"";
    $("#print-view").innerHTML=view==="print"?renderPrintCollection():"";
    $("#calendar-view").hidden=view!=="calendar";
    $("#student-view").hidden=view!=="student";$("#leader-view").hidden=view!=="leader";$("#admin-view").hidden=view!=="admin";
    $("#print-view").hidden=view!=="print";
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("is-active",b.dataset.view===view));
    updateUrl();
    bindDynamic();
  }
  function updateUrl(){
    const url=new URL(location.href);
    if(activeDate)url.searchParams.set("date",activeDate);else url.searchParams.delete("date");
    if(view==="calendar")url.searchParams.delete("view");else url.searchParams.set("view",view);
    history.replaceState(null,"",url);
  }
  function renderList(){
    const prefix=monthPrefix(),entries=Object.values(topics).filter(t=>t.date.startsWith(prefix)).sort((a,b)=>a.date.localeCompare(b.date));
    $("#topic-list").innerHTML=entries.length?entries.map(t=>{
      const state=lifecycleState(t);
      return `<button class="topic-day ${t.date===activeDate?"is-active":""}" data-date="${t.date}"><time>${t.date.slice(8)}</time><span><strong>${esc(t.title.en)}</strong><small>${koTitle(t.title.ko)}</small></span><i class="status-pill ${state.key}">${state.label}</i></button>`;
    }).join(""):`<p class="ko">이 달에는 작성된 토픽이 없습니다.</p>`;
  }
  function weekday(date){return new Intl.DateTimeFormat("ko-KR",{weekday:"short",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))}
  function renderCalendar(){
    const year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate(),prefix=monthPrefix();
    const monthTopics=Object.values(topics).filter(t=>t.date?.startsWith(prefix));
    const operationDays=new Set(operatingDates()),targets=[...operationDays].filter(date=>!topics[date]);
    const offset=(new Date(`${prefix}-01T12:00:00`).getDay()+6)%7;
    return `<header class="calendar-toolbar"><button class="icon-button" data-action="previous-month" aria-label="이전 달">←</button><div><h1>${year}년 ${month+1}월</h1><p>${operationDays.size}개 운영일 · ${targets.length}개 미작성</p></div><button class="icon-button" data-action="next-month" aria-label="다음 달">→</button><div class="calendar-actions"><button class="button secondary" data-action="today">오늘로 이동</button><button class="button primary" data-action="auto-compose-month">이번 달 자동 구성</button><button class="button secondary" data-action="settings">고급 설정</button></div></header>
      <div class="weekday-row" aria-hidden="true">${["월","화","수","목","금","토","일"].map(day=>`<span>${day}</span>`).join("")}</div>
      <section class="month-calendar">${Array.from({length:offset},()=>'<span class="calendar-spacer"></span>').join("")}${Array.from({length:days},(_,i)=>{
        const date=`${prefix}-${String(i+1).padStart(2,"0")}`,t=topics[date];
        const isOperating=operationDays.has(date),status=lifecycleState(t),state=status.key,label=status.label;
        if(!isOperating&&!t)return `<article class="calendar-day is-off"><header><time>${i+1}일 · ${weekday(date)}</time></header><p>운영 없음</p></article>`;
        if(!t)return `<article class="calendar-day is-empty"><header><time>${i+1}일 · ${weekday(date)}</time><span class="status-pill">${label}</span></header><h2>토픽 미작성</h2><div class="date-actions empty-actions"><button class="button ghost" data-auto-date="${date}">자동 생성</button><button class="text-action" data-custom-date="${date}">주제 지정</button></div></article>`;
        const primaryTarget=["approved","print-ready","completed"].includes(state)?"print":"admin";
        return `<article class="calendar-day is-complete ${t.hidden?"is-hidden":""}"><header><time>${i+1}일 · ${weekday(date)}</time><span class="status-pill ${state}">${label}</span></header><h2>${koTitle(t.title.ko||t.title.en)}</h2><div class="date-actions"><button class="button ${state==="print-ready"?"primary":"secondary"}" data-open="${date}:${primaryTarget}">${status.action}</button><details class="card-overflow"><summary aria-label="추가 작업">⋯</summary><div><button data-open="${date}:admin">수정</button>${canPreviewTopic(t)?`<button data-print-leader="${date}">리더용 PDF</button>`:""}${state==="print-ready"?`<button data-used="${date}">사용 완료로 표시</button>`:""}<button data-toggle-hidden="${date}">${t.hidden?"공개":"숨김"}</button><button data-clone-from="${date}">복제</button></div></details></div></article>`;
      }).join("")}</section><details class="quick-help"><summary>처음 사용하시나요?</summary><p>빈 날짜에서 자동 생성 → 두 페이지 확인 → 필요한 부분만 수정 → 승인 → PDF 출력 순서로 진행하세요.</p></details>
      <div class="batch-toolbar"><label><input type="checkbox" data-action="select-approved"> 인쇄 가능 날짜 선택</label><button class="button primary" data-action="batch-print" ${printDates.size?"":"disabled"}>선택 PDF (${printDates.size})</button></div>`;
  }
  function nextOpenDate(){
    const prefix=monthPrefix(),days=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
    return Array.from({length:days},(_,i)=>`${prefix}-${String(i+1).padStart(2,"0")}`).find(date=>!topics[date])||`${prefix}-01`;
  }
  function renderOperatorWorkflow(){
    const selected=topics[activeDate],review=selected?.conversationFlow?window.TalkFlowConversation.evaluate(selected.conversationFlow):null;
    const stage=["approved","print-ready","completed"].includes(lifecycleState(selected).key)?5:selected?.conversationFlow?4:2;
    return `<section class="operator-workflow" aria-label="토픽 제작 5단계">
      <ol class="workflow-steps">${["날짜","주제","생성","확인","승인·출력"].map((label,index)=>`<li class="${index+1<stage?"complete":index+1===stage?"current":""}"><b>${index+1}</b>${label}</li>`).join("")}</ol>
      <div class="operator-grid">
        <label>날짜<input id="operator-date" type="date" value="${esc(selected?.date||nextOpenDate())}"></label>
        <label>주제 또는 키워드<input id="operator-topic" placeholder="예: 온라인 리뷰, 주말 계획"></label>
        <label>피하고 싶은 소재<input id="operator-avoid" placeholder="선택 입력"></label>
        <label>분위기<select id="operator-mood"><option>가볍고 편하게</option><option selected>경험 중심</option><option>생각 확장</option><option>함께 결정하기</option></select></label>
      </div>
      <div class="operator-actions create-actions"><span><button class="button secondary" data-action="recommend-topic">추천 주제 넣기</button><small>최근 사용하지 않은 주제를 입력합니다.</small></span><span><button class="button primary" data-action="operator-create" disabled>토픽 생성하기</button><small>입력한 주제로 학생용 회화 흐름을 만듭니다.</small></span>${canPreviewTopic(selected)?`<span class="preview-action"><button class="button secondary" data-open="${selected.date}:print">학생용 A4 미리보기</button></span>`:""}</div>
      <div class="operator-status ${review?.status||"pending"}"><strong>${review?review.status==="ready"?"바로 사용 가능":review.status==="review"?"확인할 부분 있음":"다시 생성 권장":"날짜와 주제를 선택해 시작하세요."}</strong><span>${review?`${review.issues.length}개 확인 항목 · ${review.issues[0]||"학생용 A4 미리보기 후 승인하세요."}`:"추천 주제를 넣거나 직접 입력하면 생성 버튼이 활성화됩니다."}</span></div>
    </section>`;
  }
  function validatePrint(t){
    const issues=[];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(t?.date||""))issues.push("날짜");
    if(!t?.title?.en||!t?.title?.ko)issues.push("제목");
    if(t?.generationEngine===Simple.VERSION){const evaluation=Simple.evaluate(t,Object.values(topics));if(!evaluation.ready)issues.push(...evaluation.blockers.map(item=>`${item.id} · ${item.location}: ${item.message}`));}
    else if(t?.generationEngine===Generation.VERSION){
      const evaluation=Generation.evaluate(t,Object.values(topics));if(!evaluation.ready)issues.push(...evaluation.blockers.map(item=>`${item.id} · ${item.location}: ${item.message}`));
    }else if(t?.generatedConversation)issues.push("구형 v1 fallback");
    else if(t?.conversationFlow)issues.push(...window.TalkFlowConversation.issues(t.conversationFlow));
    else{
      if(t?.smallTalk?.length!==3||t?.easyEntry?.length!==3||t?.mainDiscussion?.length!==4)issues.push("질문");
      if((t?.mainDiscussion||[]).some(q=>!q.starter||!q.exampleFollowUp||!q.deeperFollowUp))issues.push("후속 질문");
      if(!t?.midGame?.options?.length)issues.push("Mid-game");
      if(!t?.finalRound?.questionEn)issues.push("Final Round");
    }
    if(t?.generationEngine===Simple.VERSION&&(t.standardVersion!==Simple.STANDARD_VERSION||t.templateVersion!==Simple.TEMPLATE_VERSION))issues.push("v3-simple 연결");
    else if((t?.conversationFlow||t?.generationEngine===Generation.VERSION)&&(t.standardVersion!==STANDARD.version||t.templateVersion!=="4"))issues.push("v2/v4 연결");
    if(t?.quality?.status!=="approved"||t?.hidden)issues.push("승인");
    return issues.length?{status:"review",label:"PRINT REVIEW REQUIRED",issues}:{status:"ready",label:"PRINT READY",issues:[]};
  }
  function evaluateRenderedPrint(t){
    const handout=document.querySelector(`.simple-handout[data-print-topic="${CSS.escape(t.date)}"],.v4-handout[data-print-topic="${CSS.escape(t.date)}"],.fc-handout[data-print-topic="${CSS.escape(t.date)}"]`);
    if(!handout)return {status:"review",issues:["v4 인쇄물이 화면에 없습니다."]};
    const pages=[...handout.querySelectorAll(".a4-page")],issues=[];
    if(pages.length!==2)issues.push(`A4 페이지가 ${pages.length}개입니다.`);
    if(pages.some(page=>page.scrollHeight-page.clientHeight>1||page.scrollWidth-page.clientWidth>1))issues.push("A4 페이지에 넘치는 내용이 있습니다.");
    const pointSize=node=>Math.round(Number.parseFloat(getComputedStyle(node).fontSize)*72/96*100)/100;
    const minimum=selector=>{const values=[...handout.querySelectorAll(selector)].map(pointSize);return values.length?Math.min(...values):0};
    const type=t.generationEngine===Simple.VERSION?{
      title:minimum(".simple-title h1"),
      question:minimum(".simple-questions strong,.simple-final>strong"),
      englishInstruction:minimum(".simple-story-copy p:first-child,.simple-english strong,.simple-materials p"),
      koreanGuidance:minimum(".simple-questions>li>span,.simple-instruction,.simple-steps,.simple-participation,.simple-result>span,.simple-final>span"),
      meta:minimum(".simple-header,.simple-help,.simple-options,.simple-leader-note")
    }:{
      title:minimum(".handout-title h1,.bound-title h1"),
      question:minimum(".start-card>strong,.story-card>strong,.round-card>strong,.timed-round>strong,.main-activity>strong,.group-decision>strong,.bound-question-main>strong,.bound-section>header h3"),
      englishInstruction:minimum(".timed-round>p,.bilingual-steps b,.assigned-opposition>p,.assigned-role-briefs span,.bound-starter,.bound-followup,.bound-rule,.bound-expression b"),
      koreanGuidance:minimum(".timed-round>small,.timed-round>p small,.start-card>small,.story-card>small,.round-card>small,.session-reset small,.main-activity>small,.assigned-opposition>small,.assigned-opposition>p small,.group-decision>small,.everyone-rule small,.material-card small,.leader-inline span,.bound-why p,.bound-pop-item p,.bound-bingo-rule,.bound-bingo span,.bound-rule span,.bound-situation p,.bound-situation div span,.bound-expression span"),
      meta:minimum(".session-banner span,.turn-rule,.material-card b,.evidence-choice,.section-hint,.bound-section>header span,.bound-session span,.bound-qtag")
    };
    const minimums=t.generationEngine===Simple.VERSION?{title:20,question:11,englishInstruction:9,koreanGuidance:9,meta:8}:{title:18,question:10.5,englishInstruction:9,koreanGuidance:8.5,meta:7.5};
    if(Object.entries(minimums).some(([key,value])=>type[key]<value))issues.push("인쇄 글자 크기 최소 기준을 충족하지 않습니다.");
    return {status:issues.length?"review":"ready",issues,pages:pages.length,type,checkedAt:new Date().toISOString()};
  }
  function printHeader(t,page,leader=false){
    return `<header class="handout-header"><div class="handout-brand"><strong>THEBOX</strong><span>TALK FLOW</span></div><div class="handout-title"><span>${esc(t.date)} · ${weekday(t.date)}</span><h1>${esc(t.title.en)}</h1><p>${esc(t.title.ko)}</p></div><div class="handout-label">${leader?"Leader Guide":"Student Handout"}<b>Page ${page} / 2</b></div></header>`;
  }
  function handoutSection(title,body,className=""){return `<section class="handout-section ${className}"><h2>${title}</h2>${body}</section>`}
  function handoutQuestions(items,{follow=false,deep=false}={}){
    return `<ol class="handout-questions">${items.map(q=>`<li><strong>${esc(q.questionEn)}</strong><span>${esc(q.questionKo)}</span>${q.starter?`<p><b>STARTER</b> ${esc(q.starter)}</p>`:""}${follow&&q.followUp?`<p><b>FOLLOW-UP</b> ${esc(q.followUp)}</p>`:""}${deep?`<div class="handout-follow"><p><b>EXAMPLE</b> ${esc(q.exampleFollowUp)}</p><p><b>DEEPER</b> ${esc(q.deeperFollowUp)}</p></div>`:""}</li>`).join("")}</ol>`;
  }
  function handoutActivity(a){return `<div class="handout-activity"><strong>${esc(a.titleEn)} <small>${esc(a.titleKo)}</small></strong><p>${esc(a.instructionEn)}</p><span>${esc(a.instructionKo)}</span><div>${a.options.map(o=>`<i>${esc(o)}</i>`).join("")}</div></div>`}
  const GENERATED_QTAG={quick_choice:"QUICK CHOICE",recent_experience:"RECENT EXPERIENCE",light_opinion:"LIGHT OPINION"};
  function generatedHeader(t,leader,page){return `<header class="bound-header"><div class="bound-brand"><b>THEBOX</b><span>TALK FLOW</span></div><div class="bound-meta">${esc(t.date)} · ${esc(t.weekday)} <em>|</em> ${esc(t.category.en)} · ${esc(t.category.ko)}</div><div class="bound-role">${leader?"LEADER":"STUDENT"} · ${page} / 2</div></header>`}
  function generatedFooter(t,page){return `<footer class="bound-footer"><b>${esc(t.title.en)}</b><span>${esc(t.title.ko)} · Page ${page} / 2</span></footer>`}
  function generatedTitle(t){return `<div class="bound-title"><h1>${esc(t.title.en)}</h1><p>${esc(t.title.ko)}</p></div>`}
  function generatedLeaderBox(label,notes){return `<aside class="bound-leader"><b>${esc(label)}</b>${notes.map(note=>`<p>${esc(note)}</p>`).join("")}</aside>`}
  function generatedSection(id,title,time,body){return `<section class="fc-section bound-section" data-section="${esc(id)}"><header><h3>${esc(title)}</h3>${time?`<span>${esc(time)}</span>`:""}</header>${body}</section>`}
  function generatedQuestion(question,index){return `<div class="bound-question"><div class="bound-number">${index+1}</div><div class="bound-question-main"><div class="bound-qtag">${GENERATED_QTAG[question.type]} · ${question.minutes} MIN</div><strong>${esc(question.en)}</strong>${question.options?`<div class="bound-options">${question.options.map(option=>`<span><i></i>${esc(option)}</span>`).join("")}</div>`:""}${question.escape?`<div class="bound-escape">${esc(question.escape)}</div>`:""}<div class="bound-starter">${esc(question.starter)}</div><div class="bound-followup">↳ ${esc(question.followup)}</div><div class="bound-ladder"><p><b>BASIC</b>${esc(question.ladder.basic)}</p><p><b>PLUS</b>${esc(question.ladder.plus)}</p></div></div></div>`}
  function generatedGameMaterials(game){
    const options=game.options?`<div class="bound-game-options">${game.options.map(item=>`<div><b><i></i>${esc(item.label)}</b><span>${esc(item.ko)}</span></div>`).join("")}</div>`:"";
    const roles=game.roles?`<div class="bound-game-roles">${game.roles.map(item=>`<div><b>${esc(item.name)}</b><span>${esc(item.task_en)}</span><small>${esc(item.task_ko)}</small></div>`).join("")}</div>`:"";
    const inputs=game.inputs?`<div class="bound-game-inputs">${game.inputs.map(item=>`<label>${esc(item.label)}${Array.from({length:item.lines},()=>"<i></i>").join("")}</label>`).join("")}</div>`:"";
    const starters=game.starters?`<div class="bound-game-starters">${game.starters.map(item=>`<span>${esc(item)}</span>`).join("")}</div>`:"";
    return options+roles+inputs+starters;
  }
  function renderGeneratedHandout(t,leader=false){
    const s1=t.session1,s2=t.session2,game=s2.game;
    const timeline=s1.icebreakers.map((question,index)=>`Q${index+1} ${question.minutes}분`).join(" · ");
    const popQuiz=s1.popQuiz.map((item,index)=>`<div class="bound-pop-item"><b>${index+1}</b><div><del>${esc(item.wrong)}</del><strong><i>✓</i>${esc(item.right)}</strong><p>${esc(item.why_ko)}</p></div></div>`).join("");
    const icebreakers=s1.icebreakers.map(generatedQuestion).join("");
    const bingoRows=[0,3,6].map(start=>`<tr>${s1.bingo.words.slice(start,start+3).map(word=>`<td><b>${esc(word.en)}</b><em>${esc(word.pos)}</em><span>${esc(word.ko)}</span></td>`).join("")}</tr>`).join("");
    const bingoTable=`<table class="bound-bingo">${bingoRows}</table>`;
    const bingoBody=`<p class="bound-bingo-rule">${esc(s1.bingo.rule_ko)}</p>${leader?`<div class="bound-bingo-leader">${bingoTable}${generatedLeaderBox("LEADER · SESSION 1",t.leader.s1_notes)}</div>`:bingoTable}`;
    const pageOne=[
      generatedSection("why","WHY THIS TOPIC","",`<div class="bound-why"><p>${esc(s1.why.ko)}</p><span>${esc(s1.why.en)}</span></div>`),
      generatedSection("popQuiz","POP QUIZ — DOES THIS SOUND NATURAL?","10 MIN",`<div class="bound-pop-grid">${popQuiz}</div>`),
      generatedSection("icebreakers","ICEBREAKER QUESTIONS","한 명씩 순서대로 · 다음 사람이 ↳ 질문을 읽어요",icebreakers),
      generatedSection("bingo","SPARK WORDS BINGO","상시 진행",bingoBody)
    ].join("");
    const rules=game.rules.map((rule,index)=>`<div class="bound-rule"><b>${index+1}</b>${esc(rule.en)}<span>${esc(rule.ko)}</span></div>`).join("");
    const factsEn=s2.situation.facts.map(item=>esc(item.en)).join(" · "),factsKo=s2.situation.facts.map(item=>esc(item.ko)).join(" · ");
    const discussion=s2.discussion.map((item,index)=>`<div class="bound-question bound-discussion"><div class="bound-number">${index+1}</div><div class="bound-question-main"><strong>${esc(item.en)}</strong><div class="bound-starter">${esc(item.starter)}</div><div class="bound-followup">↳ ${esc(item.followup)}</div></div></div>`).join("");
    const expressions=s2.expressions.map(item=>`<div class="bound-expression"><em>${esc(item.fn.replace(/_/g," "))}</em><b>${esc(item.en)}</b><span>${esc(item.ko)}</span></div>`).join("");
    const pageTwo=[
      generatedSection("game",`${game.type.en} · ${game.type.ko}`,"", `<div class="bound-game-name">${esc(game.name)}</div><div class="bound-how-to"><h4>HOW TO PLAY</h4><span>${game.minutes} MIN</span></div><div class="bound-rules">${rules}</div>${generatedGameMaterials(game)}`),
      generatedSection("situation","SITUATION","게임과 DISCUSSION이 함께 사용해요",`<div class="bound-situation"><b>${esc(s2.situation.en)}</b><p>${esc(s2.situation.ko)}</p><div>${factsEn}<span>${factsKo}</span></div></div>`),
      generatedSection("discussion","DISCUSSION","15 MIN · 답이 끝나면 다음 사람이 ↳ 질문",discussion),
      generatedSection("expressions","USEFUL EXPRESSIONS","5 MIN · 오늘 써 볼 여섯 문장",`<div class="bound-expressions">${expressions}</div>`)
    ].join("");
    const timeCut=t.leader.timeCut.map(item=>`${item.block} ${item.from}→${item.to}분`).join(" · ");
    const pageOneLeader="";
    const pageTwoLeader=leader?generatedLeaderBox("LEADER · SESSION 2",[...t.leader.s2_notes,`시간 부족 시 — ${timeCut}. ${game.name}은 최소 ${game.minFloor}분을 유지하세요.`]):"";
    const page=(number,minutes,sections,leaderNotes)=>`<section class="a4-page">${generatedHeader(t,leader,number)}<div class="bound-body">${generatedTitle(t)}<div class="bound-session"><b>SESSION ${number} · ${minutes} MINUTES</b><span>${number===1?`POP QUIZ 10분 · ${timeline} · BINGO 상시`:`GAME ${game.minutes}분 · DISCUSSION 15분 · EXPRESSIONS 5분`}</span></div>${sections}${leaderNotes}</div>${generatedFooter(t,number)}</section>`;
    return `<article class="a4-topic fc-handout bound-handout${leader?" bound-leader-handout":""}" data-print-topic="${esc(t.date)}" data-generation-engine="${Generation.VERSION}">${page(1,s1.minutes,pageOne,pageOneLeader)}${page(2,s2.minutes,pageTwo,pageTwoLeader)}</article>`;
  }
  function simpleHeader(t,leader,page){return `<header class="simple-header"><b>THEBOX TALK FLOW</b><span>${esc(t.date)} · ${esc(t.category.en)} / ${esc(t.category.ko)}</span><em>${leader?"LEADER":"STUDENT"} ${page} / 2</em></header><div class="simple-title"><h1>${esc(t.title.en)}</h1><p>${esc(t.title.ko)}</p></div>`}
  function simpleLeader(note){return `<aside class="simple-leader-note"><b>LEADER</b><span>${esc(note)}</span></aside>`}
  function simpleQuestions(items){return `<ol class="simple-questions">${items.map(item=>`<li><strong>${esc(item.en)}</strong><span>${esc(item.ko)}</span>${item.options?.length?`<p class="simple-options">${item.options.map(option=>`□ ${esc(option)}`).join(" · ")}</p>`:""}${item.example?`<p class="simple-help">${esc(item.example)}</p>`:""}</li>`).join("")}</ol>`}
  function renderSimpleHandout(t,leader=false){
    const one=t.session1,two=t.session2,a=two.activity;
    const story=`<section class="simple-section simple-story"><h2>${esc(one.story.heading)}</h2><div class="simple-story-copy"><p>${one.story.en.map(esc).join(" ")}</p><p lang="ko">${one.story.ko.map(esc).join(" ")}</p></div>${leader?simpleLeader(t.leader.story):""}</section>`;
    const easy=`<section class="simple-section"><h2>EASY TALK</h2>${simpleQuestions(one.easyTalk)}${leader?simpleLeader(`${t.leader.easyTalk} ${(t.leader.easyTalkFollowups||[]).join(" · ")}`):""}</section>`;
    const real=`<section class="simple-section"><h2>REAL TALK</h2>${simpleQuestions(one.realTalk)}${leader?simpleLeader(`${t.leader.realTalk} ${(t.leader.realTalkFollowups||[]).join(" · ")}`):""}</section>`;
    const expressions=`<section class="simple-section simple-english"><h2>TODAY’S ENGLISH</h2><div>${one.expressions.map(item=>`<p><strong>${esc(item.en)}</strong><span>${esc(item.ko)}</span></p>`).join("")}</div></section>`;
    const reset=`<section class="simple-section simple-reset"><h2>RESET</h2><strong>${esc(two.reset.en)}</strong><span>${esc(two.reset.ko)}</span></section>`;
    const materials=`<div class="simple-materials">${a.materials.map((item,index)=>`<article><b>${index+1}</b><p>${esc(item.en)}</p><span>${esc(item.ko)}</span></article>`).join("")}</div>`;
    const roles=a.roles?.length?`<div class="simple-roles">${a.roles.map(item=>`<p><strong>${esc(item.en)}</strong><span>${esc(item.ko)}</span></p>`).join("")}</div>`:"";
    const support=t.leader.activitySupport,activityNote=support?`${t.leader.activity} 시범: ${support.demoKo} 조용한 참가자: ${support.quietKo} 긴 답변: ${support.longKo} 시간 부족: ${support.timeCutKo} 빠른 합의: ${support.fastAgreementKo}`:t.leader.activity;
    const activity=`<section class="simple-section simple-activity"><h2>TODAY’S ACTIVITY</h2><h3>${esc(a.name)}</h3><p class="simple-instruction">${esc(a.instructionKo)}</p>${materials}${roles}<ol class="simple-steps">${a.stepsKo.map(step=>`<li>${esc(step)}</li>`).join("")}</ol><div class="simple-phrases">${a.phrases.map(line=>`<span>${esc(line)}</span>`).join("")}</div><p class="simple-participation">${esc(a.participationKo)}</p>${leader?simpleLeader(activityNote):""}</section>`;
    const result=`<section class="simple-section simple-result"><h2>GROUP RESULT</h2><strong>${esc(two.groupResult.en)}</strong><span>${esc(two.groupResult.ko)}</span><i></i></section>`;
    const final=`<section class="simple-section simple-final"><h2>FINAL QUESTION</h2><strong>${esc(two.finalQuestion.en)}</strong><span>${esc(two.finalQuestion.ko)}</span>${leader?simpleLeader(t.leader.final):""}</section>`;
    const emergency=leader?`<footer class="simple-emergency">${t.leader.emergency.map(line=>`<span>${esc(line)}</span>`).join("")}<b>${esc(t.leader.timeCutKo)}</b></footer>`:"";
    const page=(number,body)=>`<section class="a4-page">${simpleHeader(t,leader,number)}<main class="simple-body simple-page-${number}">${body}</main>${emergency}</section>`;
    return `<article class="a4-topic simple-handout${leader?" simple-leader-handout":""}" data-print-topic="${esc(t.date)}" data-generation-engine="${Simple.VERSION}" data-template-version="${Simple.TEMPLATE_VERSION}">${page(1,story+easy+real+expressions)}${page(2,reset+activity+result+final)}</article>`;
  }
  function renderHandout(t,leader=false){
    if(t.generationEngine===Simple.VERSION)return renderSimpleHandout(t,leader);
    if(t.generationEngine===Generation.VERSION)return renderGeneratedHandout(t,leader);
    if(t.conversationFlow)return renderConversationHandout(t,leader);
    return `<article class="a4-topic" data-print-topic="${t.date}">
      <section class="a4-page">${printHeader(t,1,leader)}<div class="handout-body page-one">
        ${handoutSection("TODAY'S GOAL",bilingual(t.goal.en,t.goal.ko),"goal")}
        ${handoutSection("TOPIC HOOK",bilingual(t.hook.en,t.hook.ko),"hook")}
        ${handoutSection("SMALL TALK",handoutQuestions(t.smallTalk))}
        ${handoutSection("QUICK ACTIVITY",handoutActivity(t.quickActivity))}
        ${handoutSection("EASY ENTRY",handoutQuestions(t.easyEntry,{follow:true}))}
        ${leader?handoutSection("LEADER CHECK","<p>Small Talk 10 min · Quick Activity 10 min · Easy Entry 20 min</p>","leader-only"):""}
      </div><footer>${esc(t.title.en)}<span>1 / 2</span></footer></section>
      <section class="a4-page">${printHeader(t,2,leader)}<div class="handout-body page-two">
        ${handoutSection("MAIN DISCUSSION",handoutQuestions(t.mainDiscussion,{deep:true}))}
        ${handoutSection("MID-GAME",handoutActivity(t.midGame))}
        ${handoutSection("USEFUL PHRASES",`<div class="handout-phrases">${t.usefulPhrases.map(p=>`<div><strong>${esc(p.en)}</strong><span>${esc(p.ko)}</span><small>${esc(p.usage)}</small></div>`).join("")}</div>`)}
        ${handoutSection("FINAL ROUND",`${bilingual(t.finalRound.questionEn,t.finalRound.questionKo)}<p class="final-starter"><b>STARTER</b> ${esc(t.finalRound.starter)}</p>`)}
        ${leader?handoutSection("LEADER NOTES",`<p>${esc(t.leaderNotes.recommendedSkip)}</p><p>${esc(t.leaderNotes.sensitiveWarning)}</p><p>${t.leaderNotes.whenConversationStops.map(esc).join(" · ")}</p>`,"leader-only"):""}
      </div><footer>${esc(t.title.en)}<span>2 / 2</span></footer></section>
    </article>`;
  }
  function actionCue(label,text){
    const meta={START:["1","시작"],SAY:["●","말하기"],ADD:["+","덧붙이기"],ASK:["→","질문하기"],REACT:["↺","반응하기"]}[label]||["•",""];
    return `<p class="action-cue ${label.toLowerCase()}"><b><i aria-hidden="true">${meta[0]}</i>${label}<small>${meta[1]}</small></b><span>${esc(text)}</span></p>`;
  }
  const safeMinutes=(value,fallback)=>Number.isFinite(Number(value))?Math.max(0,Math.min(90,Number(value))):fallback;
  function actionRow(item){
    const story=Boolean(item.storySteps);
    return `<div class="action-row">${actionCue("START",item.sayFrame||item.storySteps?.[0]||"My answer is...")}${actionCue("ADD","Add one detail.")}${actionCue("GO FURTHER","Ask and react.")}</div>`;
  }
  function materialCards(items){
    return `<div class="material-grid">${(items||[]).map(item=>`<article class="material-card"><b>${esc(item.title)}</b><p>${esc(item.contentEn)}</p><small>${esc(item.contentKo)}</small>${item.type==="reviewText"?`<div class="evidence-choice"><span>□ BUY</span><span>□ DON'T BUY</span><i>MARK ONE DETAIL · 근거 한 곳 표시</i></div>`:""}</article>`).join("")}</div>`;
  }
  function renderEvidenceSessionOne(t,one,leader){
    const [real,evidence,story]=one.rounds,storyItem=one.storyPrompts[0];
    const evidenceStepsEn=["Read all three reviews.","For each review, choose BUY or DON'T BUY.","Mark one detail that influenced your choice.","Choose one review and explain your decision for 30 seconds.","Ask someone with the opposite choice.","Decide whether to change your mind."];
    const evidenceStepsKo=["리뷰 3개를 모두 읽으세요.","각 리뷰마다 살지 말지 고르세요.","선택에 영향을 준 문장 하나를 표시하세요.","리뷰 하나를 골라 30초 동안 이유를 말하세요.","반대 선택을 한 사람에게 질문하세요.","상대 의견을 듣고 선택을 바꿀지 정하세요."];
    return `<section class="session-banner"><b>SESSION 1 · 50 MINUTES</b><span>ITEM · 실제 물건 → EVIDENCE · 리뷰 판단 → STORY · 경험 이야기</span></section>
      <section class="timed-round real-item"><h2>${esc(real.title)} · ${safeMinutes(real.minutes,12)} MIN</h2><strong>${esc(real.goalEn)}</strong><small>${esc(real.goalKo)}</small><p>${esc(real.instructionEn)}<small>${esc(real.instructionKo)}</small></p><div class="prompt-line">${real.prompts.map(prompt=>`<span>${esc(prompt)}</span>`).join("")}</div><b class="turn-rule">45 SEC EACH · NEXT PERSON ASKS ONE QUESTION · EVERYONE FINISHES BEFORE THE NEXT ROUND<small>한 명당 45초 · 다음 사람이 질문 1개 · 전원이 끝난 뒤 이동</small></b>${leader?`<aside class="leader-inline"><b>LEADER</b><span>시계 방향 · 45초씩 · 다음 사람이 질문 1개 · 전원 완료 전 이동 금지</span><i>“Let’s hear from someone new.” · “You have 20 seconds left.”</i></aside>`:""}</section>
      <section class="timed-round evidence-round"><h2>${esc(evidence.title)} · ${safeMinutes(evidence.minutes,18)} MIN</h2><strong>${esc(evidence.goalEn)}</strong><small>${esc(evidence.goalKo)}</small>${materialCards(t.conversationMaterials)}<ol class="bilingual-steps">${evidenceStepsEn.map((step,index)=>`<li><b>${esc(step)}</b><span>${esc(evidenceStepsKo[index])}</span></li>`).join("")}</ol><div class="activity-language"><b>I would buy it because...</b><b>I would skip it because...</b><b>Can you change my mind?</b><b>I still disagree because...</b></div>${leader?`<aside class="leader-inline"><b>LEADER</b><span>A/B/C를 모두 판단하게 하고 반대 선택끼리 연결하세요. 시간이 부족하면 Review C를 생략할 수 있습니다.</span></aside>`:""}</section>
      <section class="timed-round story-round"><h2>${esc(story.title)} · ${safeMinutes(story.minutes,20)} MIN</h2><strong>${esc(storyItem.questionEn)}</strong><small>${esc(storyItem.questionKo)}</small><div class="story-path-inline">${storyItem.storySteps.map(step=>`<span>${esc(step)}</span>`).join("")}</div><p class="alternative">${esc(storyItem.noExperienceAlternative)}</p><b class="turn-rule">60 SEC EACH · NEXT PERSON MUST ASK A FOLLOW-UP · USE A DIFFERENT PHRASE FROM “SAY THIS.”<small>한 명당 60초 · 다음 사람은 후속 질문 · SAY THIS에서 서로 다른 표현 사용</small></b>${leader?`<aside class="leader-inline"><b>LEADER</b><span>짧은 답은 명사+이유도 인정하고, 여유 있는 참가자는 후속 질문을 추가하게 하세요.</span></aside>`:""}</section>
      <section class="words"><h2>SAY THIS</h2><ul>${one.phrases.map(item=>`<li>${item.purpose?`<i>${esc(item.purpose)}</i>`:""}<strong>${esc(item.en)}</strong><span>${esc(item.ko)}</span></li>`).join("")}</ul></section>
      ${leader?"":`<section class="notes-lines"><h2>NOTES · 기억하고 싶은 표현</h2><i></i><i></i><i></i></section>`}
      ${leader?`<section class="leader-strip"><h2>TIME CUT</h2><ul><li>Real Item 12 → 8분</li><li>Evidence 18 → 12분</li><li>Story 20 → 12분</li><li>Write the Fake는 최소 15분 유지</li></ul></section>`:""}`;
  }
  function renderSessionTwo(two,leader){
    const main=two.mainActivity,secondary=two.secondaryActivity,decision=two.groupDecision;
    const stepsKo=main.stepsKo||main.steps.map(()=>main.goalKo||"순서대로 활동을 진행하세요.");
    return `<section class="session-banner"><b>SESSION 2 · ${safeMinutes(two.minutes,40)} MINUTES</b><span>RESET · 환기 → CREATE · 만들기 → DEBATE · 대결 → DECIDE · 결정</span></section>
      <section class="session-reset"><h2>${esc(two.reset.titleEn)} · ${safeMinutes(two.reset.minutes,5)} MIN</h2><strong>${esc(two.reset.instructionEn)}</strong><small>${esc(two.reset.instructionKo)}</small></section>
      <section class="main-activity"><h2>${esc(main.titleEn)} · ${safeMinutes(main.minutes,20)} MIN</h2><strong>${esc(main.goalEn)}</strong><small>${esc(main.goalKo)}</small><ol class="bilingual-steps">${main.steps.map((step,index)=>`<li><b>${esc(step)}</b><span>${esc(stepsKo[index])}</span></li>`).join("")}</ol>${main.roles?.length?`<div class="assigned-role-briefs">${main.roles.map(role=>`<b>${esc(role.name)}<span>${esc(role.brief)}</span><small>${esc(role.briefKo)}</small></b>`).join("")}</div>`:""}<div class="mission-options sentence-options">${main.options.map(option=>`<span>${esc(option)}</span>`).join("")}</div>${main.privateAnswer?`<div class="private-answer"><b>${esc(main.privateAnswer.labelEn)}</b><small>${esc(main.privateAnswer.labelKo)}</small>${main.privateAnswer.choices.map(choice=>`<span>□ ${esc(choice)}</span>`).join("")}</div>`:""}<div class="activity-language">${main.use.map(line=>`<b>${esc(line)}</b>`).join("")}</div>${leader?`<aside class="leader-inline"><b>LEADER</b><span>${main.titleEn==="WRITE THE FAKE"?"예시 한 쌍을 먼저 보여주고 종이를 가리게 하세요. 전원이 추측과 이유를 말한 뒤 공개합니다.":"모든 참가자의 준비·발화·질문·반박을 확인하세요."}</span>${main.titleEn==="WRITE THE FAKE"?`<i>Sentence 1: It arrived two days late. · Sentence 2: The seller sent a handwritten apology.</i>`:""}</aside>`:""}</section>
      ${secondary?`<section class="assigned-opposition"><h2>${esc(secondary.titleEn)} · ${safeMinutes(secondary.minutes,10)} MIN</h2><strong>${esc(secondary.contextEn)}</strong><small>${esc(secondary.contextKo)}</small><p>${esc(secondary.scenarioEn)}<small>${esc(secondary.scenarioKo)}</small></p><p class="team-assignment">${esc(secondary.assignmentEn)}<small>${esc(secondary.assignmentKo)}</small></p><div>${secondary.roles.map(role=>`<b>${esc(role.name)} · ${esc(role.nameKo)}<span>${esc(role.brief)}</span><small>${esc(role.briefKo)}</small></b>`).join("")}</div><p>${esc(secondary.rule)}<small>${esc(secondary.ruleKo)}</small></p><div class="activity-language">${secondary.use.map(line=>`<b>${esc(line)}</b>`).join("")}</div>${leader?`<aside class="leader-inline"><b>LEADER</b><span>팀을 배정하고 홀수 인원은 Judge로 지정하세요. 전원 한 문장, 팀별 반박 한 번을 확인하세요.</span></aside>`:""}</section>`:""}
      <section class="group-decision"><h2>${secondary?"FINAL DECISION":"GROUP DECISION"} · ${safeMinutes(decision.minutes,10)} MIN</h2><strong>${esc(decision.promptEn)}</strong><small>${esc(decision.promptKo)}</small><b class="everyone-rule">${esc(decision.everyoneSpeaksRule)}<small>${esc(decision.everyoneSpeaksRuleKo||"모두 한 번 이상 말한 뒤 결정하세요.")}</small></b><div class="result-line">OUR RESULT:</div></section>
      ${two.finalRound?.minutes?`<section class="conversation-final"><h2>FINAL ROUND · ${safeMinutes(two.finalRound.minutes,5)} MIN</h2><strong>${esc(two.finalRound.questionEn)}</strong><small>${esc(two.finalRound.questionKo)}</small>${actionCue("SAY",two.finalRound.sayFrame)}</section>`:""}
      ${leader?`<section class="leader-strip leader-page-two"><h2>LEADER TIME · SESSION 2</h2><ul><li>${secondary?"Reset Vote 5 · Write the Fake 20 · Star Fight 10 · Final Decision 5":"Reset 5 · Main Activity 20 · Group Decision 10 · Final Round 5"}</li><li>어려운 참가자는 명사+짧은 이유를 인정하고, 가능한 참가자는 follow-up 또는 반박을 추가합니다.</li><li>Write the Fake는 최소 15분, Final Decision은 5분을 유지하세요.</li></ul></section>`:""}`;
  }
  function renderConversationHandout(t,leader=false){
    const flow=t.conversationFlow,one=t.sessionOne||{minutes:50,quickStarts:flow.quickStarts,storyPrompts:flow.storyPrompts,talkRounds:flow.talkRounds.slice(0,1),phrases:flow.topicPhrases},two=t.sessionTwo;
    const quick=one.quickStarts.map((item,index)=>`<article class="start-card"><strong>${index+1}. ${esc(item.questionEn)}</strong><small>${esc(item.questionKo)}</small>${item.options?.length?`<div class="choice-row">${item.options.map(option=>`<span>□ ${esc(option)}</span>`).join("")}</div>`:""}${actionRow(item)}</article>`).join("");
    const stories=one.storyPrompts.map((item,index)=>`<article class="story-card"><strong>${index+1}. ${esc(item.questionEn)}</strong><small>${esc(item.questionKo)}</small><ol>${item.storySteps.map(step=>`<li>${esc(step)}</li>`).join("")}</ol>${actionRow(item)}<p class="alternative">${esc(item.noExperienceAlternative)}</p></article>`).join("");
    const rounds=one.talkRounds.map((item,index)=>`<article class="round-card"><strong>${index+1}. ${esc(item.questionEn)}</strong><small>${esc(item.questionKo)}</small>${actionRow(item)}</article>`).join("");
    const phrases=one.phrases.map(item=>`<li><strong>${esc(item.en)}</strong><span>${esc(item.ko)}</span></li>`).join("");
    const guide=flow.leaderGuide||{};
    return `<article class="a4-topic conversation-handout v4-handout ${t.topicMode==="context"?"context-handout":""} ${one.format==="evidenceRounds"?"evidence-handout":""} ${leader?"leader-handout":""}" data-print-topic="${t.date}" data-talkflow-standard="v2" data-template-version="${leader?STANDARD.leaderTemplate:STANDARD.studentTemplate}">
      <section class="a4-page">${printHeader(t,1,leader)}<div class="handout-body conversation-page page-one">
        ${one.format==="evidenceRounds"?renderEvidenceSessionOne(t,one,leader):`<section class="session-banner"><b>SESSION 1 · ${one.minutes} MINUTES</b><span>START → STORY → TALK</span></section>
        ${t.topicMode==="context"?`<section class="common-brief"><div><h2>60-SECOND BRIEF</h2>${t.commonGround.briefEn.map((line,index)=>`<p><b>${index+1}</b>${esc(line)}<small>${esc(t.commonGround.briefKo[index])}</small></p>`).join("")}<div class="brief-extra"><span>EXAMPLE · ${esc(t.commonGround.exampleEn)}</span><b>${t.commonGround.keywords.map(esc).join(" · ")}</b></div><div class="brief-source">${esc(t.sourceMaterial.publisher)} · ${esc(t.sourceMaterial.title)} · ${esc(t.sourceMaterial.publishedAt)}</div></div>${t.sourceMaterial.qrEnabled&&t.sourceMaterial.qrAsset?`<a class="brief-qr" href="${esc(t.sourceMaterial.url)}"><img src="${esc(t.sourceMaterial.qrAsset)}" alt="More context QR"><span>More context<br>선택 자료 보기</span></a>`:""}</section>`:""}
        <section class="how-to-use"><h2>HOW TO USE</h2><p><b>START</b><b>ADD</b><b>GO FURTHER</b></p></section><b class="turn-rule">CHOOSE PRIVATELY · 45 SEC EACH · NEXT PERSON ASKS · EVERYONE BEFORE THE NEXT STEP</b>
        ${t.conversationMaterials?.length?`<section class="conversation-material"><h2>USE THIS EVIDENCE</h2>${materialCards(t.conversationMaterials)}</section>`:""}
        <section><h2>START NOW</h2><div class="start-grid">${quick}</div></section>
        <section><h2>TELL YOUR STORY</h2><div class="story-grid">${stories}</div></section>
        <section><h2>TALK TOGETHER</h2><div class="round-grid">${rounds}</div></section>
        <section class="words"><h2>SAY THIS</h2><p class="section-hint">Use one phrase when you share your answer.</p><ul>${phrases}</ul></section>
        ${leader?`<section class="leader-strip"><h2>LEADER CHECK · SESSION 1</h2><ul><li>Start 10 · Story 20 · Talk 15 · Wrap 5.</li><li>One turn each; use the no-experience path without pressure.</li></ul></section>`:""}`}
      </div><footer>${esc(t.title.en)}<span>1 / 2</span></footer></section>
      <section class="a4-page">${printHeader(t,2,leader)}<div class="handout-body conversation-page page-two">
        ${renderSessionTwo(two,leader)}
      </div><footer>${esc(t.title.en)}<span>2 / 2</span></footer></section>
    </article>`;
  }
  function renderPrintCollection(){
    const dates=printDates.size?[...printDates].sort():[activeDate],items=dates.map(date=>topics[date]).filter(Boolean);
    if(!items.length)return empty();
    const blocked=items.filter(topic=>!canPreviewTopic(topic));
    if(blocked.length)return `<div class="generation-blocked"><p class="eyebrow">PRINT BLOCKED</p><h1>완성되지 않은 토픽은 PDF로 출력할 수 없습니다.</h1><p>${blocked.map(topic=>`${esc(topic.date)} · ${esc(lifecycleState(topic).label)}`).join("<br>")}</p><button class="button secondary" data-action="calendar">월 목록으로 돌아가기</button></div>`;
    document.title=items.length===1?`${items[0].date}_TheBox_TalkFlow_${safeFilename(items[0].title.ko)}`:`${monthPrefix()}_TheBox_TalkFlow_${items.length}topics`;
    const canConfirm=items.length===1&&items[0].quality?.status==="approved"&&!["checked","printed"].includes(items[0].operatorStatus?.printStatus);
    return `<div class="print-toolbar"><button class="button secondary" data-action="calendar">← 월 목록으로</button><span>${items.length}개 토픽 · ${items.length*2}페이지</span><button class="button secondary" data-action="toggle-print-role">${printLeader?"학생용 A4":"리더용 A4"}</button>${canConfirm?`<button class="button secondary" data-action="confirm-print">A4 확인 완료</button>`:""}<button class="button primary" data-action="print-now">A4 PDF / 인쇄</button></div><div class="paper-stack">${items.map(t=>renderHandout(t,printLeader)).join("")}</div>`;
  }
  function safeFilename(value){return String(value||"topic").replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"_")}
  function empty(){return `<div class="empty-state"><p class="eyebrow">OPEN A DATE</p><h1>선택한 날짜에 토픽이 없습니다.</h1><p>관리 화면에서 새 토픽을 만들거나 JSON을 가져와 시작하세요.</p><button class="button primary" data-action="create">새 토픽 만들기</button></div>`}
  function hero(t){return `<header class="topic-hero"><p class="eyebrow">${esc(t.date)} · ${esc(t.category).toUpperCase()}</p><h1>${esc(t.title.en)}<span class="ko-title">${esc(t.title.ko)}</span></h1><div class="topic-meta"><span class="chip">◷ ${t.leaderNotes.estimatedMinutes} min</span><span class="chip">같은 질문 · 다양한 깊이</span>${t.quality.status==="approved"?'<span class="chip">✓ Approved</span>':""}</div></header>`}
  function progress(){return `<nav class="progress-strip" aria-label="진행 섹션">${SECTION_LABELS.map((label,i)=>`<button data-scroll="section-${i+1}">${i+1}. ${label}</button>`).join("")}</nav>`}
  function heading(i,title){return `<div class="section-heading"><div><span class="section-num">STEP ${String(i).padStart(2,"0")}</span><h2>${title}</h2></div><button class="collapse" aria-label="${title} 접기 또는 펼치기">−</button></div>`}
  function dailyNav(t,mode){
    const dates=Object.keys(topics).sort(),index=dates.indexOf(t.date);
    const printActions=canPreviewTopic(t)?`<button data-open="${t.date}:print">학생용 A4</button><button data-print-leader="${t.date}">리더용 A4</button>`:"";
    return `<div class="daily-nav"><button data-action="calendar">← 월 목록</button><div><strong>${t.date} · ${weekday(t.date)}</strong><span>${lifecycleState(t).label} · 마지막 저장 ${new Date(t.updatedAt||t.createdAt).toLocaleString("ko-KR")}</span>${t.generatedConversation&&t.generationEngine!==Simple.VERSION?'<small class="legacy-format-badge">이전 형식</small>':""}</div><button data-prev-next="${dates[index-1]||""}" ${index<=0?"disabled":""}>이전 날짜</button><button data-prev-next="${dates[index+1]||""}" ${index<0||index>=dates.length-1?"disabled":""}>다음 날짜</button>${printActions}${mode!=="admin"?`<button data-open="${t.date}:admin">토픽 수정</button>`:""}</div>`;
  }
  function bilingual(en,ko){return `<div class="bilingual"><div class="en">${esc(en)}</div><div class="ko" lang="ko">${esc(ko)}</div></div>`}
  function questions(items,mode="easy",leader=false){
    return `<div class="question-list">${items.map((q,i)=>`<article class="question">${leader?`<label class="checkline"><input type="checkbox" data-check="${mode}-${i}"><span>`:""}${bilingual(q.questionEn,q.questionKo)}<div class="starter"><b>STARTER</b>${esc(q.starter)}</div>${mode==="main"?`<div class="followups"><div class="followup"><b>KEEP IT GOING</b>${esc(q.exampleFollowUp)}</div><div class="followup"><b>GO DEEPER</b>${esc(q.deeperFollowUp)}</div></div>`:q.followUp?`<div class="followups"><div class="followup"><b>KEEP IT GOING</b>${esc(q.followUp)}</div></div>`:""}${leader?"</span></label>":""}</article>`).join("")}</div>`;
  }
  function activity(a){return `<div class="activity">${bilingual(a.titleEn,a.titleKo)}<p>${esc(a.instructionEn)}</p><p class="ko">${esc(a.instructionKo)}</p><div class="option-grid">${a.options.map(o=>`<div class="option">${esc(o)}</div>`).join("")}</div></div>`}
  function card(i,title,body){return `<section class="flow-card" id="section-${i}">${heading(i,title)}${body}</section>`}
  function generationBlocked(t){
    const failed=t.operatorStatus?.generationStatus==="failed",title=failed?"GENERATION FAILED":"LEGACY OR INVALID DRAFT";
    const source=t.originalDraft||t;
    return `<section class="generation-blocked"><p class="eyebrow">${title}</p><h1>${failed?"토픽 내용을 완성하지 못했습니다.":"구형 또는 불완전한 자동 생성 초안입니다."}</h1><p>${failed?"작성된 초안은 보존했습니다.<br>문제가 있는 부분만 다시 생성하세요.":"이 초안은 자동 승인·미리보기·PDF 대상이 아닙니다."}</p><div class="button-row"><button class="button primary" data-action="regenerate-v2">v2 구조로 다시 생성</button><button class="button danger" data-action="delete">기존 초안 삭제</button></div><details><summary>원문 보기</summary><pre>${esc(JSON.stringify(source,null,2))}</pre></details></section>`;
  }
  function renderGeneratedScreen(t,leader=false){
    return `<header class="generated-topic-hero"><p class="eyebrow">${esc(t.date)} · ${leader?"LEADER GUIDE":"STUDENT"}</p><h1>${esc(t.title.en)}</h1><p lang="ko">${esc(t.title.ko)}</p></header><div class="generated-screen">${renderGeneratedHandout(t,leader)}</div>`;
  }
  function renderSimpleScreen(t,leader=false){
    return `<header class="generated-topic-hero"><p class="eyebrow">${esc(t.date)} · SIMPLE CONVERSATION · ${leader?"LEADER":"STUDENT"}</p><h1>${esc(t.title.en)}</h1><p lang="ko">${esc(t.title.ko)}</p></header><div class="generated-screen">${renderSimpleHandout(t,leader)}</div>`;
  }
  function renderStudent(t){
    if(!t)return empty();
    if(!canPreviewTopic(t))return dailyNav(t,"student")+generationBlocked(t);
    if(t.generationEngine===Simple.VERSION)return dailyNav(t,"student")+renderSimpleScreen(t);
    if(t.generationEngine===Generation.VERSION)return dailyNav(t,"student")+renderGeneratedScreen(t);
    if(t.conversationFlow)return dailyNav(t,"student")+renderConversationScreen(t);
    return dailyNav(t,"student")+hero(t)+progress()+
      card(1,"Topic Hook",bilingual(t.hook.en,t.hook.ko))+
      card(2,"Today's Goal",bilingual(t.goal.en,t.goal.ko))+
      card(3,"Small Talk",questions(t.smallTalk,"small"))+
      card(4,"Quick Activity",activity(t.quickActivity))+
      card(5,"Easy Entry",questions(t.easyEntry,"easy"))+
      card(6,"Main Discussion",questions(t.mainDiscussion,"main"))+
      card(7,"Mid-game",activity(t.midGame))+
      card(8,"Useful Phrases",`<div class="phrase-grid">${t.usefulPhrases.map(p=>`<div class="phrase"><strong>${esc(p.en)}</strong><span class="ko">${esc(p.ko)}</span><small>${esc(p.usage)}</small></div>`).join("")}</div>`)+
      card(9,"Final Round",`${bilingual(t.finalRound.questionEn,t.finalRound.questionKo)}<div class="starter"><b>STARTER</b>${esc(t.finalRound.starter)}</div>`);
  }
  function renderConversationScreen(t){
    const flow=t.conversationFlow;
    return `${hero(t)}<nav class="conversation-path" aria-label="회화 진행 순서"><b>CHOOSE</b><b>SAY</b><b>ADD</b><b>ASK</b><b>REACT</b><b>DECIDE</b></nav>
      ${card(1,"Start Now",flow.quickStarts.map(item=>`<article class="screen-conversation-card"><h3>${esc(item.questionEn)}</h3><p class="ko">${esc(item.questionKo)}</p><div class="choice-row">${item.options.map(option=>`<span>${esc(option)}</span>`).join("")}</div>${actionCue("SAY",item.sayFrame)}</article>`).join(""))}
      ${card(2,"Tell Your Story",flow.storyPrompts.map(item=>`<article class="screen-conversation-card"><h3>${esc(item.questionEn)}</h3><ol>${item.storySteps.map(step=>`<li>${esc(step)}</li>`).join("")}</ol>${actionCue("ASK",item.askSomeone)}<p class="ko">${esc(item.noExperienceAlternative)}</p></article>`).join(""))}
      ${card(3,"Talk Together",flow.talkRounds.map(item=>`<article class="screen-conversation-card"><h3>${esc(item.questionEn)}</h3>${actionCue("SAY",item.sayFrame)}${actionCue("ASK",item.askPrompt)}${actionCue("REACT",item.reactionPrompts.join(" / "))}</article>`).join(""))}
      ${card(4,"Group Mission",`<article class="screen-conversation-card mission"><h3>${esc(flow.groupMission.titleEn)}</h3><p>${esc(flow.groupMission.instructionEn)}</p><div class="option-grid">${flow.groupMission.options.map(option=>`<span class="option">${esc(option)}</span>`).join("")}</div><strong>${esc(flow.groupMission.everyoneSpeaksRule)}</strong></article>`)}
      ${card(5,"Final Round",`<article class="screen-conversation-card"><h3>${esc(flow.finalRound.questionEn)}</h3>${actionCue("SAY",flow.finalRound.sayFrame)}</article>`)}`;
  }
  function renderLeader(t){
    if(!t)return empty();
    if(!canPreviewTopic(t))return dailyNav(t,"leader")+generationBlocked(t);
    if(t.generationEngine===Simple.VERSION)return `${dailyNav(t,"leader")}<div class="leader-toolbar"><div class="timer" id="timer-display">${formatTime(timerSeconds)}</div><button data-action="timer-start">시작/일시정지</button><button data-action="timer-reset">초기화</button><button data-print-leader="${t.date}">리더용 A4</button></div>${renderSimpleScreen(t,true)}${renderFeedback(t)}`;
    if(t.generationEngine===Generation.VERSION)return dailyNav(t,"leader")+renderGeneratedScreen(t,true);
    if(t.conversationFlow){
      const guide=t.conversationFlow.leaderGuide;
      return `${dailyNav(t,"leader")}<div class="leader-toolbar"><div class="timer" id="timer-display">${formatTime(timerSeconds)}</div><button data-action="timer-start">시작/일시정지</button><button data-action="timer-reset">초기화</button><button data-print-leader="${t.date}">리더용 A4</button></div>${renderConversationScreen(t)}
        <section class="leader-support"><h2>100분 진행 지원</h2><div><strong>짧게 답했을 때</strong><p>${esc(guide.shortAnswerPrompts.join(" · "))}</p></div><div><strong>경험이 없을 때</strong><p>${esc(guide.noExperiencePrompts.join(" · "))}</p></div><div><strong>턴 넘기기</strong><p>${esc(guide.turnTransitions.join(" · "))}</p></div><div><strong>조용한 참가자</strong><p>${esc(guide.quietSpeakerPrompts.join(" · "))}</p></div></section>${renderFeedback(t)}`;
    }
    const schedule=[["Small Talk","10"],["Quick","10"],["Easy Entry","20"],["Main 1","25"],["Mid-game","10"],["Main 2","20"],["Final","5"]];
    return `${dailyNav(t,"leader")}<div class="leader-toolbar"><div class="timer" id="timer-display">${formatTime(timerSeconds)}</div><button data-action="timer-start">시작/일시정지</button><button data-action="timer-reset">초기화</button><button data-action="student-share">학생 화면 공유</button><button data-print-leader="${t.date}">리더용 A4</button></div>${hero(t)}<div class="timeline">${schedule.map(s=>`<div class="time-block"><strong>${s[0]}</strong>${s[1]}분</div>`).join("")}</div>
      <div class="leader-note"><strong>대화가 끊겼을 때</strong><br>${t.leaderNotes.whenConversationStops.map(esc).join(" · ")}</div>
      <div class="leader-note"><strong>진행 메모</strong><br>${esc(t.leaderNotes.recommendedSkip)}<br>${esc(t.leaderNotes.sensitiveWarning)}</div>
      ${card(1,"Topic Hook",bilingual(t.hook.en,t.hook.ko))}${card(2,"Today's Goal",bilingual(t.goal.en,t.goal.ko))}
      ${card(3,"Small Talk",questions(t.smallTalk,"small",true))}${card(4,"Quick Activity",activity(t.quickActivity))}
      ${card(5,"Easy Entry",questions(t.easyEntry,"easy",true))}${card(6,"Main Discussion",questions(t.mainDiscussion,"main",true))}
      ${card(7,"Mid-game",activity(t.midGame))}${card(8,"Useful Phrases",`<div class="phrase-grid">${t.usefulPhrases.map(p=>`<div class="phrase"><strong>${esc(p.en)}</strong><span class="ko">${esc(p.ko)}</span><small>${esc(p.usage)}</small></div>`).join("")}</div>`)}
      ${card(9,"Final Round",bilingual(t.finalRound.questionEn,t.finalRound.questionKo))}`;
  }
  function renderFeedback(t){
    return `<form class="feedback-card" data-feedback-form="${esc(t.id)}"><h2>10초 사용 피드백</h2>
      <label>첫 발화가 쉬웠나요?<select name="firstSpeech"><option>쉬움</option><option>보통</option><option>어려움</option></select></label>
      <label>대화가 이어졌나요?<select name="continuity"><option>잘 이어짐</option><option>보통</option><option>자주 끊김</option></select></label>
      <label>다시 사용할 만한가요?<select name="reuse"><option>추천</option><option>수정 후 사용</option><option>재사용하지 않음</option></select></label>
      <fieldset><legend>문제가 있었던 이유</legend>${["주제가 어려움","질문이 추상적","비슷한 질문 반복","영어가 어려움","활동이 재미없음","개인 경험이 부족함","대화가 짧게 끝남","기타"].map(tag=>`<label><input type="checkbox" name="reason" value="${tag}">${tag}</label>`).join("")}</fieldset>
      <button class="button primary" type="submit">피드백 저장</button></form>`;
  }
  function formatTime(total){const m=String(Math.floor(total/60)).padStart(2,"0"),s=String(total%60).padStart(2,"0");return`${m}:${s}`}
  function sessionSummary(t){
    const one=t.sessionOne,two=t.sessionTwo,oneRows=one.rounds||[
      {title:"START NOW",minutes:10},{title:"TELL YOUR STORY",minutes:20},{title:"TALK TOGETHER",minutes:15},{title:"WRAP",minutes:5}
    ];
    const twoRows=[two.reset,two.mainActivity,two.secondaryActivity,two.groupDecision,two.finalRound].filter(item=>Number(item?.minutes)>0).map((item,index)=>({
      title:item.titleEn||(item===two.groupDecision?(two.secondaryActivity?"FINAL DECISION":"GROUP DECISION"):item===two.finalRound?"FINAL ROUND":`ACTIVITY ${index+1}`),
      minutes:item.minutes
    }));
    const mechanismLabels={personalArtifact:"실제 물건 사용",timedTurn:"순서대로 말하기",informationGap:"서로 다른 정보",assignedOpposition:"반대 역할",openEndedDecision:"그룹 최종 결정"};
    return `<div class="session-meta"><section><h3>SESSION 1 · ${safeMinutes(one.minutes,50)} MIN</h3>${oneRows.map(row=>`<p><b>${esc(row.title)}</b><span>${safeMinutes(row.minutes,0)}분</span></p>`).join("")}</section><section><h3>SESSION 2 · ${safeMinutes(two.minutes,40)} MIN</h3>${twoRows.map(row=>`<p><b>${esc(row.titleEn||row.title)}</b><span>${safeMinutes(row.minutes,0)}분</span></p>`).join("")}</section><section><h3>말하기 장치</h3>${Object.entries(t.speakingMechanisms||{}).filter(([,enabled])=>enabled).map(([key])=>`<p><b>${mechanismLabels[key]||key}</b></p>`).join("")}</section></div>`;
  }

  function renderAdmin(t){
    if(!t)return empty();
    if(t.operatorStatus?.generationStatus==="failed"||t.generatedConversation&&![Simple.VERSION,Generation.VERSION].includes(t.generationEngine))return dailyNav(t,"admin")+generationBlocked(t);
    if(t.generationEngine===Simple.VERSION){
      const evaluation=Simple.evaluate(t,Object.values(topics)),state=evaluation.blockers.length?"생성 실패":evaluation.issues.length?"확인 필요":"사용 가능";
      const issues=evaluation.issues.map(item=>`<li class="${item.severity}"><strong>${esc(item.location)}</strong><span>${esc(item.message)}</span></li>`).join("");
      const score=evaluation.quality||t.contentQuality,scoreRows=score?Object.entries(score.scores).map(([key,value])=>`<li><strong>${esc(key)}</strong><span>${value}</span></li>`).join(""):"";
      return `${dailyNav(t,"admin")}<section class="simple-review-status ${evaluation.blockers.length?"has-errors":"is-ready"}"><p class="eyebrow">SIMPLE CONVERSATION</p><h2>${state}</h2>${issues?`<ul class="issue-list">${issues}</ul>`:"<p>학생용과 리더용 자료를 미리 본 뒤 승인하세요.</p>"}</section><section class="operator-review simple-operator-review"><div class="review-heading"><div><p class="eyebrow">승인 전 확인</p><h2>학생용 A4 1·2페이지</h2></div></div><button class="review-preview-grid" data-preview-modal aria-label="학생용 A4 두 페이지 크게 보기">${renderSimpleHandout(t)}</button></section><section class="review-actions simple-review-actions"><details class="regeneration-menu"><summary class="button secondary">부분 다시 생성 ▾</summary><div>${[["story","Story만 다시 만들기"],["easyTalk","Easy Talk만 다시 만들기"],["realTalk","Real Talk만 다시 만들기"],["expressions","Today’s English만 다시 만들기"],["activity","Activity만 다시 만들기"],["korean","한국어만 다시 확인하기"]].map(([key,label])=>`<button data-simple-regenerate="${key}">${label}</button>`).join("")}</div></details><button class="button secondary" data-action="regenerate-v2">전체 다시 생성</button><button class="button secondary" data-open="${t.date}:print" ${evaluation.blockers.length?"disabled":""}>미리보기</button><button class="button primary approve-button" data-action="approve-save" ${evaluation.blockers.length?"disabled aria-disabled=\"true\"":""}>승인하고 저장</button></section><dialog class="a4-preview-dialog"><button class="dialog-close" data-preview-close>닫기</button><div>${renderSimpleHandout(t)}</div></dialog><details class="advanced-editor"><summary>고급 QA 및 생성 데이터${score?` · ${score.total}/100`:""}</summary>${scoreRows?`<ul class="simple-score-list">${scoreRows}</ul>`:""}<pre>${esc(JSON.stringify(t,null,2))}</pre></details>`;
    }
    if(t.generationEngine===Generation.VERSION){
      const evaluation=Generation.evaluate(t,Object.values(topics)),printReady=t.operatorStatus?.printValidation?.status==="ready"&&["checked","printed"].includes(t.operatorStatus?.printStatus);
      const gateClass=evaluation.blockers.length?"draft":evaluation.warnings.length?"warning":"approved";
      const gateLabel=evaluation.blockers.length?`승인 차단 · BLOCKER ${evaluation.blockers.length}개`:evaluation.warnings.length?`경고 ${evaluation.warnings.length}개 · 승인 가능`:"승인 가능 · 검사 통과";
      const renderSafe=!evaluation.blockers.some(item=>item.id==="B1");
      const issueItems=evaluation.issues.map(item=>`<li class="${item.severity==="blocker"?"critical":"warning"}"><strong>${esc(item.id)} · ${esc(item.location)}</strong><span>${esc(item.message)}</span></li>`).join("");
      return `${dailyNav(t,"admin")}<section class="quality-panel ${gateClass}"><h2>${gateLabel}</h2><div class="readiness-split"><span class="${evaluation.blockers.length?"":"ready"}">BLOCKER ${evaluation.blockers.length}</span><span class="${evaluation.warnings.length?"warning":"ready"}">WARNING ${evaluation.warnings.length}</span><span class="${printReady?"ready":""}">PRINT ${printReady?"READY":"REVIEW"}</span></div>${issueItems?`<ul class="issue-list">${issueItems}</ul>`:`<p lang="ko">B1~B11과 W1~W12 검사를 모두 통과했습니다.</p>`}</section><section class="operator-review"><div class="review-heading"><div><p class="eyebrow">BOUND-FIELD APPROVAL GATE · 승인 전 확인</p><h2>학생용 A4 1·2페이지</h2></div><span>${evaluation.issues.length}개 확인 항목</span></div>${renderSafe?`<button class="review-preview-grid" data-preview-modal aria-label="학생용 A4 두 페이지 크게 보기">${renderGeneratedHandout(t)}</button>`:`<p class="approval-warning">필수 섹션 누락으로 미리보기를 만들 수 없습니다.</p>`}</section><section class="review-actions"><button class="button secondary" data-action="regenerate-v2">새 형식으로 다시 생성</button>${evaluation.ready?`<button class="button secondary" data-open="${t.date}:print">학생용 A4 미리보기</button>`:""}<button class="button primary approve-button" data-action="approve-save" ${evaluation.blockers.length?"disabled aria-disabled=\"true\"":""}>승인하고 저장</button><button class="button danger" data-action="delete">삭제</button></section>${renderSafe?`<dialog class="a4-preview-dialog"><button class="dialog-close" data-preview-close>닫기</button><div>${renderGeneratedHandout(t)}</div></dialog>`:""}<details class="advanced-editor"><summary>생성 데이터 및 원문 보기</summary><pre>${esc(JSON.stringify(t,null,2))}</pre></details>`;
    }
    const result=validateTopic(t),qStatus=result.status==="approved"?"approved":result.status==="review"?"review":"draft";
    const conversation=t.conversationFlow?window.TalkFlowConversation.evaluate(t.conversationFlow):null;
    const speaking=window.TalkFlowSessions.speakingEvaluate(t);
    const diagnostics=[...(conversation?.diagnostics||[]),...window.TalkFlowSessions.diagnostics(t),...speaking.diagnostics];
    const structureReady=conversation?.status==="ready"&&!window.TalkFlowSessions.diagnostics(t).length;
    const printReady=validatePrint(t).status==="ready"&&["checked","printed"].includes(t.operatorStatus?.printStatus)&&t.operatorStatus?.printValidation?.status==="ready";
    const finalLabel=structureReady&&speaking.status==="ready"&&printReady?"CONVERSATION READY":structureReady&&speaking.status==="ready"?"PRINT REVIEW REQUIRED":structureReady?"STRUCTURE READY · SPEAKING REVIEW REQUIRED":speaking.label;
    const speakingChecks=[["material","실제 말할 재료가 있습니다."],["axes","질문이 서로 다른 내용을 다룹니다."],["turns","모든 참가자의 순번이 있습니다."],["opposition","반대 의견이 생기는 활동이 있습니다."],["decision","정답 없는 그룹 결론이 있습니다."]];
    const repairLabel=item=>item.target==="sessionTwo.mainActivity"?"활동 다시 만들기":item.target?.includes("options")?"선택지 보완":item.target==="commonGround"?"설명 줄이기":"이 부분만 다시 만들기";
    return `${dailyNav(t,"admin")}${t.conversationFlow?"":`<div class="admin-toolbar"><button class="button primary" data-action="save">저장</button><button class="button secondary" data-action="validate">자동 검수</button><button class="button secondary" data-action="convert-flow">회화형 구조로 변환</button><span class="spacer"></span><button class="button danger" data-action="delete">삭제</button></div>`}
      <div class="quality-panel ${qStatus}"><h3>${esc(finalLabel)}</h3><b class="topic-mode-label">${t.topicMode==="context"?"60초 설명이 포함된 정보형":"바로 대화 가능한 생활형"}</b><div class="readiness-split"><span class="${structureReady?"ready":""}">STRUCTURE ${structureReady?"READY":"REVIEW"}</span><span class="${speaking.status==="ready"?"ready":""}">${esc(speaking.label)}</span><span class="${printReady?"ready":""}">PRINT ${printReady?"READY":"REVIEW"}</span></div><ul class="speaking-checks">${speakingChecks.map(([key,label])=>`<li class="${speaking.checks[key]?"ready":"review"}"><b>${speaking.checks[key]?"✓":"!"}</b>${label}</li>`).join("")}</ul><div class="ko">${diagnostics.length?`${diagnostics.length}개 문제를 확인하세요.`:"구조와 실제 발화 준비가 완료됐습니다."}</div>${diagnostics.length?`<ul class="issue-list">${diagnostics.map(item=>`<li class="${item.critical?"critical":""}"><strong>${esc(item.location)}</strong><span>${esc(item.message)}</span><button class="mini" data-regenerate="${esc(item.target)}">${repairLabel(item)}</button></li>`).join("")}</ul>`:""}</div>
      ${t.conversationFlow?`<section class="operator-review"><div class="review-heading"><div><p class="eyebrow">${esc(lifecycleState(t).label)} · 승인 전 확인</p><h2>학생용 A4 1·2페이지</h2></div><span>${diagnostics.length}개 확인 항목</span></div><p class="review-preview-help">두 페이지를 함께 확인하세요. 페이지를 누르면 큰 A4 미리보기가 열립니다.</p><button class="review-preview-grid" data-preview-modal aria-label="학생용 A4 두 페이지 크게 보기">${renderConversationHandout(t)}</button></section><section class="review-actions"><button class="button secondary preview-button" data-open="${t.date}:print">학생용 A4 미리보기</button><details class="regeneration-menu"><summary class="button secondary">다시 생성 ▾</summary><div><button data-regenerate="all">문제 자동 수정</button><button data-regenerate="sessionOne">질문만 다시 만들기</button><button data-regenerate="sessionTwo.mainActivity">활동만 다시 만들기</button><button data-regenerate="sessionTwo.mainActivity.options">선택지만 보완</button><button data-regenerate="translation">번역만 다시 확인</button></div></details><button class="button primary approve-button" data-action="approve-save">승인하고 저장</button><details class="admin-overflow"><summary class="button secondary">⋯</summary><div><button data-toggle-hidden="${t.date}">${t.hidden?"공개":"숨김"}</button><button data-clone-from="${t.date}">복제</button><button data-action="export">월 JSON</button><button data-action="advanced-open">고급 편집</button></div></details></section>${diagnostics.length&&!conversation.critical?`<p class="approval-warning">현재 확인이 필요한 항목이 있습니다. 문제를 확인한 뒤 승인하세요.</p>`:""}<dialog class="a4-preview-dialog"><button class="dialog-close" data-preview-close aria-label="미리보기 닫기">닫기</button><div>${renderConversationHandout(t)}</div><button class="button primary" data-open="${t.date}:print">학생용 PDF 열기</button></dialog>`:""}
      ${t.conversationFlow?`<section class="conversation-flow-summary"><h2>실제 세션 구성</h2>${sessionSummary(t)}</section>`:""}
      <div class="${t.conversationFlow?"conversation-editor-summary":""}"><div class="editor-section"><h3>기본 정보</h3><div class="form-grid">${field("date","날짜",t.date,"date")}${field("category","카테고리",t.category)}${field("title.en","English title",t.title.en)}${field("title.ko","한국어 제목",t.title.ko)}${area("hook.en","Topic Hook · English",t.hook.en)}${area("hook.ko","Topic Hook · 한국어",t.hook.ko)}${area("goal.en","Today's Goal · English",t.goal.en)}${area("goal.ko","Today's Goal · 한국어",t.goal.ko)}</div></div>
      ${editQuestionSection("smallTalk","Small Talk",t.smallTalk,false)}
      ${editActivity("quickActivity","Quick Activity",t.quickActivity)}
      ${editQuestionSection("easyEntry","Easy Entry",t.easyEntry,false)}
      ${editQuestionSection("mainDiscussion","Main Discussion",t.mainDiscussion,true)}
      ${editActivity("midGame","Mid-game",t.midGame)}
      <div class="editor-section"><h3>Useful Phrases <button class="mini" data-regenerate="usefulPhrases">이 섹션 재생성</button></h3>${t.usefulPhrases.map((p,i)=>`<div class="editor-item form-grid">${field(`usefulPhrases.${i}.en`,"English",p.en)}${field(`usefulPhrases.${i}.ko`,"한국어",p.ko)}${area(`usefulPhrases.${i}.usage`,"Usage",p.usage)}</div>`).join("")}</div>
      <div class="editor-section"><h3>Final Round <button class="mini" data-regenerate="finalRound">이 섹션 재생성</button></h3><div class="form-grid">${area("finalRound.questionEn","English",t.finalRound.questionEn)}${area("finalRound.questionKo","한국어",t.finalRound.questionKo)}${area("finalRound.starter","Starter",t.finalRound.starter)}</div></div></div>
      <details class="advanced-editor" ${t.conversationFlow?"":"open"}><summary>고급 편집 및 기술 데이터</summary><div class="editor-section"><h3>Leader Notes</h3><div class="form-grid">${field("leaderNotes.estimatedMinutes","예상 진행 시간",t.leaderNotes.estimatedMinutes,"number")}${area("leaderNotes.sensitiveWarning","민감도 주의",t.leaderNotes.sensitiveWarning)}${area("leaderNotes.recommendedSkip","건너뛰기 권장",t.leaderNotes.recommendedSkip)}<label>승인 상태<select data-path="quality.status"><option value="draft" ${t.quality.status==="draft"?"selected":""}>초안</option><option value="review" ${t.quality.status==="review"?"selected":""}>검토</option><option value="approved" ${t.quality.status==="approved"?"selected":""}>승인</option></select></label><label>공개 숨김<select data-path="hidden"><option value="false" ${!t.hidden?"selected":""}>공개</option><option value="true" ${t.hidden?"selected":""}>숨김</option></select></label></div><div class="button-row">${t.conversationFlow?'<button class="button secondary" data-action="restore-version">이전 버전 복원</button>':""}<button class="button secondary" data-action="export">월 JSON</button><button class="button secondary" data-action="import">JSON 가져오기</button><button class="button secondary" data-action="viewer">공개 뷰어</button><button class="button secondary" data-action="generate-all">전체 다시 생성</button></div></div></details>`;
  }
  function field(path,label,value,type="text"){return `<label>${label}<input type="${type}" data-path="${path}" value="${esc(value)}"></label>`}
  function area(path,label,value){return `<label>${label}<textarea data-path="${path}">${esc(value)}</textarea></label>`}
  function editQuestionSection(key,title,items,deep){
    return `<div class="editor-section"><h3>${title} <button class="mini" data-add="${key}">＋ 질문</button> <button class="mini" data-regenerate="${key}">이 섹션 재생성</button></h3>${items.map((q,i)=>`<div class="editor-item"><div class="item-actions"><button class="mini" data-move="${key}:${i}:-1">↑</button><button class="mini" data-move="${key}:${i}:1">↓</button><button class="mini" data-remove="${key}:${i}">삭제</button></div><div class="form-grid">${area(`${key}.${i}.questionEn`,"Question · English",q.questionEn)}${area(`${key}.${i}.questionKo`,"Question · 한국어",q.questionKo)}${area(`${key}.${i}.starter`,"Starter",q.starter)}${deep?`${area(`${key}.${i}.exampleFollowUp`,"Example Follow-up",q.exampleFollowUp)}${area(`${key}.${i}.deeperFollowUp`,"Deeper Follow-up",q.deeperFollowUp)}`:area(`${key}.${i}.followUp`,"Follow-up",q.followUp||"")}</div></div>`).join("")}</div>`;
  }
  function editActivity(key,title,a){return `<div class="editor-section"><h3>${title} <button class="mini" data-regenerate="${key}">이 섹션 재생성</button></h3><div class="form-grid">${field(`${key}.type`,"Type",a.type)}${field(`${key}.titleEn`,"Title · English",a.titleEn)}${field(`${key}.titleKo`,"Title · 한국어",a.titleKo)}${area(`${key}.instructionEn`,"Instruction · English",a.instructionEn)}${area(`${key}.instructionKo`,"Instruction · 한국어",a.instructionKo)}${area(`${key}.optionsText`,"Options · 한 줄에 하나",a.options.join("\n"))}</div></div>`}

  function setPath(object,path,value){
    const parts=path.split(".");let target=object;
    for(let i=0;i<parts.length-1;i++){if(!target[parts[i]]||typeof target[parts[i]]!=="object")target[parts[i]]={};target=target[parts[i]]}
    const key=parts.at(-1);
    if(key==="estimatedMinutes")target[key]=Number(value);
    else if(path==="hidden")target[key]=value==="true";
    else if(key==="optionsText")target.options=value.split("\n").map(x=>x.trim()).filter(Boolean);
    else target[key]=value;
  }
  function bindDynamic(){
    document.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{if(confirmDirty()){activeDate=b.dataset.date;render()}});
    document.querySelectorAll(".collapse").forEach(b=>b.onclick=()=>{const card=b.closest(".flow-card");card.classList.toggle("is-collapsed");b.textContent=card.classList.contains("is-collapsed")?"+":"−"});
    document.querySelectorAll("[data-scroll]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"}));
    document.querySelectorAll("[data-path]").forEach(input=>input.oninput=()=>{setPath(current(),input.dataset.path,input.value);current().updatedAt=new Date().toISOString();dirty=true;saveDraft()});
    document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>handleAction(b.dataset.action));
    const operatorTopic=$("#operator-topic"),operatorCreate=document.querySelector("[data-action='operator-create']");
    if(operatorTopic&&operatorCreate)operatorTopic.oninput=()=>{operatorCreate.disabled=!operatorTopic.value.trim()};
    document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{const[date,target]=b.dataset.open.split(":");if(target==="print"&&!canPreviewTopic(topics[date])){notify("완성되지 않은 토픽은 미리보기·PDF를 사용할 수 없습니다.",true);return}activeDate=date;printDates.clear();if(target==="print")printDates.add(date);view=target;render()});
    document.querySelectorAll("[data-print-date]").forEach(input=>input.onchange=()=>{input.checked?printDates.add(input.dataset.printDate):printDates.delete(input.dataset.printDate);render()});
    document.querySelectorAll("[data-create-date]").forEach(b=>b.onclick=()=>createTopic(b.dataset.createDate));
    document.querySelectorAll("[data-auto-date]").forEach(b=>b.onclick=()=>autoCreateDate(b.dataset.autoDate));
    document.querySelectorAll("[data-custom-date]").forEach(b=>b.onclick=()=>openCustomTopic(b.dataset.customDate));
    document.querySelectorAll("[data-used]").forEach(b=>b.onclick=()=>{const topic=topics[b.dataset.used];topic.operatorStatus={...topic.operatorStatus,used:true};saveTopics("사용 완료로 표시했습니다.")});
    document.querySelectorAll("[data-preview-modal]").forEach(button=>button.onclick=()=>document.querySelector(".a4-preview-dialog")?.showModal());
    document.querySelectorAll("[data-preview-close]").forEach(button=>button.onclick=()=>button.closest("dialog")?.close());
    document.querySelectorAll("[data-clone-from]").forEach(b=>b.onclick=()=>cloneTopicFrom(b.dataset.cloneFrom));
    document.querySelectorAll("[data-move-to]").forEach(b=>b.onclick=()=>moveTopicTo(b.dataset.moveTo));
    document.querySelectorAll("[data-toggle-hidden]").forEach(b=>b.onclick=()=>{const t=topics[b.dataset.toggleHidden];t.hidden=!t.hidden;saveTopics(t.hidden?"토픽을 숨겼습니다.":"토픽을 공개했습니다.")});
    document.querySelectorAll("[data-prev-next]").forEach(b=>b.onclick=()=>{if(b.dataset.prevNext){activeDate=b.dataset.prevNext;render()}});
    document.querySelectorAll("[data-print-leader]").forEach(b=>b.onclick=()=>{if(!canPreviewTopic(topics[b.dataset.printLeader])){notify("완성되지 않은 토픽은 리더용 PDF를 사용할 수 없습니다.",true);return}activeDate=b.dataset.printLeader;printDates=new Set([activeDate]);printLeader=true;view="print";render()});
    document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>{const t=topics[b.dataset.approve],result=validateTopic(t);if(result.status!=="approved"){notify(`승인 전 ${result.issues.length}개 품질 항목을 확인하세요.`,true);return}t.quality={status:"approved",score:result.score,issues:[]};saveTopics("토픽을 승인했습니다.")});
    document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{current()[b.dataset.add].push({questionEn:"",questionKo:"",starter:"",followUp:"",exampleFollowUp:"",deeperFollowUp:""});dirty=true;render()});
    document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const[k,i]=b.dataset.remove.split(":");current()[k].splice(Number(i),1);dirty=true;render()});
    document.querySelectorAll("[data-move]").forEach(b=>b.onclick=()=>{const[k,rawI,rawD]=b.dataset.move.split(":"),i=Number(rawI),to=i+Number(rawD),arr=current()[k];if(to<0||to>=arr.length)return;[arr[i],arr[to]]=[arr[to],arr[i]];dirty=true;render()});
    document.querySelectorAll("[data-regenerate]").forEach(b=>b.onclick=()=>regenerate(b.dataset.regenerate));
    document.querySelectorAll("[data-simple-regenerate]").forEach(b=>b.onclick=()=>regenerateSimpleSection(b.dataset.simpleRegenerate));
    document.querySelectorAll("[data-feedback-form]").forEach(form=>form.onsubmit=event=>{
      event.preventDefault();
      const data=new FormData(form),records=loadRecord(KEYS.feedback);
      records[current().id]=[...(records[current().id]||[]),{createdAt:new Date().toISOString(),firstSpeech:data.get("firstSpeech"),continuity:data.get("continuity"),reuse:data.get("reuse"),reasons:data.getAll("reason")}].slice(-20);
      localStorage.setItem(KEYS.feedback,JSON.stringify(records));notify("사용 피드백을 저장했습니다.");
    });
  }
  function confirmDirty(){return!dirty||confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")}
  function handleAction(action){
    if(action==="save")saveTopics();
    if(action==="validate"){const r=validateTopic(current());current().quality={status:r.status==="approved"?"approved":"review",score:r.score,issues:r.issues};dirty=true;saveTopics("품질검사를 완료하고 저장했습니다.")}
    if(action==="delete"){if(confirm("이 Talk Flow 토픽을 삭제할까요?")){delete topics[activeDate];activeDate=Object.keys(topics).sort()[0]||today();saveTopics("삭제했습니다.")}}
    if(action==="create")createTopic(activeDate);
    if(action==="export")exportMonth();
    if(action==="import")$("#json-import").click();
    if(action==="viewer")openViewer();
    if(action==="print")window.print();
    if(action==="student-share")shareStudent();
    if(action==="timer-start")toggleTimer();
    if(action==="timer-reset"){timerSeconds=0;clearInterval(timerHandle);timerHandle=null;render()}
    if(action==="generate-all")regenerate("all");
    if(action==="calendar"){view="calendar";printDates.clear();document.title="TheBox Talk Flow";render()}
    if(action==="today"){cursor=new Date();render()}
    if(action==="previous-month"){cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1,12);render()}
    if(action==="next-month"){cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1,12);render()}
    if(action==="auto-compose-month")autoComposeMonth();
    if(action==="settings"){$("#settings-button").click()}
    if(action==="create-for-month"){const date=prompt("새 토픽 날짜 (YYYY-MM-DD)",`${monthPrefix()}-01`);if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date))createTopic(date)}
    if(action==="recommend-topic"){
      const feedback=loadRecord(KEYS.feedback),blocked=new Set(Object.entries(feedback).filter(([,items])=>items.at(-1)?.reuse==="재사용하지 않음").map(([id])=>id));
      const learned=Object.values(topics).filter(topic=>!blocked.has(topic.id)&&feedback[topic.id]?.at(-1)?.reuse==="추천").map(topic=>topic.title.ko);
      const recommendations=[...learned,"작은 선택이 하루를 바꾸는 순간","새로운 장소를 고르는 기준","메시지를 더 편하게 주고받는 법","함께 정하는 주말 계획"];
      $("#operator-topic").value=recommendations[new Date().getDate()%recommendations.length];
      const createButton=document.querySelector("[data-action='operator-create']");if(createButton)createButton.disabled=false;
      notify("추천 주제를 입력했습니다. 내용을 확인한 뒤 토픽 생성하기를 누르세요.");
    }
    if(action==="operator-create")createConversationTopic();
    if(action==="regenerate-v2")regenerateV2();
    if(action==="convert-flow")convertCurrentToConversation();
    if(action==="restore-version")restoreVersion();
    if(action==="approve-save")approveAndSave();
    if(action==="advanced-open"){const advanced=document.querySelector(".advanced-editor");if(advanced){advanced.open=true;advanced.scrollIntoView({behavior:"smooth",block:"start"})}}
    if(action==="select-approved"){printDates=new Set(Object.values(topics).filter(t=>t.date.startsWith(monthPrefix())&&t.quality?.status==="approved"&&!t.hidden).map(t=>t.date));render()}
    if(action==="month-print"){printDates=new Set(Object.values(topics).filter(t=>t.date.startsWith(monthPrefix())&&t.quality?.status==="approved"&&!t.hidden).map(t=>t.date));view="print";render()}
    if(action==="week-print"){const start=new Date();start.setDate(start.getDate()-((start.getDay()+6)%7));printDates=new Set(Object.values(topics).filter(t=>{const d=new Date(`${t.date}T12:00:00`),end=new Date(start);end.setDate(end.getDate()+7);return d>=start&&d<end&&t.quality?.status==="approved"&&!t.hidden}).map(t=>t.date));if(!printDates.size)notify("이번 주 승인 토픽이 없습니다.",true);else{view="print";render()}}
    if(action==="batch-print"){if(printDates.size){view="print";render()}}
    if(action==="toggle-print-role"){printLeader=!printLeader;render()}
    if(action==="confirm-print"){
      const topic=topics[[...printDates][0]];
      if(topic?.quality?.status!=="approved"){notify("승인된 토픽만 인쇄 준비 완료로 표시할 수 있습니다.",true);return}
      if(!canPreviewTopic(topic)){notify("콘텐츠 검증을 통과하지 못해 인쇄 확인을 진행할 수 없습니다.",true);return}
      const printValidation=evaluateRenderedPrint(topic);
      if(printValidation.status!=="ready"){notify(`A4 확인 실패: ${printValidation.issues.join(" ")}`,true);return}
      topic.operatorStatus={...topic.operatorStatus,printStatus:"checked",printValidation};
      saveTopics("A4 확인을 완료해 인쇄 준비 상태로 변경했습니다.");
    }
    if(action==="print-now"){const selected=[...printDates].map(date=>topics[date]).filter(Boolean);if(selected.some(topic=>!canPreviewTopic(topic))){notify("완성되지 않은 토픽은 PDF로 출력할 수 없습니다.",true);return}window.print()}
  }
  function createTopic(date){
    const base=clone(Object.values(window.TALKFLOW_SAMPLE_TOPICS)[0]);base.id=`talkflow-${date}-${crypto.randomUUID()}`;base.date=date;base.title={en:"New Conversation Flow",ko:"새 대화 흐름"};base.quality={status:"draft",score:0,issues:["내용을 작성하고 품질검사를 실행하세요."]};base.createdAt=base.updatedAt=new Date().toISOString();topics[date]=base;activeDate=date;dirty=true;view="admin";render();
  }
  async function createConversationTopic(){
    const date=$("#operator-date").value,keyword=$("#operator-topic").value.trim(),mood=$("#operator-mood").value;
    if(!date||!keyword){notify("날짜와 주제를 입력해 주세요.",true);return}
    if(topics[date]){notify("선택한 날짜에 토픽이 있습니다. 기존 토픽을 열거나 다른 날짜를 선택하세요.",true);return}
    await generateAndStore({date,keyword,mood,avoid:$("#operator-avoid")?.value.trim()||""});
  }
  function pendingGeneration(request,originalDraft=null){
    const createdAt=new Date().toISOString();
    return{id:`talkflow-${request.date}-${crypto.randomUUID()}`,date:request.date,weekday:weekday(request.date),category:{en:"",ko:request.mood||"경험 중심"},title:{en:"",ko:request.keyword},generatedConversation:true,generationEngine:Simple.VERSION,generationRequest:clone(request),originalDraft:originalDraft?clone(originalDraft):undefined,quality:{status:"draft",score:0,issues:[]},operatorStatus:{generationStatus:"running",reviewStatus:"review",printStatus:"unchecked",used:false},hidden:false,createdAt,updatedAt:createdAt};
  }
  function generationMessages(stage,request,plan=null,issues=[],previousCandidate=null){
    return [{role:"user",content:JSON.stringify({
      stage,
      contract:"TheBox Talk Flow Simple Conversation v3. Page 1 contains one story or situation, EASY TALK 3, REAL TALK 3, and TODAY'S ENGLISH 4. Page 2 contains RESET, exactly one TODAY'S ACTIVITY, GROUP RESULT, and FINAL QUESTION. Return structured content through the declared tool only, never HTML.",
      fixedDesign:{styles:Simple.STYLES,activities:Simple.ACTIVITIES,hiddenQuestionAxes:Simple.AXES,session1Minutes:50,session2Minutes:40},
      languageExposure:{koreanRequired:["story summary","all six question translations","four expression meanings","activity instruction/materials/steps/participation","group result","final question"],koreanStyle:"Use concise conversational ~해요 style."},
      generationRules:["Write a 55–90 word adult scene with a named person, concrete place or object, a number/time/price/condition, an expectation gap, a balanced conflict, and a final choice. Give story.id a stable value.","Easy Talk roles are recent experience with an alternative path, daily habit, and a balanced conditional A/B/C choice. Real Talk roles are personal example, evaluation criterion, and tradeoff/solution. Use at least five axes total, no axis more than twice, unique starters, and no repeated answer.","Every question supports a one-sentence answer, a reason, and an example or exception. Store one short starter only.","Each of four topic-specific expressions declares useIn and is usable in Story, Real Talk, or Activity; reject generic fillers.","Create exactly one 15–25 minute activity with real materials, disagreement, a listening step, every-person speech, and a concrete group result.","Set activity.sourceRef to story.id and reuse the same people, object, price, time, condition, reviews, messages, or schedule.","Include at least three speaking supports in activity.phrases.","Generate three Easy and three Real leader followups plus activity demo, quiet-speaker, long-speaker, time-cut, and fast-agreement support.","Do not expose START, ADD, GO FURTHER, CHOOSE, SAY, ASK, REACT, DECIDE, readiness, schema, or axis labels.","Never require standing, walking, moving around, switching seats, or external materials."],
      topic:{date:request.date,weekday:weekday(request.date),keyword:request.keyword,mood:request.mood||"경험 중심",source:request.source||"",avoid:request.avoid||"",repairSection:request.repairSection||""},
      monthlyDiversity:Object.values(topics).filter(item=>item?.date?.slice(0,7)===request.date.slice(0,7)&&item.generationEngine===Simple.VERSION).map(item=>({style:item.style,activity:item.session2?.activity?.name,storyOpening:item.session1?.story?.en?.[0],questionOpenings:[...(item.session1?.easyTalk||[]),...(item.session1?.realTalk||[])].map(question=>question.en.split(" ").slice(0,3).join(" ")),expressions:(item.session1?.expressions||[]).map(expression=>expression.en)})),
      approvedPlan:plan,
      previousValidationIssues:issues,
      previousCandidate,
      retryRule:previousCandidate?"Keep valid fields unchanged and repair only the listed locations.":"Create every required content field once."
    })}];
  }
  async function requestGenerationStage(stage,request,plan=null){
    const tool=stage==="plan"?Simple.PLAN_TOOL:Simple.CONTENT_TOOL,validate=stage==="plan"?Simple.validatePlan:value=>{
      const result=Simple.validateContent({...value,contentQualityVersion:"quality-v1"},plan,Object.values(topics),true);
      if(value?.date===request.date)return result;
      const mismatch={severity:"blocker",id:"B1",group:"structure",location:"date",message:"요청 날짜와 생성 날짜가 일치하지 않습니다."};
      return{...result,ok:false,issues:[...result.issues,mismatch],blockers:[...result.blockers,mismatch]};
    };
    let lastError=null,lastIssues=[],previousCandidate=null;
    for(let attempt=0;attempt<2;attempt++){
      try{
        const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":settings.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:6000,messages:generationMessages(stage,request,plan,lastIssues,previousCandidate),tools:[tool],tool_choice:{type:"tool",name:tool.name}})});
        const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message||`HTTP ${response.status}`);
        const call=payload.content?.find(item=>item.type==="tool_use"&&item.name===tool.name);
        if(!call?.input)throw new Error(`${tool.name} tool result is missing.`);
        previousCandidate=call.input;
        const result=validate(call.input);
        if(result.ok)return call.input;
        lastIssues=result.issues.map(item=>`${item.location}: ${item.message}`);
        lastError=new Error(lastIssues.join(" "));
      }catch(error){lastError=error}
    }
    const error=new Error(`${stage==="plan"?"Topic Plan":"Content Fill"} failed: ${lastError?.message||"unknown error"}`);
    error.stage=stage;error.issues=lastIssues;throw error;
  }
  async function generateV2Topic(request){
    if(!settings.apiKey){const error=new Error("자동 생성 연결이 필요합니다.");error.stage="plan";throw error}
    const plan=await requestGenerationStage("plan",request);
    const content=await requestGenerationStage("content",request,plan);
    const topic=Simple.buildTopic(request,plan,content,Object.values(topics));
    topic.generationRequest=clone(request);
    return topic;
  }
  async function generateAndStore(request,originalDraft=null){
    const pending=pendingGeneration(request,originalDraft);topics[request.date]=pending;activeDate=request.date;dirty=true;view="admin";saveTopics("Topic Plan 생성을 시작했습니다.");
    try{
      const topic=await generateV2Topic(request);topics[request.date]=topic;dirty=true;saveTopics("새 Simple Conversation 토픽 생성과 승인 게이트 검사를 완료했습니다.");return topic;
    }catch(error){
      pending.operatorStatus.generationStatus="failed";pending.generationFailure={stage:error.stage||"plan",message:error.message,issues:error.issues||[]};pending.quality={status:"review",score:0,issues:[error.message]};pending.updatedAt=new Date().toISOString();topics[request.date]=pending;dirty=true;saveTopics("토픽 내용을 완성하지 못했습니다. 작성된 초안은 보존했습니다. 문제가 있는 부분만 다시 생성하세요.");return null;
    }
  }
  async function regenerateV2(){
    const previous=current(),request=previous.generationRequest||{date:previous.date,keyword:previous.title?.ko||previous.title?.en||"새 대화 주제",mood:previous.category?.ko||previous.category||"경험 중심"};
    preserveVersion(previous);
    await generateAndStore({...request,date:previous.date},previous);
  }
  async function regenerateSimpleSection(section){
    const previous=current();if(previous.generationEngine!==Simple.VERSION)return;
    const request=previous.generationRequest||{date:previous.date,keyword:previous.title?.ko||previous.title?.en,mood:previous.category?.ko||"경험 중심"};preserveVersion(previous);notify(`${section} 부분을 다시 생성하고 있습니다.`);
    try{
      const fresh=await generateV2Topic({...request,date:previous.date,repairSection:section,source:JSON.stringify({story:previous.session1.story,activity:previous.session2.activity})}),next=clone(previous);
      if(section==="story")next.session1.story=fresh.session1.story;
      if(section==="easyTalk")next.session1.easyTalk=fresh.session1.easyTalk;
      if(section==="realTalk")next.session1.realTalk=fresh.session1.realTalk;
      if(section==="expressions")next.session1.expressions=fresh.session1.expressions;
      if(section==="activity"){next.session2.activity=fresh.session2.activity;next.session2.activity.sourceRef=next.session1.story.id}
      if(section==="korean"){const copyKo=(target,source)=>{if(Array.isArray(target))target.forEach((item,index)=>copyKo(item,source?.[index]));else if(target&&typeof target==="object")Object.keys(target).forEach(key=>{if(key==="ko"||key.endsWith("Ko"))target[key]=clone(source?.[key]);else copyKo(target[key],source?.[key])})};copyKo(next,fresh)}
      if(section==="story")next.session2.activity.sourceRef=next.session1.story.id;
      next.contentQualityVersion="quality-v1";const evaluation=Simple.evaluate(next,Object.values(topics));if(!evaluation.ready)throw Object.assign(new Error("부분 재생성 후 전체 연결성 검사를 통과하지 못했습니다."),{issues:evaluation.issues});next.contentQuality=evaluation.quality;next.quality={status:"review",score:evaluation.quality.total,issues:[]};next.operatorStatus={...next.operatorStatus,reviewStatus:"review",printStatus:"unchecked"};next.updatedAt=new Date().toISOString();topics[activeDate]=next;dirty=true;saveTopics("선택한 부분만 다시 생성하고 전체 연결성을 확인했습니다.");
    }catch(error){notify(`부분 재생성 실패: ${error.message}`,true)}
  }
  async function autoCreateDate(date){
    if(topics[date]){notify("이 날짜에는 이미 토픽이 있습니다.",true);return}
    const recent=new Set(Object.values(topics).filter(topic=>Math.abs(new Date(date)-new Date(topic.date))<=60*86400000).map(topic=>topic.title.ko));
    const ideas=["온라인 선택을 믿는 기준","함께 정하는 저녁 메뉴","메시지를 편하게 주고받는 법","짧은 여행을 계획하는 방법","집중을 지키는 스마트폰 습관"];
    const keyword=ideas.find(item=>!recent.has(item))||ideas[Number(date.slice(-2))%ideas.length];
    await generateAndStore({date,keyword,mood:"경험 중심"});
  }
  function openCustomTopic(date){
    $("#custom-date").value=date;$("#custom-keyword").value="";$("#custom-source").value="";$("#custom-avoid").value="";$("#custom-topic-dialog").showModal();
  }
  async function autoComposeMonth(){
    const targets=operatingDates().filter(date=>!topics[date]);
    if(!targets.length){notify("이번 달 미작성 운영일이 없습니다.");return}
    if(!confirm(`생성 대상 ${targets.length}개\n${targets.join(", ")}\n기존 토픽과 승인 토픽은 제외합니다.\n미작성 운영일에만 초안을 만들까요?`))return;
    for(let index=0;index<targets.length;index++)await generateAndStore({date:targets[index],keyword:["생활 속 선택","함께 정하는 계획","디지털 습관","좋은 추천의 기준"][index%4],mood:"경험 중심"});
    notify(`${targets.length}개 운영일의 2단계 생성을 완료했습니다.`);
  }
  function convertCurrentToConversation(){
    const topic=current();if(topic.conversationFlow){notify("이미 회화형 구조를 사용하고 있습니다.");return}
    preserveVersion(topic);topic.conversationFlow=window.TalkFlowConversation.fromLegacy(topic);topic.quality={...topic.quality,status:"review"};topic.updatedAt=new Date().toISOString();topics[activeDate]=window.TalkFlowSessions.upgradeTopic(topic);dirty=true;saveTopics("직전 버전을 보존하고 회화형 구조를 만들었습니다.");
  }
  function restoreVersion(){
    const versions=loadRecord(KEYS.versions),previous=versions[current().id]?.[0];
    if(!previous){notify("복원할 이전 버전이 없습니다.",true);return}
    topics[activeDate]=clone(previous.topic);versions[current().id]=versions[current().id].slice(1);localStorage.setItem(KEYS.versions,JSON.stringify(versions));saveTopics("이전 버전을 복원했습니다.");
  }
  async function approveAndSave(){
    const topic=current(),result=validateTopic(topic);
    if(topic.generationEngine===Simple.VERSION){
      const evaluation=Simple.evaluate(topic,Object.values(topics));
      if(evaluation.blockers.length){notify(`BLOCKER ${evaluation.blockers.length}개를 해결해야 승인할 수 있습니다.`,true);return}
      topic.contentQuality=evaluation.quality;topic.quality={status:"approved",score:evaluation.quality?.total||100,issues:[]};
      topic.operatorStatus={...topic.operatorStatus,reviewStatus:"approved"};
      saveTopics("토픽을 이 컴퓨터에 승인 저장했습니다. Gist는 변경하지 않았습니다.");
      return;
    }
    if(topic.generationEngine===Generation.VERSION){
      const evaluation=Generation.evaluate(topic,Object.values(topics));
      if(evaluation.blockers.length){notify(`BLOCKER ${evaluation.blockers.length}개를 해결해야 승인할 수 있습니다.`,true);return}
      topic.quality={status:"approved",score:100,issues:[]};
      topic.operatorStatus={...topic.operatorStatus,reviewStatus:"approved"};
      saveTopics("토픽을 이 컴퓨터에 승인 저장했습니다. Gist는 변경하지 않았습니다.");
      return;
    }
    const review=topic.conversationFlow?window.TalkFlowConversation.evaluate(topic.conversationFlow):null;
    const conversationIssues=new Set((review?.diagnostics||[]).map(item=>`${item.location}: ${item.message}`));
    const sessionDiagnostics=window.TalkFlowSessions.diagnostics(topic),sessionIssues=new Set(sessionDiagnostics.map(item=>`${item.location}: ${item.message}`));
    const speakingDiagnostics=window.TalkFlowSessions.speakingDiagnostics(topic),speakingIssues=new Set(speakingDiagnostics.map(item=>`${item.location}: ${item.message}`));
    const legacyCritical=result.issues.filter(issue=>!conversationIssues.has(issue)&&!sessionIssues.has(issue)&&!speakingIssues.has(issue));
    if(review?.critical||sessionDiagnostics.some(item=>item.critical)||speakingDiagnostics.some(item=>item.critical)||legacyCritical.length){notify("치명 오류가 있어 승인할 수 없습니다. 표시된 문제 위치를 먼저 수정해 주세요.",true);return}
    topic.quality={status:"approved",score:result.score,issues:[]};
    topic.operatorStatus={...topic.operatorStatus,reviewStatus:"approved"};
    saveTopics("토픽을 이 컴퓨터에 승인 저장했습니다. Gist는 변경하지 않았습니다.");
  }
  function cloneTopicFrom(sourceDate){
    if(!topics[sourceDate]){notify("복제할 토픽을 찾을 수 없습니다.",true);return}
    const targetDate=prompt("복제할 새 날짜 (YYYY-MM-DD)");
    if(!targetDate)return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)){notify("날짜를 YYYY-MM-DD 형식으로 입력해 주세요.",true);return}
    if(topics[targetDate]){notify("선택한 날짜에 토픽이 있습니다. 다른 날짜를 선택하세요.",true);return}
    const copy=clone(topics[sourceDate]);copy.id=`talkflow-${targetDate}-${crypto.randomUUID()}`;copy.date=targetDate;copy.quality={...copy.quality,status:"draft"};copy.operatorStatus={...copy.operatorStatus,reviewStatus:"review",printStatus:"unchecked",used:false};copy.hidden=false;copy.createdAt=copy.updatedAt=new Date().toISOString();topics[targetDate]=copy;activeDate=targetDate;saveTopics("토픽을 새 날짜로 복제했습니다.")
  }
  function moveTopicTo(targetDate){
    const sourceDate=prompt("이동할 기존 토픽 날짜 (YYYY-MM-DD)",activeDate);
    if(!sourceDate||!topics[sourceDate]){if(sourceDate)notify("해당 날짜의 토픽을 찾을 수 없습니다.",true);return}
    if(topics[targetDate]){notify("이동할 날짜에 이미 토픽이 있습니다.",true);return}
    topics[targetDate]={...topics[sourceDate],date:targetDate,updatedAt:new Date().toISOString()};delete topics[sourceDate];activeDate=targetDate;saveTopics("토픽 날짜를 이동했습니다.")
  }
  function toggleTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null}else timerHandle=setInterval(()=>{timerSeconds++;const el=$("#timer-display");if(el)el.textContent=formatTime(timerSeconds)},1000)}

  async function regenerate(section){
    if(!settings.apiKey){notify("자동 생성 연결이 필요합니다. 작성된 내용은 그대로 보존했습니다.",true);return}
    const topic=current(),scope=section==="all"?"complete topic":section;
    notify("말하기 흐름을 만들고 있습니다.");
    const target=section.split(".").reduce((value,key)=>value?.[key],topic);
    const prompt=`<talkflow-standard version="2" student-template="student-v4" leader-template="leader-v4">
The v2 contract allows changing activities and section composition. Session 1 requires easy entry, personal experience, judgment material, and interaction. Session 2 requires an activity, information gap, roles, and an open group decision; never return a general discussion list. Every activity step needs natural Korean guidance. Use START, ADD, and GO FURTHER learner cues. Validate Structure, Speaking, and Print Ready independently.
Create or repair TheBox Talk Flow ${scope} as strict JSON for one mixed-confidence adult group. Keep SESSION 1 exactly 50 minutes and SESSION 2 exactly 40 minutes. Use no more than six core prompts, at least three distinct promptAxes, and never repeat one axis more than twice. Include at least one complete conversationMaterial with a full review, message, statistic, scenario, schedule, or conditions—not label-only options and never copied article text. Add at least three speakingMechanisms; page one uses two, page two uses two, page two includes timedTurn or assignedOpposition, and openEndedDecision is always true. Every participant prepares an output, speaks in turn, asks a follow-up, reacts, and speaks before the next step or final decision. SESSION 2 is participant action, not a question list: reset 5, a sustainable 20-minute activity with preparation, guessing or comparison, defense or challenge, and participant output, then an open decision and final close totaling 40. Spot the Fake is allowed only with complete ambiguous evidence, no disclosed fake count, multiple defensible clues, discussion before reveal, and ten minutes of steps; otherwise use Write the Fake, Blind Ranking, Assigned Role Debate, or Open Decision Challenge. Provide exactly four short SAY THIS phrases that can be reused often. No REACT phrase appears more than twice; include surprise, agreement, different experience, opposition, and reason request. Prefer easy spoken English over idioms. Korean must sound natural rather than literal. Context topics retain a source-backed 60-second brief and then use its facts in a comparison, opposing claims, cases, conditions, or role information. Preserve the current JSON shape and add only backward-compatible speaking fields. Independently check structure readiness, speaking readiness, language, timing, print density, and safety once; repair only failing fields. Topic context: ${JSON.stringify({title:topic.title,category:topic.category,topicMode:topic.topicMode,target})}. Return only replacement JSON for ${scope}. Raw JSON only.
</talkflow-standard>`;
    try{
      preserveVersion(topic);
      const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":settings.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:6000,messages:[{role:"user",content:prompt}]})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message||`HTTP ${response.status}`);
      const text=payload.content?.map(c=>c.text||"").join("")||"",match=text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);if(!match)throw new Error("응답에서 JSON을 찾지 못했습니다.");
      const result=JSON.parse(match[0]);if(section==="all"){result.id=topic.id;result.date=topic.date;result.createdAt=topic.createdAt;result.updatedAt=new Date().toISOString();result.quality={status:"draft",score:0,issues:[]};result.standardVersion=STANDARD.version;result.templateVersion="4";topics[activeDate]=window.TalkFlowSessions.upgradeTopic(result)}else setPath(topic,section,result);
      dirty=true;const quality=validateTopic(current());current().quality={status:"review",score:quality.score,issues:quality.issues};current().operatorStatus={...current().operatorStatus,reviewStatus:"review",printStatus:"unchecked",used:false};saveTopics(`${scope} 생성과 품질검사를 완료했습니다.`);
    }catch(error){notify("토픽 내용을 완성하지 못했습니다. 작성된 부분은 보존했으며 문제가 있는 구간만 다시 생성할 수 있습니다.",true)}
  }

  function exportMonth(){
    const data=Object.fromEntries(Object.entries(topics).filter(([date])=>date.startsWith(monthPrefix())));
    download(monthFile(),JSON.stringify({schema:"thebox-talkflow-v1",month:monthPrefix(),topics:data},null,2),"application/json");
    notify("월간 JSON을 내보냈습니다.");
  }
  function importJson(file){
    const reader=new FileReader();reader.onload=()=>{
      try{
        const parsed=JSON.parse(reader.result),incoming=parsed.topics||parsed;if(!incoming||typeof incoming!=="object"||Array.isArray(incoming))throw new Error("topics 객체가 없습니다.");
        const next=clone(topics);for(const [date,topic] of Object.entries(incoming)){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error(`잘못된 날짜: ${date}`);const result=validateTopic(topic,{...next,[date]:topic});if(result.score===0)throw new Error(`${date}: 필수 구조가 누락되었습니다.`);next[date]=topic}
        topics=next;activeDate=Object.keys(incoming).sort()[0]||activeDate;saveTopics(`${Object.keys(incoming).length}개 토픽을 가져왔습니다.`);
      }catch(error){notify(`JSON 가져오기 실패: ${error.message}`,true)}
    };reader.onerror=()=>notify("파일을 읽을 수 없습니다.",true);reader.readAsText(file);
  }
  function approvedMonth(){return Object.fromEntries(Object.entries(topics).filter(([date,t])=>date.startsWith(monthPrefix())&&t.quality?.status==="approved"&&!t.hidden))}
  function openViewer(){
    const approved=approvedMonth();if(!Object.keys(approved).length){notify("공개 가능한 승인 토픽이 없습니다.",true);return}
    const html=viewerHtml(approved);const url=URL.createObjectURL(new Blob([html],{type:"text/html"}));window.open(url,"_blank","noopener");download(monthFile("viewer"),html,"text/html");notify(`승인 토픽 ${Object.keys(approved).length}개만 공개 뷰어에 포함했습니다.`);
  }
  function viewerHtml(data){
    const safe=JSON.stringify(data).replace(/</g,"\\u003c");
    const css=`*{box-sizing:border-box}body{margin:0;background:#fbfcf8;color:#17211b;font:16px/1.55 Arial,sans-serif}.topbar{padding:18px 5vw;border-bottom:1px solid #dde5dc;background:#fff}.brand{display:flex;gap:10px;align-items:center}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#286644;color:#fff;font-weight:800}.brand small{display:block;color:#66746a;font-size:10px}main{max-width:920px;margin:auto;padding:32px 18px 70px}.topic-hero{padding:36px;border-radius:24px;background:linear-gradient(135deg,#e4f2e8,#f8f2d7);margin:20px 0}.topic-hero h1{font-size:clamp(30px,6vw,50px);line-height:1.08;margin:0}.ko-title{display:block;font-size:.45em;color:#56705f;margin-top:10px}.eyebrow{font-size:11px;color:#286644;font-weight:800}.flow-card{background:#fff;border:1px solid #dde5dc;border-radius:18px;padding:clamp(20px,4vw,32px);margin:12px 0}.question-list{display:grid;gap:12px;counter-reset:q}.question{counter-increment:q;position:relative;padding:18px 18px 18px 50px;background:#f7f9f6;border-radius:13px}.question:before{content:counter(q);position:absolute;left:16px;top:18px;background:#286644;color:#fff;padding:3px 8px;border-radius:8px;font-size:11px}.en{font-weight:600}.ko{color:#66746a;font-size:13px;word-break:keep-all}.starter{margin-top:10px;padding:10px;border-left:3px solid #f4c95d;background:#fffaf0;font-size:12px}.followups{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.followup{padding:10px;border:1px dashed #cdd7cd;border-radius:8px;font-size:11px}.followup b{display:block;color:#286644;font-size:9px}@media(max-width:520px){main{padding:16px 12px 50px}.topic-hero{padding:24px}.followups{grid-template-columns:1fr}.question{padding-left:45px}}`;
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TheBox Talk Flow</title><style>${css}</style></head><body><header class="topbar"><div class="brand"><span class="brand-mark">T</span><span><strong>TheBox Talk Flow</strong><small>One Topic. Better Conversation.</small></span></div></header><main id="main"></main><script>const topics=${safe};const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));const q=(a,m)=>'<div class="question-list">'+a.map((x,i)=>'<article class="question"><div class="en">'+esc(x.questionEn)+'</div><div class="ko">'+esc(x.questionKo)+'</div><div class="starter"><b>STARTER</b> '+esc(x.starter)+'</div>'+(m?'<div class="followups"><div class="followup"><b>KEEP IT GOING</b>'+esc(x.exampleFollowUp)+'</div><div class="followup"><b>GO DEEPER</b>'+esc(x.deeperFollowUp)+'</div></div>':'')+'</article>').join('')+'</div>';const simpleQ=a=>'<div class="question-list">'+a.map(x=>'<article class="question"><div class="en">'+esc(x.en)+'</div><div class="ko">'+esc(x.ko)+'</div></article>').join('')+'</div>';const simple=t=>'<header class="topic-hero"><p class="eyebrow">'+esc(t.date)+' · SIMPLE CONVERSATION</p><h1>'+esc(t.title.en)+'<span class="ko-title">'+esc(t.title.ko)+'</span></h1></header><section class="flow-card"><h2>'+esc(t.session1.story.heading)+'</h2><p class="en">'+t.session1.story.en.map(esc).join(' ')+'</p><p class="ko">'+t.session1.story.ko.map(esc).join(' ')+'</p></section><section class="flow-card"><h2>EASY TALK</h2>'+simpleQ(t.session1.easyTalk)+'</section><section class="flow-card"><h2>REAL TALK</h2>'+simpleQ(t.session1.realTalk)+'</section><section class="flow-card"><h2>TODAY’S ENGLISH</h2>'+t.session1.expressions.map(x=>'<p><b>'+esc(x.en)+'</b><br><span class="ko">'+esc(x.ko)+'</span></p>').join('')+'</section><section class="flow-card"><h2>TODAY’S ACTIVITY · '+esc(t.session2.activity.name)+'</h2><p class="ko">'+esc(t.session2.activity.instructionKo)+'</p>'+t.session2.activity.materials.map(x=>'<p><b>'+esc(x.en)+'</b><br><span class="ko">'+esc(x.ko)+'</span></p>').join('')+'<h3>GROUP RESULT</h3><p>'+esc(t.session2.groupResult.en)+'</p><p class="ko">'+esc(t.session2.groupResult.ko)+'</p><h3>FINAL QUESTION</h3><p>'+esc(t.session2.finalQuestion.en)+'</p><p class="ko">'+esc(t.session2.finalQuestion.ko)+'</p></section>';const cards=t=>t.generationEngine==="v3-simple"?simple(t):'<header class="topic-hero"><p class="eyebrow">'+t.date+'</p><h1>'+esc(t.title.en)+'<span class="ko-title">'+esc(t.title.ko)+'</span></h1></header><section class="flow-card"><h2>Topic Hook</h2><p class="en">'+esc(t.hook.en)+'</p><p class="ko">'+esc(t.hook.ko)+'</p></section><section class="flow-card"><h2>Small Talk</h2>'+q(t.smallTalk,false)+'</section><section class="flow-card"><h2>Easy Entry</h2>'+q(t.easyEntry,false)+'</section><section class="flow-card"><h2>Main Discussion</h2>'+q(t.mainDiscussion,true)+'</section><section class="flow-card"><h2>Final Round</h2><p class="en">'+esc(t.finalRound.questionEn)+'</p></section>';document.getElementById("main").innerHTML=Object.values(topics).map(cards).join("");<\/script></body></html>`;
  }
  function shareStudent(){
    if(!settings.lastShareUrl){notify("설정에서 Gist 저장 후 생성되는 공개 링크를 사용하세요.",true);return}
    navigator.clipboard?.writeText(settings.lastShareUrl).then(()=>notify("Gist 학생 공개 링크를 복사했습니다.")).catch(()=>notify(settings.lastShareUrl));
  }
  function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  async function gistPush(){
    if(!settings.gistToken){notify("Gist 토큰을 입력하세요.",true);return}
    const files={[monthFile()]:{content:JSON.stringify({schema:"thebox-talkflow-v1",topics:Object.fromEntries(Object.entries(topics).filter(([d])=>d.startsWith(monthPrefix())))},null,2)},[monthFile("viewer")]:{content:viewerHtml(approvedMonth())}};
    try{
      const url=settings.gistId?`https://api.github.com/gists/${settings.gistId}`:"https://api.github.com/gists",response=await fetch(url,{method:settings.gistId?"PATCH":"POST",headers:{Authorization:`Bearer ${settings.gistToken}`,"Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"},body:JSON.stringify({description:`TheBox Talk Flow ${monthPrefix()}`,public:false,files})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.message||`HTTP ${response.status}`);settings.gistId=payload.id;settings.lastShareUrl=`https://gist.githack.com/${payload.owner?.login||"anonymous"}/${payload.id}/raw/${monthFile("viewer")}`;saveSettings();$("#gist-id").value=payload.id;navigator.clipboard?.writeText(settings.lastShareUrl).catch(()=>{});notify("Talk Flow 전용 Gist 저장 및 공개 링크 복사를 완료했습니다.");
    }catch(error){notify(`Gist 저장 실패: ${error.message}`,true)}
  }
  async function gistPull(){
    const id=$("#gist-id").value.trim()||settings.gistId;if(!id){notify("Gist ID를 입력하세요.",true);return}
    try{
      const response=await fetch(`https://api.github.com/gists/${id}`,{headers:settings.gistToken?{Authorization:`Bearer ${settings.gistToken}`}:{}}),payload=await response.json();if(!response.ok)throw new Error(payload.message||`HTTP ${response.status}`);
      const file=payload.files?.[monthFile()];if(!file)throw new Error(`${monthFile()} 파일이 없습니다.`);const parsed=JSON.parse(file.content);topics={...topics,...parsed.topics};settings.gistId=id;saveSettings();saveTopics("Talk Flow 전용 Gist에서 불러왔습니다.");
    }catch(error){notify(`Gist 불러오기 실패: ${error.message}`,true)}
  }
  function saveSettings(){localStorage.setItem(KEYS.settings,JSON.stringify(settings))}

  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{if(confirmDirty()){view=b.dataset.view;render()}});
  $("#prev-month").onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1,12);render()};
  $("#next-month").onclick=()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1,12);render()};
  $("#month-label").onclick=()=>{cursor=new Date();render()};
  $("#new-topic").onclick=()=>{const date=prompt("새 토픽 날짜 (YYYY-MM-DD)",`${monthPrefix()}-01`);if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)){activeDate=date;createTopic(date)}};
  $("#settings-button").onclick=()=>{
    $("#api-key").value=settings.apiKey||"";$("#gist-token").value=settings.gistToken||"";$("#gist-id").value=settings.gistId||"";
    const weekdays=settings.operatingWeekdays||[1,4];
    document.querySelectorAll("[name='operating-day']").forEach(input=>input.checked=weekdays.includes(Number(input.value)));
    $("#excluded-dates").value=(settings.excludedDates||[]).join(", ");
    $("#additional-dates").value=(settings.additionalDates||[]).join(", ");
    $("#exclude-public-holidays").checked=Boolean(settings.excludePublicHolidays);
    $("#settings-dialog").showModal()
  };
  $("#settings-form").addEventListener("submit",event=>{
    if(event.submitter?.value==="cancel")return;
    const operatingWeekdays=[...document.querySelectorAll("[name='operating-day']:checked")].map(input=>Number(input.value));
    if(!operatingWeekdays.length){event.preventDefault();notify("운영 요일을 하나 이상 선택해 주세요.",true);return}
    const parseDates=id=>$(id).value.split(",").map(value=>value.trim()).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value));
    const excludedDates=parseDates("#excluded-dates"),additionalDates=parseDates("#additional-dates"),excludePublicHolidays=$("#exclude-public-holidays").checked;
    settings={...settings,apiKey:$("#api-key").value.trim(),gistToken:$("#gist-token").value.trim(),gistId:$("#gist-id").value.trim(),operatingWeekdays,excludedDates,additionalDates,excludePublicHolidays,lastSchedule:{operatingWeekdays,excludedDates,additionalDates,excludePublicHolidays}};
    saveSettings();notify("Talk Flow 전용 설정을 저장했습니다.");render()
  });
  $("#copy-schedule").onclick=()=>{
    const previous=settings.lastSchedule;
    if(!previous){notify("복사할 이전 운영 설정이 없습니다.",true);return}
    document.querySelectorAll("[name='operating-day']").forEach(input=>input.checked=previous.operatingWeekdays.includes(Number(input.value)));
    $("#excluded-dates").value=previous.excludedDates.join(", ");$("#additional-dates").value=previous.additionalDates.join(", ");$("#exclude-public-holidays").checked=previous.excludePublicHolidays;
    notify("이전 운영일 설정을 불러왔습니다.")
  };
  $("#custom-topic-form").addEventListener("submit",async event=>{
    if(event.submitter?.value==="cancel")return;
    event.preventDefault();
    const date=$("#custom-date").value,keyword=$("#custom-keyword").value.trim(),source=$("#custom-source").value.trim(),mood=$("#custom-mood").value;
    if(!date||!keyword){event.preventDefault();notify("날짜와 주제를 입력해 주세요.",true);return}
    if(topics[date]){event.preventDefault();notify("선택한 날짜에 토픽이 있습니다.",true);return}
    await generateAndStore({date,keyword,mood,source,avoid:$("#custom-avoid").value.trim()});
    $("#custom-topic-dialog").close();
  });
  $("#gist-push").onclick=gistPush;$("#gist-pull").onclick=gistPull;
  $("#json-import").onchange=event=>{const file=event.target.files?.[0];if(file)importJson(file);event.target.value=""};
  window.addEventListener("beforeunload",event=>{if(dirty){event.preventDefault();event.returnValue=""}});
  window.addEventListener("error",event=>notify(`오류: ${event.message}`,true));
  const params=new URLSearchParams(location.search);if(params.get("date")&&topics[params.get("date")])activeDate=params.get("date");if(["calendar","student","leader","admin","print"].includes(params.get("view")))view=params.get("view");if(view==="print")printDates.add(activeDate);
  window.TalkFlow={KEYS,STANDARD,validateTopic,validateAll,validatePrint,evaluateRenderedPrint,getTopics:()=>clone(topics),approvedMonth,monthFile,viewerHtml,lifecycle:topic=>clone(lifecycleState(topic)),conversation:window.TalkFlowConversation,sessions:window.TalkFlowSessions,generation:Simple,legacyGeneration:Generation,generateForTest:request=>generateV2Topic(request),renderForTest:(topic,leader=false)=>renderSimpleHandout(topic,leader),canPreviewTopic,getVersions:()=>loadRecord(KEYS.versions),getFeedback:()=>loadRecord(KEYS.feedback)};
  render();
})();
