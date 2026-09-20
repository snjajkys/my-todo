'use client'

import { useMemo } from 'react'
import { formatFullDate } from '@/lib/date'
import { MARK_BADGE_CLASS, markOf } from '@/lib/holiday'
import { useHolidays } from '@/hooks/useHolidays'
import { useToday } from '@/hooks/useToday'

export default function TodayBanner() {
  const today = useToday()

  // 오늘 하루치만 묻는다. range 를 렌더마다 새로 만들면 훅이 매번 다시 불러온다.
  const range = useMemo(
    () => (today ? { from: today, to: today } : null),
    [today]
  )
  const { holidays } = useHolidays(range)

  const mark = today ? markOf(today, holidays) : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-lg font-bold text-white"
      >
        {today ? Number(today.slice(8, 10)) : '·'}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">오늘</p>
        {/* 서버 렌더링 시에는 날짜를 비워 두고 클라이언트 로컬 시간대로 채운다. */}
        <p
          className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold"
          suppressHydrationWarning
        >
          <span className="truncate">{today ? formatFullDate(today) : ' '}</span>
          {/* 이름이 있는 휴일만 붙인다. 날짜 문자열이 이미 "토요일"이라고 말하고
              있으므로 주말은 한 번 더 적을 필요가 없다. */}
          {mark?.name && (
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${MARK_BADGE_CLASS[mark.kind]}`}
            >
              {mark.name}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
