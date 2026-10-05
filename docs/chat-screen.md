# 강아지 대화 화면 — "PUPPY CONNECT"

> 위치: `src/modules/dog/ChatScreen.tsx` + `console/*` + `hooks/useDogChat.ts` + `api/chat.ts`
> 디자인 출처: `puppy-profile.html`(하늘색 투명 게임기 케이스 + 보라 버튼, 2026-10 새 디자인). 이전 노란 게임기
> (HANN-Creator/shelter-connect `pet-chat-section.html`) 구현은 이 디자인으로 **대체**됐다. 케이스 이미지는
> `assets/console-shell.webp`(510×1046), 좌표(LCD·버튼 %)는 `console/layout.ts`가 HTML CSS 값을 그대로 담는다.
> 성격 파라미터 기반 대화는 옛날 옵시디언 초안이고 실제로는 안 씀 — `결정-기록.md`에
> "대화 파트는 실시간 LLM(GPT-5.6-luna) 확정"으로 이미 정리돼 있음.

## API 계약 (실제 배포 백엔드)
[chat-storage-api.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/chat-storage-api.md) (B-06) +
[grounded-chat-api.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/grounded-chat-api.md) (B-07):

1. `POST /v1/dogs/{dogId}/chat-sessions` — OPEN 세션 재사용 또는 새로 생성
2. `POST /v1/chat-sessions/{sessionId}/messages` — 사용자 메시지 저장 (PENDING으로 응답)
3. `POST /v1/chat-sessions/{sessionId}/messages/{messageId}/reply` — **이 요청 안에서 최대 30초 AI 호출을
   기다린 뒤 완료된 답변을 그대로 반환** — 별도 폴링·SSE 없음. `useDogChat.send()`가 2번→3번을 순서대로 호출.
4. `GET /v1/chat-sessions/{sessionId}/messages` — 히스토리 (대화 수첩용)

## 화면 구성 ("PUPPY CONNECT" 콘솔)
- **케이스**: 이미지(Skia `useImage`) 위에 인쇄된 버튼 자리마다 투명 `Pressable`(최소 44pt). D-pad ↑←/↓→ = 주제 이동(순환),
  **A** 대화하기(주제 질문이 아직 없으면 `send(prompt)` 후 대화창 열기), **START** 이어 말하기(보내지 않고 열기),
  **B** 돌아가기(대화창 닫기 → 없으면 `goBack`), **SELECT** 프로필(`Profile` 라우트, 소개서). 좌상단 ← 버튼도 같은 동작
- **LCD**: 이름 + "{보호소}의 친구" + 하트(`useDogSaved`, 저장 토스트), 정원(말풍선 · 강아지 스프라이트 — `dogWalkAtlas` 재사용),
  주제 칩 3개(산책/혼자/첫 만남, `console/topics.ts`) + "A …" 힌트(이미 물어본 주제는 "다시 보기")
- **대화창**(케이스 위 오버레이): 제목줄(×) · 연락처 · 주제 칩 · 메시지(강아지=하늘색/나=분홍, 전송 중 …, 실패 시 "다시 시도") · 입력 ·
  상태줄. `needsShelterConfirmation` 답변엔 "보호소에 확인할 질문으로 담기"(로컬 state, 백엔드 저장 API 없음)
- 키보드: iOS는 키보드 높이만큼 대화창 높이를 줄여 입력창이 가려지지 않게 한다(Android는 `adjustResize`)
- "대화 수첩"은 대화창이 대체. 앱 홈 오버레이·프로필 종이 보드(③)는 이번 범위 아님(프로필은 후속 작업, 성향정보는 API에 없어 숨김)

## 진입점
`GameScreen.tsx`에서 강아지 40map-unit 이내 접근 시 "말 걸기" 버튼 → `Chat` 라우트로 이동
(`{dogId, dogName, identityIndex}`, 공놀이 던지기 버튼과 같은 근접-감지 패턴).

## 알려진 제약 (테스트 전 필수 확인)
- **로그인 구현됨**: `LoginScreen`(이메일/비밀번호, Supabase Auth SDK 직접 호출, [#4](https://github.com/kingluminance/shelter-connect-fe/pull/4))
  + 실제 `SUPABASE_ANON_KEY`가 `.env`에 설정됨. 토큰 없이 대화 API를 부르면 여전히 서버가
  `401 UNAUTHENTICATED`를 반환하고 `useDogChat`이 `status: 'error'`로 빠지지만, 이제 화면에서
  "로그인하기" 버튼으로 이동 → 로그인 후 돌아오면 같은 화면이 포커스를 다시 받아 세션을 재오픈한다
  (`useFocusEffect` 기반, [#6](https://github.com/kingluminance/shelter-connect-fe/pull/6)) — 예전처럼
  이전 에러가 남아있지 않음.
- **`AI_ENABLED` 서버 설정 여부(확인 필요)**: 꺼져 있으면 로그인이 됐어도 `/reply`가
  `503 AI_NOT_CONFIGURED`를 반환하고 `sendError`로 표시됨. 실제로 꺼져 있는지는 이번 턴에 재확인하지
  않음 — 대화 테스트 시 이 실패가 뜨면 백엔드 설정 문제인지부터 확인할 것.

## 테스트
`clientId.test.ts` — 메시지 idempotency 키(`clientMessageId`) 생성 포맷만 검증. `useDogChat`
자체는 네트워크 orchestration이 대부분이라 별도 단위 테스트 없음 — API 함수는 얇은 fetch 래퍼.
