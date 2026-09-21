# 게임 모듈 아키텍처 — 운동장 화면

> Source: Obsidian `projects/dog-adoption/화면과-사용자-흐름.md`, `강아지-입양-서비스-기획.md`, `결정-기록.md`
> 위치: `src/modules/game/` — `core/`는 RN 전용 API 의존 금지 (웹 이식성)

## 렌더링
`@shopify/react-native-skia` + `react-native-reanimated`. GPU 가속, Reanimated shared value와
직접 연동되어 UI 스레드에서 60fps 목표. 이미지는 Skia `useImage`로만 로드 — RN `Image`/`require()` 금지.

## 이동 규칙
- 조이스틱(모바일) / 방향키·WASD(PC)로 캐릭터 이동
- Shift(PC) / 조이스틱 끝까지(모바일): 달리기
- 10초 정지 시 앉기(SIT) 모션 자동 전환
- 맵 경계: 초기엔 단순 Rect, 추후 Tiled JSON 타일맵으로 확장

## 강아지 8종 애니메이션 상태
| 상태 | 설명 | 트리거 |
|---|---|---|
| IDLE | 가만히 서 있음 | 기본 상태 |
| WALK | 걷기 | 랜덤 이동 |
| RUN | 뛰기 | 빠른 이동 (활발한 성격) |
| SNIFF | 코 킁킁 | 바닥 냄새 맡기 |
| TAIL_WAG | 꼬리 흔들기 | 플레이어 근접 시 |
| BACK_OFF | 뒷걸음질 | 낯선 상황 / 소심한 성격 |
| SIT | 앉기 | 10초 정지, 또는 확률적 |
| LIE_DOWN | 눕기 | 장시간 정지 또는 게으른 성격 |

스프라이트시트: 8 프레임 × 방향(좌/우 최소), 250ms/프레임. **정확한 프레임 크기/수는 확인 필요.**

## 행동 파이프라인
```
관찰 기록 (JSON) → 성격 파라미터 추출 (data-model.md의 DogPersonality)
    ↓
상태머신 초기화 (playfulness, sociability, energy 등)
    ↓
매 틱(tick)마다 전환 확률 계산
    ↓
Skia 캔버스에 스프라이트 렌더
```

구현 위치: `src/modules/game/core/systems/stateMachine.ts`, `movement.ts`

## 공놀이(공 물어오기) 상태 흐름
```
IDLE/WALK
  → BALL_THROWN (유저가 공 던지기 버튼 탭)
  → CHASING (공 좌표로 이동)
  → GRABBING (무는 모션)
  → RETURNING (유저에게 복귀)
  → DROPPING (내려놓기)
  → IDLE
```
- `likesBall: false` 강아지는 이벤트 무시 → IDLE 유지
- `playfulness` 높을수록 추적 속도 빠름, 회수 후 재촉 모션 추가
- 구현 위치: `src/modules/game/core/systems/ballPlay.ts` (이동은 `movement.ts` 재사용)
- 모바일: 탭 버튼으로 공 던지기 (PC 프로토타입의 E키 대응)

## 맵
3종 맵 에셋 확보 완료 (`src/modules/game/core/assets/maps/`) — 낱개 타일 PNG + JSON 배치 방식
(Tiled 아님). 각 맵 폴더: `map/ground.png`(바닥 전체), `map/layout.json`(bounds/spawn/강아지 자리
6개/장애물 rect/오브젝트 배치), `animations/{water,grass,reeds}`(8프레임/250ms 시트),
`props/*.png`(개별 사물 투명 PNG). 640×640px, nearest 스케일링 확인됨.
맵별 `require()` 매핑은 `src/modules/game/core/assets/maps/<name>.ts` — 손으로 고치지 말고
`scripts/gen-map-assets.mjs`로 재생성 (Metro가 `require()`를 정적으로 분석해야 해서 동적 경로 불가).

**이번 버전 구현 대상은 여전히 `sunny-meadow`(햇살 운동장) 1개.** 나머지 두 맵(`woodland-trail`,
`lakeside-retreat`)은 에셋만 들어와 있고 화면 연결은 나중 버전.

**GameScreen 현재 상태(`src/modules/game/GameScreen.tsx`)**: `ground.png` 정적 렌더 + 조이스틱으로
움직이는 원(placeholder) 플레이어. `layout.json`의 bounds/obstacles로 충돌 처리(`movement.ts`).
아직 안 한 것: water/grass/reeds 애니메이션 재생, props 레이어 렌더(깊이 정렬), 강아지 캐릭터/상태머신.

## 대화 AI
이동/행동 시스템과 달리 대화 부분에만 실제 LLM(GPT-5.6-luna) 호출 — 관찰 기록 기반 grounded chat.
실시간 이동에는 LLM 미사용(지연/비용). 연동은 `POST /chat/{dogId}` (docs/api-conventions.md).

## (확인 필요)
- 강아지 캐릭터 스프라이트시트 프레임 크기/배치 — 맵 에셋은 확보됐지만 강아지 캐릭터는 아직 없음
