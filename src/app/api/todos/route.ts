import { NextResponse } from 'next/server'
import { getActiveUserId } from '@/lib/currentUser'
import { prisma } from '@/lib/prisma'
import {
  rangeFilter,
  serializeTodo,
  validateCreate,
  validateRange,
} from '@/lib/todo'

// 프록시가 쿠키 없는 요청을 이미 막지만, 여기서도 확인한다.
// 프록시 matcher 가 바뀌면 이 경로가 조용히 무방비가 될 수 있다.
const unauthorized = () =>
  NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

// GET /api/todos - 내 할 일 목록 조회
// from/to 를 주면 그 기간에 걸치는 것만 (달력 화면), 없으면 전 기간 (오늘 화면)
export async function GET(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const range = validateRange(new URL(request.url).searchParams)
    if (!range.ok) {
      return NextResponse.json({ error: range.error }, { status: 400 })
    }

    const todos = await prisma.todo.findMany({
      where: range.value
        ? { userId, ...rangeFilter(range.value) }
        : { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(todos.map(serializeTodo))
  } catch (error) {
    console.error('[GET /api/todos]', error)
    return NextResponse.json(
      { error: '할 일 목록을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/todos - 새 할 일 생성
export async function POST(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const body = await request.json().catch(() => null)
    const parsed = validateCreate(body)

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const todo = await prisma.todo.create({
      data: { ...parsed.value, userId },
    })

    return NextResponse.json(serializeTodo(todo), { status: 201 })
  } catch (error) {
    console.error('[POST /api/todos]', error)
    return NextResponse.json(
      { error: '할 일을 추가하지 못했습니다.' },
      { status: 500 }
    )
  }
}
