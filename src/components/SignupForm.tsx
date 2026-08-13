'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
} from '@/lib/accountRules'

const inputClass =
  'rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft'

export default function SignupForm() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const trimmedName = username.trim()
  const nameTooShort =
    trimmedName.length > 0 && trimmedName.length < MIN_USERNAME_LENGTH
  const passwordTooShort =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH
  const mismatch = confirmation.length > 0 && password !== confirmation

  const canSubmit =
    inviteCode.trim().length > 0 &&
    trimmedName.length >= MIN_USERNAME_LENGTH &&
    trimmedName.length <= MAX_USERNAME_LENGTH &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmation

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !canSubmit) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, username, password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? '가입하지 못했습니다.')
        return
      }

      router.replace('/')
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="inviteCode" className="text-sm font-medium">
          초대 코드
        </label>
        <input
          id="inviteCode"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          autoFocus
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          아이디
        </label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          maxLength={MAX_USERNAME_LENGTH}
          required
          aria-describedby="username-hint"
          className={inputClass}
        />
        <p
          id="username-hint"
          className={`text-xs ${nameTooShort ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}
        >
          한글, 영문, 숫자, - _ 로 {MIN_USERNAME_LENGTH}~{MAX_USERNAME_LENGTH}자.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          aria-describedby="password-hint"
          className={inputClass}
        />
        <p
          id="password-hint"
          className={`text-xs ${passwordTooShort ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}
        >
          {MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmation" className="text-sm font-medium">
          비밀번호 확인
        </label>
        <input
          id="confirmation"
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="new-password"
          required
          className={inputClass}
        />
        {mismatch && (
          <p className="text-xs text-red-600 dark:text-red-400">
            두 입력이 서로 다릅니다.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition-colors hover:bg-ink-strong disabled:opacity-50"
      >
        {submitting ? '만드는 중...' : '내 다이어리 만들기'}
      </button>

      <p className="text-center text-sm text-muted">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-medium text-ink-text underline">
          로그인
        </Link>
      </p>
    </form>
  )
}
