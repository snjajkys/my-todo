'use client'

import { useState, type FormEvent } from 'react'
import {
  describePeriod,
  formatShortDate,
  todayDateOnly,
  type PeriodTone,
} from '@/lib/date'
import { describeCarryOver } from '@/lib/todoView'
import type { Todo, TodoType } from '@/types/todo'

type Props = {
  todo: Todo
  today: string | null
  onUpdate: (
    id: number,
    data: {
      title?: string
      completed?: boolean
      type?: TodoType
      startDate?: string | null
      endDate?: string | null
    }
  ) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const TONE_CLASS: Record<PeriodTone, string> = {
  upcoming: 'text-muted',
  active: 'text-ink-text',
  due: 'text-orange-600 dark:text-orange-400',
  overdue: 'text-red-600 dark:text-red-400',
}

export default function TodoItem({ todo, today, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(todo.title)
  const [draftType, setDraftType] = useState<TodoType>(todo.type)
  const [draftStart, setDraftStart] = useState(todo.startDate ?? '')
  const [draftEnd, setDraftEnd] = useState(todo.endDate ?? '')
  const [draftError, setDraftError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const startEdit = () => {
    setDraftTitle(todo.title)
    setDraftType(todo.type)
    setDraftStart(todo.startDate ?? '')
    setDraftEnd(todo.endDate ?? '')
    setDraftError(null)
    setEditing(true)
  }

  const selectDraftType = (next: TodoType) => {
    setDraftType(next)
    setDraftError(null)
    if (next === 'PERIOD' && !draftEnd) {
      const base = draftStart || today || todayDateOnly()
      setDraftStart(base)
      setDraftEnd(base)
    }
  }

  const handleToggle = async () => {
    setBusy(true)
    try {
      await onUpdate(todo.id, { completed: !todo.completed })
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = draftTitle.trim()
    if (!trimmed) return

    if (draftType === 'PERIOD') {
      if (!draftStart || !draftEnd) {
        setDraftError('시작일과 종료일을 모두 선택해 주세요.')
        return
      }
      if (draftStart > draftEnd) {
        setDraftError('종료일은 시작일보다 빠를 수 없습니다.')
        return
      }
    }

    const unchanged =
      trimmed === todo.title &&
      draftType === todo.type &&
      (draftType === 'TODAY'
        ? true
        : draftStart === todo.startDate && draftEnd === todo.endDate)

    if (unchanged) {
      setEditing(false)
      return
    }

    setBusy(true)
    try {
      await onUpdate(todo.id, {
        title: trimmed,
        type: draftType,
        startDate:
          draftType === 'PERIOD'
            ? draftStart
            : todo.type === 'TODAY'
              ? // 이미 오늘 할 일이면 기준 날짜를 그대로 둔다 (이월 상태 보존)
                todo.startDate
              : // 기간 -> 오늘 전환이면 오늘로 다시 잡는다
                (today ?? todayDateOnly()),
        endDate: draftType === 'PERIOD' ? draftEnd : null,
      })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await onDelete(todo.id)
    } finally {
      setBusy(false)
    }
  }

  const period =
    todo.type === 'PERIOD' && todo.startDate && todo.endDate
      ? describePeriod(todo.startDate, todo.endDate, today)
      : null
  const carryOver = describeCarryOver(todo, today)

  if (editing) {
    return (
      <li className="rounded-xl border border-ink bg-card px-4 py-3 shadow-sm">
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-3">
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
            maxLength={200}
            aria-label="할 일 제목 수정"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/25"
          />

          <div role="group" aria-label="할 일 종류 수정" className="flex gap-2">
            {(['TODAY', 'PERIOD'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => selectDraftType(value)}
                aria-pressed={draftType === value}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  draftType === value
                    ? 'border-ink bg-ink-soft'
                    : 'border-border text-muted hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {value === 'TODAY' ? '오늘' : '기간'}
              </button>
            ))}
          </div>

          {draftType === 'PERIOD' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                value={draftStart}
                max={draftEnd || undefined}
                onChange={(e) => setDraftStart(e.target.value)}
                aria-label="시작일 수정"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
              <span className="hidden text-muted sm:block">~</span>
              <input
                type="date"
                value={draftEnd}
                min={draftStart || undefined}
                onChange={(e) => setDraftEnd(e.target.value)}
                aria-label="종료일 수정"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-ink"
              />
            </div>
          )}

          {draftError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {draftError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !draftTitle.trim()}
              className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-strong disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              취소
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition hover:shadow ${
        carryOver ? 'border-red-300 dark:border-red-900/70' : 'border-border'
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        disabled={busy}
        aria-label={`${todo.title} 완료 여부`}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-ink"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              todo.type === 'TODAY'
                ? 'bg-ink-soft text-ink-text'
                : 'bg-sepia-soft text-sepia-text'
            }`}
          >
            {todo.type === 'TODAY' ? '오늘' : '기간'}
          </span>
          <span
            className={`min-w-0 break-words text-sm ${
              todo.completed ? 'text-muted line-through' : ''
            }`}
          >
            {todo.title}
          </span>
        </div>

        {period && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{period.range}</span>
            {period.label && !todo.completed && (
              <span className={`font-medium ${TONE_CLASS[period.tone]}`}>
                {period.label}
              </span>
            )}
          </p>
        )}

        {carryOver && todo.startDate && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{formatShortDate(todo.startDate)}</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {carryOver.label}
            </span>
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={startEdit}
          disabled={busy}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          수정
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          삭제
        </button>
      </div>
    </li>
  )
}
