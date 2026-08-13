// 가입 폼과 서버 라우트가 같은 규칙을 쓰도록 여기에만 둔다.
// src/lib/user.ts 는 Prisma 를 들이므로 클라이언트에서 import 할 수 없다.

export const MIN_PASSWORD_LENGTH = 8
export const MIN_USERNAME_LENGTH = 2
export const MAX_USERNAME_LENGTH = 20

// 아이디는 대소문자 구분 없이 저장하므로, 헷갈릴 여지가 적은 글자만 받는다.
const USERNAME_PATTERN = /^[a-z0-9가-힣_-]+$/i

export function validateUsername(input: unknown) {
  const username = typeof input === 'string' ? input.trim() : ''

  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH
  ) {
    return {
      ok: false as const,
      error: `아이디는 ${MIN_USERNAME_LENGTH}~${MAX_USERNAME_LENGTH}자여야 합니다.`,
    }
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false as const,
      error: '아이디에는 한글, 영문, 숫자, - _ 만 쓸 수 있습니다.',
    }
  }

  return { ok: true as const, value: username }
}

export function validatePassword(input: unknown) {
  if (typeof input !== 'string' || input.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false as const,
      error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    }
  }

  return { ok: true as const, value: input }
}
