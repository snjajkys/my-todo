import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isWeekend,
  markOf,
  weekdayOf,
  yearsIn,
  type HolidayMap,
} from './holiday.ts'

const holidays = (
  pub: [string, string][] = [],
  custom: [string, string][] = []
): HolidayMap => ({ public: new Map(pub), custom: new Map(custom) })

test('요일을 로컬 기준으로 읽는다', () => {
  // 2026-09-20 은 일요일, 09-19 는 토요일.
  assert.equal(weekdayOf('2026-09-20'), 0)
  assert.equal(weekdayOf('2026-09-19'), 6)
  assert.equal(weekdayOf('2026-09-21'), 1)
})

test('토요일과 일요일이 주말이다', () => {
  assert.equal(isWeekend('2026-09-19'), true)
  assert.equal(isWeekend('2026-09-20'), true)
  assert.equal(isWeekend('2026-09-21'), false)
})

test('평일은 아무 표시도 없다', () => {
  assert.equal(markOf('2026-09-21', holidays()), null)
})

test('주말은 토요일과 일요일을 구별한다', () => {
  assert.equal(markOf('2026-09-19', holidays())?.kind, 'saturday')
  assert.equal(markOf('2026-09-20', holidays())?.kind, 'sunday')
})

test('주말에는 이름이 없다', () => {
  assert.equal(markOf('2026-09-20', holidays())?.name, null)
})

test('일요일에 걸린 공휴일은 일요일이 아니라 공휴일로 읽는다', () => {
  // 이 순서가 뒤집히면 일요일에 걸린 삼일절이 이름 없이 그냥 일요일로 보인다.
  const mark = markOf('2026-09-20', holidays([['2026-09-20', '삼일절']]))

  assert.equal(mark?.kind, 'public')
  assert.equal(mark?.name, '삼일절')
})

test('직접 넣은 휴일이 공휴일보다 앞선다', () => {
  const mark = markOf(
    '2026-09-21',
    holidays([['2026-09-21', '임시공휴일']], [['2026-09-21', '재량휴업일']])
  )

  assert.equal(mark?.kind, 'custom')
  assert.equal(mark?.name, '재량휴업일')
})

test('직접 넣은 휴일은 평일에도 쉬는 날이 된다', () => {
  const mark = markOf('2026-09-21', holidays([], [['2026-09-21', '재량휴업일']]))

  assert.equal(mark?.isOff, true)
})

test('범위에 걸친 해를 모두 모은다', () => {
  // 달력 격자는 앞뒤 달을 물고 있어 12월 화면이 다음 해까지 넘어간다.
  assert.deepEqual(yearsIn('2026-12-27', '2027-01-02'), [2026, 2027])
  assert.deepEqual(yearsIn('2026-03-01', '2026-03-31'), [2026])
})

test('뒤집힌 범위는 빈 목록을 준다', () => {
  assert.deepEqual(yearsIn('2027-01-01', '2026-01-01'), [])
})
