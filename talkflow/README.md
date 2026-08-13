# TheBox Talk Flow

Talk Flow는 운영일별 회화 토픽을 생성·검수하고 학생용·리더용 A4 자료로 출력하는 운영 도구입니다. 새 토픽은 Conversation-First 생성 경로와 Simple Conversation v3 두 페이지 구조를 사용하며, 저장된 이전 형식 토픽은 자동 변환하지 않습니다.

## 실행 모드

### UI-only

AI 없이 기존 토픽 검수, 학생·리더 미리보기, PDF, 일괄 인쇄, Gist와 데이터 관리를 확인할 때 저장소 루트에서 실행합니다.

```powershell
python -m http.server 8766
```

`http://127.0.0.1:8766/talkflow/`을 엽니다. 서버 API가 없으면 토픽 생성과 재생성만 `AI 서버 설정 필요` 상태로 비활성화됩니다.

### AI 포함 로컬 개발

1. `node talkflow/hash-admin-password.mjs`를 실행해 관리자 암호 hash와 session secret을 직접 만듭니다. 입력한 비밀번호 원문은 표시하거나 저장하지 않습니다.
2. 저장소 루트의 `.env.local`에 `ANTHROPIC_API_KEY`, `TALKFLOW_ADMIN_PASSWORD_HASH`, `TALKFLOW_SESSION_SECRET`을 설정합니다. 이 파일은 Git에서 제외됩니다.
3. `vercel dev`를 실행하고 출력된 로컬 URL의 `/talkflow/`을 엽니다.

브라우저는 Anthropic 키를 보거나 저장하지 않습니다. 모델 목록, 연결 테스트, Topic Plan, Content Fill과 모든 부분 재생성은 같은 origin의 `/api/talkflow/*`만 호출합니다.

## 운영 흐름

1. `해야 할 일`에서 생성 실패, 검수 필요, 승인 가능, 미작성 순서로 작업을 확인합니다.
2. AI 서버 로그인 후 미작성 운영일에서 Topic Plan과 Content Fill을 생성합니다.
3. `내용 검수`에서 Story, 질문, 표현, Activity와 Final Question을 확인하고 필요한 섹션만 다시 생성합니다.
4. 학생용·리더용 각 두 페이지를 확인합니다.
5. 차단 오류가 없을 때 승인하고 개별 PDF 또는 `일괄 인쇄`를 사용합니다.

브라우저 뒤로가기·앞으로가기와 새로고침은 view, 날짜, 탭, 페이지와 스크롤을 복원합니다.

## 비밀값과 데이터

- Anthropic 키는 서버 환경변수에서만 읽습니다.
- 관리자 비밀번호는 scrypt hash로만 저장하며 로그인 후 HttpOnly·Secure·SameSite=Strict 세션 cookie를 사용합니다.
- 이전 버전이 브라우저 설정에 저장한 Anthropic 키가 있으면 AI 설정의 `안전하게 삭제`를 한 번 사용합니다. 다른 Talk Flow 설정과 토픽은 유지됩니다.
- Gist token은 기존 동작을 유지하며 JSON/viewer export에 Anthropic 키나 관리자 비밀번호가 포함되지 않습니다.
- 기존 승인 토픽, 실패 초안, 이전 형식 토픽과 `/topics/`는 자동 수정하지 않습니다.

## QA

```powershell
node talkflow/proxy-security-qa.mjs
node talkflow/auth-regression-qa.mjs
node talkflow/connection-qa.mjs
node talkflow/model-qa.mjs
node talkflow/simple-qa.mjs
node talkflow/structured-content-qa.mjs
node talkflow/generation-engine-qa.mjs
node talkflow/conversation-qa.mjs
node talkflow/qa.mjs
node talkflow/navigation-qa.mjs
node talkflow/print-qa.mjs
node talkflow/preview-qa.mjs https://<preview-host>/talkflow/
```

`.qa-pdf`와 `.omo/evidence`는 검수 산출물이며 커밋하지 않습니다. 보안 운영과 사고 대응은 `SECURITY.md`, 배포 절차는 `DEPLOYMENT.md`를 따릅니다.
