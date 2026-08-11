'use client'

import { useSyncExternalStore } from 'react'
import { todayDateOnly } from '@/lib/date'

// 30초마다 스냅샷을 다시 읽어 자정이 지나면 날짜가 자동으로 갱신된다.
// 값이 같으면(같은 날짜 문자열) React 가 리렌더하지 않는다.
function subscribe(onStoreChange: () => void) {
  const id = setInterval(onStoreChange, 30_000)
  return () => clearInterval(id)
}

/**
 * 사용자 로컬 기준 오늘 날짜("YYYY-MM-DD").
 * 서버 렌더링 시에는 null 을 반환해 서버/클라이언트 시간대 차이로 인한
 * hydration 불일치를 피한다.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayDateOnly, () => null)
}
