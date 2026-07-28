(function () {
  "use strict";
  const KEYS={data:"tb_talkflow_v1",settings:"tb_talkflow_settings_v1",drafts:"tb_talkflow_drafts_v1"};
  const SECTION_KEYS=["hook","goal","smallTalk","quickActivity","easyEntry","mainDiscussion","midGame","usefulPhrases","finalRound"];
  const SECTION_LABELS=["Topic Hook","Today's Goal","Small Talk","Quick Activity","Easy Entry","Main Discussion","Mid-game","Useful Phrases","Final Round"];
  const BAD_ENGLISH=["say the truth","different with","go spontaneous","star point","if nobody would know"];
  const SENSITIVE=["big secret","income","salary","work mistake","dating conflict","family problem","disease","political view","religion","appearance","trauma","큰 비밀","소득","연봉","직장 실수","연애 갈등","가족 문제","질병","정치 성향","종교","외모","트라우마"];
  const $=s=>document.querySelector(s);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  let topics=loadTopics(),settings=loadSettings(),activeDate=Object.keys(topics).sort()[0]||today(),cursor=new Date("2026-08-01T12:00:00"),view="calendar",dirty=false;
  let printDates=new Set(),printLeader=false;
  let timerSeconds=0,timerHandle=null;

  function today(){return new Date().toISOString().slice(0,10)}
  function loadTopics(){
    try{
      const raw=localStorage.getItem(KEYS.data);
      if(!raw)return clone(window.TALKFLOW_SAMPLE_TOPICS||{});
      const parsed=JSON.parse(raw);
      return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:clone(window.TALKFLOW_SAMPLE_TOPICS||{});
    }catch(error){setTimeout(()=>notify(`저장 데이터 복원 실패: ${error.message}`,true));return clone(window.TALKFLOW_SAMPLE_TOPICS||{})}
  }
  function loadSettings(){try{return JSON.parse(localStorage.getItem(KEYS.settings)||"{}")}catch{return{}}}
  function saveTopics(message="저장했습니다."){
    try{localStorage.setItem(KEYS.data,JSON.stringify(topics));dirty=false;localStorage.removeItem(KEYS.drafts);notify(message);render()}
    catch(error){notify(`저장 실패: ${error.message}`,true)}
  }
  function saveDraft(){if(!dirty)return;try{localStorage.setItem(KEYS.drafts,JSON.stringify({activeDate,topic:topics[activeDate],savedAt:new Date().toISOString()}))}catch{}}
  function notify(message,isError=false){const el=$("#notice");if(!el)return;el.textContent=message;el.className=`notice show${isError?" error":""}`;clearTimeout(notify.handle);notify.handle=setTimeout(()=>el.className="notice",3400)}
  function monthPrefix(){return `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}`}
  function monthFile(kind="json"){return `thebox-talkflow-${monthPrefix()}${kind==="viewer"?"-viewer.html":".json"}`}
  function current(){return topics[activeDate]}

  function validateTopic(topic,allTopics=topics){
    const issues=[];
    if(!topic||typeof topic!=="object")return{status:"regenerate",score:0,issues:["토픽 데이터가 객체가 아닙니다."]};
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
      const state=t.quality?.status||"draft",label=state==="approved"?"승인":state==="review"?"검토":"초안";
      return `<button class="topic-day ${t.date===activeDate?"is-active":""}" data-date="${t.date}"><time>${t.date.slice(8)}</time><span><strong>${esc(t.title.en)}</strong><small>${esc(t.title.ko)}</small></span><i class="status-pill ${state}">${label}</i></button>`;
    }).join(""):`<p class="ko">이 달에는 작성된 토픽이 없습니다.</p>`;
  }
  function weekday(date){return new Intl.DateTimeFormat("ko-KR",{weekday:"short",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))}
  function renderCalendar(){
    const year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate(),prefix=monthPrefix();
    const monthTopics=Object.values(topics).filter(t=>t.date?.startsWith(prefix));
    const approved=monthTopics.filter(t=>t.quality?.status==="approved"&&!t.hidden);
    return `<header class="manage-hero"><div><p class="eyebrow">OFFLINE STUDY OPERATIONS</p><h1>${year}년 ${month+1}월 일별 토픽</h1><p>날짜를 선택해 학생용 A4를 확인하고 인쇄하세요.</p></div><div class="manage-actions"><button class="button secondary" data-action="today">오늘</button><button class="button primary" data-action="create-for-month">＋ 토픽 생성</button><button class="button secondary" data-action="settings">⚙ 관리 설정</button></div></header>
      <section class="month-summary"><div><strong>${monthTopics.length}</strong><span>작성 토픽</span></div><div><strong>${approved.length}</strong><span>인쇄 가능</span></div><div><strong>${monthTopics.filter(t=>t.quality?.status==="review").length}</strong><span>검토 필요</span></div><div><strong>${monthTopics.filter(t=>t.hidden).length}</strong><span>숨김</span></div></section>
      <div class="batch-toolbar"><label><input type="checkbox" data-action="select-approved"> 승인 토픽 전체 선택</label><button class="button secondary" data-action="week-print">이번 주 인쇄</button><button class="button secondary" data-action="month-print">현재 월 전체 인쇄</button><button class="button primary" data-action="batch-print" ${printDates.size?"":"disabled"}>선택 날짜 인쇄 (${printDates.size})</button></div>
      <section class="date-grid">${Array.from({length:days},(_,i)=>{
        const date=`${prefix}-${String(i+1).padStart(2,"0")}`,t=topics[date];
        if(!t)return `<article class="date-card is-empty"><header><label><input type="checkbox" disabled><time>${i+1}일 · ${weekday(date)}</time></label><span class="status-pill">미작성</span></header><div class="empty-date"><p>등록된 토픽이 없습니다.</p><button class="mini" data-create-date="${date}">토픽 생성</button><button class="mini" data-clone-to="${date}">기존 토픽 복제</button><button class="mini" data-move-to="${date}">다른 날짜에서 이동</button></div></article>`;
        const state=t.quality?.status||"draft",label=state==="approved"?"승인":state==="review"?"검토 필요":"초안",print=validatePrint(t);
        return `<article class="date-card ${t.hidden?"is-hidden":""}"><header><label><input type="checkbox" data-print-date="${date}" ${printDates.has(date)?"checked":""} ${state==="approved"&&!t.hidden?"":"disabled"}><time>${i+1}일 · ${weekday(date)}</time></label><span class="status-pill ${state}">${label}</span></header><h2>${esc(t.title.en)}</h2><p>${esc(t.title.ko)}</p><div class="date-meta"><span>${t.hidden?"◌ 숨김":"◉ 공개"}</span><span class="print-state ${print.status.toLowerCase()}">${print.label}</span></div><div class="date-actions"><button data-open="${date}:student">토픽 보기</button><button data-open="${date}:admin">수정</button><button data-open="${date}:print">학생용 A4</button><button data-open="${date}:leader">리더 보기</button><button data-clone-to="${date}">복제</button><button data-toggle-hidden="${date}">${t.hidden?"공개":"숨김"}</button></div></article>`;
      }).join("")}</section>`;
  }
  function validatePrint(t){
    const issues=[];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(t?.date||""))issues.push("날짜");
    if(!t?.title?.en||!t?.title?.ko)issues.push("제목");
    if(t?.smallTalk?.length!==3||t?.easyEntry?.length!==3||t?.mainDiscussion?.length!==4)issues.push("질문");
    if((t?.mainDiscussion||[]).some(q=>!q.starter||!q.exampleFollowUp||!q.deeperFollowUp))issues.push("후속 질문");
    if(!t?.midGame?.options?.length)issues.push("Mid-game");
    if(!t?.finalRound?.questionEn)issues.push("Final Round");
    if(t?.quality?.status!=="approved"||t?.hidden)issues.push("승인");
    return issues.length?{status:"review",label:"PRINT REVIEW REQUIRED",issues}:{status:"ready",label:"PRINT READY",issues:[]};
  }
  function printHeader(t,page,leader=false){
    return `<header class="handout-header"><div class="handout-brand"><strong>THEBOX</strong><span>TALK FLOW</span></div><div class="handout-title"><span>${esc(t.date)} · ${weekday(t.date)}</span><h1>${esc(t.title.en)}</h1><p>${esc(t.title.ko)}</p></div><div class="handout-label">${leader?"Leader Guide":"Student Handout"}<b>Page ${page} / 2</b></div></header>`;
  }
  function handoutSection(title,body,className=""){return `<section class="handout-section ${className}"><h2>${title}</h2>${body}</section>`}
  function handoutQuestions(items,{follow=false,deep=false}={}){
    return `<ol class="handout-questions">${items.map(q=>`<li><strong>${esc(q.questionEn)}</strong><span>${esc(q.questionKo)}</span>${q.starter?`<p><b>STARTER</b> ${esc(q.starter)}</p>`:""}${follow&&q.followUp?`<p><b>FOLLOW-UP</b> ${esc(q.followUp)}</p>`:""}${deep?`<div class="handout-follow"><p><b>EXAMPLE</b> ${esc(q.exampleFollowUp)}</p><p><b>DEEPER</b> ${esc(q.deeperFollowUp)}</p></div>`:""}</li>`).join("")}</ol>`;
  }
  function handoutActivity(a){return `<div class="handout-activity"><strong>${esc(a.titleEn)} <small>${esc(a.titleKo)}</small></strong><p>${esc(a.instructionEn)}</p><span>${esc(a.instructionKo)}</span><div>${a.options.map(o=>`<i>${esc(o)}</i>`).join("")}</div></div>`}
  function renderHandout(t,leader=false){
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
  function renderPrintCollection(){
    const dates=printDates.size?[...printDates].sort():[activeDate],items=dates.map(date=>topics[date]).filter(Boolean);
    if(!items.length)return empty();
    document.title=items.length===1?`${items[0].date}_TheBox_TalkFlow_${safeFilename(items[0].title.ko)}`:`${monthPrefix()}_TheBox_TalkFlow_${items.length}topics`;
    return `<div class="print-toolbar"><button class="button secondary" data-action="calendar">← 월 목록으로</button><span>${items.length}개 토픽 · ${items.length*2}페이지</span><button class="button secondary" data-action="toggle-print-role">${printLeader?"학생용 A4":"리더용 A4"}</button><button class="button primary" data-action="print-now">A4 PDF / 인쇄</button></div><div class="paper-stack">${items.map(t=>renderHandout(t,printLeader)).join("")}</div>`;
  }
  function safeFilename(value){return String(value||"topic").replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"_")}
  function empty(){return `<div class="empty-state"><p class="eyebrow">OPEN A DATE</p><h1>선택한 날짜에 토픽이 없습니다.</h1><p>관리 화면에서 새 토픽을 만들거나 JSON을 가져와 시작하세요.</p><button class="button primary" data-action="create">새 토픽 만들기</button></div>`}
  function hero(t){return `<header class="topic-hero"><p class="eyebrow">${esc(t.date)} · ${esc(t.category).toUpperCase()}</p><h1>${esc(t.title.en)}<span class="ko-title">${esc(t.title.ko)}</span></h1><div class="topic-meta"><span class="chip">◷ ${t.leaderNotes.estimatedMinutes} min</span><span class="chip">같은 질문 · 다양한 깊이</span>${t.quality.status==="approved"?'<span class="chip">✓ Approved</span>':""}</div></header>`}
  function progress(){return `<nav class="progress-strip" aria-label="진행 섹션">${SECTION_LABELS.map((label,i)=>`<button data-scroll="section-${i+1}">${i+1}. ${label}</button>`).join("")}</nav>`}
  function heading(i,title){return `<div class="section-heading"><div><span class="section-num">STEP ${String(i).padStart(2,"0")}</span><h2>${title}</h2></div><button class="collapse" aria-label="${title} 접기 또는 펼치기">−</button></div>`}
  function dailyNav(t,mode){
    const dates=Object.keys(topics).sort(),index=dates.indexOf(t.date);
    return `<div class="daily-nav"><button data-action="calendar">← 월 목록</button><div><strong>${t.date} · ${weekday(t.date)}</strong><span>${t.quality?.status==="approved"?"승인":t.quality?.status==="review"?"검토 필요":"초안"} · 마지막 저장 ${new Date(t.updatedAt||t.createdAt).toLocaleString("ko-KR")}</span></div><button data-prev-next="${dates[index-1]||""}" ${index<=0?"disabled":""}>이전 날짜</button><button data-prev-next="${dates[index+1]||""}" ${index<0||index>=dates.length-1?"disabled":""}>다음 날짜</button><button data-open="${t.date}:print">학생용 A4</button><button data-print-leader="${t.date}">리더용 A4</button>${mode!=="admin"?`<button data-open="${t.date}:admin">토픽 수정</button>`:""}<button data-approve="${t.date}">승인</button><button data-toggle-hidden="${t.date}">${t.hidden?"공개":"숨김"}</button></div>`;
  }
  function bilingual(en,ko){return `<div class="bilingual"><div class="en">${esc(en)}</div><div class="ko" lang="ko">${esc(ko)}</div></div>`}
  function questions(items,mode="easy",leader=false){
    return `<div class="question-list">${items.map((q,i)=>`<article class="question">${leader?`<label class="checkline"><input type="checkbox" data-check="${mode}-${i}"><span>`:""}${bilingual(q.questionEn,q.questionKo)}<div class="starter"><b>STARTER</b>${esc(q.starter)}</div>${mode==="main"?`<div class="followups"><div class="followup"><b>KEEP IT GOING</b>${esc(q.exampleFollowUp)}</div><div class="followup"><b>GO DEEPER</b>${esc(q.deeperFollowUp)}</div></div>`:q.followUp?`<div class="followups"><div class="followup"><b>KEEP IT GOING</b>${esc(q.followUp)}</div></div>`:""}${leader?"</span></label>":""}</article>`).join("")}</div>`;
  }
  function activity(a){return `<div class="activity">${bilingual(a.titleEn,a.titleKo)}<p>${esc(a.instructionEn)}</p><p class="ko">${esc(a.instructionKo)}</p><div class="option-grid">${a.options.map(o=>`<div class="option">${esc(o)}</div>`).join("")}</div></div>`}
  function card(i,title,body){return `<section class="flow-card" id="section-${i}">${heading(i,title)}${body}</section>`}
  function renderStudent(t){
    if(!t)return empty();
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
  function renderLeader(t){
    if(!t)return empty();
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
  function formatTime(total){const m=String(Math.floor(total/60)).padStart(2,"0"),s=String(total%60).padStart(2,"0");return`${m}:${s}`}

  function renderAdmin(t){
    if(!t)return empty();
    const result=validateTopic(t),qStatus=result.status==="approved"?"approved":result.status==="review"?"review":"draft";
    return `${dailyNav(t,"admin")}<div class="admin-toolbar"><button class="button primary" data-action="save">저장</button><button class="button secondary" data-action="validate">품질검사</button><button class="button secondary" data-action="generate-all">전체 생성</button><button class="button secondary" data-action="export">월 JSON</button><button class="button secondary" data-action="import">JSON 가져오기</button><button class="button secondary" data-action="viewer">공개 뷰어</button><span class="spacer"></span><button class="button danger" data-action="delete">삭제</button></div>
      <div class="quality-panel ${qStatus}"><h3>${result.status==="approved"?"승인 가능":result.status==="review"?"검토 필요":"재생성 권장"} · ${result.score}점</h3><div class="ko">${result.issues.length?`${result.issues.length}개 항목을 확인하세요.`:"구조, 발화 가능성, 민감도 기본 검사를 통과했습니다."}</div>${result.issues.length?`<ul class="issue-list">${result.issues.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`:""}</div>
      <div class="editor-section"><h3>기본 정보</h3><div class="form-grid">${field("date","날짜",t.date,"date")}${field("category","카테고리",t.category)}${field("title.en","English title",t.title.en)}${field("title.ko","한국어 제목",t.title.ko)}${area("hook.en","Topic Hook · English",t.hook.en)}${area("hook.ko","Topic Hook · 한국어",t.hook.ko)}${area("goal.en","Today's Goal · English",t.goal.en)}${area("goal.ko","Today's Goal · 한국어",t.goal.ko)}</div></div>
      ${editQuestionSection("smallTalk","Small Talk",t.smallTalk,false)}
      ${editActivity("quickActivity","Quick Activity",t.quickActivity)}
      ${editQuestionSection("easyEntry","Easy Entry",t.easyEntry,false)}
      ${editQuestionSection("mainDiscussion","Main Discussion",t.mainDiscussion,true)}
      ${editActivity("midGame","Mid-game",t.midGame)}
      <div class="editor-section"><h3>Useful Phrases <button class="mini" data-regenerate="usefulPhrases">이 섹션 재생성</button></h3>${t.usefulPhrases.map((p,i)=>`<div class="editor-item form-grid">${field(`usefulPhrases.${i}.en`,"English",p.en)}${field(`usefulPhrases.${i}.ko`,"한국어",p.ko)}${area(`usefulPhrases.${i}.usage`,"Usage",p.usage)}</div>`).join("")}</div>
      <div class="editor-section"><h3>Final Round <button class="mini" data-regenerate="finalRound">이 섹션 재생성</button></h3><div class="form-grid">${area("finalRound.questionEn","English",t.finalRound.questionEn)}${area("finalRound.questionKo","한국어",t.finalRound.questionKo)}${area("finalRound.starter","Starter",t.finalRound.starter)}</div></div>
      <div class="editor-section"><h3>Leader Notes</h3><div class="form-grid">${field("leaderNotes.estimatedMinutes","예상 진행 시간",t.leaderNotes.estimatedMinutes,"number")}${area("leaderNotes.sensitiveWarning","민감도 주의",t.leaderNotes.sensitiveWarning)}${area("leaderNotes.recommendedSkip","건너뛰기 권장",t.leaderNotes.recommendedSkip)}<label>승인 상태<select data-path="quality.status"><option value="draft" ${t.quality.status==="draft"?"selected":""}>초안</option><option value="review" ${t.quality.status==="review"?"selected":""}>검토</option><option value="approved" ${t.quality.status==="approved"?"selected":""}>승인</option></select></label><label>공개 숨김<select data-path="hidden"><option value="false" ${!t.hidden?"selected":""}>공개</option><option value="true" ${t.hidden?"selected":""}>숨김</option></select></label></div></div>`;
  }
  function field(path,label,value,type="text"){return `<label>${label}<input type="${type}" data-path="${path}" value="${esc(value)}"></label>`}
  function area(path,label,value){return `<label>${label}<textarea data-path="${path}">${esc(value)}</textarea></label>`}
  function editQuestionSection(key,title,items,deep){
    return `<div class="editor-section"><h3>${title} <button class="mini" data-add="${key}">＋ 질문</button> <button class="mini" data-regenerate="${key}">이 섹션 재생성</button></h3>${items.map((q,i)=>`<div class="editor-item"><div class="item-actions"><button class="mini" data-move="${key}:${i}:-1">↑</button><button class="mini" data-move="${key}:${i}:1">↓</button><button class="mini" data-remove="${key}:${i}">삭제</button></div><div class="form-grid">${area(`${key}.${i}.questionEn`,"Question · English",q.questionEn)}${area(`${key}.${i}.questionKo`,"Question · 한국어",q.questionKo)}${area(`${key}.${i}.starter`,"Starter",q.starter)}${deep?`${area(`${key}.${i}.exampleFollowUp`,"Example Follow-up",q.exampleFollowUp)}${area(`${key}.${i}.deeperFollowUp`,"Deeper Follow-up",q.deeperFollowUp)}`:area(`${key}.${i}.followUp`,"Follow-up",q.followUp||"")}</div></div>`).join("")}</div>`;
  }
  function editActivity(key,title,a){return `<div class="editor-section"><h3>${title} <button class="mini" data-regenerate="${key}">이 섹션 재생성</button></h3><div class="form-grid">${field(`${key}.type`,"Type",a.type)}${field(`${key}.titleEn`,"Title · English",a.titleEn)}${field(`${key}.titleKo`,"Title · 한국어",a.titleKo)}${area(`${key}.instructionEn`,"Instruction · English",a.instructionEn)}${area(`${key}.instructionKo`,"Instruction · 한국어",a.instructionKo)}${area(`${key}.optionsText`,"Options · 한 줄에 하나",a.options.join("\n"))}</div></div>`}

  function setPath(object,path,value){
    const parts=path.split(".");let target=object;
    for(let i=0;i<parts.length-1;i++)target=target[parts[i]];
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
    document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{const[date,target]=b.dataset.open.split(":");activeDate=date;printDates.clear();if(target==="print")printDates.add(date);view=target;render()});
    document.querySelectorAll("[data-print-date]").forEach(input=>input.onchange=()=>{input.checked?printDates.add(input.dataset.printDate):printDates.delete(input.dataset.printDate);render()});
    document.querySelectorAll("[data-create-date]").forEach(b=>b.onclick=()=>createTopic(b.dataset.createDate));
    document.querySelectorAll("[data-clone-to]").forEach(b=>b.onclick=()=>cloneTopicTo(b.dataset.cloneTo));
    document.querySelectorAll("[data-move-to]").forEach(b=>b.onclick=()=>moveTopicTo(b.dataset.moveTo));
    document.querySelectorAll("[data-toggle-hidden]").forEach(b=>b.onclick=()=>{const t=topics[b.dataset.toggleHidden];t.hidden=!t.hidden;saveTopics(t.hidden?"토픽을 숨겼습니다.":"토픽을 공개했습니다.")});
    document.querySelectorAll("[data-prev-next]").forEach(b=>b.onclick=()=>{if(b.dataset.prevNext){activeDate=b.dataset.prevNext;render()}});
    document.querySelectorAll("[data-print-leader]").forEach(b=>b.onclick=()=>{activeDate=b.dataset.printLeader;printDates=new Set([activeDate]);printLeader=true;view="print";render()});
    document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>{const t=topics[b.dataset.approve],result=validateTopic(t);if(result.status!=="approved"){notify(`승인 전 ${result.issues.length}개 품질 항목을 확인하세요.`,true);return}t.quality={status:"approved",score:result.score,issues:[]};saveTopics("토픽을 승인했습니다.")});
    document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{current()[b.dataset.add].push({questionEn:"",questionKo:"",starter:"",followUp:"",exampleFollowUp:"",deeperFollowUp:""});dirty=true;render()});
    document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const[k,i]=b.dataset.remove.split(":");current()[k].splice(Number(i),1);dirty=true;render()});
    document.querySelectorAll("[data-move]").forEach(b=>b.onclick=()=>{const[k,rawI,rawD]=b.dataset.move.split(":"),i=Number(rawI),to=i+Number(rawD),arr=current()[k];if(to<0||to>=arr.length)return;[arr[i],arr[to]]=[arr[to],arr[i]];dirty=true;render()});
    document.querySelectorAll("[data-regenerate]").forEach(b=>b.onclick=()=>regenerate(b.dataset.regenerate));
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
    if(action==="settings"){$("#settings-button").click()}
    if(action==="create-for-month"){const date=prompt("새 토픽 날짜 (YYYY-MM-DD)",`${monthPrefix()}-01`);if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date))createTopic(date)}
    if(action==="select-approved"){printDates=new Set(Object.values(topics).filter(t=>t.date.startsWith(monthPrefix())&&t.quality?.status==="approved"&&!t.hidden).map(t=>t.date));render()}
    if(action==="month-print"){printDates=new Set(Object.values(topics).filter(t=>t.date.startsWith(monthPrefix())&&t.quality?.status==="approved"&&!t.hidden).map(t=>t.date));view="print";render()}
    if(action==="week-print"){const start=new Date();start.setDate(start.getDate()-((start.getDay()+6)%7));printDates=new Set(Object.values(topics).filter(t=>{const d=new Date(`${t.date}T12:00:00`),end=new Date(start);end.setDate(end.getDate()+7);return d>=start&&d<end&&t.quality?.status==="approved"&&!t.hidden}).map(t=>t.date));if(!printDates.size)notify("이번 주 승인 토픽이 없습니다.",true);else{view="print";render()}}
    if(action==="batch-print"){if(printDates.size){view="print";render()}}
    if(action==="toggle-print-role"){printLeader=!printLeader;render()}
    if(action==="print-now")window.print()
  }
  function createTopic(date){
    const base=clone(Object.values(window.TALKFLOW_SAMPLE_TOPICS)[0]);base.id=`talkflow-${date}-${crypto.randomUUID()}`;base.date=date;base.title={en:"New Conversation Flow",ko:"새 대화 흐름"};base.quality={status:"draft",score:0,issues:["내용을 작성하고 품질검사를 실행하세요."]};base.createdAt=base.updatedAt=new Date().toISOString();topics[date]=base;activeDate=date;dirty=true;view="admin";render();
  }
  function cloneTopicTo(targetDate){
    const sourceDate=prompt("복제할 기존 토픽 날짜 (YYYY-MM-DD)",activeDate);
    if(!sourceDate||!topics[sourceDate]){if(sourceDate)notify("해당 날짜의 토픽을 찾을 수 없습니다.",true);return}
    const copy=clone(topics[sourceDate]);copy.id=`talkflow-${targetDate}-${crypto.randomUUID()}`;copy.date=targetDate;copy.quality={...copy.quality,status:"draft"};copy.hidden=false;copy.createdAt=copy.updatedAt=new Date().toISOString();topics[targetDate]=copy;activeDate=targetDate;saveTopics("토픽을 새 날짜로 복제했습니다.")
  }
  function moveTopicTo(targetDate){
    const sourceDate=prompt("이동할 기존 토픽 날짜 (YYYY-MM-DD)",activeDate);
    if(!sourceDate||!topics[sourceDate]){if(sourceDate)notify("해당 날짜의 토픽을 찾을 수 없습니다.",true);return}
    if(topics[targetDate]){notify("이동할 날짜에 이미 토픽이 있습니다.",true);return}
    topics[targetDate]={...topics[sourceDate],date:targetDate,updatedAt:new Date().toISOString()};delete topics[sourceDate];activeDate=targetDate;saveTopics("토픽 날짜를 이동했습니다.")
  }
  function toggleTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null}else timerHandle=setInterval(()=>{timerSeconds++;const el=$("#timer-display");if(el)el.textContent=formatTime(timerSeconds)},1000)}

  async function regenerate(section){
    if(!settings.apiKey){notify("설정에서 Anthropic API 키를 먼저 저장하세요.",true);$("#settings-dialog").showModal();return}
    const topic=current(),scope=section==="all"?"complete topic":section;
    notify(`${scope} 생성 중…`);
    const prompt=`Create a TheBox Talk Flow ${scope} as strict JSON. One shared topic for mixed English levels. Keep meaning aligned in English and Korean. Required counts: smallTalk 3, easyEntry 3, mainDiscussion 4, usefulPhrases 3. Every main question needs starter, exampleFollowUp, deeperFollowUp. Activities need complete options. Avoid sensitive personal disclosure, stereotypes, medical/legal/financial claims, generic phrases, and yes/no dead ends. Topic context: ${JSON.stringify({title:topic.title,category:topic.category,section:section==="all"?undefined:topic[section]})}. Return ${section==="all"?"the full schema matching this existing object":"only the replacement value for "+section}: ${JSON.stringify(section==="all"?topic:topic[section])}. Raw JSON only.`;
    try{
      const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":settings.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:6000,messages:[{role:"user",content:prompt}]})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message||`HTTP ${response.status}`);
      const text=payload.content?.map(c=>c.text||"").join("")||"",match=text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);if(!match)throw new Error("응답에서 JSON을 찾지 못했습니다.");
      const result=JSON.parse(match[0]);if(section==="all"){result.id=topic.id;result.date=topic.date;result.createdAt=topic.createdAt;result.updatedAt=new Date().toISOString();result.quality={status:"draft",score:0,issues:[]};topics[activeDate]=result}else topic[section]=result;
      dirty=true;const quality=validateTopic(current());current().quality={status:quality.status==="approved"?"review":"review",score:quality.score,issues:quality.issues};saveTopics(`${scope} 생성과 품질검사를 완료했습니다.`);
    }catch(error){notify(`생성 실패: ${error.message}`,true)}
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
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TheBox Talk Flow</title><style>${css}</style></head><body><header class="topbar"><div class="brand"><span class="brand-mark">T</span><span><strong>TheBox Talk Flow</strong><small>One Topic. Better Conversation.</small></span></div></header><main id="main"></main><script>const topics=${safe};const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));const q=(a,m)=>'<div class="question-list">'+a.map((x,i)=>'<article class="question"><div class="en">'+esc(x.questionEn)+'</div><div class="ko">'+esc(x.questionKo)+'</div><div class="starter"><b>STARTER</b> '+esc(x.starter)+'</div>'+(m?'<div class="followups"><div class="followup"><b>KEEP IT GOING</b>'+esc(x.exampleFollowUp)+'</div><div class="followup"><b>GO DEEPER</b>'+esc(x.deeperFollowUp)+'</div></div>':'')+'</article>').join('')+'</div>';const cards=t=>'<header class="topic-hero"><p class="eyebrow">'+t.date+'</p><h1>'+esc(t.title.en)+'<span class="ko-title">'+esc(t.title.ko)+'</span></h1></header><section class="flow-card"><h2>Topic Hook</h2><p class="en">'+esc(t.hook.en)+'</p><p class="ko">'+esc(t.hook.ko)+'</p></section><section class="flow-card"><h2>Small Talk</h2>'+q(t.smallTalk,false)+'</section><section class="flow-card"><h2>Easy Entry</h2>'+q(t.easyEntry,false)+'</section><section class="flow-card"><h2>Main Discussion</h2>'+q(t.mainDiscussion,true)+'</section><section class="flow-card"><h2>Final Round</h2><p class="en">'+esc(t.finalRound.questionEn)+'</p></section>';document.getElementById("main").innerHTML=Object.values(topics).map(cards).join("");<\/script></body></html>`;
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
  $("#settings-button").onclick=()=>{$("#api-key").value=settings.apiKey||"";$("#gist-token").value=settings.gistToken||"";$("#gist-id").value=settings.gistId||"";$("#settings-dialog").showModal()};
  $("#settings-form").addEventListener("submit",event=>{if(event.submitter?.value==="cancel")return;settings={...settings,apiKey:$("#api-key").value.trim(),gistToken:$("#gist-token").value.trim(),gistId:$("#gist-id").value.trim()};saveSettings();notify("Talk Flow 전용 설정을 저장했습니다.")});
  $("#gist-push").onclick=gistPush;$("#gist-pull").onclick=gistPull;
  $("#json-import").onchange=event=>{const file=event.target.files?.[0];if(file)importJson(file);event.target.value=""};
  window.addEventListener("beforeunload",event=>{if(dirty){event.preventDefault();event.returnValue=""}});
  window.addEventListener("error",event=>notify(`오류: ${event.message}`,true));
  const params=new URLSearchParams(location.search);if(params.get("date")&&topics[params.get("date")])activeDate=params.get("date");if(["calendar","student","leader","admin","print"].includes(params.get("view")))view=params.get("view");if(view==="print")printDates.add(activeDate);
  window.TalkFlow={KEYS,validateTopic,validateAll,getTopics:()=>clone(topics),approvedMonth,monthFile,viewerHtml};
  render();
})();
