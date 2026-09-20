'use client'

import { useState } from 'react'
import type { DayMark } from '@/lib/holiday'

/* ------------------------------------------------------------------ *
 * 이 날을 직접 휴일로 표시하기.
 *
 * 재량휴업일이나 학교 행사처럼 어떤 공공 데이터에도 없는 날을 위한 자리다.
 * 법정공휴일과 주말은 여기서 건드리지 못한다 — 공휴일은 나라가 정하는 것이라
 * 앱에서 지울 수 있게 두면 "달력이 틀렸다"를 사용자가 직접 만들게 된다.
 * ------------------------------------------------------------------ */

const PRESETS = ['재량휴업일', '학교 행사', '개교기념일', '연가']

type Props = {
  date: string
  /** 이 날이 이미 쉬는 날이면 그 정보. 아니면 null */
  mark: DayMark | null
  onMark: (date: string, name: string) => Promise<void>
  onClear: (date: string) => Promise<void>
}

export default function HolidayEditor({ date, mark, onMark, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const isCustom = mark?.kind === 'custom'

  const submit = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || busy) return

    setBusy(true)
    try {
      await onMark(date, trimmed)
      setOpen(false)
      setName('')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    if (busy) return

    setBusy(true)
    try {
      await onClear(date)
    } finally {
      setBusy(false)
    }
  }

  // 이미 직접 넣은 날이면 해제만 보여 준다. 이름을 고치고 싶으면 해제하고 다시 넣으면 된다.
  if (isCustom) {
    return (
      <button
        type="button"
        onClick={clear}
        disabled={busy}
        className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
      >
        {busy ? '해제하는 중...' : `'${mark.name}' 해제`}
      </button>
    )
  }

  // 법정공휴일에는 덧붙일 이유가 없다. 이미 이름이 붙어 있고 이미 쉬는 날이다.
  if (mark?.kind === 'public') return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground"
      >
        + 이 날을 휴일로
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => submit(preset)}
            disabled={busy}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
          >
            {preset}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit(name)
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="직접 입력"
          maxLength={20}
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink-soft"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink-strong disabled:opacity-50"
        >
          등록
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setName('')
          }}
          disabled={busy}
          className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          취소
        </button>
      </form>
    </div>
  )
}
