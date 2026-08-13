'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteAccount({ username }: { username: string }) {
  const router = useRouter()
  // 실수로 누르는 일이 없도록, 경고와 비밀번호 입력을 한 단계 뒤에 둔다.
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    setOpen(false)
    setPassword('')
    setError(null)
  }

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || password.length === 0) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? '계정을 삭제하지 못했습니다.')
        setPassword('')
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-10 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-muted underline underline-offset-2 transition-colors hover:text-red-600 dark:hover:text-red-400"
        >
          계정 삭제
        </button>
      </div>
    )
  }

  return (
    <div className="mt-10 border-t border-border pt-6">
      <form
        onSubmit={handleDelete}
        className="flex flex-col gap-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-red-700 dark:text-red-300">
            정말 계정을 삭제할까요?
          </h2>
          <p className="text-sm leading-relaxed text-red-700/90 dark:text-red-300/90">
            <strong>{username}</strong> 계정과 지금까지 쓴 할 일이 모두 지워집니다.
            되돌릴 수 없습니다.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="delete-password"
            className="text-sm font-medium text-red-700 dark:text-red-300"
          >
            확인을 위해 비밀번호를 입력하세요
          </label>
          <input
            id="delete-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            className="rounded-lg border border-red-300 bg-card px-4 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-900 dark:focus:ring-red-900/50"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm font-medium text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting || password.length === 0}
            className="rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? '삭제 중...' : '영구 삭제'}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-lg border border-border bg-card px-4 py-2.5 font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
          >
            그만두기
          </button>
        </div>
      </form>
    </div>
  )
}
