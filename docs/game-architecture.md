# 게임 모듈 아키텍처 — 운동장 화면

> Source: Obsidian `projects/dog-adoption/화면과-사용자-흐름.md`, `강아지-입양-서비스-기획.md`, `결정-기록.md` +
> 실제 배포된 백엔드 [HANN-Creator/shelter-connect](https://github.com/HANN-Creator/shelter-connect) `docs/dog-behavior-api.md`
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

## 행동 파이프라인 (실제 백엔드 연동 완료)

강아지 자율 행동은 **더 이상 FE가 만든 성격 모델이 아니라 백엔드가 계산한 값을 그대로 재생**한다.
```
GET /v1/shelters/{id}/dogs → 강아지 목록 (useShelterDogs.ts)
    ↓
GET /v1/dogs/{id}/behavior → 8종 액션별 weight/속도/지속시간/쿨다운 (docs/data-model.md의 DogBehaviorSettings)
    ↓
매 틱(tick)마다: 방문자 근접 시 TAIL_WAG/BACK_OFF 반응(reactionDelayMs 대기),
                 아니면 쿨다운 안 걸린 액션 중 weight 가중 랜덤 선택
    ↓
Skia 캔버스에 렌더 (아직 placeholder 원 — 강아지 스프라이트 없음)
```

구현 위치: `src/modules/game/core/systems/dogStateMachine.ts`(순수 로직, `modules/dog/types.ts`의
`DogBehaviorSettings` 타입만 참조) + `src/modules/dog/hooks/useShelterDogs.ts`(API 페칭, `GameScreen.tsx`가
사용 — 화면 레벨에서 도메인 모듈을 조합하는 것은 module 격리 규칙의 예외로 취급, CLAUDE.md 참고).
**TAIL_WAG/BACK_OFF는 자율 배회 후보에서 반드시 제외**하고 근접 반응 경로로만 진입해야 함 — 처음
구현할 때 섞여 들어가서 `reactionDelayMs`를 무시하는 버그가 났고, 테스트로 잡아서 고침
(`dogStateMachine.test.ts`). LIE_DOWN은 weight 0이면 자연히 재생 안 됨(백엔드 기본값 그대로).

## 공놀이(공 물어오기)
`DogBehaviorSettings.ballPlay`(`chaseEnabled`/`returnEnabled`/`reactionDelayMs`)로 백엔드가 이미 필드를
내려주지만, FE에 공 던지기 UI/충돌 로직 자체가 아직 없어 미구현. 기본값은 꺼짐(`chaseEnabled: false`).
- 구현 위치(예정): `src/modules/game/core/systems/ballPlay.ts` (이동은 `movement.ts` 재사용)
- 모바일: 탭 버튼으로 공 던지기 (프로토타입의 E키 대응)

## 맵
3종 맵 에셋 확보 완료 (`src/modules/game/core/assets/maps/`) — 낱개 타일 PNG + JSON 배치 방식
(Tiled 아님). 각 맵 폴더: `map/ground.png`(바닥 전체), `map/layout.json`(bounds/spawn/강아지 자리
6개/장애물 rect/오브젝트 배치), `animations/{water,grass,reeds}`(8프레임/250ms 시트),
`props/*.png`(개별 사물 투명 PNG). 640×640px, nearest 스케일링 확인됨.
맵별 `require()` 매핑은 `src/modules/game/core/assets/maps/<name>.ts` — 손으로 고치지 말고
`scripts/gen-map-assets.mjs`로 재생성 (Metro가 `require()`를 정적으로 분석해야 해서 동적 경로 불가).

**이번 버전 구현 대상은 여전히 `sunny-meadow`(햇살 운동장) 1개.** 나머지 두 맵(`woodland-trail`,
`lakeside-retreat`)은 에셋만 들어와 있고 화면 연결은 나중 버전.

**GameScreen 현재 상태(`src/modules/game/GameScreen.tsx`)**: 화면 전체를 채우는 플레이어 추적 카메라,
water/grass/reeds 애니메이션, 깊이 정렬된 props, 플레이어 스프라이트(걷기 애니메이션 + 좌우 반전 —
방향별 아트가 없어서 미러링으로 대체), **실제 배포 서버(`https://shelter-connect-dev.onrender.com`)에서
route params로 받은 shelterId의 강아지+행동 설정을 fetch**해서 그 값으로 자율 행동하는 강아지들
(placeholder 원, 스프라이트 없음) — 로딩/에러 배너 있음(Render 무료 플랜 슬립 시 최대 1분 대기 가능).
**보호소 선택 화면(`src/modules/dog/ShelterListScreen.tsx`)**이 Home으로 붙어서 `GET /v1/shelters` 목록을
보여주고 고른 보호소의 shelterId를 Game 화면에 넘김 — 단, 맵 에셋은 여전히 sunny-meadow 1개뿐이라 어떤
보호소를 골라도 같은 맵이 뜸(`mapKey` 매핑 확정 전까지는 의도된 동작).
아직 안 한 것: 강아지 캐릭터 스프라이트, 공놀이(ballPlay.ts), 강아지-props 깊이 정렬(지금은 props보다
위 레이어), 대화 진입 흐름.

## 대화 AI
이동/행동 시스템과 달리 대화 부분에만 실제 LLM(GPT-5.6-luna) 호출 — 관찰 기록 기반 grounded chat.
백엔드는 이미 구현·검증됨(`grounded-chat-api.md`)이지만 **배포 서버에서 현재 `AI_ENABLED=false`**라 아직
호출 불가. 연동은 [docs/api-conventions.md](./api-conventions.md) 참고.

## (확인 필요)
- 강아지 캐릭터 스프라이트시트 프레임 크기/배치 — 맵 에셋은 확보됐지만 강아지 캐릭터는 아직 없음
- `speedTilesPerSecond` 등 "타일" 단위 ↔ 맵 픽셀 환산값 (현재 24 map-units/tile로 임의 가정)
- `mapKey`("sunny") ↔ FE 맵 폴더명 매핑 (woodland-trail/lakeside-retreat 연결 전까지는 불필요)
