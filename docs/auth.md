# 인증 — 로그인/토큰 흐름

> Source: [HANN-Creator/shelter-connect](https://github.com/HANN-Creator/shelter-connect)
> `docs/auth-and-permissions.md` — **이전 버전(FE가 백엔드 `/auth/login`만 호출한다는 가정)은 틀렸음, 대체함.**

## 인증 방식
**FE가 Supabase Auth SDK로 직접 로그인**하고, 그 결과 `access_token`만 백엔드(Spring Boot)에 Bearer로
보낸다. 백엔드는 Supabase의 공개 JWKS로 서명을 검증할 뿐, 비밀번호나 refresh token은 절대 받지 않는다.
클라이언트: [`src/shared/lib/supabase.ts`](../src/shared/lib/supabase.ts) — **Auth 전용**, `supabase.from(...)`
으로 DB 직접 쿼리하지 않는다 (DB는 백엔드가 소유).

## 로그인 흐름
```
1. FE: supabase.auth.signInWithPassword({ email, password }) (또는 다른 Supabase 로그인 방식)
       → session.access_token 확보 (SDK가 저장·자동 갱신까지 처리)
2. FE: POST /v1/me  (Authorization: Bearer <access_token>, 본문 없음)
       → 처음이면 app_users에 등록(이름 "방문자", role "USER"), 이미 있으면 같은 사용자 반환
       → 반복 호출해도 중복 생성 안 됨 — 매 로그인마다 호출해도 안전
3. FE: GET /v1/me → { id, displayName, role }
       GET /v1/me/shelters → 보호소 담당자면 관리 가능 보호소 목록, 일반 유저면 []
```
이후 모든 API 호출은 [`apiClient.ts`](../src/shared/lib/apiClient.ts)가 `supabase.auth.getSession()`으로
현재 토큰을 매번 읽어 자동 첨부한다 (세션은 SDK가 캐싱, 만료 임박 시 자동 갱신 — 별도 저장 로직 불필요).

`data.id`(app_users.id)는 Supabase Auth의 사용자 ID와 **다른 값**이다. 이후 요청의 "로그인 증명"으로
이 ID를 보내면 안 되고, 항상 토큰만 보낸다.

## 권한 레벨 (백엔드 기준)
| 상태 | 조회 | 보호소/강아지 관리 |
|---|---|---|
| 로그인 안 함 / 토큰 없음 | 공개 조회 가능 | 불가 (401) |
| 로그인했지만 `POST /v1/me` 전 | 가능 | 403 `ACCOUNT_NOT_REGISTERED` |
| 등록된 일반 사용자 (보호소 소속 없음) | 가능 | 403 |
| `ACTIVE` 소속 `MANAGER`/`STAFF` + `APPROVED` 보호소 | 가능 | 자기 보호소만 가능 |
| 계정 비활성화 | 403 `ACCOUNT_DISABLED` | 동일 |

이번 버전 FE 범위(방문자 앱)는 보호소 관리 기능을 쓰지 않으므로 대부분 "로그인 안 함 / 등록된 일반 사용자"
경로만 해당. 강아지 대화·입양 메모 저장 등 로그인이 필요한 기능을 붙일 때 위 흐름을 그대로 쓰면 됨.

## (확인 필요)
- Supabase 프로젝트의 `SUPABASE_ANON_KEY` (URL은 확인됨: `https://gwimdiwrqfcqulefshoz.supabase.co`,
  `.env.example` 참고) — 백엔드팀에게 요청
- 로그인 화면 자체 UX(이메일/비밀번호 vs 소셜)는 미정, 백엔드 문서도 "C-02에서 정할 내용"이라고 명시
