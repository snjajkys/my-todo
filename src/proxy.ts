import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  SESSION_COOKIE,
  readSessionToken,
  sessionCookieOptions,
  slideAdminSession,
} from '@/lib/session'

// 로그인하지 않아도 닿을 수 있어야 하는 경로
const PUBLIC_PATHS = new Set(['/login', '/api/login', '/signup', '/api/signup'])

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 프록시는 요청마다 돌므로 DB 를 건드리지 않고 쿠키 서명만 확인한다.
  // 그 사용자가 실제로 존재하는지는 각 라우트가 확인한다.
  let session: ReturnType<typeof readSessionToken> = null
  try {
    session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  } catch {
    // AUTH_SECRET 미설정 등. 확인할 수 없으면 로그인하지 않은 것으로 본다.
    session = null
  }

  const signedIn = session !== null

  // 관리자 세션은 30초짜리라, 요청이 올 때마다 다시 30초를 준다.
  // 창을 닫으면 요청이 끊기므로 그대로 만료된다.
  const refresh = (response: NextResponse) => {
    if (!session?.isAdmin) return response

    // 이 경로는 세션을 줄이러 온 요청이다. 여기서 늘려 주면 서로 덮어쓴다.
    if (pathname === '/api/session/suspend') return response

    const token = slideAdminSession(session)
    if (token) {
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions({ isAdmin: true }))
    }

    // 모바일 브라우저는 탭을 뒤로 보낼 때 페이지를 통째로 캐시(bfcache)해 두었다가
    // 그대로 되살린다. 세션이 끊겼는데도 로그인된 화면이 남아 있는 것처럼 보이는
    // 이유다. no-store 가 붙은 응답은 bfcache 대상에서 빠지므로, 돌아올 때
    // 화면을 되살리지 않고 서버에 다시 물어본다.
    response.headers.set('Cache-Control', 'no-store, must-revalidate')

    return response
  }

  if (PUBLIC_PATHS.has(pathname)) {
    // 이미 로그인한 사람에게 로그인/가입 화면을 다시 보여줄 필요는 없다.
    if (signedIn && (pathname === '/login' || pathname === '/signup')) {
      return refresh(NextResponse.redirect(new URL('/', request.url)))
    }

    return NextResponse.next()
  }

  if (signedIn) {
    return refresh(NextResponse.next())
  }

  // API 는 로그인 화면 HTML 대신 401 을 돌려줘야 클라이언트가 오류를 알아본다.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    )
  }

  const loginUrl = new URL('/login', request.url)
  if (pathname !== '/') {
    loginUrl.searchParams.set('next', `${pathname}${search}`)
  }

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // 정적 파일과 메타데이터 파일은 인증 없이 내보낸다.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
