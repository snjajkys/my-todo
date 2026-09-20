'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  EMPTY_HOLIDAYS,
  toHolidayMap,
  type HolidayMap,
  type HolidayPayload,
} from '@/lib/holiday'

export type DateRange = { from: string; to: string }

/**
 * 범위 안의 휴일을 불러오고, 직접 넣은 휴일을 더하고 뺀다.
 * 달력과 주간 보기가 같이 쓰므로 `useTodoRange` 와 나란히 한 곳에 둔다.
 *
 * range 가 null 이면 아무것도 하지 않는다. 사용자의 로컬 날짜를 아직 모르는
 * 서버 렌더링 시점이 그렇다. range 는 렌더마다 새로 만들지 말고 memo 해서 넘긴다.
 */
export function useHolidays(range: DateRange | null) {
  const [holidays, setHolidays] = useState<HolidayMap>(EMPTY_HOLIDAYS)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!range) return
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(
          `/api/holidays?from=${range.from}&to=${range.to}`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error('휴일을 불러오지 못했습니다.')

        const data: HolidayPayload = await res.json()
        if (!cancelled) {
          setHolidays(toHolidayMap(data))
          setError(null)
        }
      } catch (e) {
        // 휴일을 못 불러온 것으로 달력을 막지는 않는다. 할 일은 그대로 보여야 하고,
        // 주말 표시는 날짜만으로도 되므로 화면이 통째로 비지 않는다.
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '휴일을 불러오지 못했습니다.')
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [range])

  /** 이 날을 내 휴일로. 이미 있으면 이름만 바뀐다. */
  const markCustom = useCallback(async (date: string, name: string) => {
    setError(null)

    // 먼저 화면에 반영한다. 할 일 쪽과 같은 방식이고, 실패하면 되돌린다.
    setHolidays((prev) => {
      const next = new Map(prev.custom)
      next.set(date, name)
      return { ...prev, custom: next }
    })

    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, name }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setHolidays((prev) => {
        const next = new Map(prev.custom)
        next.delete(date)
        return { ...prev, custom: next }
      })
      setError(body?.error ?? '휴일을 등록하지 못했습니다.')
    }
  }, [])

  /** 직접 넣은 휴일 해제. 법정공휴일과 주말은 여기로 지울 수 없다. */
  const clearCustom = useCallback(async (date: string) => {
    setError(null)

    let removed: string | undefined
    setHolidays((prev) => {
      removed = prev.custom.get(date)
      const next = new Map(prev.custom)
      next.delete(date)
      return { ...prev, custom: next }
    })

    const res = await fetch('/api/holidays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      if (removed !== undefined) {
        const name = removed
        setHolidays((prev) => {
          const next = new Map(prev.custom)
          next.set(date, name)
          return { ...prev, custom: next }
        })
      }
      setError(body?.error ?? '휴일을 해제하지 못했습니다.')
    }
  }, [])

  return { holidays, holidayError: error, markCustom, clearCustom }
}
