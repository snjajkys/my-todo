import { createHmac, timingSafeEqual } from 'node:crypto'

// 프록시가 요청마다 부르는 모듈이므로, DB 나 무거운 의존성을 들이지 않는다.
// 비밀번호 자체를 다루는 코드는 src/lib/user.ts 에 있다.

export const SESSION_COOKIE = 'todo_session'

// 30일. 자기 다이어리를 자주 다시 열어야 하는 앱이라 넉넉히 잡는다.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

// 관리자는 남의 비밀번호를 재설정할 수 있어, 로그인 상태가 오래 남아 있으면 곤란하다.
// 즐겨찾기로 다시 열었을 때 그대로 들어가지는 일을 막는다.
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 2

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

/**
 * `<사용자 id>.<발급시각(ms)>.<만료시각(ms)>.<서명>` 형태의 세션 토큰을 만든다.
 *
 * 발급 시각을 함께 실어야 비밀번호를 바꿨을 때 그 이전 세션을 가려낼 수 있다.
 * `issuedAt` 을 넘길 수 있게 열어 둔 것은, 비밀번호 변경 시 DB 에 기록하는 시각과
 * 토큰의 발급 시각을 같은 값으로 맞추기 위해서다. 서로 다른 시계에서 읽으면
 * 근소한 차이로 방금 발급한 세션이 곧바로 무효가 될 수 있다.
 */
export function createSessionToken(
  userId: number,
  { issuedAt = Date.now(), isAdmin = false } = {}
) {
  const maxAge = isAdmin
    ? ADMIN_SESSION_MAX_AGE_SECONDS
    : SESSION_MAX_AGE_SECONDS
  const payload = `${userId}.${issuedAt}.${issuedAt + maxAge * 1000}`

  return `${payload}.${sign(payload)}`
}

/** 유효하면 사용자 id 와 발급 시각을, 아니면 null 을 돌려준다. */
export function readSessionToken(token: string | undefined) {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator === -1) return null

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  if (!safeEqual(signature, sign(payload))) return null

  const [rawUserId, rawIssuedAt, rawExpiresAt] = payload.split('.')
  const userId = Number(rawUserId)
  const issuedAt = Number(rawIssuedAt)
  const expiresAt = Number(rawExpiresAt)

  if (!Number.isInteger(userId) || userId <= 0) return null
  if (!Number.isFinite(issuedAt)) return null
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return { userId, issuedAt }
}

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const

/**
 * 관리자에게는 만료 시각이 없는 세션 쿠키를 준다. 브라우저를 닫으면 사라지므로
 * 즐겨찾기로 다시 열어도 로그인 상태가 남지 않는다.
 *
 * 다만 "탭 복원"이 켜진 브라우저는 세션 쿠키도 되살리기 때문에 이것만으로는
 * 부족하다. 토큰 자체의 만료(2시간)가 그 경우의 방어선이다.
 */
export function sessionCookieOptions({ isAdmin = false } = {}) {
  return isAdmin
    ? baseCookieOptions
    : { ...baseCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS }
}

/** 로그아웃·탈퇴 때 쿠키를 지우는 옵션. */
export const expiredSessionCookieOptions = {
  ...baseCookieOptions,
  maxAge: 0,
} as const
