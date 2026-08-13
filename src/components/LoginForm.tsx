'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? '로그인하지 못했습니다.')
        setPassword('')
        return
      }

      // 쿠키가 붙은 뒤 서버 쪽 판단을 다시 받아야 하므로 refresh 를 함께 부른다.
      router.replace(next)
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
          autoComplete="current-password"
          autoFocus
          required
          className="rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft"
        />
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
        disabled={submitting || password.length === 0}
        className="rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition-colors hover:bg-ink-strong disabled:opacity-50"
      >
        {submitting ? '확인 중...' : '들어가기'}
      </button>
    </form>
  )
}
