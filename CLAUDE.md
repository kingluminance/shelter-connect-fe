# CLAUDE.md

이 레포에서 작업할 때 참고할 규칙. 기획/아키텍처 상세는 [docs/](./docs/project-overview.md) 참고.

## 프로젝트
보호소 커넥트 — 도트 강아지와 대화하며 알아가는 입양 서비스, React Native 프론트엔드.
백엔드(Spring Boot)는 별도 레포. 이 레포는 REST API만 호출하고 Supabase에 직접 연결하지 않는다
([docs/api-conventions.md](./docs/api-conventions.md)).

## 명령어
```sh
npm start              # Metro
npm run ios            # iOS 시뮬레이터
npm run android        # Android 에뮬레이터
npm run lint            # eslint
npx tsc --noEmit        # 타입 체크
npm test                # jest
cd ios && pod install   # 네이티브 의존성 변경 후
```

## 아키텍처 규칙 ([docs/project-overview.md](./docs/project-overview.md) 상세)
- `src/modules/*` 도메인끼리 직접 참조 금지 (필요시 타입만)
- `src/shared`는 어디서나 참조 가능
- `src/modules/game/core`는 RN 전용 API(`Platform.OS`, `Dimensions` 등) 직접 호출 금지, `modules/dog`의 타입만 참조 가능 — 웹 이식성 유지
- 이미지는 Skia `useImage`로만 로드 (`Image`/`require()` 직접 사용 금지)

## 브랜치 규칙
- `main` — 배포 가능 상태만 유지, 직접 푸시 금지
- 작업 브랜치: `feature/<설명>`, `fix/<설명>`, `chore/<설명>` (예: `feature/shelter-list-screen`)
- 브랜치 하나당 하나의 논리적 변경 단위

## 커밋 규칙
[Conventional Commits](https://www.conventionalcommits.org/) 사용: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
```
feat: 보호소 목록 화면 추가
fix: 강아지 상태머신 전환 확률 버그 수정
```

## PR 규칙
- `main`으로 머지하는 모든 변경은 PR을 통해서만 (직접 push 금지)
- PR 제목은 커밋 컨벤션과 동일한 형식
- 머지 전 필수: `npx tsc --noEmit`, `npm run lint` 통과
- PR 본문에 변경 이유와 테스트 방법 간단히 기재
- game 모듈(`src/modules/game/core`) 변경 시 RN 전용 API 미사용 여부 리뷰에서 확인
- 리뷰 없이 self-merge 지양 — 1인 개발이라도 CI(lint/typecheck) 통과는 머지 조건

## 확인 필요한 미결 사항
[docs/project-overview.md](./docs/project-overview.md) 하단 "확인 필요" 섹션 참고 — 성격 파라미터 스키마,
스프라이트 규격, 입양 서류 플로우 등 백엔드/그래픽 담당자 확인 대기 중.
