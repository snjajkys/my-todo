import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { safeEqual } from '@/lib/session'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>

const KEY_LENGTH = 64

// 사용자가 한 명뿐이라 AppAuth 행은 항상 이 id 하나뿐이다.
const AUTH_ROW_ID = 1

async function derive(password: string, salt: string) {
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH)

  return key.toString('hex')
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')

  return `${salt}:${await derive(password, salt)}`
}

export async function isPasswordRegistered() {
  // 이 결과로 /login 과 /setup 이 서로를 리다이렉트한다. 빌드 시점에 프리렌더되면
  // "아직 등록 안 됨" 판정이 그대로 굳어, 등록을 마쳐도 두 화면이 서로를 튕겨낸다.
  // 여기서 요청 시점 렌더링을 강제해 그 상황을 막는다.
  await connection()

  const row = await prisma.appAuth.findUnique({
    where: { id: AUTH_ROW_ID },
    select: { id: true },
  })

  return row !== null
}

/**
 * 최초 1회만 성공한다. 이미 등록돼 있으면 기본키 충돌로 실패하므로,
 * 두 사람이 동시에 등록 화면을 열어도 뒤늦은 쪽이 덮어쓰지 못한다.
 */
export async function registerPassword(password: string) {
  try {
    await prisma.appAuth.create({
      data: { id: AUTH_ROW_ID, passwordHash: await hashPassword(password) },
    })

    return true
  } catch {
    return false
  }
}

export async function verifyPassword(password: unknown) {
  const row = await prisma.appAuth.findUnique({
    where: { id: AUTH_ROW_ID },
    select: { passwordHash: true },
  })

  if (!row || typeof password !== 'string') return false

  const [salt, expected] = row.passwordHash.split(':')
  if (!salt || !expected) return false

  return safeEqual(await derive(password, salt), expected)
}
