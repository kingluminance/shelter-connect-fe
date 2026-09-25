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
| F-04 | 공놀이(ballPlay) 미니게임 | [#7](https://github.com/kingluminance/shelter-connect-fe/pull/7) | ✅ |
| F-05 | 강아지 채팅 — "PUPPY CONNECT" 게임기 UI, 실제 백엔드 대화 API 연동 | [#3](https://github.com/kingluminance/shelter-connect-fe/pull/3) | ✅ |
| F-06 | 로그인 화면 (이메일/비밀번호, Supabase Auth SDK 직접 호출) | [#4](https://github.com/kingluminance/shelter-connect-fe/pull/4) | ✅ |
| F-07 | 강아지 소개서 화면 (사진 언락, 클립보드 디자인) | [#5](https://github.com/kingluminance/shelter-connect-fe/pull/5) | ✅ |
| F-09 | 코드 리뷰 발견 버그 수정 (BACK_OFF 타겟/쿨다운, 채팅 로그인 복귀) | [#6](https://github.com/kingluminance/shelter-connect-fe/pull/6) | ✅ |
| F-10 | 강아지 행동 에셋 8종 v1 원본 자료 추가 (아직 미연동) | [#9](https://github.com/kingluminance/shelter-connect-fe/pull/9) | ✅ |
| F-11 | 채팅 화면을 프로토타입 HTML(pet-chat-section.html)과 픽셀 단위로 맞춤 (lucide 아이콘, real-v1 정원 배경 에셋, 반응형 compact 브레이크포인트) | - | 🔎 리뷰 대기 |

> ⚠️ 이 표의 `F-XX`는 이 레포(프론트) 안에서만 순서대로 매긴 번호다. 노션의 작업 보드가 별도로 쓰는
> `F-XX` 번호(예: 노션 F-06 = 사진/프로필, F-07 = 로그인)와 **우연히 겹치지만 다른 체계**다 — 팀 리뷰
> (2026.09.25)에서 확인. 기존 항목은 히스토리를 다시 쓰지 않고 그대로 두고, 제목·PR 링크로 구분한다.
> 앞으로 새 작업은 노션 쪽과 번호를 맞추는 방향으로 조율 필요 (F-08은 노션 쪽 입양 준비 화면 번호와
> 충돌 가능성이 있어 건너뜀).
