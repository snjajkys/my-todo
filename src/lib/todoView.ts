import type { Todo } from '@/types/todo'
import { diffInDays, localDateOfTimestamp } from './date'

/**
 * 오늘 날짜 기준으로 목록에 보여줄 항목인지 판단한다.
 *
 * - PERIOD: 언제나 표시 (기간 자체가 표시되므로 날짜로 거르지 않는다)
 * - TODAY(미완료): 끝낼 때까지 계속 표시.
 *   즉 오늘 처리하지 못한 일은 다음 날에도 그대로 남는다.
 *   기준 날짜로 거르지 않는 이유는, 사용자와 서버의 시간대가 다르면 기준 날짜가
 *   하루 앞설 수 있는데 그때 항목이 사라지는 쪽이 훨씬 나쁘기 때문이다.
 * - TODAY(완료): "완료한 날"에만 표시. 어제 끝낸 일이 오늘 목록을 채우지 않게 한다.
 */
export function isVisibleOn(todo: Todo, today: string | null): boolean {
  // 날짜를 아직 모르는 서버 렌더링 시점에는 거르지 않는다.
  if (!today) return true
  if (todo.type === 'PERIOD') return true
  if (!todo.completed) return true

  const completedOn = todo.completedAt
    ? localDateOfTimestamp(todo.completedAt)
    : todo.startDate

  return completedOn === null || completedOn === today
}

export type CarryOver = {
  /** 밀린 일수 */
  days: number
  /** "어제 못 끝낸 일" / "3일째 밀린 일" */
  label: string
}

/**
 * 이전 날짜에서 넘어온 미완료 "오늘 할 일" 인지 설명한다.
 * 넘어온 항목이 아니면 null.
 */
export function describeCarryOver(
  todo: Todo,
  today: string | null
): CarryOver | null {
  if (todo.type !== 'TODAY' || todo.completed) return null
  if (!today || !todo.startDate) return null

  const days = diffInDays(todo.startDate, today)
  if (days <= 0) return null

  return {
    days,
    label: days === 1 ? '어제 못 끝낸 일' : `${days}일째 밀린 일`,
  }
}
