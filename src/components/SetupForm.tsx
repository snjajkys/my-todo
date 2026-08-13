'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordRules'

export default function SetupForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH
  const mismatch = confirmation.length > 0 && password !== confirmation
  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmation

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !canSubmit) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? '비밀번호를 등록하지 못했습니다.')

        // 그 사이 누군가 먼저 등록했다면 로그인 화면으로 보낸다.
        if (res.status === 409) router.replace('/login')
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
        <label htmlFor="password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          required
          aria-describedby="password-hint"
          className="rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft"
        />
        <p
          id="password-hint"
          className={`text-xs ${tooShort ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}
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
          className="rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft"
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
        {submitting ? '등록 중...' : '비밀번호 등록하기'}
      </button>
    </form>
  )
}
