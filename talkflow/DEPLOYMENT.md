# Talk Flow 배포 기준

## 현재 판정

- 로컬 개인 운영: Anthropic Models와 Messages 연결 테스트 통과 후 사용 가능
- 공개 UI Preview: AI 연결과 생성을 비활성화한 정적 화면에 한해 가능
- 공개 production: **NO-GO**

현재 앱은 로컬 브라우저에서 Anthropic API 키를 저장하고 직접 요청합니다. 비로컬 host에서는 `getStoredAnthropicApiKey()`가 요청 전에 `preview_ai_disabled`로 중단하므로 공개 Preview에서 키 입력, 모델 조회, 연결 테스트와 생성을 사용할 수 없습니다.

## Preview 절차

1. feature 브랜치의 정적 자산만 배포합니다.
2. Preview host에서 AI 버튼이 비활성화되고 키 원문이 DOM, URL, 로그에 없는지 확인합니다.
3. 기존 샘플 데이터로 tasks, month, calendar, drawer, 미리보기와 반응형 화면만 검수합니다.
4. Gist 쓰기와 운영 데이터 변경은 Preview에서 수행하지 않습니다.

## Production 조건

모델 조회와 메시지 생성을 인증된 서버 측 프록시로 이동해야 합니다. 프록시는 사용자 인증, rate limit, 모델 allowlist, 요청 크기 제한, 오류 로그 redaction, 비밀값 회전과 CORS 제한을 적용해야 합니다. Preview QA, 자동 QA, 20페이지 이상 PDF 육안 검수, `/topics/` 무변경과 치명 오류 0을 모두 확인한 후에만 main 병합과 운영 배포를 검토합니다.
