# 강아지 소개서 화면

> 위치: `src/modules/dog/ProfileScreen.tsx` + `hooks/useDogProfile.ts`
> 디자인 출처: HANN-Creator/shelter-connect `work/mobile-concept/shelter-mobile.html`의
> `[data-screen="photo"]` 섹션 — 실제 브라우저로 렌더링해서 확인한 클립보드/폴라로이드 디자인을
> RN View/Text로 재구현 (크림 시트, 점선 구분선, 스티키노트 메모).

## API
- `GET /v1/dogs/{dogId}` — **공개**, 로그인 불필요 (read-api.md). 이름/성별/생일/품종/체중/중성화/소개
- `GET /v1/dogs/{dogId}/photos` — **로그인 + 이 강아지와의 COMPLETED 답변 1개 이상 필요**
  (photo-read-api.md). 조건 미충족이면 `401 UNAUTHENTICATED` / `403 ACCOUNT_NOT_REGISTERED` /
  `403 PHOTO_LOCKED` — `useDogProfile`이 이 세 코드를 전부 "잠김"(`status: 'locked'`)으로 취급해서
  에러 배너 대신 "대화를 나눈 뒤에 열려요" 안내를 보여줌. 서명 URL은 **60초**만 유효 — 화면 재진입 시
  매번 새로 fetch.

## 생일 표시
`birthDate`는 실제 날짜가 아니라 저장 기준값 — `src/modules/dog/birthDate.ts`의 `formatBirthDate()`가
`docs/data-model.md`의 표(정밀도 UNKNOWN/YEAR/MONTH/DAY × 추정 여부)를 그대로 구현. 단위 테스트
(`birthDate.test.ts`)로 5가지 케이스 확인.

## 화면 구성
- 도트 모습(강아지 스프라이트, `game/core` 재사용 — ChatScreen과 같은 패턴) ↔ 실제 사진 토글.
  사진이 없거나 잠겨 있으면 토글 자체가 안 뜨고 도트 모습만 표시
- 기본 정보(이름/성별·나이/생일) + 상세 라인(외형/체중/중성화/소개)
- "우리 대화에서 알아본 것"(어시스턴트 답변 전체) / "아직 확인할 이야기"(채팅에서 담은 질문) —
  `ChatScreen`이 navigation params로 넘겨준 값 그대로 표시, 별도 API 없음(대화 자체가 근거이므로)
- "조금 더 이야기하기" → 채팅으로 복귀(`navigation.goBack()`)

## 이번 범위에서 뺀 것
- **"직접 만날 준비하기" 버튼(입양 준비 화면 연결)은 F-08에서** — 그 화면이 아직 없어서 프로토타입에
  있는 핑크 버튼은 이번엔 안 넣음
- 사진 여러 장 중 갤러리 넘기기는 안 함 — 첫 장만 표시(샘플 데이터도 강아지당 사진 0~1장)
