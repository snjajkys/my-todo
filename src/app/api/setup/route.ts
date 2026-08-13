import { NextResponse } from 'next/server'
import { isPasswordRegistered, registerPassword } from '@/lib/password'
import { validatePassword } from '@/lib/passwordRules'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/session'

// POST /api/setup - 최초 1회 비밀번호 등록
export async function POST(request: Request) {
  try {
    if (await isPasswordRegistered()) {
      return NextResponse.json(
        { error: '이미 비밀번호가 등록되어 있습니다.' },
        { status: 409 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = validatePassword((body as { password?: unknown } | null)?.password)

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    // 위 isPasswordRegistered 확인과 이 사이에 다른 요청이 먼저 등록했을 수 있다.
    // 그 경우 registerPassword 가 false 를 돌려주므로 덮어쓰지 않는다.
    if (!(await registerPassword(parsed.value))) {
      return NextResponse.json(
        { error: '이미 비밀번호가 등록되어 있습니다.' },
        { status: 409 }
      )
    }

    // 등록한 사람은 바로 로그인된 상태로 들어간다.
    const response = NextResponse.json({ ok: true }, { status: 201 })
    response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions)

    return response
  } catch (error) {
    console.error('[POST /api/setup]', error)
    return NextResponse.json(
      { error: '비밀번호를 등록하지 못했습니다.' },
      { status: 500 }
    )
  }
}
