import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/session'
import { authenticate } from '@/lib/user'

// POST /api/login - 로그인
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      username?: unknown
      password?: unknown
    } | null

    const user = await authenticate(body?.username, body?.password)

    if (!user) {
      // 아이디가 없는 것인지 비밀번호가 틀린 것인지 구분해 주지 않는다.
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user.id),
      sessionCookieOptions
    )

    return response
  } catch (error) {
    console.error('[POST /api/login]', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/login - 로그아웃
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })

  return response
}
