import assert from 'node:assert/strict'
import test from 'node:test'

import { isVisibleOn } from './todoView.ts'
import type { Todo } from '../types/todo.ts'

const TODAY = '2026-09-20'

const base: Todo = {
  id: 1,
  title: '할 일',
  completed: false,
  type: 'TODAY',
  priority: 'MEDIUM',
  startDate: TODAY,
  endDate: null,
  completedAt: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
}

const todo = (overrides: Partial<Todo>): Todo => ({ ...base, ...overrides })

test('날짜를 모르는 서버 렌더링 시점에는 거르지 않는다', () => {
  assert.equal(isVisibleOn(todo({ startDate: '2026-09-27' }), null), true)
})

test('앞날에 적어 둔 오늘 할 일은 그날이 오기 전까지 보이지 않는다', () => {
  assert.equal(isVisibleOn(todo({ startDate: '2026-09-27' }), TODAY), false)
  assert.equal(isVisibleOn(todo({ startDate: TODAY }), TODAY), true)
})

test('밀린 오늘 할 일은 끝낼 때까지 계속 보인다', () => {
  assert.equal(isVisibleOn(todo({ startDate: '2026-09-17' }), TODAY), true)
})

test('다음 주 기간 할 일은 시작일 전에는 오늘 목록에 오르지 않는다', () => {
  // 실제로 겪은 사고: 다음 주 기간을 적으면 그날부터 오늘 목록에 나왔다.
  // 오늘 할 일은 그날이 되어야 나오는데 기간 할 일만 먼저 나와 어긋났다.
  const nextWeek = todo({
    type: 'PERIOD',
    startDate: '2026-09-27',
    endDate: '2026-10-01',
  })

  assert.equal(isVisibleOn(nextWeek, TODAY), false)
  assert.equal(isVisibleOn(nextWeek, '2026-09-27'), true)
})

test('진행 중이거나 기간이 지난 기간 할 일은 보인다', () => {
  const active = todo({
    type: 'PERIOD',
    startDate: '2026-09-15',
    endDate: '2026-09-30',
  })
  const overdue = todo({
    type: 'PERIOD',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
  })

  assert.equal(isVisibleOn(active, TODAY), true)
  assert.equal(isVisibleOn(overdue, TODAY), true)
})

test('완료한 일은 종류와 상관없이 완료한 날에만 보인다', () => {
  // 완료 시각은 보는 사람의 로컬 날짜로 읽는다. 정오(UTC)를 쓰면 어느 시간대에서
  // 테스트를 돌려도 같은 날로 읽힌다.
  const doneToday = '2026-09-20T12:00:00.000Z'
  const doneYesterday = '2026-09-19T12:00:00.000Z'

  assert.equal(
    isVisibleOn(todo({ completed: true, completedAt: doneToday }), TODAY),
    true
  )
  assert.equal(
    isVisibleOn(todo({ completed: true, completedAt: doneYesterday }), TODAY),
    false
  )

  // 기간 할 일도 예외가 아니다. 예전에는 체크한 기간 할 일이 완료 칸에 영영 남았다.
  const period = todo({
    type: 'PERIOD',
    startDate: '2026-09-15',
    endDate: '2026-09-30',
    completed: true,
    completedAt: doneYesterday,
  })
  assert.equal(isVisibleOn(period, TODAY), false)
})

test('완료 시각이 없는 옛 데이터는 기준 날짜를 완료한 날로 본다', () => {
  assert.equal(isVisibleOn(todo({ completed: true }), TODAY), true)
  assert.equal(
    isVisibleOn(todo({ completed: true, startDate: '2026-09-19' }), TODAY),
    false
  )
})
