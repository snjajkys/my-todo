import { NextResponse } from 'next/server'
import { generateTemporaryPassword, getAdminUser } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { changePassword } from '@/lib/user'

// POST /api/admin/reset-password - 관리자가 다른 사람의 비밀번호를 임시값으로 재설정
export async function POST(request: Request) {
  try {
    const admin = await getAdminUser()

    // 관리자가 아니면 이 경로의 존재 자체를 알려주지 않는다.
    if (!admin) {
      return NextResponse.json(
        { error: '찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const body = (await request.json().catch(() => null)) as {
      userId?: unknown
    } | null
    const userId = Number(body?.userId)

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    // 관리자 본인은 여기서 바꾸지 않는다. 임시 비밀번호를 거칠 이유가 없고,
    // 자기 세션을 스스로 끊어 잠기는 상황을 만들 필요도 없다.
    if (userId === admin.id) {
      return NextResponse.json(
        { error: '본인 비밀번호는 계정 설정에서 바꿔 주세요.' },
        { status: 400 }
      )
    }

    // 관리 화면을 열어 둔 사이 그 사람이 탈퇴했을 수 있다.
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    })

    if (!target) {
      return NextResponse.json(
        { error: '이미 삭제된 계정입니다.' },
        { status: 404 }
      )
    }

    const temporaryPassword = generateTemporaryPassword()

    // changePassword 가 passwordChangedAt 을 갱신하므로,
    // 그 사람이 다른 기기에 남겨 둔 로그인은 이 시점에 모두 끊긴다.
    await changePassword(userId, temporaryPassword)

    return NextResponse.json({ temporaryPassword })
  } catch (error) {
    console.error('[POST /api/admin/reset-password]', error)
    return NextResponse.json(
      { error: '비밀번호를 재설정하지 못했습니다.' },
      { status: 500 }
    )
  }
}
