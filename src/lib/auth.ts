import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'todo_session'

// 30일. 개인용 앱이라 자주 다시 로그인하지 않도록 넉넉히 잡는다.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function readSecret(name: 'APP_PASSWORD' | 'AUTH_SECRET') {
  const value = process.env[name]

  // 환경변수가 비어 있으면 인증이 통째로 무력화되므로, 통과시키지 않고 막는다.
  if (!value) {
    throw new Error(`환경변수 ${name} 가 설정되지 않았습니다.`)
  }

  return value
}

function sign(payload: string) {
  return createHmac('sha256', readSecret('AUTH_SECRET'))
    .update(payload)
    .digest('base64url')
}

// 길이가 다르면 timingSafeEqual 이 예외를 던지므로 길이부터 확인한다.
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function verifyPassword(input: unknown) {
  return typeof input === 'string' && safeEqual(input, readSecret('APP_PASSWORD'))
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
