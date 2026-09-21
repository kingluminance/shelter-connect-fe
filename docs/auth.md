# 인증 — 로그인/토큰 흐름

> Source: Obsidian `projects/dog-adoption/결정-기록.md`, `API-약속.md`, `백엔드-준비.md`

## 인증 방식
Supabase Auth를 백엔드(Spring Boot)가 감싸서 제공한다. **FE는 Supabase SDK를 직접 쓰지 않고**
백엔드의 `POST /auth/login`만 호출한다 (docs/api-conventions.md 참고).

## 로그인 흐름
```
POST /auth/login { email, password }
  → 백엔드가 Supabase Auth로 검증
  → { token, user } 응답 (TODO: 정확한 응답 필드는 백엔드 확인 필요, 현재 Obsidian 문서에 샘플 없음)
FE: setAuthToken(token) → AsyncStorage에 저장 (src/shared/lib/apiClient.ts)
이후 모든 요청에 Authorization: Bearer <token> 자동 첨부
```

## 현재 유저 가져오기
```
GET /user/me  (Authorization 헤더 필요)
```

## 권한 레벨 (백엔드 기준, FE는 화면 분기에 참고)
| 역할 | 권한 |
|---|---|
| 비회원(visitor) | 보호소 목록, 강아지 목록, 관찰 기록 조회 |
| 회원(user) | visitor + 대화, 프로필 보기, 체크리스트 저장 |
| 보호소 직원 | user + 강아지/관찰 기록 등록·수정 (FE 이번 버전 범위 밖) |
| 운영자(operator) | 전체 관리 (FE 범위 밖) |

## 이번 버전 범위
"실제 로그인/서버 권한 검증"은 Obsidian 문서상 **나중 버전**으로 명시됨 — MVP에서는 화면 분기 정도만
필요할 수 있음. 실제 로그인 게이팅을 언제부터 강제할지는 기획 확인 필요.

## (확인 필요)
- `POST /auth/login` 정확한 응답 필드 (token 이름, 만료 시간, refresh 흐름 여부)
- 토큰 만료 시 FE 처리 (자동 로그아웃 vs 재로그인 유도)
