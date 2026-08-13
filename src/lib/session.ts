import { createHmac, timingSafeEqual } from 'node:crypto'

// 프록시가 요청마다 부르는 모듈이므로, DB 나 무거운 의존성을 들이지 않는다.
// 비밀번호 자체를 다루는 코드는 src/lib/password.ts 에 있다.

export const SESSION_COOKIE = 'todo_session'

// 30일. 개인용 앱이라 자주 다시 로그인하지 않도록 넉넉히 잡는다.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sign(payload: string) {
  const secret = process.env.AUTH_SECRET

  // 서명 키가 없으면 인증이 통째로 무력화되므로, 통과시키지 않고 막는다.
  if (!secret) {
    throw new Error('환경변수 AUTH_SECRET 가 설정되지 않았습니다.')
  }

  return createHmac('sha256', secret).update(payload).digest('base64url')
}

// 길이가 다르면 timingSafeEqual 이 예외를 던지므로 길이부터 확인한다.
export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

/** `<만료시각(ms)>.<서명>` 형태의 세션 토큰을 만든다. */
export function createSessionToken() {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  return `${expiresAt}.${sign(expiresAt)}`
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return false

  const separator = token.lastIndexOf('.')
  if (separator === -1) return false

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  if (!safeEqual(signature, sign(payload))) return false

  const expiresAt = Number(payload)

  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const
