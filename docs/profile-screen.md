# 강아지 소개서 화면

> 위치: `src/modules/dog/ProfileScreen.tsx` + `profile/Decor.tsx` + `hooks/useDogProfile.ts`
> 디자인 출처: `puppy-profile.html`의 "친구의 프로필"(클립보드 + 종이 보드) 시안 이미지(2026-10). 이전 크림 시트/
> 스티키노트 구현은 이 디자인으로 **대체**됐다.

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
- 헤더(← · "친구의 프로필" · 하트 저장 `useDogSaved`) + "하나씩, 천천히 알아가요." → 클립보드(클립·테이프·스티커 장식) 위 종이:
  PUPPY CONNECT 제목 + MY LITTLE FRIEND 티켓 → 폴라로이드 초상(도트 모습 ↔ 실제 사진 토글, 사진은 Skia `RemoteImage`) +
  점선 사실표(이름·보호소·성별/나이·품종·체중/중성화) → "조금씩, 나를 알아가 줘!" → **성향정보 = 보호소가 쓴 `traitLabels` 태그**
  → "우리, 이렇게 친해져요"(`introduction`) + 작은 폴라로이드 → 대화에서 알아본 것/아직 확인할 이야기(`ChatScreen`이 넘긴 값) → 하단 "{이름}와 대화하기"(복귀)
- 디자인의 건강상태·활동성·사회성·친화도 막대는 **API에 없어 숨김**(실제 값이 생기면 `dp-meters` 자리에 추가)
- 진입: 게임기 대화 화면의 SELECT, 저장한 친구의 프로필 버튼 — 라우트 params에 `shelterName` 추가

## 이번 범위에서 뺀 것
- **"직접 만날 준비하기" 버튼(입양 준비 화면 연결)은 F-08에서** — 그 화면이 아직 없어서 프로토타입에
  있는 핑크 버튼은 이번엔 안 넣음
- 사진 여러 장 중 갤러리 넘기기는 안 함 — 첫 장만 표시(샘플 데이터도 강아지당 사진 0~1장)
