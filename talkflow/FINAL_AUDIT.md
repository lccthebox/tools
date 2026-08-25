# Talk Flow 최종 감사

## 현재 구현

- 클라이언트의 Anthropic API 키 입력·저장·헤더·직접 fetch를 제거했습니다.
- 모든 모델 조회, 연결 테스트, Topic Plan, Content Fill과 부분 재생성은 `TalkFlowAiClient`를 통해 같은 origin proxy를 사용합니다.
- 서버는 `claude-sonnet-4-6`, `max_tokens` 범위, 허용된 tool schema와 Talk Flow 전용 메시지만 허용합니다.
- 관리자 로그인은 scrypt password hash와 서명된 HttpOnly·Secure·SameSite=Strict cookie를 사용합니다.
- login은 IP당 15분 5회, proxy는 IP당 1분 30회로 제한하고 잘못된 body, 임의 URL, 임의 endpoint와 비허용 모델을 차단합니다.
- 기존 브라우저 Anthropic 키만 삭제하는 migration을 제공하며 토픽·Gist 설정은 보존합니다.
- 서버 secret이 없을 때 AI 생성만 비활성화하고 기존 토픽·History·검수·PDF·일괄 인쇄를 유지합니다.

## 검증 결과

- proxy security: PASS
- server auth browser regression: 16 PASS
- connection lifecycle: 11 PASS
- model selection: 10 PASS
- Simple 실제 앱 생성 경로: 121 PASS, deterministic fixture/mock 일반 토픽 8건 (Anthropic 호출 0)
- Conversation: 107 PASS
- core workspace: 53 PASS
- navigation/History/settings/batch print: 39 PASS
- 실제 Vercel Preview: 32 PASS at 375/768/1280/1600
- student PDF 10개와 leader PDF 5개: 각 물리 2페이지

실행 증거는 `.omo/evidence/talkflow-preview/report.json`, `.omo/evidence/talkflow-simple`, `.omo/evidence/talkflow-pdf-render`에 생성되며 Git에는 포함하지 않습니다.

## 보안 결과

- client `api.anthropic.com`: 0
- client `x-api-key`: 0
- client dangerous direct browser access header: 0
- server 응답의 Anthropic key/upstream header: 0
- 비인증 proxy: 401
- 비허용 model/body/endpoint: 400
- `/topics/` diff: 0

## 배포 판정

서버 secret이 없는 현재 Preview는 UI-only와 proxy 구조 QA까지 PASS입니다. 비용 통제 원칙에 따라 이번 QA의 실제 Models 호출, Messages 호출, 연결 테스트, Topic Plan, Content Fill, 신규 라이브 토픽, 자동 재시도는 모두 0회입니다. 서버 secret을 설정한 뒤에도 연결 테스트 1회 + Topic Plan 1회 + Content Fill 1회와 신규 토픽 정확히 1건만 허용하며, 같은 목적의 반복 생성은 금지합니다. 필요한 사용자 작업은 전용 Vercel 프로젝트에 세 환경변수를 입력하는 것 한 가지입니다.
