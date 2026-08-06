# Talk Flow 최종 감사

## 구현 범위

- 기본 진입을 최대 8개의 우선 작업과 이번 주 상태가 보이는 `해야 할 일`로 유지했습니다.
- 전체 월 compact list, 상태 전용 달력, 날짜 drawer와 contextual 검수·학생용·리더용 탭을 유지했습니다.
- query 기반 History API에서 view, 날짜, 탭, 페이지, 필터, zoom과 스크롤을 복원합니다.
- drawer가 열린 동안 배경 스크롤을 잠그고 ESC, backdrop, 닫기 버튼과 포커스 복원을 지원합니다.
- 일괄 인쇄에 학생용 + 리더용 선택과 토픽당 4페이지 계산을 추가했습니다.
- 설정을 AI, Gist, 운영 일정, 인쇄, 데이터 관리의 다섯 구역으로 분리했습니다.
- 공개 비로컬 Preview에서는 직접 Anthropic 요청을 실행 전에 차단합니다.

## QA 결과

- 인증 19, 연결 11, 모델 10, Simple 생성 121, Conversation 107, core workspace 52, navigation/history/settings/combined print 39 검사를 통과했습니다.
- generation engine 회귀 검사도 통과했습니다.
- 375, 768, 1280, 1600px tasks·calendar·batch 화면에서 수평 overflow 0을 확인했습니다.
- 실제 `127.0.0.1:8766` 화면에서 tasks, month drawer, 설정 5구역, 일괄 인쇄의 8개 토픽 32페이지 계산을 확인했습니다.

재현 가능한 증거는 `talkflow/navigation-qa.mjs`, `talkflow/qa.mjs`, `talkflow/conversation-qa.mjs`, `talkflow/print-qa.mjs`에 고정되어 있습니다. 실행 시 브라우저 증거는 `.omo/evidence/task-home-history/final`, PDF 렌더 증거는 `.omo/evidence/talkflow-pdf-render`, 수치 보고서는 `talkflow/.qa-pdf/generation-results.json`에 생성됩니다. 이 결과물은 검수용이라 커밋하지 않습니다.

## Browser History

tasks → month → review → student page 1 → page 2 이동과 뒤로가기·앞으로가기 역순 복원을 확인했습니다. 학생 2페이지 새로고침, 잘못된 route 정규화, drawer URL 정리, 목록 스크롤과 포커스 복원도 자동 브라우저 검사로 고정했습니다. popstate 과정에서 API 요청과 토픽 저장은 발생하지 않았습니다.

## PDF

학생용 10개와 리더용 5개의 PDF가 모두 정확히 두 페이지였습니다. 학생 20페이지와 리더 10페이지를 PNG로 변환해 contact sheet로 육안 확인했습니다. DOM과 물리 PDF 페이지 수, 가로·세로 overflow, 본문 하단 충돌, 인쇄 글자 최소값, grayscale 내용 일치를 통과했습니다. QA PDF와 PNG는 커밋 대상에서 제외합니다.

## 보존과 남은 문제

기존 승인 토픽, 실패 초안, 이전 형식 토픽, Gist/localStorage 형식과 `/topics/`는 변경하지 않았습니다. 실수업의 발화 시간과 현장 프린터별 여백은 로컬 자동화로 증명할 수 없어 운영 pilot에서 확인해야 합니다.

## 배포 판정

로컬 운영과 AI 비활성 공개 UI Preview는 GO입니다. 브라우저가 Anthropic 비밀값을 직접 다루는 정적 구조이므로 production은 서버 측 프록시가 마련될 때까지 NO-GO입니다.
