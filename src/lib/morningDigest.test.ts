import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMorningDigest,
  isDueOn,
  secondsLeftInKstDay,
  todayInKst,
} from './morningDigest.ts'
import type { Todo } from '../types/todo.ts'

const base: Todo = {
  id: 1,
  title: '할 일',
  completed: false,
  type: 'TODAY',
  priority: 'MEDIUM',
  startDate: '2026-09-20',
  endDate: null,
  completedAt: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
}

const todo = (overrides: Partial<Todo>): Todo => ({ ...base, ...overrides })

test('크론이 도는 UTC 23시는 한국의 다음 날 아침이다', () => {
  // 이 한 줄이 틀리면 알림 전체가 하루 어긋난다.
  assert.equal(todayInKst(new Date('2026-09-20T23:00:00.000Z')), '2026-09-21')
  assert.equal(todayInKst(new Date('2026-09-20T14:59:00.000Z')), '2026-09-20')
})

test('Hobby 크론이 한 시간 늦게 돌아도 같은 날로 본다', () => {
  // 8:00 에 돌든 8:59 에 돌든 한국 날짜는 그대로여야 한다.
  assert.equal(todayInKst(new Date('2026-09-20T23:59:00.000Z')), '2026-09-21')
})

test('아침 알림은 그날 자정까지만 살려 둔다', () => {
  // UTC 23:00 = 한국 아침 8시. 자정까지 16시간 남는다.
  assert.equal(
    secondsLeftInKstDay(new Date('2026-09-20T23:00:00.000Z')),
    16 * 60 * 60
  )

  // 크론이 8:59 에 돌아도 값은 0 보다 커야 한다. 0 을 주면 푸시 서비스가
  // "지금 못 보내면 버려라" 로 읽어, 절전 중인 폰이 알림을 통째로 잃는다.
  assert.ok(secondsLeftInKstDay(new Date('2026-09-20T14:59:59.000Z')) > 0)
})

test('완료한 일은 알리지 않는다', () => {
  assert.equal(isDueOn(todo({ completed: true }), '2026-09-20'), false)
})

test('밀린 오늘 할 일은 계속 알린다', () => {
  assert.equal(isDueOn(todo({ startDate: '2026-09-17' }), '2026-09-20'), true)
})

test('아직 시작하지 않은 일은 알리지 않는다', () => {
  assert.equal(isDueOn(todo({ startDate: '2026-09-25' }), '2026-09-20'), false)

  const upcoming = todo({
    type: 'PERIOD',
    startDate: '2026-10-01',
    endDate: '2026-10-10',
  })
  assert.equal(isDueOn(upcoming, '2026-09-20'), false)
})

test('진행 중이거나 기간이 지난 기간 할 일은 알린다', () => {
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

  assert.equal(isDueOn(active, '2026-09-20'), true)
  assert.equal(isDueOn(overdue, '2026-09-20'), true)
})

test('할 일이 없으면 보낼 내용이 없다고 알려 준다', () => {
  const digest = buildMorningDigest([todo({ completed: true })], '2026-09-20')

  assert.equal(digest.hasWork, false)
})

test('개수를 제목에, 이름을 본문에 담는다', () => {
  const digest = buildMorningDigest(
    [todo({ id: 1, title: '수업안 정리' }), todo({ id: 2, title: '출장 결재' })],
    '2026-09-20'
  )

  assert.equal(digest.title, '오늘 할 일 2개')
  assert.equal(digest.body, '수업안 정리 · 출장 결재')
})

test('중요한 일과 오래 밀린 일이 앞에 온다', () => {
  const digest = buildMorningDigest(
    [
      todo({ id: 1, title: '보통', priority: 'MEDIUM', startDate: '2026-09-20' }),
      todo({ id: 2, title: '중요', priority: 'HIGH', startDate: '2026-09-20' }),
      todo({ id: 3, title: '밀린 보통', priority: 'MEDIUM', startDate: '2026-09-14' }),
    ],
    '2026-09-20'
  )

  assert.equal(digest.body, '중요 · 밀린 보통 · 보통')
})

test('네 개를 넘으면 나머지는 개수로 묶는다', () => {
  const digest = buildMorningDigest(
    Array.from({ length: 5 }, (_, i) => todo({ id: i, title: `일${i}` })),
    '2026-09-20'
  )

  assert.equal(digest.title, '오늘 할 일 5개')
  assert.equal(digest.body, '일0 · 일1 · 일2 외 2개')
})

test('긴 제목은 잘라서 나머지 항목을 가리지 않게 한다', () => {
  const long = '가'.repeat(40)
  const digest = buildMorningDigest([todo({ title: long })], '2026-09-20')

  assert.equal(digest.body, `${'가'.repeat(18)}…`)
})
