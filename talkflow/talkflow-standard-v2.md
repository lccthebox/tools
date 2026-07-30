# TheBox Talk Flow Standard v2

상태: Fail-Closed 생성기·검증기·학생/리더 v4 인쇄 템플릿의 공통 기준

## 생성 계약

- 코드가 섹션명, 섹션 수, 순서, 시간, 페이지 구성을 만든다.
- AI는 영어·한국어 제목, 질문, 번역, 실제 자료, 말하기 예문, 역할·규칙, 최종 결정 문장만 채운다.
- 생성은 `Topic Plan → Plan 검증 → Content Fill → Content 검증` 두 단계다.
- 각 단계는 최초 요청 뒤 재시도 한 번만 허용한다.
- Plan이 실패하면 Content Fill을 요청하지 않는다.
- 재시도에는 직전 결과와 실패 위치를 전달하며 통과한 필드는 유지하고 실패 위치만 수정한다.
- 신규 자동 생성에서 v1 `conversationFlow` 또는 샘플 토픽 복제 fallback을 사용하지 않는다.

## 고정 Skeleton

### Session 1 · 50분

1. Quick Start · 10분
2. Personal / Experience Round · 15분
3. Evidence / Decision Round · 20분
4. Short Wrap-up · 5분

### Session 2 · 40분

1. Reset · 5분
2. Main Activity · 20분
3. Role / Challenge · 10분
4. Final Decision · 5분

Session 1은 쉬운 진입, 개인 경험과 경험이 없을 때의 대안, 완전한 판단 자료, 상호작용을 제공한다. Session 2는 일반 Discussion 질문 목록이 아니라 참가자가 준비·공유·질문·반론·결정하는 활동이다.

## 엄격한 데이터 경계

생성 결과는 `schema/generated-topic-v2.schema.json`을 따른다. 다음은 필수다.

- `title.en`, `title.ko`
- `sessionOne.sections`, `sessionTwo.sections`
- `conversationMaterials`
- `speakingFrames`
- `leaderGuide`
- `bilingualInstructions`

빈 문자열과 `Option A`, `Option B`, `Ask and react.`, `Use this evidence.`, `Add details.`, `TBD`, `Example`, `Placeholder` 같은 임시 문구는 실패다. Schema에 선언되지 않은 필드도 실패다.

## 질문과 실제 자료

- 모든 질문에는 허용된 `axis`가 있다.
- 서로 다른 축은 최소 3개이며 같은 축은 최대 2개다.
- 같은 질문, 포함관계 질문, 표현만 바꾼 질문, 같은 Starter 재사용은 실패다.
- 완전한 리뷰·메시지·조건표·상황 카드·역할별 정보·일정표·통계·실제 사례 중 최소 1세트를 제공한다.
- 자료는 영어와 한국어로 된 완전한 항목 3개 이상과 그 자료를 인용하는 판단 질문을 포함한다.
- 라벨만 있는 선택지, 인물·상황·조건이 없는 추상 문장, 정답이 명백한 자료는 실패다.

## 발화 강제와 한국어

- 정보 격차, 개인 실제 자료, 제한시간 순번, 반대 역할, 정답 없는 그룹 결정 중 최소 3개를 실제 활동에 연결한다.
- Session 2에는 참가자 산출물, 역할 대립, 정보 격차 중 하나 이상이 있어야 한다.
- Final Decision 전에 전원이 입장을 말해야 한다.
- 활동 규칙, 순서, 팀 역할, 시간, 최종 결과, 대체 참여 방법을 영어와 자연스러운 한국어로 제공한다.
- 영문 제목에 한국어가 포함되거나 한국어 제목에 한국어가 없으면 실패다.
- 두 제목이 같거나 같은 언어로 생성되면 실패다.

## Fail-Closed 준비 상태

- `STRUCTURE FAIL`: 고정 Skeleton, 시간, 필수 필드, 질문 축, Session 2 활동 실패
- `CONTENT FAIL`: 제목 언어, 빈 값, placeholder, 실제 자료, 영어·한국어 짝 실패
- `SPEAKING FAIL`: 발화 장치, 참가자 산출물, 역할 대립, 전원 발화 실패
- `PRINT FAIL`: A4 2페이지, 넘침, 잘림, 최소 글자 크기 실패
- `CONVERSATION READY`: 위 네 상태가 모두 Ready일 때만 표시

생성 실패는 `GENERATION FAILED`로 표시한다. 작성된 초안은 보존하고 미리보기·승인·PDF를 차단한다. 구형 자동 생성 초안은 `LEGACY OR INVALID DRAFT`로 표시하고 v2 재생성, 삭제, 원문 보기만 제공한다. 자동 변환하지 않는다.

## v4 화면 계약

- 학생용 A4는 페이지마다 주요 섹션 4개만 표시한다.
- 한 섹션의 시각 계층은 섹션 제목, 질문/활동, 말하기 도움의 3단계다.
- 한 질문은 영어 질문, 한국어 뜻, 말하기 도움 2~3줄로 제한한다.
- 신규 v2 출력에는 중첩된 `START / ADD / GO FURTHER / Ask and react` 상자를 사용하지 않는다.
- 영어 발화 문장을 가장 크게 표시한다.
- 학생·리더 A4는 정확히 2페이지이며 넘침과 잘림이 없어야 한다.
- 최소 인쇄 크기는 제목 18pt, 질문 10.5pt, 영어 활동 문구 9pt, 한국어 안내 8.5pt, 메타 7.5pt다.

## 연결 위치

- 고정 Skeleton·스키마·검증: `generation-engine.js`
- 최종 JSON Schema: `schema/generated-topic-v2.schema.json`
- 생성 API 연결·승인·PDF 차단: `app.js`
- 학생/리더 v4 렌더: `app.js`의 `renderGeneratedHandout`
- 학생 레퍼런스: `reference/student-v4.html`
- 리더 레퍼런스: `reference/leader-v4.html`
- 데이터 표식: `generationEngine: "v2-fail-closed"`, `standardVersion: "2"`, `templateVersion: "4"`
