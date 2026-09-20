import { NextResponse } from 'next/server'
import { getActiveUserId } from '@/lib/currentUser'
import { parseDateOnly } from '@/lib/date'
import type { HolidayPayload } from '@/lib/holiday'
import { ensureYearsSynced, yearsIn } from '@/lib/holidaySync'
import { prisma } from '@/lib/prisma'

// 프록시가 쿠키 없는 요청을 이미 막지만, 여기서도 확인한다.
// 프록시 matcher 가 바뀌면 이 경로가 조용히 무방비가 될 수 있다.
const unauthorized = () =>
  NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

// 직접 넣는 휴일 이름의 길이. 달력 칸에 들어가야 하므로 길 이유가 없다.
const MAX_NAME_LENGTH = 20

/** 본문에서 "YYYY-MM-DD" 날짜를 꺼낸다. 실제로 있는 날짜인지까지 본다. */
function readDate(value: unknown): string | null {
  return typeof value === 'string' && parseDateOnly(value) ? value : null
}

// GET /api/holidays?from=...&to=... - 그 범위의 공휴일과 직접 넣은 휴일
export async function GET(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const params = new URL(request.url).searchParams
    const from = readDate(params.get('from'))
    const to = readDate(params.get('to'))

    if (!from || !to || from > to) {
      return NextResponse.json(
        { error: 'from 과 to 는 YYYY-MM-DD 형식이어야 하고 from 이 앞서야 합니다.' },
        { status: 400 }
      )
    }

    // 그 범위에 걸친 해가 오래됐으면 여기서 받아 온다. 실패해도 던지지 않으므로
    // 공공데이터포털이 멈춰 있어도 달력은 그대로 그려진다.
    await ensureYearsSynced(yearsIn(from, to))

    // 날짜를 "YYYY-MM-DD" 문자열로 저장해 두었으므로 범위 비교가 사전순 비교와 같다.
    const [publicRows, customRows] = await Promise.all([
      prisma.publicHoliday.findMany({
        where: { date: { gte: from, lte: to } },
        select: { date: true, name: true },
      }),
      prisma.customHoliday.findMany({
        where: { userId, date: { gte: from, lte: to } },
        select: { date: true, name: true },
      }),
    ])

    const payload: HolidayPayload = {
      public: publicRows.map((row) => [row.date, row.name]),
      custom: customRows.map((row) => [row.date, row.name]),
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[GET /api/holidays]', error)
    return NextResponse.json(
      { error: '휴일을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/holidays - 이 날을 내 휴일로 (재량휴업일 등)
export async function POST(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const body = (await request.json().catch(() => null)) as {
      date?: unknown
      name?: unknown
    } | null

    const date = readDate(body?.date)
    if (!date) {
      return NextResponse.json(
        { error: '날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.' },
        { status: 400 }
      )
    }

    const name =
      typeof body?.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json(
        { error: '휴일 이름을 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `휴일 이름은 ${MAX_NAME_LENGTH}자까지 넣을 수 있습니다.` },
        { status: 400 }
      )
    }

    // 같은 날을 다시 넣으면 이름만 바꾼다. 중복 오류를 띄우는 대신 고쳐 주는 쪽이
    // 쓰기에 자연스럽다.
    await prisma.customHoliday.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, name },
      update: { name },
    })

    return NextResponse.json({ date, name })
  } catch (error) {
    console.error('[POST /api/holidays]', error)
    return NextResponse.json(
      { error: '휴일을 등록하지 못했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/holidays - 직접 넣은 휴일 해제
export async function DELETE(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const body = (await request.json().catch(() => null)) as {
      date?: unknown
    } | null

    const date = readDate(body?.date)
    if (!date) {
      return NextResponse.json(
        { error: '날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.' },
        { status: 400 }
      )
    }

    // userId 를 함께 건다. 법정공휴일은 여기서 지울 수 없고, 남이 넣은 날도 못 지운다.
    await prisma.customHoliday.deleteMany({ where: { userId, date } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/holidays]', error)
    return NextResponse.json(
      { error: '휴일을 해제하지 못했습니다.' },
      { status: 500 }
    )
  }
}
