import { NextResponse } from 'next/server'
import { getActiveUserId } from '@/lib/currentUser'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session'
import { deleteUser, verifyUserPassword } from '@/lib/user'

// DELETE /api/account - 내 계정과 내 할 일을 모두 삭제
export async function DELETE(request: Request) {
  try {
    const userId = await getActiveUserId()

    if (userId === null) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 로그인한 채로 자리를 비운 사이 남이 눌러 지워 버리는 일을 막는다.
    const body = (await request.json().catch(() => null)) as {
      password?: unknown
    } | null

    if (!(await verifyUserPassword(userId, body?.password))) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    await deleteUser(userId)

    // 계정이 사라졌으니 쿠키도 함께 정리한다.
    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, '', {
      ...sessionCookieOptions,
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('[DELETE /api/account]', error)
    return NextResponse.json(
      { error: '계정을 삭제하지 못했습니다.' },
      { status: 500 }
    )
  }
}
