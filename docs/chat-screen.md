# 강아지 대화 화면 — "PUPPY CONNECT"

> 위치: `src/modules/dog/ChatScreen.tsx` + `hooks/useDogChat.ts` + `api/chat.ts`
> 디자인 출처: HANN-Creator/shelter-connect `work/mobile-concept/pet-chat-section.html` +
> `pet-chat.css` — 실제 브라우저로 렌더링해서 확인한 게임기(Game Boy) 모양 UI를 RN View/Text로 재구현.
> 성격 파라미터(playfulness 등) 기반 대화는 옛날 옵시디언 초안이고 실제로는 안 씀 — `결정-기록.md`에
> "대화 파트는 실시간 LLM(GPT-5.6-luna) 확정"으로 이미 정리돼 있음.

## API 계약 (실제 배포 백엔드)
[chat-storage-api.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/chat-storage-api.md) (B-06) +
[grounded-chat-api.md](https://github.com/HANN-Creator/shelter-connect/blob/main/docs/grounded-chat-api.md) (B-07):

1. `POST /v1/dogs/{dogId}/chat-sessions` — OPEN 세션 재사용 또는 새로 생성
2. `POST /v1/chat-sessions/{sessionId}/messages` — 사용자 메시지 저장 (PENDING으로 응답)
3. `POST /v1/chat-sessions/{sessionId}/messages/{messageId}/reply` — **이 요청 안에서 최대 30초 AI 호출을
   기다린 뒤 완료된 답변을 그대로 반환** — 별도 폴링·SSE 없음. `useDogChat.send()`가 2번→3번을 순서대로 호출.
4. `GET /v1/chat-sessions/{sessionId}/messages` — 히스토리 (대화 수첩용)

## 화면 구성 (프로토타입 그대로)
- 노란 게임기 케이스 + 핑크 베젤, 강아지 도트 스프라이트(`game/core/assets/dog/dogWalkAtlas.ts` 재사용 —
  화면이 다른 도메인의 렌더링 유틸을 가져다 쓰는 것도 CLAUDE.md의 "화면은 도메인 조합 지점" 예외로 취급)
- 대사창: 마지막 질문 + 최신 답변
- 빠른질문 3종(산책/혼자 있을 때/처음 만날 때) + 자유 텍스트 입력
- "보호소에 확인할 질문으로 담기" — `needsShelterConfirmation: true`인 답변에만 노출, **로컬 state에만
  저장**(백엔드에 저장 API 없음 — 프로토타입도 세션 내 메모리에만 들고 있던 방식 그대로)
- 대화 수첩 접이식 — 전체 히스토리
- 완료된 답변이 하나라도 오면 "이제 내 모습도 만나볼래?" → "사진으로 만나기" 버튼이 뜨고, 어시스턴트
  답변 전체(`knownFacts`)와 저장해둔 질문(`pendingQuestions`)을 들고 `Profile` 화면으로 이동한다
  (상세는 [profile-screen.md](./profile-screen.md))

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
