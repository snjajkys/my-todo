import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_SUSPEND_SECONDS,
  SESSION_COOKIE,
  readSessionToken,
  sessionCookieOptions,
  slideAdminSession,
} from '@/lib/session'

// POST /api/session/suspend - 창이 닫히거나 화면이 가려질 때 관리자 세션을 3초로 줄인다.
//
// 로그아웃으로 바로 끊지 않는 것은, 브라우저가 "창 닫기"와 "새로고침"을 구분해
// 알려 주지 않기 때문이다. 끊어 버리면 새로고침만 해도 로그인이 풀린다.
// 새로고침이었다면 3초 안에 화면이 돌아와 세션을 다시 늘린다.
export async function POST(request: Request) {
  const session = (() => {
    try {
      const raw = request.headers
        .get('cookie')
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
        ?.slice(SESSION_COOKIE.length + 1)

      return readSessionToken(raw)
    } catch {
      return null
    }
  })()

  const response = new NextResponse(null, { status: 204 })

  // 일반 사용자 세션은 건드리지 않는다.
  if (!session?.isAdmin) return response

  const token = slideAdminSession(session, ADMIN_SESSION_SUSPEND_SECONDS)
  if (token) {
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions({ isAdmin: true })
    )
  }

  return response
}
