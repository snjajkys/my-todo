/* ------------------------------------------------------------------ *
 * 공공데이터포털 특일 정보 API 와 이야기하는 부분.
 *
 * DB 를 건드리지 않는다. 저장은 holidaySync.ts 가 맡는다. 이렇게 갈라 둔 것은
 * 응답을 읽는 규칙을 테스트로 묶어 두기 위해서다 — 이 API 는 형태가 들쭉날쭉해서
 * 실제로 틀리는 자리가 거의 전부 여기다.
 * ------------------------------------------------------------------ */

const ENDPOINT =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'

// 한 해의 공휴일은 스무 날 남짓이다. 넉넉하게 한 번에 받아 온다.
const ROWS = 100

// 외부 API 가 응답하지 않을 때 달력까지 같이 멈추지 않도록 한계를 둔다.
const TIMEOUT_MS = 5000

export type PublicHolidayRow = { date: string; name: string }

export function serviceKey(): string | null {
  return process.env.HOLIDAY_API_KEY || null
}

/** 키가 설정되어 있는지. "왜 공휴일이 안 보이는지" 판단하는 데 쓴다. */
export function holidayApiConfigured(): boolean {
  return serviceKey() !== null
}

/**
 * 공공데이터포털은 인증키를 두 벌로 준다. Encoding 은 이미 URL 인코딩된 것이고
 * Decoding 은 원본이다. 원본을 그대로 실으면 `+` 나 `/` 가 깨지고, 인코딩된 것을
 * 다시 인코딩하면 `%` 가 `%25` 가 되어 역시 깨진다. 어느 쪽을 넣어도 되도록
 * 이미 인코딩된 값인지 보고 정한다.
 */
export function keyParam(key: string): string {
  return /%[0-9A-Fa-f]{2}/.test(key) ? key : encodeURIComponent(key)
}

type ApiItem = {
  locdate?: unknown
  dateName?: unknown
  isHoliday?: unknown
}

/**
 * 응답에서 항목 목록을 꺼낸다.
 *
 * 이 API 는 형태가 한결같지 않다. 결과가 없으면 `items` 가 빈 문자열이고,
 * 하나뿐이면 `item` 이 배열이 아니라 객체로 온다. 그대로 믿고 map 을 돌리면
 * 공휴일이 하나뿐인 응답에서 터진다.
 */
export function readItems(payload: unknown): ApiItem[] {
  const body = (payload as { response?: { body?: { items?: unknown } } })
    ?.response?.body

  const items = (body as { items?: unknown })?.items
  if (!items || typeof items !== 'object') return []

  const item = (items as { item?: unknown }).item
  if (!item) return []

  return Array.isArray(item) ? (item as ApiItem[]) : [item as ApiItem]
}

export function readResultCode(payload: unknown): string | null {
  const code = (payload as { response?: { header?: { resultCode?: unknown } } })
    ?.response?.header?.resultCode

  // 성공 코드가 문자열 "00" 으로 오는 곳과 숫자 0 으로 오는 곳이 섞여 있다.
  if (typeof code === 'string') return code
  if (typeof code === 'number') return String(code).padStart(2, '0')

  return null
}

/** 20260301 (숫자든 문자열이든) -> "2026-03-01" */
export function toDateOnly(locdate: unknown): string | null {
  const raw = String(locdate ?? '')
  if (!/^\d{8}$/.test(raw)) return null

  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

/**
 * 응답 본문에서 "실제로 쉬는 날"만 골라낸다.
 *
 * `isHoliday` 를 반드시 본다. 이 API 는 국경일도 함께 주는데 그중 제헌절은
 * 2008년부터 공휴일이 아니다. 이 한 줄이 없으면 달력에 쉬지 않는 날이 빨갛게 찍힌다.
 */
export function parseHolidays(payload: unknown): PublicHolidayRow[] {
  const rows: PublicHolidayRow[] = []

  for (const item of readItems(payload)) {
    if (item.isHoliday !== 'Y') continue

    const date = toDateOnly(item.locdate)
    const name = typeof item.dateName === 'string' ? item.dateName.trim() : ''

    if (date && name) rows.push({ date, name })
  }

  return rows
}

/** 그 해의 공휴일을 받아 온다. 키가 없으면 null (오류가 아니라 "설정 안 됨"). */
export async function fetchYear(
  year: number
): Promise<PublicHolidayRow[] | null> {
  const key = serviceKey()
  if (!key) return null

  const url =
    `${ENDPOINT}?serviceKey=${keyParam(key)}` +
    `&solYear=${year}&numOfRows=${ROWS}&_type=json`

  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // 우리가 DB 에 캐시하므로 fetch 단계에서 또 캐시할 이유가 없다.
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`특일 정보 API 가 ${res.status} 를 돌려주었습니다.`)
  }

  // 키가 틀리면 JSON 이 아니라 XML 오류 문서가 온다. 무엇이 왔는지 로그에 남겨야
  // "키를 잘못 넣었다"를 알아볼 수 있다.
  const text = await res.text()

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`특일 정보 API 응답을 읽지 못했습니다: ${text.slice(0, 200)}`)
  }

  const code = readResultCode(payload)
  if (code && code !== '00') {
    throw new Error(`특일 정보 API 오류 (resultCode ${code})`)
  }

  return parseHolidays(payload)
}
