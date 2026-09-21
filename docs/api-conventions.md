# API 컨벤션 — Spring Boot 백엔드 계약

> Source: Obsidian `projects/dog-adoption/API-약속.md`, `백엔드-준비.md`
> 클라이언트: [apiClient.ts](../src/shared/lib/apiClient.ts) (`API_BASE_URL` env)

백엔드는 별도 레포(Spring Boot + Java 21 + Supabase PostgreSQL). 이 FE는 REST로만 통신하며
Supabase에 직접 연결하지 않는다.

## 공통 규칙
- ID는 모두 **string** (숫자라도 문자열로)
- 날짜/시간: **ISO 8601** (`2025-01-15T10:30:00Z`)
- 모르는 값: `null` (빈 문자열 금지)
- 에러 포맷: `{ "code": "DOG_NOT_FOUND", "message": "...", "requestId": "uuid" }` → [ApiError](../src/shared/lib/apiClient.ts)
- 인증 필요한 요청은 `Authorization: Bearer <token>` 헤더 (apiClient가 AsyncStorage 토큰 자동 첨부)

## 엔드포인트 목록 (구현 상태: 백엔드 B-12까지 완료)
| ID | 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|---|
| B-03 | GET | `/shelters` | 보호소 목록 | 비회원 가능 |
| B-04 | GET | `/shelters/{id}/dogs` | 보호소별 강아지 목록 | 비회원 가능 |
| B-05 | GET | `/dogs/{id}` | 강아지 상세 (성격 파라미터 포함) | 비회원 가능 |
| B-06 | GET | `/dogs/{id}/observation` | 강아지 관찰 기록 (대화 AI용) | 비회원 가능 |
| B-07 | POST | `/chat/{dogId}` | 강아지에게 말 걸기 (LLM 호출) | 필요 |
| B-08 | GET | `/dogs/{id}/profile` | 실제 사진 + 소개서 (대화 후 열림, `PROFILE_LOCKED` 가능) | 필요 |
| B-09 | POST | `/adoption/checklist` | 입양 체크리스트 저장 | 필요 |
| B-10 | GET | `/adoption/checklist/{userId}` | 체크리스트 불러오기 | 필요 |
| B-11 | POST | `/auth/login` | 로그인 (내부적으로 Supabase Auth) | - |
| B-12 | GET | `/user/me` | 내 정보 | 필요 |

## 샘플 요청/응답

### GET `/shelters`
```json
[{ "id": "shelter-001", "name": "햇살 보호소", "address": "서울시 마포구", "dogCount": 3, "mapId": "sunny-yard" }]
```

### GET `/shelters/{id}/dogs`
```json
[{
  "id": "dog-001", "name": "콩이", "breed": "믹스", "age": 2, "spriteKey": "dog_sprite_01",
  "personality": { "playfulness": 0.8, "sociability": 0.6, "energy": 0.7, "likesBall": true }
}]
```

### GET `/dogs/{id}/observation`
```json
{
  "dogId": "dog-001",
  "records": [
    { "date": "2025-01-10", "note": "오늘 공을 세 번 가져왔다. 꼬리를 계속 흔들었음.", "tags": ["활발", "공놀이", "친화적"] }
  ]
}
```

### POST `/chat/{dogId}` 요청 → 응답
```json
// req
{ "userId": "user-abc", "message": "공놀이 좋아해?" }
// res
{ "reply": "꼬리를 세차게 흔들며 당신을 바라봅니다. 공만 보면 눈이 반짝이는 편이에요!", "emotion": "excited", "unknownQuestion": false }
```
> `unknownQuestion: true`면 FE에서 "보호소에 물어볼 질문" 목록에 자동 추가 (로컬 상태, 영속 저장은 나중 버전)

### GET `/dogs/{id}/profile`
```json
{
  "dogId": "dog-001", "name": "콩이", "photos": ["https://cdn.../dog-001-1.jpg"],
  "introduction": "활발하고 사람 좋아하는 2살 믹스견...",
  "vaccinated": true, "neutered": false, "availableFrom": "2025-02-01"
}
```

## 에러 코드
| 코드 | 의미 |
|---|---|
| `DOG_NOT_FOUND` | 해당 ID 강아지 없음 |
| `SHELTER_NOT_FOUND` | 보호소 없음 |
| `PROFILE_LOCKED` | 대화 없이 프로필 접근 시도 |
| `CHAT_LIMIT_EXCEEDED` | 대화 횟수 초과 |
| `UNAUTHORIZED` | 인증 필요 |
