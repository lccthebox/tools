# TheBox Talk Flow Standard v2

## 목적

Talk Flow v2는 생성 결과를 화면용 문장 묶음이 아니라 **질문과 발화 장치가 자기 데이터에 직접 결합된 수업 데이터**로 만든다. 생성기, 검증기, 학생용 렌더러, 리더용 렌더러는 같은 객체를 사용한다. 렌더러는 다른 질문의 starter를 가져오거나 누락 값을 임의 문구로 대체하지 않는다.

## 고정 출력 구조

한 토픽은 학생용 A4 두 페이지이며 아래 8개 섹션을 정확히 한 번씩 갖는다.

### Session 1 · 50분

1. `why` — 쉬운 진입을 위한 한·영 맥락
2. `popQuiz` — 실제 한국어 학습자 오류 3개
3. `icebreakers` — 경험과 가벼운 판단을 연결하는 질문 3개
4. `bingo` — 상호작용에 쓰는 3×3 어휘 9개

각 icebreaker는 `en`, `type`, `minutes`, `starter`, `followup`, `ladder`를 자기 객체 안에 가진다. 필요한 경우에만 `options` 또는 `escape`를 가진다. 학생 질문 블록에는 한국어 번역을 노출하지 않는다.

### Session 2 · 40분

1. `game` — 활동, 정보 격차 또는 역할, 비교와 그룹 결정을 만드는 게임 정확히 1개
2. `situation` — 숫자와 갈등을 포함하며 게임과 토론이 함께 사용하는 사실
3. `discussion` — 상황 및 게임 결과에 연결된 질문 3개
4. `expressions` — 기능이 서로 다른 실전 표현 6개

Session 2는 일반 Discussion 목록으로 대체할 수 없다. 게임은 4~6개의 한·영 진행 규칙과 실제 선택지·역할·입력칸 중 필요한 재료를 포함한다. 모든 참가자가 준비하고, 순서대로 말하고, 다른 사람에게 질문하거나 반응하고, 최종 결정 전에 한 번 이상 발화하도록 최소 3개의 발화 강제 장치를 데이터에 명시한다.

## 바운드 필드 규칙

- starter, followup, option, ladder는 해당 질문 객체에서만 읽는다.
- game의 rule, option, role, input, starter는 해당 game 객체에서만 읽는다.
- Content Fill이 통과한 뒤 game 필드를 후처리하거나 재작성하지 않는다.
- 누락된 한국어를 공통 문구로 채우지 않는다. 필수 한국어가 없으면 검증 실패다.
- 리더용 TIME CUT은 현재 토픽의 `leader.timeCut`, `game.name`, `game.minFloor`에서 생성한다.
- 영어 제목은 ASCII 문자의 비율이 80% 이상이어야 한다.
- `Option A`, `Role 1`, `TBD`, 빈 라벨 같은 placeholder는 허용하지 않는다.
- `START / ADD / GO FURTHER / Ask and react` 반복 상자와 4단계 story chain은 사용하지 않는다.
- 물리적 이동을 요구하는 `stand`, `move around`, `walk`, `switch seats`, `find a partner across the room` 지시는 금지한다.

## 언어 노출

한국어 활동 안내는 필수다. 다음 필드는 자연스러운 해요체 한국어를 갖는다.

- WHY 설명
- Pop Quiz 오류 설명
- Bingo 규칙과 뜻
- Game 진행 규칙 및 선택지·역할 안내
- Situation 설명과 facts
- Useful Expressions 뜻
- 리더 운영 메모와 TIME CUT 정보

학생용 icebreaker 및 discussion의 질문·선택지·starter·followup·ladder는 영어만 노출한다. 영어 발화를 돕는 문장 안에 한국어가 섞이면 경고한다.

## 생성 계약

생성기는 Topic Plan과 Content Fill 두 단계로 실행한다. 최종 Content Fill은 `schema/generated-topic-v2.schema.json`을 만족해야 한다. 요청 날짜 불일치 또는 B1~B11 blocker가 있으면 같은 후보를 포함해 실패 위치만 한 번 재생성한다. 두 번째에도 실패하면 저장·승인·인쇄 준비 상태로 전환하지 않는다.

## 승인 게이트

검사는 독립된 세 그룹으로 표시한다.

- **Structure** — 필수 8섹션, 개수, 스키마, 게임 1개
- **Speaking** — 질문별 starter 결합, 발화 장치, 중복·회귀·물리 이동 금지
- **Print Ready** — A4 2페이지, overflow 없음, 최소 글자 크기, 학생/리더 출력

`B1`~`B11`은 승인 차단 항목이다. 하나라도 있으면 승인 버튼을 비활성화하고 자동 수정 진입점을 표시한다. `W1`~`W12`는 경고이며 승인할 수 있지만 운영자가 확인해야 한다. QA fixture뿐 아니라 실제 일반 토픽 생성 경로도 동일한 생성기·검증기·렌더러·승인 게이트를 사용한다.

## 렌더링 계약

학생용과 리더용은 `renderGeneratedHandout(topic, leader)` 하나를 공유하고 모드만 분기한다. 학생용은 수업 데이터만, 리더용은 같은 두 페이지에 현재 토픽의 리더 메모와 TIME CUT을 추가한다. 기준 HTML은 다음 시각 구조를 따른다.

- `reference/student-v4.html`
- `reference/leader-v4.html`

두 출력 모두 title 18pt, question 10.5pt, English instruction 9pt, Korean guidance 8.5pt, meta 7.5pt 이상을 유지한다.
