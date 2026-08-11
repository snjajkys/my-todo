'use client'

import { formatFullDate } from '@/lib/date'
import { useToday } from '@/hooks/useToday'

export default function TodayBanner() {
  const today = useToday()

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
          className="truncate text-base font-semibold"
          suppressHydrationWarning
        >
          {today ? formatFullDate(today) : ' '}
        </p>
      </div>
    </div>
  )
}
