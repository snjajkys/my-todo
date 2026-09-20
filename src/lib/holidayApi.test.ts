import assert from 'node:assert/strict'
import test from 'node:test'

import {
  keyParam,
  parseHolidays,
  readItems,
  readResultCode,
  toDateOnly,
} from './holidayApi.ts'

/* 공공데이터포털 특일 정보 API 응답을 읽는 규칙.
   실제로 틀리는 자리가 거의 전부 여기라서 따로 묶어 두었다. */

test('여러 개면 배열로 온다', () => {
  const payload = {
    response: {
      body: {
        items: {
          item: [
            { locdate: 20260101, dateName: '1월1일', isHoliday: 'Y' },
            { locdate: 20260301, dateName: '삼일절', isHoliday: 'Y' },
          ],
        },
      },
    },
  }

  assert.equal(readItems(payload).length, 2)
})

test('하나뿐이면 배열이 아니라 객체로 온다', () => {
  // 이걸 놓치면 공휴일이 하나인 응답에서 터진다.
  const payload = {
    response: {
      body: { items: { item: { locdate: 20260101, dateName: '1월1일', isHoliday: 'Y' } } },
    },
  }

  const items = readItems(payload)
  assert.equal(items.length, 1)
  assert.equal(items[0].dateName, '1월1일')
})

test('결과가 없으면 items 가 빈 문자열로 온다', () => {
  const payload = { response: { body: { items: '' } } }

  assert.deepEqual(readItems(payload), [])
})

test('엉뚱한 응답에도 터지지 않는다', () => {
  assert.deepEqual(readItems(null), [])
  assert.deepEqual(readItems({}), [])
  assert.deepEqual(readItems({ response: {} }), [])
  assert.deepEqual(readItems('<xml>오류</xml>'), [])
})

test('isHoliday 가 N 인 날은 걸러 낸다', () => {
  // 어느 날이 쉬는 날인지는 우리가 판단하지 않는다. API 가 말해 주는 대로 따른다.
  // 여기서 검증하는 것은 "그 필드를 실제로 보고 있는가" 하나다.
  const payload = {
    response: {
      body: {
        items: {
          item: [
            { locdate: 20260717, dateName: '쉬지 않는 날', isHoliday: 'N' },
            { locdate: 20260815, dateName: '광복절', isHoliday: 'Y' },
          ],
        },
      },
    },
  }

  assert.deepEqual(parseHolidays(payload), [
    { date: '2026-08-15', name: '광복절' },
  ])
})

test('날짜를 YYYY-MM-DD 로 바꾼다', () => {
  assert.equal(toDateOnly(20260301), '2026-03-01')
  assert.equal(toDateOnly('20261225'), '2026-12-25')
})

test('날짜 형식이 아니면 버린다', () => {
  assert.equal(toDateOnly(undefined), null)
  assert.equal(toDateOnly('2026-03-01'), null)
  assert.equal(toDateOnly(202603), null)
})

test('이름이 비어 있으면 넣지 않는다', () => {
  const payload = {
    response: {
      body: { items: { item: { locdate: 20260101, dateName: '   ', isHoliday: 'Y' } } },
    },
  }

  assert.deepEqual(parseHolidays(payload), [])
})

test('성공 코드가 문자열이든 숫자든 00 으로 읽는다', () => {
  assert.equal(readResultCode({ response: { header: { resultCode: '00' } } }), '00')
  assert.equal(readResultCode({ response: { header: { resultCode: 0 } } }), '00')
  assert.equal(readResultCode({}), null)
})

test('Decoding 키는 인코딩하고 Encoding 키는 그대로 둔다', () => {
  // 원본 키에는 +와 /가 들어 있어 그대로 실으면 깨진다.
  assert.equal(keyParam('ab+cd/ef=='), 'ab%2Bcd%2Fef%3D%3D')

  // 이미 인코딩된 키를 또 인코딩하면 %가 %25가 되어 역시 깨진다.
  assert.equal(keyParam('ab%2Bcd%2Fef%3D%3D'), 'ab%2Bcd%2Fef%3D%3D')
})
