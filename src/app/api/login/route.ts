import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/password'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/session'

// POST /api/login - 로그인
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const password = (body as { password?: unknown } | null)?.password

    if (!(await verifyPassword(password))) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions)

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
