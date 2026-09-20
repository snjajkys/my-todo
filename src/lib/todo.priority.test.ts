import assert from 'node:assert/strict'
import test from 'node:test'

import { validateCreate, validateUpdate } from './todo.ts'

test('새 할 일은 우선순위를 저장한다', () => {
  const result = validateCreate({
    title: '중요한 일',
    type: 'TODAY',
    startDate: '2026-09-20',
    priority: 'HIGH',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.priority, 'HIGH')
  }
})

test('유효하지 않은 우선순위는 거절한다', () => {
  const result = validateCreate({
    title: '잘못된 우선순위',
    type: 'TODAY',
    startDate: '2026-09-20',
    priority: 'CRITICAL',
  })

  assert.equal(result.ok, false)
  if (result.ok) {
    throw new Error('should be rejected')
  }
  assert.match(result.error, /우선순위/)
})

test('수정 시 우선순위도 변경할 수 있다', () => {
  const result = validateUpdate(
    { priority: 'LOW' },
    {
      id: 1,
      title: '기존 항목',
      completed: false,
      type: 'TODAY',
      priority: 'MEDIUM',
      startDate: new Date('2026-09-20T00:00:00.000Z'),
      endDate: null,
      completedAt: null,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      userId: 1,
    }
  )

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.priority, 'LOW')
  }
})
