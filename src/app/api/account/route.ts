import { NextResponse } from 'next/server'
import { validatePassword } from '@/lib/accountRules'
import { isAdminUsername } from '@/lib/admin'
import { getActiveUserId, getCurrentUser } from '@/lib/currentUser'
import {
  SESSION_COOKIE,
  createSessionToken,
  expiredSessionCookieOptions,
  sessionCookieOptions,
} from '@/lib/session'
import { changePassword, deleteUser, verifyUserPassword } from '@/lib/user'

// PATCH /api/account - 비밀번호 변경
export async function PATCH(request: Request) {
  try {
    // 새 쿠키를 다시 내주므로, 관리자인지 판단하려면 아이디까지 필요하다.
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const userId = user.id

    const body = (await request.json().catch(() => null)) as {
      currentPassword?: unknown
      newPassword?: unknown
    } | null

    if (!(await verifyUserPassword(userId, body?.currentPassword))) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const parsed = validatePassword(body?.newPassword)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    if (parsed.value === body?.currentPassword) {
      return NextResponse.json(
        { error: '지금 쓰는 비밀번호와 다른 값을 정해 주세요.' },
        { status: 400 }
      )
    }

    const changedAt = await changePassword(userId, parsed.value)

    // 다른 기기의 세션은 모두 끊기므로, 지금 요청한 본인에게는 새 쿠키를 내준다.
    const isAdmin = isAdminUsername(user.username)

    const response = NextResponse.json({ ok: true })
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(userId, { issuedAt: changedAt.getTime(), isAdmin }),
      sessionCookieOptions({ isAdmin })
    )

    return response
  } catch (error) {
    console.error('[PATCH /api/account]', error)
    return NextResponse.json(
      { error: '비밀번호를 바꾸지 못했습니다.' },
      { status: 500 }
    )
  }
}

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
    response.cookies.set(SESSION_COOKIE, '', expiredSessionCookieOptions)

    return response
  } catch (error) {
    console.error('[DELETE /api/account]', error)
    return NextResponse.json(
      { error: '계정을 삭제하지 못했습니다.' },
      { status: 500 }
    )
  }
}
