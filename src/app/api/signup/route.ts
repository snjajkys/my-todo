import { NextResponse } from 'next/server'
import { validatePassword, validateUsername } from '@/lib/accountRules'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/session'
import { createUser, isInviteCodeValid } from '@/lib/user'

// POST /api/signup - 초대 코드를 아는 사람만 계정을 만들 수 있다
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      username?: unknown
      password?: unknown
      inviteCode?: unknown
    } | null

    if (!isInviteCodeValid(body?.inviteCode)) {
      return NextResponse.json(
        { error: '초대 코드가 올바르지 않습니다.' },
        { status: 403 }
      )
    }

    const username = validateUsername(body?.username)
    if (!username.ok) {
      return NextResponse.json({ error: username.error }, { status: 400 })
    }

    const password = validatePassword(body?.password)
    if (!password.ok) {
      return NextResponse.json({ error: password.error }, { status: 400 })
    }

    const user = await createUser(username.value, password.value)
    if (!user) {
      return NextResponse.json(
        { error: '이미 사용 중인 아이디입니다.' },
        { status: 409 }
      )
    }

    // 가입한 사람은 바로 로그인된 상태로 들어간다.
    const response = NextResponse.json({ ok: true }, { status: 201 })
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user.id),
      sessionCookieOptions
    )

    return response
  } catch (error) {
    console.error('[POST /api/signup]', error)
    return NextResponse.json(
      { error: '가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
