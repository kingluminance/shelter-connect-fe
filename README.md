# 보호소 커넥트 — Frontend (shelter-connect-fe)

도트 강아지와 대화하며 알아가는 입양 서비스, React Native 프론트엔드.
기획/아키텍처 컨텍스트는 [docs/](./docs/project-overview.md) 참고.

## 스택
- React Native 0.87 (bare CLI, TypeScript) — Android + iOS
- `@shopify/react-native-skia` + `react-native-reanimated` v4 — 운동장 게임 화면
- `@react-navigation/native` (native-stack)
- REST API — 실제 배포된 [Spring Boot 백엔드](https://github.com/HANN-Creator/shelter-connect)
  (`https://shelter-connect-dev.onrender.com`) — `src/shared/lib/apiClient.ts`
- 로그인은 `@supabase/supabase-js`로 FE가 직접 처리 — `src/shared/lib/supabase.ts` ([docs/auth.md](./docs/auth.md))

## 시작하기

```sh
npm install
cp .env.example .env   # SUPABASE_ANON_KEY는 백엔드팀에게 받아서 채워야 함 (API_BASE_URL은 기본값이 배포 서버)
```

### iOS
전체 Xcode(Command Line Tools만으로는 빌드 불가) 필요 — App Store에서 설치 후:
```sh
cd ios && pod install && cd ..
npm run ios
```

### Android
Android Studio + SDK 필요 (`brew install --cask android-studio` 또는 공식 설치 프로그램).
설치 후 `ANDROID_HOME`을 셸 프로필에 등록하고:
```sh
npm run android
```

## 폴더 구조 및 아키텍처 규칙
[docs/project-overview.md](./docs/project-overview.md) 참고 — `modules/*` 도메인 격리, `game/core`는
RN 전용 API 직접 의존 금지 등.

## 문서
- [project-overview.md](./docs/project-overview.md) — 서비스 개요, 폴더 구조, MVP 범위
- [api-conventions.md](./docs/api-conventions.md) — 백엔드 REST 계약
- [data-model.md](./docs/data-model.md) — 응답 DTO 타입
- [auth.md](./docs/auth.md) — 로그인/토큰 흐름
- [game-architecture.md](./docs/game-architecture.md) — 운동장 게임 모듈 상세
