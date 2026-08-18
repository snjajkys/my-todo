'use client'

import { useMemo, useState } from 'react'
import { useToday } from '@/hooks/useToday'
import { useTodoRange } from '@/hooks/useTodoRange'
import {
  eachDate,
  formatFullDate,
  formatMonth,
  monthGridRange,
  monthOf,
  shiftMonth,
} from '@/lib/date'
import type { Todo } from '@/types/todo'
import TodoForm from './TodoForm'
import TodoItem from './TodoItem'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 한 칸에 점을 다 찍으면 좁은 화면에서 뭉개진다. 넘치는 개수는 숫자로 알린다.
const MAX_DOTS = 3

export default function CalendarView() {
  const today = useToday()

  // 기본값은 "오늘이 있는 달"이고, 화살표로 옮기면 그때부터 고른 값이 이긴다.
  // 이렇게 파생해 두면 초기값을 이펙트로 밀어 넣지 않아도 되고, 아무 데도 안 옮긴
  // 상태로 자정을 넘기면 달력도 새 날짜를 따라간다.
  //
  // 서버 렌더링 시점에는 사용자의 로컬 날짜를 알 수 없어 useToday 가 null 을 준다.
  // 그때는 month 도 null 이라 격자를 그리지 않는다. 시간대가 다른 기기에서 하루
  // 어긋난 달을 잠깐 그렸다가 고치는 일을 피하기 위해서다.
  const [pickedMonth, setPickedMonth] = useState<string | null>(null)
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const month = pickedMonth ?? (today ? monthOf(today) : null)
  const selected = pickedDate ?? today

  // 격자는 그 달을 감싸는 일요일~토요일이라 앞뒤 달의 며칠을 포함한다.
  // 조회 범위도 같은 값을 써야 그 칸들이 빈 채로 남지 않는다.
  const grid = useMemo(() => (month ? monthGridRange(month) : null), [month])

  const { byDate, loading, error, add, update, remove } = useTodoRange(grid)

  const days = useMemo(() => (grid ? eachDate(grid.from, grid.to) : []), [grid])

  const selectedItems = (selected && byDate.get(selected)) || []

  const goMonth = (delta: number) => {
    if (!month) return

    const next = shiftMonth(month, delta)
    setPickedMonth(next)
    // 옮겨 간 달에 오늘이 있으면 오늘을, 아니면 1일을 펼쳐 둔다.
    setPickedDate(today && monthOf(today) === next ? today : `${next}-01`)
  }

  const renderDots = (items: Todo[]) => (
    <span className="mt-1 flex h-2 items-center justify-center gap-0.5">
      {items.slice(0, MAX_DOTS).map((todo) => (
        <span
          key={todo.id}
          className={`h-1.5 w-1.5 rounded-full ${
            todo.completed
              ? 'bg-muted/40'
              : todo.type === 'TODAY'
                ? 'bg-ink'
                : 'bg-sepia'
          }`}
        />
      ))}
      {items.length > MAX_DOTS && (
        <span className="text-[9px] leading-none text-muted">
          +{items.length - MAX_DOTS}
        </span>
      )}
    </span>
  )

  if (!month) {
    return <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          aria-label="이전 달"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          ‹
        </button>

        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
          {today && monthOf(today) !== month && (
            <button
              type="button"
              // 고른 값을 지우면 기본값(오늘이 있는 달)으로 돌아간다.
              onClick={() => {
                setPickedMonth(null)
                setPickedDate(null)
              }}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              오늘
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => goMonth(1)}
          aria-label="다음 달"
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

      <div>
        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAYS.map((label, i) => (
            <div
              key={label}
              className={`py-1 text-center text-xs font-medium ${
                i === 0
                  ? 'text-red-500 dark:text-red-400'
                  : i === 6
                    ? 'text-ink-text'
                    : 'text-muted'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          className={`grid grid-cols-7 gap-1 transition-opacity ${
            loading ? 'opacity-50' : ''
          }`}
        >
          {days.map((date) => {
            const items = byDate.get(date) ?? []
            const inMonth = monthOf(date) === month

            return (
              <button
                key={date}
                type="button"
                onClick={() => setPickedDate(date)}
                aria-pressed={date === selected}
                aria-label={formatFullDate(date)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition ${
                  date === selected
                    ? 'border-ink bg-ink-soft'
                    : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
                } ${inMonth ? '' : 'opacity-40'}`}
              >
                <span
                  className={
                    date === today
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white'
                      : ''
                  }
                >
                  {Number(date.slice(8))}
                </span>
                {renderDots(items)}
              </button>
            )
          })}
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            오늘 할 일
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sepia" />
            기간 할 일
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />
            완료
          </span>
        </p>
      </div>

      {selected && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
              {formatFullDate(selected)}
              <span className="font-normal text-muted">
                {selectedItems.length}개
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              aria-expanded={adding}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              {adding ? '닫기' : '+ 이 날에 추가'}
            </button>
          </div>

          {adding && (
            <div className="mb-3">
              {/* 날짜를 바꾸면 입력 중이던 기간도 새 날짜로 다시 잡히도록 새로 띄운다 */}
              <TodoForm key={selected} baseDate={selected} onAdd={add} />
            </div>
          )}

          {selectedItems.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {selectedItems.map((todo) => (
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
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              이 날에 기록된 할 일이 없습니다.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
