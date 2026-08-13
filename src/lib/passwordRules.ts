// 클라이언트 폼과 서버 라우트가 같은 규칙을 쓰도록 여기에만 둔다.
// src/lib/password.ts 는 Prisma 를 들이므로 클라이언트에서 import 할 수 없다.

export const MIN_PASSWORD_LENGTH = 8

export function validatePassword(input: unknown) {
  if (typeof input !== 'string' || input.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false as const,
      error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    }
  }

  return { ok: true as const, value: input }
}
