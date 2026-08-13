import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, readSessionToken } from '@/lib/session'

// 프록시는 쿠키의 서명만 확인한다. 여기서는 그 결과를 실제 사용자로 바꿔,
// 라우트 핸들러와 서버 컴포넌트가 "누구의 요청인지" 알 수 있게 한다.

/** 쿠키에 담긴 세션. 서명이 유효할 때만 값이 있고, 실재 여부는 아직 확인하지 않았다. */
async function readSession() {
  try {
    const store = await cookies()

    return readSessionToken(store.get(SESSION_COOKIE)?.value)
  } catch {
    // AUTH_SECRET 미설정 등. 확인할 수 없으면 로그인하지 않은 것으로 본다.
    return null
  }
}

/**
 * 로그인한 사용자. 서명만 믿지 않고 두 가지를 더 확인한다.
 *
 * - 계정이 아직 있는가. 세션이 30일이라 그 사이 탈퇴했을 수 있다. 서명만 믿으면
 *   지워진 계정의 쿠키로도 API 가 200 을 돌려주고, 할 일 추가는 외래키 위반으로 500 이 난다.
 * - 비밀번호를 바꾼 뒤에 발급된 세션인가. 토큰은 비밀번호와 무관하게 서명되므로,
 *   이 확인이 없으면 비밀번호를 바꿔도 다른 기기의 로그인이 그대로 살아 있다.
 */
export async function getCurrentUser() {
  const session = await readSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, passwordChangedAt: true },
  })

  if (!user) return null
  if (session.issuedAt < user.passwordChangedAt.getTime()) return null

  return { id: user.id, username: user.username }
}

/** 라우트 핸들러용. 로그인한 사용자의 id 이거나, 없으면 null. */
export async function getActiveUserId() {
  return (await getCurrentUser())?.id ?? null
}
