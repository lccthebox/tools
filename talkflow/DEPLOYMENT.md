# Talk Flow 배포 기준

## 구조

- 정적 UI: `/talkflow/`
- 관리자 상태/로그인/로그아웃: `/api/talkflow/status`, `/login`, `/logout`
- Anthropic allowlist proxy: `/api/talkflow/models`, `/messages`
- 실행 환경: 별도 Vercel 프로젝트 `thebox-talkflow-preview`

GitHub Pages에는 서버 함수를 넣지 않습니다. 운영 Pages와 `/topics/`는 이 배포와 분리되어 있습니다.

## 필수 서버 환경변수

- `ANTHROPIC_API_KEY`
- `TALKFLOW_ADMIN_PASSWORD_HASH`
- `TALKFLOW_SESSION_SECRET`

환경변수가 하나라도 없으면 status는 `configured: false`를 반환하며 생성 UI가 비활성화됩니다. 기존 토픽 검수와 인쇄는 계속 동작합니다. 비밀값은 브라우저, Git, Vercel 빌드 산출물, PR 본문에 복사하지 않습니다.

## Preview

현재 안전한 UI Preview:

`https://thebox-talkflow-preview.vercel.app/talkflow/`

이 URL은 운영 사이트가 아니라 전용 Preview 프로젝트입니다. 현재 서버 secret이 설정되지 않아 `서버 설정 필요` 상태이며, 브라우저 직접 Anthropic 요청은 0입니다. Vercel의 고유 preview deployment는 조직 SSO 보호도 적용됩니다.

배포 명령:

```powershell
vercel pull --yes --scope theboxis
vercel build
vercel deploy --prebuilt --scope theboxis
```

전용 안정 URL을 갱신할 때만 `vercel build --prod`와 `vercel deploy --prebuilt --prod --scope theboxis`를 사용합니다. 이는 `thebox-talkflow-preview` 프로젝트에만 적용하며 GitHub Pages나 main을 배포하지 않습니다.

## 비밀값 설정 후 검증

Vercel Dashboard 또는 `vercel env add`로 세 환경변수를 Preview/Production 대상에 직접 입력한 뒤 재배포합니다. Codex나 브라우저 DOM으로 기존 API 키를 복사하지 않습니다.

검증 순서:

1. status가 configured이고 비로그인 상태인지 확인
2. 관리자 로그인 후 Secure HttpOnly session 확인
3. Models 1회와 Messages 1회, pending 0 확인
4. 신규 토픽 최소 3건 생성과 quality 검증
5. 학생·리더 각 2페이지, PDF, History, reload 확인
6. client `api.anthropic.com` 요청 0과 secret scan 확인

## Main 병합 기준

UI, History, PDF, Proxy, 보안, Preview와 실제 AI 3건 생성 QA가 같은 SHA에서 모두 통과해야 합니다. 실제 Anthropic secret이 없는 Preview는 UI-only PASS일 뿐 production readiness PASS가 아닙니다. main 병합과 운영 Pages 반영은 별도 승인 전 실행하지 않습니다.
