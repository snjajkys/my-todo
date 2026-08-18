import type { Todo } from '@/types/todo'
import { diffInDays, eachDate, localDateOfTimestamp } from './date'

/**
 * 오늘 날짜 기준으로 목록에 보여줄 항목인지 판단한다.
 *
 * - PERIOD: 언제나 표시 (기간 자체가 표시되므로 날짜로 거르지 않는다)
 * - TODAY(미완료): 기준 날짜가 지났으면 끝낼 때까지 계속 표시.
 *   즉 오늘 처리하지 못한 일은 다음 날에도 그대로 남는다.
 *   반대로 달력에서 앞날에 미리 적어 둔 일은 그날이 오기 전까지는 넣지 않는다.
 *   미래만 걸러 내므로, 시간대 차이로 기준 날짜가 하루 밀리더라도 항목이
 *   영영 사라지지 않고 늦어도 다음 날에는 목록에 올라온다.
 * - TODAY(완료): "완료한 날"에만 표시. 어제 끝낸 일이 오늘 목록을 채우지 않게 한다.
 */
export function isVisibleOn(todo: Todo, today: string | null): boolean {
  // 날짜를 아직 모르는 서버 렌더링 시점에는 거르지 않는다.
  if (!today) return true
  if (todo.type === 'PERIOD') return true
  if (!todo.completed) return !todo.startDate || todo.startDate <= today

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

/**
 * 달력에서 이 할 일이 놓일 날짜 칸들. from ~ to 밖은 잘라낸다.
 *
 * - PERIOD: 시작일 ~ 종료일 전 구간
 * - TODAY(완료): 완료한 날 하루
 * - TODAY(미완료): 등록한 날 하루
 *
 * 마지막 규칙은 오늘 화면(`isVisibleOn`)과 일부러 다르게 잡았다. 오늘 화면은
 * 끝낼 때까지 매일 다시 보여 주지만, 그 규칙을 격자에 그대로 옮기면 3일 밀린 일
 * 하나가 칸 세 개를 채워 달력을 못 쓰게 만든다. 밀렸다는 사실은 칸을 늘리는 대신
 * `describeCarryOver` 의 딱지로 알린다.
 *
 * 완료 시각은 UTC 인데 "며칠에 한 일"은 보는 사람의 로컬 날짜라야 하므로,
 * 이 판단은 서버가 아니라 반드시 브라우저에서 한다.
 */
export function dateKeysOf(todo: Todo, from: string, to: string): string[] {
  if (todo.type === 'PERIOD') {
    if (!todo.startDate || !todo.endDate) return []

    // 격자 밖으로 뻗은 기간은 잘라 낸다. 몇 달짜리 기간도 칸 수만큼만 만든다.
    const start = todo.startDate > from ? todo.startDate : from
    const end = todo.endDate < to ? todo.endDate : to

    return start > end ? [] : eachDate(start, end)
  }

  const day = todo.completed
    ? todo.completedAt
      ? localDateOfTimestamp(todo.completedAt)
      : todo.startDate
    : todo.startDate

  return day && day >= from && day <= to ? [day] : []
}
