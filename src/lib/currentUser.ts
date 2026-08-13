import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, readSessionToken } from '@/lib/session'

// 프록시는 쿠키의 서명만 확인한다. 여기서는 그 결과를 실제 사용자로 바꿔,
// 라우트 핸들러와 서버 컴포넌트가 "누구의 요청인지" 알 수 있게 한다.

/** 로그인한 사용자의 id. 로그인하지 않았으면 null. */
export async function getSessionUserId() {
  try {
    const store = await cookies()

    return readSessionToken(store.get(SESSION_COOKIE)?.value)
  } catch {
    // AUTH_SECRET 미설정 등. 확인할 수 없으면 로그인하지 않은 것으로 본다.
    return null
  }
}

/**
 * 로그인한 사용자. 세션은 30일이라 그 사이 계정이 지워졌을 수 있으므로
 * id 가 실제로 존재하는지까지 확인한다.
 *
 * 서명만 확인하고 넘어가면 지워진 계정의 쿠키로도 API 가 200 을 돌려주고,
 * 그 상태로 할 일을 추가하면 외래키 위반으로 500 이 난다.
 */
export async function getCurrentUser() {
  const userId = await getSessionUserId()
  if (userId === null) return null

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  })
}

/** 라우트 핸들러용. 로그인한 사용자의 id 이거나, 없으면 null. */
export async function getActiveUserId() {
  return (await getCurrentUser())?.id ?? null
}
