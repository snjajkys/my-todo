'use client'

import { useState } from 'react'

type Props = {
  id: number
  username: string
  createdAt: string
  todoCount: number
  isSelf: boolean
}

export default function AdminAccountRow({
  id,
  username,
  createdAt,
  todoCount,
  isSelf,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [issued, setIssued] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = async () => {
    if (submitting) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })

      const body = await res.json().catch(() => null)

      if (!res.ok) {
        setError(body?.error ?? '재설정하지 못했습니다.')
        return
      }

      setIssued(body.temporaryPassword)
      setConfirming(false)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {username}
            {isSelf && (
              <span className="ml-2 text-xs font-normal text-muted">(나)</span>
            )}
          </span>
          <span className="text-xs text-muted">
            가입 {createdAt} · 할 일 {todoCount}건
          </span>
        </div>

        {isSelf ? (
          <span className="text-sm text-muted">계정 설정에서 변경</span>
        ) : confirming ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? '재설정 중...' : '정말 재설정'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIssued(null)
              setConfirming(true)
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            비밀번호 재설정
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {issued && (
        <div className="rounded-lg border border-ink bg-ink-soft px-4 py-3">
          <p className="text-sm font-medium">
            임시 비밀번호:{' '}
            <code className="font-mono text-base tracking-wide">{issued}</code>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            이 화면을 벗어나면 다시 볼 수 없습니다. {username} 님에게 전달하고,
            로그인한 뒤 직접 바꾸도록 안내해 주세요. 기존 로그인은 모두 해제됐습니다.
          </p>
        </div>
      )}
    </li>
  )
}
