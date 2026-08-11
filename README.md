# MY TODO

## 실행 방법

```bash
# 1. 의존성 설치 (설치 후 prisma generate 가 자동 실행됩니다)
npm install

# 2. DB 생성 및 마이그레이션 적용
npx prisma migrate dev

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속.

> `.env` 파일이 없다면 `.env.example` 을 복사해서 만들어 주세요.
> ```bash
> cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
> ```

### 같은 와이파이의 휴대폰에서 접속하기

`npm run dev` 를 실행하면 터미널에 두 개의 주소가 나옵니다. 휴대폰에서는 **Network** 주소를
그대로 입력하면 됩니다. (PC 와 휴대폰이 같은 와이파이에 있어야 합니다.)

```
- Local:         http://localhost:3000
- Network:       http://192.168.219.102:3000   <- 휴대폰에서 이 주소로 접속
```

`next dev` 는 별도 옵션 없이도 모든 네트워크 인터페이스에 바인딩되므로 `-H 0.0.0.0` 은 필요 없습니다.
오히려 `-H 0.0.0.0` 을 주면 위 Network 줄이 실제 IP 대신 `0.0.0.0` 으로 표시돼 주소를 알기 어려워집니다.

단, Next.js 는 개발 모드에서 **localhost 이외의 origin 이 보내는 `/_next/*` 요청을 기본으로 차단**합니다.
이 상태로 휴대폰에서 열면 화면은 뜨지만 JS 번들이 403 으로 막혀 버튼이 전혀 동작하지 않습니다.
그래서 `next.config.ts` 에 사설 IP 대역을 `allowedDevOrigins` 로 허용해 두었습니다.

> 접속이 안 된다면 Windows 방화벽에서 Node.js 의 사설 네트워크 접근이 허용돼 있는지 확인해 주세요.

### 그 외 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run build` / `npm start` | 프로덕션 빌드 및 실행 |
| `npm run lint` | ESLint 검사 |
| `npx prisma studio` | DB 데이터를 브라우저에서 확인/편집 |
| `npx prisma migrate reset` | DB 초기화 (데이터 전부 삭제) |

## 기능

- 오늘 날짜와 요일 표시 (사용자 로컬 시간대 기준, 자정이 지나면 자동 갱신)
- 할 일을 **오늘 할 일**과 **기간 할 일** 두 종류로 구분해서 입력
  - 오늘 할 일: 등록한 날이 기준 날짜. **오늘 끝내지 못하면 다음 날에도 계속 표시**되고,
    `어제 못 끝낸 일` · `3일째 밀린 일` 처럼 며칠 밀렸는지 함께 보여 줍니다 (항목 테두리도 빨강).
  - 기간 할 일: 시작일 ~ 종료일 지정, 오늘 기준 상태 표시
    (`시작까지 N일` · `종료까지 N일` · `오늘 마감` · `N일 지남`)
- 할 일 목록 조회 / 추가 / 삭제
- 완료 · 미완료 체크 토글 (완료 시 취소선)
- 수정 (인라인 편집으로 제목 · 종류 · 기간 모두 변경 가능, `Esc` 로 취소)
- 미완료 / 완료 섹션 분리 표시 + 두 가지 필터
  - 종류 필터: 전체 종류 · 오늘 · 기간
  - 상태 필터: 전체 · 미완료 · 완료
- 로딩 상태, 빈 목록 안내 메시지, 에러 메시지 처리
- 반응형 레이아웃, 다크 모드 대응

체크 · 수정 · 삭제는 낙관적 업데이트(optimistic update)로 즉시 화면에 반영하고,
서버 요청이 실패하면 이전 상태로 되돌리며 에러 메시지를 표시합니다.

### 목록에 표시되는 규칙

| 항목 | 표시 조건 |
| --- | --- |
| 오늘 할 일 (미완료) | 끝낼 때까지 **매일 계속 표시** (며칠 밀렸는지 함께 안내) |
| 오늘 할 일 (완료) | **완료한 날에만** 표시 — 어제 끝낸 일이 오늘 목록을 채우지 않습니다 |
| 기간 할 일 | 항상 표시 |

판단 기준은 `src/lib/todoView.ts` 의 `isVisibleOn()` 한 곳에 모아 두었습니다.
"오늘"은 사용자마다 다른 값(로컬 시간대)이라 서버가 아니라 **브라우저에서** 거릅니다.

### 날짜 처리

- 시작일 · 종료일은 시각이 의미 없는 "날짜"이므로 API 에서는 `"YYYY-MM-DD"` 문자열로
  주고받고, DB 에는 UTC 자정 `DateTime` 으로 저장합니다. (시간대에 따른 하루 밀림 방지)
- 오늘 날짜는 서버가 아니라 **브라우저 로컬 시간대** 기준입니다.
  `useSyncExternalStore` 로 읽어 서버 렌더링 시에는 비워 두므로 hydration 불일치가 없습니다.
- `completedAt`(완료 시각)은 API 가 자동으로 관리합니다. 완료하면 그 시각이 기록되고,
  완료를 해제하면 `null` 로 되돌아갑니다. "완료한 날"을 알아야 지난 날짜의 완료 항목을
  목록에서 내릴 수 있기 때문입니다.

## API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/todos` | 전체 목록 조회 (최신순) |
| POST | `/api/todos` | 새 할 일 생성 |
| PATCH | `/api/todos/[id]` | 제목 · 완료 상태 · 종류 · 기간 수정 (일부만 보내도 됨) |
| DELETE | `/api/todos/[id]` | 삭제 |

```jsonc
// POST - 오늘 할 일 (type 생략 시 TODAY)
// startDate 는 그 할 일의 기준 날짜. 생략하면 서버 기준 오늘로 채웁니다.
{ "title": "설거지하기", "type": "TODAY", "startDate": "2026-08-11" }

// POST - 기간 할 일
{ "title": "보고서 작성", "type": "PERIOD",
  "startDate": "2026-08-11", "endDate": "2026-08-16" }

// PATCH - 완료 토글 / 종료일만 변경 / 종류 전환
{ "completed": true }        // completedAt 이 자동으로 기록됩니다
{ "endDate": "2026-08-20" }
{ "type": "TODAY" }          // 종료일은 비워지고 기준 날짜는 오늘로 다시 잡힙니다
```

검증 규칙:

- `type` 은 `TODAY` 또는 `PERIOD`
- `TODAY` 는 기준 날짜(`startDate`) 1개만 사용하고 `endDate` 는 지정할 수 없음
  (기준 날짜를 생략하면 서버 기준 오늘로 채우지만, 시간대 차이가 있으므로 클라이언트가
  자기 로컬 날짜를 보내는 것을 권장합니다)
- `PERIOD` 는 시작일 · 종료일 필수, 시작일 ≤ 종료일
- 날짜는 `YYYY-MM-DD` 형식의 실제 존재하는 날짜만 허용
- PATCH 는 기존 레코드와 병합한 최종 상태를 기준으로 검증 (예: 이미 `PERIOD` 인 항목의 종료일만 변경 가능)
- 이미 있는 오늘 할 일의 제목만 바꿔도 기준 날짜는 유지되어, 이월 상태가 초기화되지 않습니다

응답 코드: `200` / `201` 성공, `400` 잘못된 입력, `404` 대상 없음, `500` 서버 오류.

## DB 스키마

```prisma
model Todo {
  id          Int       @id @default(autoincrement())
  title       String
  completed   Boolean   @default(false)
  type        String    @default("TODAY")  // "TODAY" | "PERIOD"
  startDate   DateTime?                    // TODAY: 기준 날짜 / PERIOD: 시작일
  endDate     DateTime?                    // PERIOD 일 때만 사용
  completedAt DateTime?                    // 완료 처리한 시각 (해제하면 null)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

> SQLite 는 enum 을 지원하지 않아 `type` 은 문자열로 저장하고 API 계층(`src/lib/todo.ts`)에서 검증합니다.

## 프로젝트 구조

```
prisma/
  schema.prisma            # Prisma 스키마
  migrations/              # 마이그레이션 파일
prisma.config.ts           # Prisma 7 설정 (DATABASE_URL 주입)
src/
  app/
    api/todos/route.ts         # GET, POST
    api/todos/[id]/route.ts    # PATCH, DELETE
    page.tsx                   # 메인 페이지
    layout.tsx, globals.css
  components/
    TodayBanner.tsx        # 오늘 날짜 + 요일
    TodoApp.tsx            # 상태 관리 + 목록/필터 렌더링
    TodoForm.tsx           # 종류 선택 + 기간 입력 + 등록
    TodoItem.tsx           # 개별 항목 (체크 / 인라인 수정 / 삭제)
  hooks/useToday.ts        # 로컬 기준 오늘 날짜 (자정 자동 갱신)
  lib/
    prisma.ts              # PrismaClient 싱글턴 (better-sqlite3 드라이버 어댑터)
    date.ts                # 날짜 파싱 / 포맷 / 기간 상태 계산
    todo.ts                # 요청 검증 + 응답 직렬화 (서버)
    todoView.ts            # 오늘 목록 표시 규칙 + 이월 안내 (클라이언트)
  types/todo.ts            # 공용 타입
  generated/prisma/        # prisma generate 산출물 (git 미포함)
```
