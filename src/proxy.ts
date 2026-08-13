import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, readSessionToken } from '@/lib/session'

// 로그인하지 않아도 닿을 수 있어야 하는 경로
const PUBLIC_PATHS = new Set(['/login', '/api/login', '/signup', '/api/signup'])

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 프록시는 요청마다 돌므로 DB 를 건드리지 않고 쿠키 서명만 확인한다.
  // 그 사용자가 실제로 존재하는지는 각 라우트가 확인한다.
  let signedIn = false
  try {
    signedIn = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value) !== null
  } catch {
    // AUTH_SECRET 미설정 등. 확인할 수 없으면 로그인하지 않은 것으로 본다.
    signedIn = false
  }

  if (PUBLIC_PATHS.has(pathname)) {
    // 이미 로그인한 사람에게 로그인/가입 화면을 다시 보여줄 필요는 없다.
    if (signedIn && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  }

  if (signedIn) {
    return NextResponse.next()
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
