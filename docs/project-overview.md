# 보호소 커넥트 (shelter-connect-fe) — 프로젝트 개요

> Source: Obsidian `projects/dog-adoption/보호소-커넥트-인덱스.md`, `서비스-기획.md`, `결정-기록.md`

## 서비스 개요
도트(픽셀아트) 강아지와 먼저 대화하며 성격/습관을 알아간 뒤에야 실제 사진과 프로필을 보여주는
입양 서비스. 이 레포는 **프론트엔드(React Native, Lumina 담당)** 전용.

**역할 분담:** 백엔드 — 지한 (Spring Boot, 별도 레포) / 프론트엔드 — Lumina (이 레포)

## 사용자 흐름 (6단계)
1. 보호소 선택 — 가까운 보호소 고르기
2. 운동장 입장 — 도트 캐릭터로 맵 진입
3. 강아지 만나기 — 자율 이동 중인 도트 강아지에게 다가가기
4. 대화하기 — 관찰 기록 기반 grounded chat (LLM)
5. 프로필 보기 — 대화 후 "직접 만나볼래요?" 버튼으로 실제 사진+소개서
6. 입양 준비 — 체크리스트 + 가족 구성/돌봄 계획 메모

## 기술 스택
| 영역 | 선택 |
|---|---|
| 플랫폼 | React Native — Android + iOS 우선 (bare CLI), 추후 RN Web 확장 |
| 게임 렌더러 | `@shopify/react-native-skia` + `react-native-reanimated` |
| 네비게이션 | `@react-navigation/native` (native-stack) |
| 백엔드 통신 | REST — Spring Boot API (Supabase Auth/PostgreSQL은 백엔드 뒤에 있음, FE는 직접 연결 안 함) |
| 인증 | 백엔드 `/auth/login`을 통한 Supabase Auth — 토큰은 FE가 AsyncStorage에 저장 |
| 상태머신 | 강아지 자율 행동 — 순수 로직, 성격 파라미터 가중치 |

## 폴더 아키텍처
FSD 전체 적용은 보류 (게임 렌더링 패러다임 충돌 + 1인 프론트 개발 규모 대비 이점 적음).
**도메인별 응집(`modules/도메인`) + game 모듈만 예외적으로 격리.**

```
src/
├── app/                # 앱 루트, 네비게이션
├── modules/
│   ├── auth/            (screens, api, types)
│   ├── dog/              (screens, api, types, components) — 보호소/강아지 목록, 프로필
│   ├── adoption/         (screens, api, types) — 입양 체크리스트
│   ├── profile/           (screens, api) — 내 정보
│   └── game/                          # 예외 취급, 거의 독립 패키지
│       ├── GameScreen.tsx
│       ├── core/                       # 순수 Skia+Reanimated, RN API 직접 의존 금지
│       │   ├── entities/
│       │   ├── systems/                # movement, stateMachine, ballPlay, collision
│       │   └── assets/
│       └── input/                      # 플랫폼별 입력 (터치 → 추후 웹 마우스/키보드)
└── shared/
    ├── ui/
    ├── lib/               # apiClient.ts 등
    └── types/
```

**핵심 규칙**
1. `modules/*`끼리 직접 참조 금지 (필요시 타입만)
2. `shared`는 누구나 참조 가능
3. `game/core`는 `modules/dog`의 타입만 참조 가능, RN 전용 API(`Platform.OS`, `Dimensions` 등) 직접 호출 금지 → 웹 이식성 확보
4. 이미지는 Skia `useImage`로만 로드 (RN `Image`/`require()` 직접 사용 금지) — 웹 CanvasKit 호환

## 이번 버전(MVP) 범위
| 기능 | 이번 | 나중 |
|---|---|---|
| 보호소 선택 / 운동장 맵 / 강아지 자율 이동 / 대화(관찰 기록 기반) / 프로필 / 입양 체크리스트 UI | ✅ | |
| 실제 로그인·권한 검증, 입양 신청→서류 제출 연결, 대화 영속 저장, 보호소 등록 정책, RN Web 확장 | | 나중 |

## 관련 컨텍스트 파일
- [api-conventions.md](./api-conventions.md) — 백엔드 REST 계약 (10개 엔드포인트)
- [data-model.md](./data-model.md) — 응답 DTO 타입
- [auth.md](./auth.md) — 로그인/토큰 흐름
- [game-architecture.md](./game-architecture.md) — 게임 모듈 상세 (화면/애니메이션/상태머신)

## (확인 필요 — Obsidian TODO에서 미결)
- 성격 파라미터 스키마 최종 확정 (백엔드팀 확인)
- 스프라이트시트 규격 (프레임 크기/수/배치) — 그래픽 담당자 조율
- 맵 에셋 형태 (낱개 타일 vs Tiled 타일셋)
- 입양 서류 플로우 상세
