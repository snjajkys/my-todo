export type TodoType = 'TODAY' | 'PERIOD'
export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type Todo = {
  id: number
  title: string
  completed: boolean
  type: TodoType
  priority: TodoPriority
  /**
   * "YYYY-MM-DD"
   * - TODAY: 그 할 일의 기준 날짜(등록한 날)
   * - PERIOD: 시작일
   */
  startDate: string | null
  /** "YYYY-MM-DD" · PERIOD 일 때만 값이 있음 */
  endDate: string | null
  /** 완료 처리한 시각(ISO). 미완료면 null */
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TodoInput = {
  title: string
  type: TodoType
  priority: TodoPriority
  startDate: string | null
  endDate: string | null
}

export type StatusFilter = 'all' | 'active' | 'completed'
export type TypeFilter = 'all' | TodoType

export const TODO_TYPE_LABEL: Record<TodoType, string> = {
  TODAY: '오늘',
  PERIOD: '기간',
}

export const TODO_PRIORITY_LABEL: Record<TodoPriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
}
