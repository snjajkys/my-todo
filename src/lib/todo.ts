import type { Todo as PrismaTodo } from '@/generated/prisma/client'
import type { Todo, TodoType } from '@/types/todo'
import { parseDateOnly, toDateOnly, todayDateOnly } from './date'

const TODO_TYPES: TodoType[] = ['TODAY', 'PERIOD']

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

/** DB 레코드를 API 응답 형태로 변환 (날짜는 "YYYY-MM-DD" 문자열) */
export function serializeTodo(todo: PrismaTodo): Todo {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    type: todo.type === 'PERIOD' ? 'PERIOD' : 'TODAY',
    startDate: toDateOnly(todo.startDate),
    endDate: toDateOnly(todo.endDate),
    completedAt: todo.completedAt?.toISOString() ?? null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  }
}

function isTodoType(value: unknown): value is TodoType {
  return TODO_TYPES.includes(value as TodoType)
}

function normalizeTitle(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

type TodoDates = { startDate: Date | null; endDate: Date | null }

/**
 * 종류에 따라 날짜 필드를 검증한다.
 * - TODAY: 기준 날짜 1개만 사용. 생략하면 서버 기준 오늘로 채운다.
 * - PERIOD: 시작일/종료일 필수, 시작일 <= 종료일
 */
function validateDates(
  type: TodoType,
  rawStart: unknown,
  rawEnd: unknown
): ValidationResult<TodoDates> {
  if (type === 'TODAY') {
    if (rawEnd !== undefined && rawEnd !== null) {
      return { ok: false, error: '오늘 할 일에는 종료일을 지정할 수 없습니다.' }
    }

    // 기준 날짜는 사용자의 로컬 날짜여야 하므로 클라이언트가 보내는 값을 우선한다.
    if (rawStart === undefined || rawStart === null) {
      return {
        ok: true,
        value: { startDate: parseDateOnly(todayDateOnly()), endDate: null },
      }
    }

    const startDate = parseDateOnly(rawStart)
    if (!startDate) {
      return {
        ok: false,
        error: '날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.',
      }
    }

    return { ok: true, value: { startDate, endDate: null } }
  }

  if (
    rawStart === undefined ||
    rawStart === null ||
    rawEnd === undefined ||
    rawEnd === null
  ) {
    return { ok: false, error: '기간 할 일은 시작일과 종료일이 필요합니다.' }
  }

  const startDate = parseDateOnly(rawStart)
  const endDate = parseDateOnly(rawEnd)

  if (!startDate || !endDate) {
    return {
      ok: false,
      error: '날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.',
    }
  }

  if (startDate.getTime() > endDate.getTime()) {
    return { ok: false, error: '종료일은 시작일보다 빠를 수 없습니다.' }
  }

  return { ok: true, value: { startDate, endDate } }
}

export type CreateData = {
  title: string
  type: TodoType
  startDate: Date | null
  endDate: Date | null
}

/** POST 본문 검증 */
export function validateCreate(body: unknown): ValidationResult<CreateData> {
  const input = (body ?? {}) as Record<string, unknown>

  const title = normalizeTitle(input.title)
  if (!title) {
    return { ok: false, error: '제목을 입력해 주세요.' }
  }

  const type = input.type === undefined ? 'TODAY' : input.type
  if (!isTodoType(type)) {
    return { ok: false, error: 'type 은 TODAY 또는 PERIOD 여야 합니다.' }
  }

  const dates = validateDates(type, input.startDate, input.endDate)
  if (!dates.ok) return dates

  return { ok: true, value: { title, type, ...dates.value } }
}

export type UpdateData = Partial<CreateData> & {
  completed?: boolean
  completedAt?: Date | null
}

/**
 * PATCH 본문 검증. 날짜 규칙은 기존 레코드와 병합한 최종 상태 기준으로 판단한다.
 * (예: 이미 PERIOD 인 항목의 종료일만 바꾸는 요청)
 */
export function validateUpdate(
  body: unknown,
  existing: PrismaTodo
): ValidationResult<UpdateData> {
  const input = (body ?? {}) as Record<string, unknown>
  const touched = (key: string) => Object.hasOwn(input, key)

  if (
    !touched('title') &&
    !touched('completed') &&
    !touched('type') &&
    !touched('startDate') &&
    !touched('endDate')
  ) {
    return { ok: false, error: '수정할 내용이 없습니다.' }
  }

  const data: UpdateData = {}

  if (touched('title')) {
    const title = normalizeTitle(input.title)
    if (!title) {
      return { ok: false, error: '제목은 비워 둘 수 없습니다.' }
    }
    data.title = title
  }

  if (touched('completed')) {
    if (typeof input.completed !== 'boolean') {
      return { ok: false, error: 'completed 는 boolean 이어야 합니다.' }
    }
    data.completed = input.completed

    // 완료한 "날"을 알아야 지난 날짜의 완료 항목을 목록에서 내릴 수 있다.
    if (input.completed) {
      if (!existing.completed) data.completedAt = new Date()
    } else {
      data.completedAt = null
    }
  }

  const type = touched('type') ? input.type : existing.type
  if (!isTodoType(type)) {
    return { ok: false, error: 'type 은 TODAY 또는 PERIOD 여야 합니다.' }
  }

  const typeChanged = type !== existing.type
  const datesTouched = touched('startDate') || touched('endDate')

  if (typeChanged || datesTouched) {
    const rawStart = touched('startDate')
      ? input.startDate
      : typeChanged && type === 'TODAY'
        ? // PERIOD -> TODAY 전환은 "오늘부터 할 일"로 보고 기준 날짜를 다시 잡는다.
          // (지난/미래 기간의 날짜를 그대로 물려받으면 이월 표시가 엉뚱해진다)
          undefined
        : toDateOnly(existing.startDate)
    // TODAY 로 바꾸면 종료일은 자동으로 비운다.
    const rawEnd =
      type === 'TODAY' && !touched('endDate')
        ? null
        : touched('endDate')
          ? input.endDate
          : toDateOnly(existing.endDate)

    const dates = validateDates(type, rawStart, rawEnd)
    if (!dates.ok) return dates

    data.type = type
    data.startDate = dates.value.startDate
    data.endDate = dates.value.endDate
  }

  return { ok: true, value: data }
}
