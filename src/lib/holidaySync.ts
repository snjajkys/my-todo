import { fetchYear, holidayApiConfigured } from './holidayApi.ts'
import { prisma } from '@/lib/prisma'

// yearsIn 은 순수 계산이라 holiday.ts 에 둔다. 이 파일은 prisma 를 물고 있어서
// node 가 테스트로 직접 읽어 들이지 못하기 때문이다.
export { yearsIn } from './holiday.ts'
export { holidayApiConfigured } from './holidayApi.ts'

/* ------------------------------------------------------------------ *
 * 받아 온 법정공휴일을 저장하는 부분. API 와 이야기하는 쪽은 holidayApi.ts 다.
 *
 * 공휴일을 코드에 적어 두지 않고 받아 오는 이유가 있다. 설날과 추석과
 * 부처님오신날은 음력이라 해마다 옮겨 다니고, 대체공휴일 규칙은 법이 바뀌면
 * 같이 바뀌며, 임시공휴일은 연중에 갑자기 생긴다. 표에 적어 두면 언젠가 반드시
 * 틀리고, 틀린 걸 아무도 알아채지 못한 채로 남는다.
 *
 * (이 기능을 만들며 공휴일 목록 사이트 두 곳을 봤는데 서로 달랐고, 정작 키를 넣고
 *  공식 데이터를 받아 보니 양쪽 다 틀렸다. 심지어 코드를 쓰던 나 자신도 제헌절을
 *  공휴일이 아니라고 적어 두었다가 반증당했다 — 2026년 제헌절은 공휴일이다.)
 *
 * 키가 없으면 이 파일은 아무것도 하지 않는다. 주말과 직접 넣은 날은 키 없이도
 * 그대로 보이므로, 키가 없다고 달력이 망가지지는 않는다.
 * ------------------------------------------------------------------ */

// 다시 받아 오기까지 기다리는 기간.
//
// 한 번 받고 끝내면 안 되는 것은 임시공휴일 때문이다. 정부가 연중에 지정하면
// 그 전에 받아 둔 표에는 없다. 그렇다고 매번 받아 오면 달력을 열 때마다
// 외부 API 를 기다리게 되므로, 일주일에 한 번으로 둔다.
const STALE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * 그 해를 받아 DB 에 넣는다.
 *
 * 그 해의 기존 행을 지우고 다시 넣는다. 더하기만 하면 취소된 임시공휴일이
 * 영영 남기 때문이다. 한 트랜잭션으로 묶어, 지우기만 하고 끝나는 순간이 없게 한다.
 */
async function syncYear(year: number): Promise<number> {
  const rows = await fetchYear(year)
  if (rows === null) return 0

  await prisma.$transaction([
    prisma.publicHoliday.deleteMany({
      where: { date: { startsWith: `${year}-` } },
    }),
    prisma.publicHoliday.createMany({ data: rows }),
    prisma.holidaySync.upsert({
      where: { year },
      create: { year, syncedAt: new Date() },
      update: { syncedAt: new Date() },
    }),
  ])

  return rows.length
}

/**
 * 그 연도들이 최근 것인지 확인하고, 아니면 받아 온다.
 *
 * 실패해도 던지지 않는다. 공휴일을 못 받아 왔다고 달력이 안 나오면 안 된다.
 * 가지고 있는 것(조금 오래됐을 수는 있는)으로 그리고, 이유는 로그에 남긴다.
 */
export async function ensureYearsSynced(years: number[]): Promise<void> {
  if (!holidayApiConfigured() || years.length === 0) return

  const known = await prisma.holidaySync.findMany({
    where: { year: { in: years } },
  })

  const freshUntil = Date.now() - STALE_MS
  const fresh = new Set(
    known
      .filter((row) => row.syncedAt.getTime() > freshUntil)
      .map((row) => row.year)
  )

  for (const year of years) {
    if (fresh.has(year)) continue

    try {
      const count = await syncYear(year)
      console.log(`[holiday] ${year}년 공휴일 ${count}일 받아 옴`)
    } catch (error) {
      console.error(`[holiday] ${year}년 공휴일을 받아 오지 못했습니다.`, error)
    }
  }
}
