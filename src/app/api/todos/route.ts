import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeTodo, validateCreate } from '@/lib/todo'

// GET /api/todos - 전체 목록 조회
export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
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
    const body = await request.json().catch(() => null)
    const parsed = validateCreate(body)

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const todo = await prisma.todo.create({ data: parsed.value })

    return NextResponse.json(serializeTodo(todo), { status: 201 })
  } catch (error) {
    console.error('[POST /api/todos]', error)
    return NextResponse.json(
      { error: '할 일을 추가하지 못했습니다.' },
      { status: 500 }
    )
  }
}
