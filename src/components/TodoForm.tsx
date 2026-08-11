'use client'

import { useState, type FormEvent } from 'react'
import { useToday } from '@/hooks/useToday'
import { todayDateOnly } from '@/lib/date'
import type { TodoInput, TodoType } from '@/types/todo'

type Props = {
  onAdd: (input: TodoInput) => Promise<void>
}

const TYPE_OPTIONS: { value: TodoType; label: string; hint: string }[] = [
  {
    value: 'TODAY',
    label: '오늘 할 일',
    hint: '못 끝내면 다음 날로 넘어와요',
  },
  { value: 'PERIOD', label: '기간 할 일', hint: '시작일 ~ 종료일이 있는 일' },
]

export default function TodoForm({ onAdd }: Props) {
  const today = useToday()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TodoType>('TODAY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectType = (next: TodoType) => {
    setType(next)
    setLocalError(null)

    // 기간을 처음 고르면 오늘 날짜로 초기값을 채워 준다.
    if (next === 'PERIOD' && !startDate) {
      const base = today ?? todayDateOnly()
      setStartDate(base)
      setEndDate(base)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const trimmed = title.trim()
    if (!trimmed) return

    if (type === 'PERIOD') {
      if (!startDate || !endDate) {
        setLocalError('기간 할 일은 시작일과 종료일을 모두 선택해 주세요.')
        return
      }
      if (startDate > endDate) {
        setLocalError('종료일은 시작일보다 빠를 수 없습니다.')
        return
      }
    }

    setLocalError(null)
    setSubmitting(true)
    try {
      await onAdd({
        title: trimmed,
        type,
        // 오늘 할 일의 기준 날짜는 사용자의 로컬 "오늘" 이어야 한다.
        startDate: type === 'PERIOD' ? startDate : (today ?? todayDateOnly()),
        endDate: type === 'PERIOD' ? endDate : null,
      })
      // 종류/기간은 연속 입력에 대비해 유지하고 제목만 비운다.
      setTitle('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      // min/max 는 날짜 선택 UI 를 좁혀 주는 용도로만 두고,
      // 검증 메시지는 아래 handleSubmit 에서 일관되게 처리한다.
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">할 일 종류</legend>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => selectType(option.value)}
              aria-pressed={type === option.value}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                type === option.value
                  ? 'border-ink bg-ink-soft'
                  : 'border-border hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {type === 'PERIOD' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted">시작일</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/25"
            />
          </label>
          <span className="hidden pb-2.5 text-muted sm:block">~</span>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted">종료일</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/25"
            />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          aria-label="할 일 제목"
          maxLength={200}
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/25"
        />
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '등록'}
        </button>
      </div>

      {localError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {localError}
        </p>
      )}
    </form>
  )
}
