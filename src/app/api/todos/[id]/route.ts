import { NextResponse } from 'next/server'
import { getActiveUserId } from '@/lib/currentUser'
import { prisma } from '@/lib/prisma'
import { serializeTodo, validateUpdate } from '@/lib/todo'

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const unauthorized = () =>
  NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

// 남의 할 일에 대해서는 403 이 아니라 404 를 준다.
// 403 은 "그 id 는 존재한다"는 사실을 알려주는 셈이 된다.
const notFound = () =>
  NextResponse.json({ error: '할 일을 찾을 수 없습니다.' }, { status: 404 })

// PATCH /api/todos/[id] - 제목 / 완료 상태 / 종류 / 기간 수정
export async function PATCH(request: Request, { params }: Params) {
  const { id: rawId } = await params
  const id = parseId(rawId)

  if (id === null) {
    return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 })
  }

  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    // 반드시 userId 까지 함께 걸어야 한다. id 만으로 찾으면
    // 남의 할 일을 번호만 바꿔가며 고칠 수 있다.
    const existing = await prisma.todo.findFirst({ where: { id, userId } })
    if (!existing) return notFound()

    const body = await request.json().catch(() => null)
    const parsed = validateUpdate(body, existing)

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const todo = await prisma.todo.update({
      where: { id, userId },
      data: parsed.value,
    })

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
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    // 지울 대상을 고르는 조건 자체에 userId 를 넣어, 남의 것은 애초에 걸리지 않게 한다.
    const { count } = await prisma.todo.deleteMany({ where: { id, userId } })
    if (count === 0) return notFound()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/todos/[id]]', error)
    return NextResponse.json(
      { error: '할 일을 삭제하지 못했습니다.' },
      { status: 500 }
    )
  }
}
