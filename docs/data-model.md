# 데이터 모델 — 실제 백엔드 기준

> Source: [HANN-Creator/shelter-connect](https://github.com/HANN-Creator/shelter-connect) `docs/data-model.md`,
> `docs/dog-behavior-api.md` — **이전 버전(Obsidian 초안 — playfulness/sociability/energy 성격 모델)은
> 실제 백엔드 구현과 다름, 대체함.**
> FE 타입 소스: [`src/modules/dog/types.ts`](../src/modules/dog/types.ts) — 여기 문서는 그 요약.

## 백엔드 테이블 (참고 — FE는 REST로만 접근, 직접 쿼리 안 함)
| 테이블 | 담는 내용 |
|---|---|
| `app_users` | 사용자, 운영자, 외부 인증 식별자 (비밀번호/이메일 저장 안 함) |
| `shelters` / `shelter_memberships` | 보호소 정보·승인·공개 상태 / 소속·담당 권한 |
| `dogs` | 도트 프로필, 입양 상태, `avatar_key` |
| `dog_observations` | 실제 관찰 기록 (DRAFT→CONFIRMED→RETRACTED) |
| `dog_photos` | 사진 저장 경로·사용 허가 (현재 FE 미사용, `PHOTO_STORAGE_ENABLED=false`) |
| `dog_behavior_profiles` / `dog_behavior_evidence` | 8종 동작 설정 + 관찰 근거 |
| `chat_sessions` / `chat_messages` | 사용자-강아지 대화 (현재 FE 미사용, `AI_ENABLED=false`) |
| `adoption_notes` | 입양 전 개인 메모 (현재 FE 미사용) |

## FE TypeScript 타입 (실제 소스: [`src/modules/dog/types.ts`](../src/modules/dog/types.ts))

```ts
interface Shelter {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  mapKey: string;     // 게임 맵 에셋 선택 키 (예: "sunny")
  dogCount: number;   // 공개 탐색에 노출된 강아지 수 (전체 보호 마릿수 아님)
}

interface ShelterDetail extends Shelter {
  address: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
}

type AdoptionStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'ADOPTED' | 'PAUSED';

interface DogSummary {
  id: string;
  shelterId: string;
  name: string;
  species: 'DOG';           // 첫 버전은 강아지 전용
  adoptionStatus: AdoptionStatus;
  avatarKey: string;        // 도트 에셋 선택 키 (예: "bomi", "dubu", "kongi", "bami")
  traitLabels: string[];    // 보호소가 작성한 소개 태그, 최대 8개
}

interface DogProfile extends DogSummary {
  sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
  breed: string | null;
  birthDate: string | null;             // 저장 기준값, 실제 생일 아님 (아래 표 참고)
  birthDatePrecision: 'UNKNOWN' | 'YEAR' | 'MONTH' | 'DAY';
  birthDateEstimated: boolean | null;
  weightKg: number | null;
  neutered: boolean | null;             // true 완료 / false 미실시 / null 미확인
  introduction: string | null;
}
```

생일 표시 규칙 — `birthDate`를 실제 날짜로 오해하지 말 것:

| 저장 | 화면 표시 |
|---|---|
| `null` / `UNKNOWN` / `null` | "생일을 아직 몰라요" |
| `2022-01-01` / `YEAR` / `true` | "2022년생 추정" |
| `2022-07-01` / `MONTH` / `true` | "2022년 7월생 추정" |
| `2022-07-28` / `DAY` / `false` | "2022년 7월 28일" |

### 강아지 행동 설정 (게임 화면의 자율 행동을 구동하는 실제 데이터)

```ts
type DogActionKey = 'IDLE' | 'WALK' | 'RUN' | 'SNIFF' | 'TAIL_WAG' | 'BACK_OFF' | 'SIT' | 'LIE_DOWN';

interface DogActionSetting {
  weight: number;              // 0~100, 상대 선택 비중. 0이면 해당 동작 사용 안 함
  speedTilesPerSecond: number; // 0~6, "맵 1타일/초" 단위 이동 속도 (애니메이션 FPS 아님)
  minDurationMs: number;       // 500~30,000
  maxDurationMs: number;       // 500~60,000, min 이상
  cooldownMs: number;          // 0~120,000, 종료 후 재선택까지 대기
}

interface DogBehaviorSettings {
  actions: Record<DogActionKey, DogActionSetting>;
  approachDistanceTiles: number;  // 방문자가 이 반경에 들어오면 접근 고려 (0=자발적 접근 없음)
  personalSpaceTiles: number;     // 이보다 가까우면 BACK_OFF 고려 (approachDistanceTiles 이하)
  reactionDelayMs: number;        // 방문자 반응 전 대기 시간
  ballPlay: { chaseEnabled: boolean; returnEnabled: boolean; reactionDelayMs: number };
}

interface DogBehavior {
  dogId: string;
  schemaVersion: number;
  basis: 'CONFIRMED' | 'DEFAULT'; // 보호소가 확인 안 했으면 DEFAULT (안전한 기본값)
  revision: number | null;
  settings: DogBehaviorSettings;
}
```

**규칙**: IDLE/WALK 비중은 각 1 이상, WALK/RUN/BACK_OFF만 속도 0보다 큼(나머지 5종은 0이어야 함),
RUN은 WALK 이상 속도. **TAIL_WAG/BACK_OFF는 자율 배회 풀에 포함되지 않고 방문자 근접 반응으로만
진입** — `src/modules/game/core/systems/dogStateMachine.ts` 구현 시 이 부분에서 실제로 버그가
났었음(자율 풀에 잘못 섞여서 `reactionDelayMs`를 건너뜀), 테스트로 잡아서 고침.

기본값(보호소 미확인 시): IDLE 70 / WALK 30 / 나머지 0, 접근·거리 0(반응 없음), 속도 WALK 0.8/RUN 1.8/
BACK_OFF 0.6, 유지 2~5초·재선택 대기 2초·반응 대기 1초, 공놀이 꺼짐.

## (확인 필요)
- `speedTilesPerSecond` 등 "타일" 단위의 실제 픽셀 환산값 — 현재 FE는 24 map-units/tile로 임의 가정
  (`TILE_SIZE_MAP_UNITS` in dogStateMachine.ts), 백엔드/그래픽 담당자와 확정 필요
- `mapKey`("sunny"/"forest") ↔ FE 맵 에셋 폴더명(`01-sunny-meadow`/`02-woodland-trail`) 매핑 확정
- `avatarKey` ↔ 실제 강아지 스프라이트 매핑 (스프라이트 자체가 아직 없음)
