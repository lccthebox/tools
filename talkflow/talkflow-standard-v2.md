# TheBox Talk Flow Standard v2

상태: 생성기·검증기·학생/리더 v4 인쇄 템플릿의 공통 기준

## 변경 원칙

- 게임은 수정 금지 대상이 아니다. 목표에 맞지 않으면 다른 대화 활동으로 교체한다.
- 섹션은 완전 고정하지 않는다. 시간 합계와 학습 흐름을 지키면서 합치거나 재구성할 수 있다.
- 기존 운영 토픽, Gist 데이터, localStorage 스키마는 파괴적으로 변경하지 않는다.

## Session 1 · 50분

Session 1은 다음 네 기능을 실제 인쇄 내용으로 제공한다.

1. 쉬운 진입: 바로 답할 수 있는 짧은 질문과 `START`
2. 경험: 개인 경험 또는 경험이 없을 때의 안전한 대안
3. 판단 재료: 리뷰, 메시지, 조건, 일정, 수치 등 완전한 자료
4. 상호작용: 후속 질문, 반응, 순번 규칙

학습자 진행 표시는 `START / ADD / GO FURTHER`를 사용한다.

## Session 2 · 40분

Session 2는 일반 Discussion 질문 목록이 아니라 참가자 행동 중심 활동이다.

- 정보 격차: 비공개 선택, 서로 다른 정보, 추측 또는 비교
- 역할: 서로 다른 입장이나 행동 지시
- 그룹 결정: 전원이 말한 뒤 하나의 열린 결론 기록
- 모든 활동 단계, 역할, 결정 규칙에 자연스러운 한국어 안내 필수

## 발화 강제

활성 발화 강제 장치를 최소 3개 제공한다. 예: 제한 시간 순번, 정보 격차, 개인 산출물, 반대 역할, 전원 발화 후 결정. 두 페이지 모두 실제로 작동하는 장치를 최소 2개 포함한다.

## 준비 상태 분리

- Structure Ready: 50/40분 구성, Session 1 네 기능, Session 2 활동 구조
- Speaking Ready: 최소 3개 발화 장치, 후속 질문, 역할/이견, 참가자 산출물
- Print Ready: 학생·리더 v4 2페이지, 넘침 없음, 핵심 질문 11pt 이상, 행동 문구 9.5pt 이상, 한국어 활동 안내 8.5pt 이상

세 상태는 독립적으로 검증하며 하나를 다른 상태의 대리값으로 사용하지 않는다.

## 연결 계약

- 생성 기준: `<talkflow-standard version="2" student-template="student-v4" leader-template="leader-v4">`
- 학생 레퍼런스: `reference/student-v4.html`
- 리더 레퍼런스: `reference/leader-v4.html`
- 데이터 표식: `standardVersion: "2"`, `templateVersion: "4"`
- 렌더 표식: `data-talkflow-standard="v2"`와 `data-template-version`
