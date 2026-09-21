# 데이터 모델 — 응답 DTO 타입

> Source: Obsidian `projects/dog-adoption/백엔드-준비.md`, `API-약속.md`
> FE는 Supabase 테이블에 직접 접근하지 않는다. 아래는 백엔드가 관리하는 테이블 구조(참고용)와,
> FE가 실제로 받는 REST 응답 shape(TS 타입, 여기서부터 구현)를 함께 정리한다.

## 백엔드 테이블 (참고 — 직접 쿼리하지 않음)
| 테이블 | 주요 컬럼 |
|---|---|
| `shelters` | id, name, address, map_id |
| `dogs` | id, shelter_id, name, breed, age, sprite_key |
| `dog_personalities` | dog_id, playfulness, sociability, energy, likes_ball |
| `observation_records` | id, dog_id, date, note, tags(jsonb) |
| `dog_photos` | id, dog_id, url, order |
| `dog_profiles` | dog_id, introduction, vaccinated, neutered, available_from |
| `users` | id (Supabase Auth UID), email, nickname |
| `adoption_checklists` | id, user_id, dog_id, items(jsonb), memo |
| `chat_logs` | id, user_id, dog_id, message, reply, created_at |
| `shelter_questions` | id, user_id, dog_id, question, created_at |
| `maps` | id, name, asset_key, width, height |

## 관계 (텍스트 트리)
```
shelters
  └── dogs (shelter_id)
        ├── dog_personalities (dog_id, 1:1)
        ├── observation_records (dog_id)
        ├── dog_photos (dog_id)
        └── dog_profiles (dog_id, 1:1)

users (Supabase Auth UID)
  ├── adoption_checklists (user_id, dog_id)
  └── chat_logs (user_id, dog_id)
```

## FE TypeScript 타입 (API 응답 기준 — `modules/dog/types`, `modules/adoption/types` 등에 위치)
```ts
interface Shelter {
  id: string;
  name: string;
  address: string;
  dogCount: number;
  mapId: string;
}

interface DogPersonality {
  playfulness: number;   // 0~1, 높을수록 RUN/TAIL_WAG·공 추적 빈도 증가
  sociability: number;   // 0~1, 높으면 TAIL_WAG, 낮으면 BACK_OFF
  energy: number;        // 0~1, 높으면 WALK/RUN, 낮으면 SIT/LIE_DOWN
  likesBall: boolean;    // false면 공놀이 이벤트 무시
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  spriteKey: string;
  personality: DogPersonality;
}

interface ObservationRecord {
  date: string; // ISO 8601 date
  note: string;
  tags: string[];
}

interface DogObservation {
  dogId: string;
  records: ObservationRecord[];
}

interface ChatReply {
  reply: string;
  emotion: string;          // TODO: 백엔드와 emotion enum 값 목록 확정 필요
  unknownQuestion: boolean;
}

interface DogProfile {
  dogId: string;
  name: string;
  photos: string[];
  introduction: string;
  vaccinated: boolean;
  neutered: boolean;
  availableFrom: string; // ISO 8601 date
}

interface AdoptionChecklist {
  userId: string;
  dogId: string;
  items: Record<string, boolean>; // TODO: 항목 스키마 확정 필요 (입양 서류 플로우 미정)
  memo: string;
}
```

## (확인 필요)
- `emotion` 값의 전체 목록 (백엔드 프롬프트 스펙 확인)
- `adoption_checklists.items`의 실제 체크리스트 항목 스키마
