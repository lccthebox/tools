# Talk Flow Security

## Trust boundary

브라우저는 Talk Flow UI와 same-origin API만 신뢰합니다. Anthropic key는 Vercel server environment에만 존재하며 `/api/talkflow/models`와 `/messages`가 고정 upstream URL을 호출합니다. CORS는 인증 수단으로 사용하지 않습니다.

## Authentication

- 관리자 비밀번호는 `scrypt$N$r$p$salt$digest` 형식의 hash로 저장합니다.
- session은 `TALKFLOW_SESSION_SECRET` HMAC으로 서명되고 8시간 뒤 만료됩니다.
- cookie는 `__Host-talkflow_session`, HttpOnly, Secure, SameSite=Strict, Path=/입니다.
- POST는 same-origin host와 `x-talkflow-request: app`을 모두 확인합니다.
- 비밀번호 원문은 DOM에 로그인 중에만 존재하고 localStorage/sessionStorage/URL에 저장하지 않습니다.

## Request limits

- login: IP당 15분 5회
- proxy: IP당 1분 30회
- message body: 120 KB 이하
- model: `claude-sonnet-4-6` only
- max tokens: 1–6000
- generation tools: `submit_simple_topic_plan`, `submit_simple_content` only
- connection probe와 고정 prefix의 이전 Talk Flow repair 요청 외 임의 prompt는 거부

서버리스 인메모리 제한은 인스턴스 단위 최소 방어입니다. 공개 범위를 확대하거나 여러 관리자가 사용하게 되면 Vercel Firewall 또는 내구성 있는 rate-limit store를 추가합니다.

## Key rotation

1. Anthropic에서 새 key 생성
2. Vercel `ANTHROPIC_API_KEY` 교체
3. Preview 재배포 후 Models/Messages 200 확인
4. 이전 key 폐기
5. client direct request와 저장소 secret scan 재실행

관리자 비밀번호 변경은 새 hash로 `TALKFLOW_ADMIN_PASSWORD_HASH`를 교체하고 `TALKFLOW_SESSION_SECRET`도 함께 회전해 기존 session을 모두 무효화합니다.

## Incident response

의심스러운 사용이나 유출 가능성이 있으면 Anthropic key를 즉시 폐기하고 Vercel deployment 접근을 제한합니다. 다음으로 session secret과 관리자 password hash를 회전하고, Vercel function logs에는 status, error type, request id만 남았는지 확인합니다. prompt, topic 본문, 비밀번호, API key, upstream header는 사고 보고서에 복사하지 않습니다.
