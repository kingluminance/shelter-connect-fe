# API 컨벤션 — 실제 배포된 Spring Boot 백엔드 계약

> Source: [HANN-Creator/shelter-connect](https://github.com/HANN-Creator/shelter-connect)의 `docs/` (read-api.md,
> auth-and-permissions.md, dog-behavior-api.md 등) — **이전 버전(Obsidian 초안 기준)을 대체함.**
> 클라이언트: [apiClient.ts](../src/shared/lib/apiClient.ts) (`API_BASE_URL` env)

백엔드는 별도 레포, 실제 배포됨: **`https://shelter-connect-dev.onrender.com`** (Render 무료 플랜 — 15분
미사용 시 슬립, 첫 요청은 최대 1분 소요될 수 있음). FE는 REST로만 통신하고 Supabase DB에 직접 연결하지 않는다.

## 공통 규칙
- ID는 모두 PostgreSQL **UUID 문자열**
- 날짜/시간: **UTC ISO 8601**, 화면은 한국 시간으로 표시
- 모르는 단일 값은 `null`, 빈 목록은 `[]`
- 목록 응답: `{ "data": [...], "nextCursor": string | null }` — 커서 기반 페이지네이션, `nextCursor`는 그대로
  다음 요청에 전달 (클라이언트에서 해석·생성 금지)
- 단일 응답: `{ "data": {...} }`
- 에러 포맷: `{ "code": "RESOURCE_NOT_FOUND", "message": "...", "requestId": "uuid" }` → [ApiError](../src/shared/lib/apiClient.ts).
  `requestId`는 응답의 `X-Request-ID` 헤더와 동일
- 모든 응답에 `Cache-Control: no-store`
- 인증 필요한 요청은 `Authorization: Bearer <supabase-access-token>` — [auth.md](./auth.md) 참고. 공개 API에
  토큰을 안 보내면 정상 조회되지만, **잘못된 토큰을 보내면 공개 API도 401**

## 엔드포인트 목록

### 조회 (인증 불필요, [read-api.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/read-api.md))
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/v1/shelters?region=&limit=&cursor=` | 승인·공개된 보호소 목록 |
| GET | `/v1/shelters/{shelterId}` | 보호소 상세 (+공개 강아지 수) |
| GET | `/v1/shelters/{shelterId}/dogs?limit=&cursor=` | 해당 보호소의 공개 강아지 목록 |
| GET | `/v1/dogs/{dogId}` | 강아지 상세 (사진 제외) |

`limit` 기본 20, 1~50. 공개 조건: 보호소 `APPROVED`+공개, 강아지 `is_public`+`AVAILABLE`/`IN_PROGRESS`만.
`ADOPTED`/`PAUSED`/비공개는 존재해도 404.

### 강아지 행동 설정 ([dog-behavior-api.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/dog-behavior-api.md))
| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/v1/dogs/{dogId}/behavior` | 앱에서 재생할 8종 동작 설정 | 불필요 |

게임 화면의 강아지 자율 이동/행동은 이 API가 내려주는 값으로 구동한다 — 자세한 필드는 [data-model.md](./data-model.md),
구현은 [game-architecture.md](./game-architecture.md) 참고.

### 인증/내 정보 ([auth-and-permissions.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/auth-and-permissions.md))
| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/v1/me` | 앱 사용자 등록/조회 (반복 호출해도 중복 생성 안 함) | 필요 |
| GET | `/v1/me` | 내 정보 | 필요 |
| GET | `/v1/me/shelters` | 내가 관리 가능한 보호소 목록 (보호소 담당자용) | 필요 |

로그인 자체는 Supabase Auth SDK가 처리하고, 이 서버는 그 결과 토큰만 받는다 — [auth.md](./auth.md) 참고.

### 아직 FE에서 안 쓰는 것 (백엔드는 구현돼 있음)
- `dog-management-api.md` — 강아지 등록/수정 (보호소 관리자용)
- `chat-storage-api.md`, `grounded-chat-api.md` — 대화 저장 + AI 답변 (AI는 배포 서버에서 현재 `AI_ENABLED=false`)
- `photo-read-api.md` — 사진 조회 (현재 배포 서버에서 `PHOTO_STORAGE_ENABLED=false`)
- `adoption-notes-api.md` — 입양 준비 개인 메모

## 샘플 응답

### GET `/v1/shelters`
```json
{
  "data": [{
    "id": "02100000-0000-4000-8000-000000000001",
    "name": "온기 보호소 (가상)",
    "region": "서울 은평구",
    "latitude": 37.61, "longitude": 126.93,
    "mapKey": "sunny",
    "dogCount": 3
  }],
  "nextCursor": null
}
```
`mapKey`는 게임 맵 에셋을 고르는 키 — `sunny` → `src/modules/game/core/assets/maps/sunnyMeadow.ts`,
`forest` → `woodlandTrail.ts` 매칭 (추정, 백엔드팀 확인 필요).

### GET `/v1/shelters/{id}/dogs`
```json
{
  "data": [{
    "id": "02200000-0000-4000-8000-000000000001",
    "shelterId": "02100000-0000-4000-8000-000000000001",
    "name": "봄이",
    "species": "DOG",
    "adoptionStatus": "AVAILABLE",
    "avatarKey": "bomi",
    "traitLabels": ["천천히 친해져요", "짧은 공놀이"]
  }],
  "nextCursor": null
}
```
`avatarKey`는 이미지 URL이 아니라 앱의 도트 에셋을 고르는 키 (`bomi`/`dubu`/`kongi`/`bami` 등 — 매핑 안 된
키는 기본 도트로).

### GET `/v1/dogs/{dogId}/behavior`
```json
{
  "data": {
    "dogId": "02200000-0000-4000-8000-000000000001",
    "schemaVersion": 1,
    "basis": "DEFAULT",
    "revision": null,
    "settings": {
      "actions": {
        "IDLE": { "weight": 70, "speedTilesPerSecond": 0, "minDurationMs": 2000, "maxDurationMs": 5000, "cooldownMs": 2000 },
        "WALK": { "weight": 30, "speedTilesPerSecond": 0.8, "minDurationMs": 2000, "maxDurationMs": 5000, "cooldownMs": 2000 }
      },
      "approachDistanceTiles": 0,
      "personalSpaceTiles": 0,
      "reactionDelayMs": 1000,
      "ballPlay": { "chaseEnabled": false, "returnEnabled": false, "reactionDelayMs": 1000 }
    }
  }
}
```
`basis: "DEFAULT"`면 보호소가 아직 이 강아지의 행동을 확인(CONFIRMED)하지 않은 것 — 실제 전체 8개 액션
필드는 [data-model.md](./data-model.md) 참고.

## 에러 코드 (조회/인증 공통)
| HTTP | 코드 | 의미 |
|---|---|---|
| 400 | `INVALID_REQUEST` | UUID/limit/region 등 입력값 확인 |
| 400 | `INVALID_CURSOR` | 커서 비우고 첫 페이지 재조회 |
| 401 | `UNAUTHENTICATED` | 토큰 누락/위조/만료 |
| 403 | `ACCOUNT_NOT_REGISTERED` | `POST /v1/me`로 등록 필요 |
| 403 | `ACCOUNT_DISABLED` | 계정 비활성화 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `RESOURCE_NOT_FOUND` | 대상 없음/비공개 |
| 409 | `STALE_RESOURCE` / `WRITE_CONFLICT` | 최신 데이터 재조회 후 재시도 |
| 500 | `INTERNAL_ERROR` | 재시도 안내, `requestId` 보관 |
