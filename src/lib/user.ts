import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { prisma } from '@/lib/prisma'
import { safeEqual } from '@/lib/session'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>

const KEY_LENGTH = 64

async function derive(password: string, salt: string) {
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH)

  return key.toString('hex')
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')

  return `${salt}:${await derive(password, salt)}`
}

async function matches(password: string, stored: string) {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false

  return safeEqual(await derive(password, salt), expected)
}

export function isInviteCodeValid(input: unknown) {
  const expected = process.env.INVITE_CODE

  // 초대 코드가 설정돼 있지 않으면 가입을 열어 두지 않고 막는다.
  if (!expected) return false

  return typeof input === 'string' && safeEqual(input.trim(), expected)
}

/** 이미 쓰는 아이디면 null. 성공하면 만들어진 사용자. */
export async function createUser(username: string, password: string) {
  try {
    return await prisma.user.create({
      data: {
        username: normalizeUsername(username),
        passwordHash: await hashPassword(password),
      },
      select: { id: true, username: true },
    })
  } catch {
    // username 유일 제약 위반. 두 사람이 같은 아이디로 동시에 가입해도
    // 뒤늦은 쪽이 여기서 걸린다.
    return null
  }
}

/** 이미 로그인한 사용자가 비밀번호를 다시 입력했을 때 확인한다. */
export async function verifyUserPassword(userId: number, password: unknown) {
  if (typeof password !== 'string') return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })

  if (!user) return false

  return matches(password, user.passwordHash)
}

/**
 * 계정과 그 사람의 할 일을 함께 지운다.
 * 할 일 삭제는 Todo.userId 외래키의 ON DELETE CASCADE 가 처리한다.
 */
export async function deleteUser(userId: number) {
  await prisma.user.delete({ where: { id: userId } })
}

/** 아이디와 비밀번호가 맞으면 사용자, 아니면 null. */
export async function authenticate(username: unknown, password: unknown) {
  if (typeof username !== 'string' || typeof password !== 'string') return null

  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
    select: { id: true, username: true, passwordHash: true },
  })

  if (!user) return null
  if (!(await matches(password, user.passwordHash))) return null

  return { id: user.id, username: user.username }
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}
