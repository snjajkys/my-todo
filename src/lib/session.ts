import { createHmac, timingSafeEqual } from 'node:crypto'

// 프록시가 요청마다 부르는 모듈이므로, DB 나 무거운 의존성을 들이지 않는다.
// 비밀번호 자체를 다루는 코드는 src/lib/user.ts 에 있다.

export const SESSION_COOKIE = 'todo_session'

// 30일. 자기 다이어리를 자주 다시 열어야 하는 앱이라 넉넉히 잡는다.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

// 관리자는 남의 비밀번호를 재설정할 수 있어, 로그인 상태가 남아 있으면 곤란하다.
//
// 만료 없는 세션 쿠키를 주지만 그것만으로는 부족하다. 크롬의 "중단한 지점에서
// 계속하기"처럼 세션 복원이 켜진 브라우저는 창을 닫아도 세션 쿠키를 되살린다.
// 실제로 모바일에서는 닫으면 풀렸지만 PC 에서는 그대로 남았다.
//
// 그래서 토큰 만료를 짧게 두고, 화면이 열려 있는 동안에만 계속 늘려 준다.
// 창을 닫으면 늘려 줄 요청이 오지 않으므로 그대로 무효가 된다.
export const ADMIN_SESSION_IDLE_SECONDS = 10

// 창이 닫히거나 화면이 가려질 때 클라이언트가 알려 오면 이 값으로 줄인다.
// 브라우저는 "닫기"와 "새로고침"을 구분해 주지 않으므로 0 으로 끊지 않는다.
// 새로고침이었다면 이 시간 안에 화면이 돌아와 다시 늘려 준다.
export const ADMIN_SESSION_SUSPEND_SECONDS = 3

// 조작이 이어지는 한 무한히 늘어나지는 않도록 한계를 둔다.
const ADMIN_SESSION_ABSOLUTE_SECONDS = 60 * 60 * 8

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
 * `<사용자 id>.<발급시각(ms)>.<만료시각(ms)>.<a|u>.<서명>` 형태의 세션 토큰을 만든다.
 *
 * 발급 시각을 함께 실어야 비밀번호를 바꿨을 때 그 이전 세션을 가려낼 수 있다.
 * `issuedAt` 을 넘길 수 있게 열어 둔 것은, 비밀번호 변경 시 DB 에 기록하는 시각과
 * 토큰의 발급 시각을 같은 값으로 맞추기 위해서다. 서로 다른 시계에서 읽으면
 * 근소한 차이로 방금 발급한 세션이 곧바로 무효가 될 수 있다.
 *
 * 마지막 자리에 관리자 여부를 싣는 것은 프록시 때문이다. 프록시는 DB 를 보지 않으므로
 * 토큰만으로 "이 세션을 30초씩 늘려 줘야 하는지" 판단할 수 있어야 한다.
 */
export function createSessionToken(
  userId: number,
  { issuedAt = Date.now(), isAdmin = false, expiresAt = 0 } = {}
) {
  const maxAge = isAdmin
    ? ADMIN_SESSION_IDLE_SECONDS
    : SESSION_MAX_AGE_SECONDS
  const expiry = expiresAt || issuedAt + maxAge * 1000
  const payload = `${userId}.${issuedAt}.${expiry}.${isAdmin ? 'a' : 'u'}`

  return `${payload}.${sign(payload)}`
}

/** 유효하면 세션 내용을, 아니면 null 을 돌려준다. */
export function readSessionToken(token: string | undefined) {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator === -1) return null

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  if (!safeEqual(signature, sign(payload))) return null

  const [rawUserId, rawIssuedAt, rawExpiresAt, kind] = payload.split('.')
  const userId = Number(rawUserId)
  const issuedAt = Number(rawIssuedAt)
  const expiresAt = Number(rawExpiresAt)

  if (!Number.isInteger(userId) || userId <= 0) return null
  if (!Number.isFinite(issuedAt)) return null
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null
  if (kind !== 'a' && kind !== 'u') return null

  return { userId, issuedAt, expiresAt, isAdmin: kind === 'a' }
}

/**
 * 관리자 세션의 만료를 지금부터 30초 뒤로 다시 잡는다.
 * 발급 시각은 그대로 둔다. 비밀번호 변경 시각과 비교하는 기준이기 때문이다.
 *
 * 절대 한계를 넘었으면 null 을 돌려주고, 그때는 늘리지 않고 만료되게 둔다.
 */
export function slideAdminSession(
  session: { userId: number; issuedAt: number },
  seconds = ADMIN_SESSION_IDLE_SECONDS
) {
  const now = Date.now()
  const limit = session.issuedAt + ADMIN_SESSION_ABSOLUTE_SECONDS * 1000

  if (now >= limit) return null

  return createSessionToken(session.userId, {
    issuedAt: session.issuedAt,
    isAdmin: true,
    expiresAt: Math.min(now + seconds * 1000, limit),
  })
}

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const

/**
 * 관리자에게는 만료 시각이 없는 세션 쿠키를 준다. 브라우저를 닫으면 사라진다.
 * 세션 복원이 켜진 브라우저에서 쿠키가 되살아나더라도, 토큰 쪽 만료가 막는다.
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
