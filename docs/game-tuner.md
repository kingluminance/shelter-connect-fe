# 게임 튜너 — 스프라이트 크기 · 충돌 구역을 눈으로 맞추는 도구

`tools/game-tuner/index.html` — 브라우저에서 드래그로 조절하고, 결과를 **코드에 붙여넣을 값**으로 뽑아 주는 단독 HTML(빌드 불필요).
맵(`01-sunny-meadow`)·소품·강아지/플레이어 스프라이트를 실제 에셋으로 그리고, 게임과 같은 충돌 규칙(`core/systems/movement.ts`의
`stepMovement`)으로 걸어 볼 수 있다.

## 열기
```sh
npm run tuner                 # tools/game-tuner/data.js 를 현재 코드의 값·layout.json 으로 다시 생성
open tools/game-tuner/index.html   # 더블클릭해도 됨 (서버 필요 없음)
```
상수나 `layout.json`을 바꾼 뒤에는 `npm run tuner`를 다시 돌린다(툴이 코드의 현재 값으로 시작하도록).
작업 내용은 브라우저 `localStorage`에 저장되고, "처음 값으로 되돌리기"로 코드 값으로 리셋한다.

## 쓰는 법
- **강아지(발 위치)·플레이어**: 드래그해서 옮김. **사람 충돌원(주황)은 가운데 마름모를 끌면 위치(그림은 그대로 두고 원만 이동 → `PLAYER_SPRITE_OFFSET`), 오른쪽 점을 끌면 크기(`PLAYER_RADIUS`)**가 바뀐다(슬라이더도 있음). 초록 사각형 = 강아지가 플레이어를 막는 영역, 주황 원 = 플레이어 충돌, 파랑 점선 = 강아지 이동 충돌
- **스프라이트 위치·크기**: 강아지(보라)·사람(분홍) 점선 상자의 **왼쪽 위 ✥를 끌면 그림 위치**(`DOG_SPRITE_OFFSET` / `PLAYER_SPRITE_OFFSET`), **오른쪽 아래 네모를 끌면 크기**(`DOG_DISPLAY_SIZE` / `PLAYER_DISPLAY_SIZE`). 강아지는 발 기준점이 고정이라 상자 가운데(가로)를 축으로 커진다. 슬라이더로도 조절
- **빨간 사각형(맵 충돌 `obstacles`)**: 클릭 선택 → 드래그 이동, 모서리·변 핸들로 크기, `Delete` 삭제, 방향키 1칸 이동, 숫자 입력(x/y/w/h), 복제.
  "＋ 충돌 구역 그리기"는 드래그로 새 사각형. 스냅(1·2·4·8)과 되돌리기(⌘Z) 지원
- **▶ 걸어서 테스트**: WASD/방향키(+Shift 달리기)로 플레이어를 걸어 충돌 확인. 사각형 안에 끼면 경고
- **오른쪽 값**: 강아지/플레이어 크기, 충돌 반지름·높이, 말 걸기·공놀이 거리(점선 원으로 표시), 폰 화면 범위(`VIEWPORT_MAP_UNITS`)
- 마우스 휠 = 확대/축소, 빈 곳 드래그 = 화면 이동

## 코드에 반영
아래 "내보내기" 칸에 파일별로 나뉜 줄이 나온다 — 주석에 적힌 파일에서 같은 이름의 줄을 바꿔 붙이면 된다:
`GameScreen.tsx`(`DOG_DISPLAY_SIZE`, `DOG_SPRITE_OFFSET`, `DOG_COLLISION_RADIUS`/`_Y_OFFSET` 비율, `PLAYER_RADIUS`, `PLAYER_DISPLAY_SIZE`, `PLAYER_SPRITE_OFFSET`, `TALK_RANGE`, `VIEWPORT_MAP_UNITS`),
`dogStateMachine.ts`(`DOG_RADIUS`), `ballPlay.ts`(`ENGAGE/LEAVE/RECEIVE_DISTANCE`, `THROW_RANGE`).
충돌 구역은 **layout.json 내려받기**로 받은 파일을 `src/modules/game/core/assets/maps/01-sunny-meadow/map/layout.json`에 덮어쓴다.

## 한계
- 지금은 1번 맵(`sunny-meadow`)만. 다른 맵은 `scripts/gen-game-tuner-data.mjs`의 `MAP` 경로를 바꿔 생성
- 강아지 그림은 정면(DOWN) 대기 프레임 1장으로 보여 줌(걷기 애니메이션은 안 그림)
- 공을 문 위치(`mouthPoint`)·손 위치(`HAND_OFFSET`) 같은 값은 아직 튜너에 없음
