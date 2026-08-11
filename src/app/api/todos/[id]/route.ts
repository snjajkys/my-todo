import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeTodo, validateUpdate } from '@/lib/todo'

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

// PATCH /api/todos/[id] - 제목 / 완료 상태 / 종류 / 기간 수정
export async function PATCH(request: Request, { params }: Params) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (id === null) {
    return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 })
  }

  try {
    const existing = await prisma.todo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = validateUpdate(body, existing)

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const todo = await prisma.todo.update({ where: { id }, data: parsed.value })
    return NextResponse.json(serializeTodo(todo))
  } catch (error) {
    console.error('[PATCH /api/todos/[id]]', error)
    return NextResponse.json(
      { error: '할 일을 수정하지 못했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/todos/[id] - 삭제
export async function DELETE(_request: Request, { params }: Params) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (id === null) {
    return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 })
  }

  try {
    const existing = await prisma.todo.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: '할 일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    await prisma.todo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/todos/[id]]', error)
    return NextResponse.json(
      { error: '할 일을 삭제하지 못했습니다.' },
      { status: 500 }
    )
  }
}
