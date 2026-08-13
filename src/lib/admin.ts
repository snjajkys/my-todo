import { randomBytes } from 'node:crypto'
import { getCurrentUser } from '@/lib/currentUser'
import { prisma } from '@/lib/prisma'

// 관리자는 DB 플래그가 아니라 환경변수로 지정한다.
// DB 에 손댈 수 있는 사람이 스스로를 관리자로 올리지 못하게 하려는 것이다.

function normalize(value: string) {
  return value.trim().toLowerCase()
}

/** 로그인한 사용자가 관리자면 그 사용자, 아니면 null. */
export async function getAdminUser() {
  const configured = process.env.ADMIN_USERNAME

  // 지정돼 있지 않으면 관리자 기능 자체를 닫는다.
  if (!configured) return null

  const user = await getCurrentUser()
  if (!user) return null

  return normalize(user.username) === normalize(configured) ? user : null
}

/** 관리 화면에 보여줄 목록. 할 일 "내용"은 담지 않고 개수만 센다. */
export async function listAccounts() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
      passwordChangedAt: true,
      _count: { select: { todos: true } },
    },
    orderBy: { id: 'asc' },
  })
}

// 받아 적기 쉽게 헷갈리는 글자(0/o/1/l/i)는 뺀다.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** 관리자가 값을 직접 정하지 않도록, 임시 비밀번호는 앱이 만든다. */
export function generateTemporaryPassword() {
  const pick = (n: number) =>
    Array.from(randomBytes(n))
      .map((b) => ALPHABET[b % ALPHABET.length])
      .join('')

  return `${pick(4)}-${pick(4)}-${pick(4)}`
}
