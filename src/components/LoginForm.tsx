'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const inputClass =
  'rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft'

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = username.trim().length > 0 && password.length > 0

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !canSubmit) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
        <label htmlFor="username" className="text-sm font-medium">
          아이디
        </label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          className={inputClass}
        />
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
          autoComplete="current-password"
          required
          className={inputClass}
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
        disabled={submitting || !canSubmit}
        className="rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition-colors hover:bg-ink-strong disabled:opacity-50"
      >
        {submitting ? '확인 중...' : '들어가기'}
      </button>

      <p className="text-center text-sm text-muted">
        초대 코드를 받으셨나요?{' '}
        <Link href="/signup" className="font-medium text-ink-text underline">
          가입하기
        </Link>
      </p>
    </form>
  )
}
