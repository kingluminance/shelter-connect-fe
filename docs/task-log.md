# 작업 로그

백엔드 레포([HANN-Creator/shelter-connect](https://github.com/HANN-Creator/shelter-connect))가 PR·커밋에
`[B-14]`, `[Q-02]`처럼 작업 ID를 붙이는 방식을 이 레포에도 적용한 것. `F-XX`(Frontend) 접두사, 순서대로
번호를 매긴다. 새 작업을 시작할 때 이 표에 다음 번호로 한 줄 추가하고 커밋·PR 제목에 그 ID를 붙인다
([CLAUDE.md](../CLAUDE.md) 참고).

| ID | 내용 | PR | 상태 |
|---|---|---|---|
| F-01 | 초기 프로젝트 세팅 (RN + iOS 빌드, CLAUDE.md/docs 뼈대) | - | ✅ |
| F-02 | 실제 배포 백엔드 연동 (강아지·행동 fetch) + 보호소 선택 화면 | [#1](https://github.com/kingluminance/shelter-connect-fe/pull/1) | ✅ |
| F-03 | 강아지 스프라이트(placeholder 원 → 도트) + 깊이 정렬 버그 수정 + 행동별 애니메이션 | [#2](https://github.com/kingluminance/shelter-connect-fe/pull/2) | ✅ |
| F-04 | 공놀이(ballPlay) 미니게임 | - | 🔜 PR 대기 (`feature/ball-play`) |
| F-05 | 강아지 채팅 — "PUPPY CONNECT" 게임기 UI, 실제 백엔드 대화 API 연동 | [#3](https://github.com/kingluminance/shelter-connect-fe/pull/3) | ✅ |
| F-06 | 로그인 화면 (이메일/비밀번호, Supabase Auth SDK 직접 호출) | - | 🚧 진행 중 (`feature/login-screen`) |
