'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MIN_PASSWORD_LENGTH } from '@/lib/accountRules'

const inputClass =
  'rounded-lg border border-border bg-card px-4 py-2.5 outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft'

export default function ChangePassword() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH
  const mismatch = confirmation.length > 0 && next !== confirmation
  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_PASSWORD_LENGTH &&
    next === confirmation

  const close = () => {
    setOpen(false)
    setCurrent('')
    setNext('')
    setConfirmation('')
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !canSubmit) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? '비밀번호를 바꾸지 못했습니다.')
        return
      }

      close()
      setDone(true)
      // 새 쿠키를 받았으므로 서버 쪽 판단을 다시 받아 온다.
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-10 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => {
            setDone(false)
            setOpen(true)
          }}
          className="text-sm text-muted underline underline-offset-2 transition-colors hover:text-foreground"
        >
          비밀번호 변경
        </button>
        {done && (
          <p role="status" className="mt-2 text-sm text-ink-text">
            비밀번호를 바꿨습니다. 다른 기기에 남아 있던 로그인은 모두 해제됩니다.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-10 border-t border-border pt-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      >
        <h2 className="font-semibold">비밀번호 변경</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="current-password" className="text-sm font-medium">
            현재 비밀번호
          </label>
          <input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="new-password" className="text-sm font-medium">
            새 비밀번호
          </label>
          <input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
            aria-describedby="new-password-hint"
            className={inputClass}
          />
          <p
            id="new-password-hint"
            className={`text-xs ${tooShort ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}
          >
            {MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="new-password-confirm" className="text-sm font-medium">
            새 비밀번호 확인
          </label>
          <input
            id="new-password-confirm"
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

        <p className="text-xs leading-relaxed text-muted">
          바꾸고 나면 다른 기기에 남아 있던 로그인은 모두 해제됩니다.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition-colors hover:bg-ink-strong disabled:opacity-50"
          >
            {submitting ? '바꾸는 중...' : '변경'}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-lg border border-border px-4 py-2.5 font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
          >
            그만두기
          </button>
        </div>
      </form>
    </div>
  )
}
