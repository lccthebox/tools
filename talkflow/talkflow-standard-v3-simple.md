# TheBox Talk Flow — Simple Conversation v3

## 적용 범위

이 기준은 새로 생성하는 토픽에만 적용한다. 기존 `/topics/`와 저장된 이전 형식 토픽은 자동 변환하지 않는다. 운영일, 승인·사용 상태, 학생/리더 보기, A4 및 일괄 인쇄, localStorage·Gist·JSON 경계와 fail-closed 검증은 유지한다.

## 수업 구조

- Session 1, 50분: 쉬운 진입, 짧은 경험 공유, 판단 재료, 상호작용.
- 1페이지: 제목, `TODAY’S STORY` 또는 `THE SITUATION`, `EASY TALK` 3문항, `REAL TALK` 3문항, `TODAY’S ENGLISH` 4개, 이유를 말하기 전 최초 선택을 표시하는 `QUICK VOTE`다.
- Session 2, 40분: 정보 격차가 있는 활동, 역할 또는 조건, 그룹 결정.
- 2페이지: 정확히 한 개의 `TODAY’S ACTIVITY`, `GROUP RESULT`, 학생용 갈등 질문 `THINK HARDER` 한 개, `FINAL QUESTION`이다.
- 활동에는 한국어 안내, 실제 판단 자료, 2×2로 표시하는 진행 순서 네 개, 전원 발화 규칙, 발화 지원 문장 최소 3개가 필요하다. 순서는 최초 선택 → 근거와 질문 → 다른 근거 청취와 반응 → 선택 변경 가능성과 최종 결정이다.
- 활동 유형은 Review Jury, Choose and Defend, Rank and Negotiate, Advice Circle, Build a Plan, Problem Card, Truth or Bluff, Story Exchange, Best Option Challenge, Mini Role Play 중 하나다.

## 변주와 품질

- `story`, `case`, `trend` 중 하나를 사용하며 같은 달에 한 스타일만 반복하지 않는다.
- 여섯 질문은 경험, 습관, 비교, 기준, 의견, 해결, 결정, 예측 중 서로 다른 여섯 축을 내부적으로 사용한다.
- 질문 축과 스키마 이름은 학생 자료에 노출하지 않는다.
- `START`, `ADD`, `GO FURTHER`, `CHOOSE`, `SAY`, `ASK`, `REACT`, `DECIDE`, readiness 라벨은 학생 자료에 표시하지 않는다.
- 온라인 리뷰 골든 샘플은 `Review Jury` 활동 하나만 사용한다.

## 콘텐츠 품질 엔진

- Story는 영어 55~90단어, 한국어 3~5문장으로 구성한다. 사람, 구체적인 물건·장소, 숫자·시간·가격·조건, 예상과 실제의 차이, 균형 있는 갈등, 마지막 선택이 모두 필요하다.
- Easy Talk은 최근 경험, 평소 습관, 조건이 있는 빠른 선택으로 역할을 고정한다. Real Talk은 구체적인 사례, 판단 기준, 선택·해결·트레이드오프로 역할을 분리한다.
- 여섯 질문은 최소 다섯 개 axis를 사용하고 동일 axis는 최대 두 번만 사용한다. 같은 답, 동일 문두 과다 반복, 동일 starter를 허용하지 않는다.
- 각 질문은 한 문장, 선택과 이유, 사례 또는 예외로 확장할 수 있어야 한다. 학생용에는 짧은 starter 하나만 표시하고 리더용에는 질문별 후속 질문을 둔다.
- Today’s English 네 개는 판단, 경험, 동의·반박, 후속 질문 기능을 담당하며 `useIn`으로 Story, Real Talk, Activity의 실제 사용 위치를 연결한다.
- Activity는 `sourceRef`로 Story ID를 직접 참조한다. 15~25분 동안 실제 자료, 의견 차이, 다른 사람의 말을 듣는 단계, 전원 발화, 구체적인 Group Result를 포함한다.
- Story 영어에 있는 숫자·시간·가격 정보는 한국어에도 보존한다. 판단 자료의 한국어는 번역만 제공하고 정답을 유도하는 평가형 힌트를 넣지 않는다.
- 월간 검사에서는 동일 Activity 연속 사용, 동일 스타일 3회 연속, 동일 질문 문두 3회 초과, 동일 표현 2회 초과를 경고한다.

품질 점수는 Story 15, Question Diversity 15, Answerability 15, Interest 10, Expression Usefulness 10, Activity Connection 15, Bilingual Quality 10, Print Readability 10으로 총 100점이다. 총점 85점 이상이며 각 영역 최소 기준을 충족하고 blocker가 없어야 승인할 수 있다. 숫자 점수는 관리자 고급 영역에서만 확인한다.

부분 재생성은 Story, Easy Talk, Real Talk, Today’s English, Activity, 한국어 단위로 제공한다. 선택하지 않은 섹션은 보존하며, 변경 후 Story–Activity 연결과 전체 품질 게이트를 다시 검사한다.

## 분리된 게이트

- Structure: 페이지별 섹션 수, 질문 수, 활동 수, 필수 필드와 시간.
- Speaking: 질문 축 중복 방지, 실제 판단 자료, 전원 참여, 발화 지원 최소 3개, 그룹 결과.
- Print Ready: A4 두 페이지, 오버플로 없음, 제목 20pt, 질문 11pt, 한국어·활동·자료 9pt, 도움말 8pt, 리더 노트 8.5pt 이상.

## 디자인

흰색 편집 지면, 세리프 영문 대제목, 차콜 본문, 딥 그린 강조, 넉넉한 여백과 가는 구분선을 사용한다. Story는 연한 배경과 좌측 초록선을 사용한다. 판단 자료 번호는 원형 고대비 배지로 표시하고, 활동 단계는 2×2로 배치하며, 한국어는 `word-break: keep-all`을 적용한다. 검은 전체 폭 헤더·푸터와 중첩 카드, 장식용 박스 반복을 사용하지 않는다. 학생과 리더는 같은 구조를 쓰며 리더판은 해당 섹션 가까이에 짧은 진행 노트와 하단 비상 문장을 더한다.
