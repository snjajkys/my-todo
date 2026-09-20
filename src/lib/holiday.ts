import { fromDateOnly } from './date.ts'

/* ------------------------------------------------------------------ *
 * 쉬는 날 판단.
 *
 * 세 가지가 섞인다.
 *   - 토요일 · 일요일: 날짜만 보면 안다. 데이터가 필요 없다.
 *   - 법정공휴일: 공공데이터포털에서 받아 둔 것 (`PublicHoliday`)
 *   - 직접 넣은 날: 재량휴업일 같은 것 (`CustomHoliday`)
 *
 * 화면은 이 셋을 구별해서 칠해야 한다. 일요일과 공휴일은 빨강, 토요일은 파랑이
 * 한국에서 달력을 읽는 관습이고, 직접 넣은 날은 그 둘과 달라야 "내가 넣은 것"임을
 * 알아볼 수 있다.
 * ------------------------------------------------------------------ */

export type HolidayKind =
  // 일요일
  | 'sunday'
  // 토요일
  | 'saturday'
  // 법정공휴일
  | 'public'
  // 직접 넣은 날
  | 'custom'

export type DayMark = {
  kind: HolidayKind
  /** 공휴일·직접 넣은 날의 이름. 주말이면 null */
  name: string | null
  /** 쉬는 날인가. 지금은 네 가지 모두 참이지만, 부르는 쪽이 뜻을 분명히 하도록 둔다. */
  isOff: boolean
}

/** 그 날짜의 요일 (0 = 일요일). 로컬 기준으로 읽는다. */
export function weekdayOf(date: string): number {
  return fromDateOnly(date).getDay()
}

export function isWeekend(date: string): boolean {
  const day = weekdayOf(date)
  return day === 0 || day === 6
}

export type HolidayMap = {
  /** "YYYY-MM-DD" -> 공휴일 이름 */
  public: Map<string, string>
  /** "YYYY-MM-DD" -> 직접 넣은 이름 */
  custom: Map<string, string>
}

export const EMPTY_HOLIDAYS: HolidayMap = {
  public: new Map(),
  custom: new Map(),
}

/**
 * 그 날짜를 어떻게 칠할지.
 *
 * 순서가 뜻을 정한다. 공휴일을 주말보다 먼저 보는 것은, 일요일에 걸린 삼일절을
 * "일요일"이 아니라 "삼일절"로 읽어야 하기 때문이다. 직접 넣은 날을 맨 앞에 두는
 * 것은, 본인이 굳이 적어 둔 이름이 있다면 그게 가장 알고 싶은 것이라서다.
 *
 * 쉬는 날이 아니면 null.
 */
export function markOf(date: string, holidays: HolidayMap): DayMark | null {
  const custom = holidays.custom.get(date)
  if (custom) return { kind: 'custom', name: custom, isOff: true }

  const name = holidays.public.get(date)
  if (name) return { kind: 'public', name, isOff: true }

  const day = weekdayOf(date)
  if (day === 0) return { kind: 'sunday', name: null, isOff: true }
  if (day === 6) return { kind: 'saturday', name: null, isOff: true }

  return null
}

/* ── 화면에서 쓰는 색 ────────────────────────────────
   한 곳에 모아 둔다. 달력과 주간 보기와 메인 날짜표가 서로 다른 색을 쓰면
   같은 날이 화면마다 달라 보인다. */

/** 날짜 숫자에 입히는 글자색 */
export const MARK_TEXT_CLASS: Record<HolidayKind, string> = {
  // 일요일과 공휴일은 빨강. 한국 달력을 읽는 관습이다.
  sunday: 'text-red-500 dark:text-red-400',
  public: 'text-red-500 dark:text-red-400',
  // 토요일은 파랑.
  saturday: 'text-blue-500 dark:text-blue-400',
  // 직접 넣은 날은 앞의 둘과 구별되어야 "내가 넣은 것"임을 알아본다.
  custom: 'text-amber-600 dark:text-amber-400',
}

/** 휴일 이름표의 배경까지 포함한 색 */
export const MARK_BADGE_CLASS: Record<HolidayKind, string> = {
  sunday: 'text-red-600 dark:text-red-400',
  public:
    'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  saturday: 'text-blue-600 dark:text-blue-400',
  custom:
    'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
}

/** 요일 머리글(일 월 화 …)에 쓰는 색. 여기서는 공휴일을 알 수 없으므로 요일만 본다. */
export function weekdayHeaderClass(index: number): string {
  if (index === 0) return MARK_TEXT_CLASS.sunday
  if (index === 6) return MARK_TEXT_CLASS.saturday
  return 'text-muted'
}

/** API 응답과 클라이언트가 주고받는 형태 */
export type HolidayPayload = {
  /** [날짜, 이름] 쌍. Map 은 JSON 으로 오가지 못하므로 배열로 싣는다. */
  public: [string, string][]
  custom: [string, string][]
}

export function toHolidayMap(payload: HolidayPayload): HolidayMap {
  return {
    public: new Map(payload.public),
    custom: new Map(payload.custom),
  }
}

/**
 * "2026-12-27" ~ "2027-01-02" 처럼 해를 넘는 범위에 걸친 연도들.
 *
 * 달력 격자는 그 달을 감싸는 일요일~토요일이라 앞뒤 달의 며칠을 물고 있다.
 * 12월 화면이 다음 해까지 넘어가므로, 공휴일도 두 해를 받아 와야 그 칸이 비지 않는다.
 */
export function yearsIn(from: string, to: string): number[] {
  const first = Number(from.slice(0, 4))
  const last = Number(to.slice(0, 4))

  if (!Number.isInteger(first) || !Number.isInteger(last) || last < first) {
    return []
  }

  // 달력 한 화면은 길어야 두 해에 걸친다. 잘못된 입력으로 수백 해를 도는 일이
  // 없도록 상한을 둔다.
  const years: number[] = []
  for (let year = first; year <= last && years.length < 3; year++) {
    years.push(year)
  }

  return years
}
