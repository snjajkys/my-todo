'use client'

import { useMemo, useState } from 'react'
import { useToday } from '@/hooks/useToday'
import { useTodoRange } from '@/hooks/useTodoRange'
import { addDays, eachDate, formatShortDate, weekRangeOf } from '@/lib/date'
import TodoForm from './TodoForm'
import TodoItem from './TodoItem'

export default function WeekView() {
  const today = useToday()

  // 달력과 같은 방식. 기본은 "오늘이 든 주"이고, 화살표로 옮기면 고른 값이 이긴다.
  // 서버 렌더링 시점에는 로컬 날짜를 몰라 null 이므로 아무것도 그리지 않는다.
  const [pickedAnchor, setPickedAnchor] = useState<string | null>(null)
  const [addingOn, setAddingOn] = useState<string | null>(null)

  const anchor = pickedAnchor ?? today

  const week = useMemo(() => (anchor ? weekRangeOf(anchor) : null), [anchor])

  const { byDate, loading, error, add, update, remove } = useTodoRange(week)

  const days = useMemo(
    () => (week ? eachDate(week.from, week.to) : []),
    [week]
  )

  const goWeek = (delta: number) => {
    if (!anchor) return
    setPickedAnchor(addDays(anchor, delta * 7))
    setAddingOn(null)
  }

  if (!week) {
    return <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>
  }

  const thisWeek = today ? weekRangeOf(today).from === week.from : false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goWeek(-1)}
          aria-label="지난 주"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          ‹
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 className="text-center text-sm font-semibold sm:text-base">
            {formatShortDate(week.from)} ~ {formatShortDate(week.to)}
          </h2>
          {!thisWeek && (
            <button
              type="button"
              // 고른 값을 지우면 기본값(오늘이 든 주)으로 돌아간다.
              onClick={() => {
                setPickedAnchor(null)
                setAddingOn(null)
              }}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              이번 주
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => goWeek(1)}
          aria-label="다음 주"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          ›
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div
        className={`flex flex-col gap-5 transition-opacity ${
          loading ? 'opacity-50' : ''
        }`}
      >
        {days.map((date) => {
          const items = byDate.get(date) ?? []
          const active = items.filter((t) => !t.completed).length

          return (
            <section key={date}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1.5">
                <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                  <span className={date === today ? 'text-ink-text' : ''}>
                    {formatShortDate(date)}
                  </span>
                  {date === today && (
                    <span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      오늘
                    </span>
                  )}
                  {items.length > 0 && (
                    <span className="text-xs font-normal text-muted">
                      {active > 0 ? `미완료 ${active}개` : '모두 완료'}
                    </span>
                  )}
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setAddingOn((open) => (open === date ? null : date))
                  }
                  aria-expanded={addingOn === date}
                  className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {addingOn === date ? '닫기' : '+ 추가'}
                </button>
              </div>

              {addingOn === date && (
                <div className="mb-2">
                  {/* 날짜가 바뀌면 입력 중이던 기간도 새 날짜로 다시 잡히도록 새로 띄운다 */}
                  <TodoForm key={date} baseDate={date} onAdd={add} />
                </div>
              )}

              {items.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {items.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      today={today}
                      onUpdate={update}
                      onDelete={remove}
                    />
                  ))}
                </ul>
              ) : (
                addingOn !== date && (
                  <p className="px-1 py-1 text-xs text-muted">비어 있음</p>
                )
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
