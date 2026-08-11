const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/** "YYYY-MM-DD" 문자열을 UTC 자정 Date 로 변환. 형식/실존하지 않는 날짜면 null. */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return null

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null

  // 2026-02-31 처럼 존재하지 않는 날짜는 다른 날로 밀리므로 왕복 비교로 걸러낸다.
  return toDateOnly(date) === value ? date : null
}

/** Date -> "YYYY-MM-DD" (UTC 기준) */
export function toDateOnly(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null
}

/** Date 를 로컬 시간대 기준 "YYYY-MM-DD" 로 변환 */
export function toLocalDateOnly(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** 사용자 로컬 기준 오늘 날짜 "YYYY-MM-DD" */
export function todayDateOnly(): string {
  return toLocalDateOnly(new Date())
}

/** ISO 타임스탬프가 로컬 기준으로 며칠인지 ("YYYY-MM-DD") */
export function localDateOfTimestamp(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : toLocalDateOnly(date)
}

/** "YYYY-MM-DD" -> 로컬 자정 Date (표시/일수 계산용) */
export function fromDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 두 날짜 문자열 사이의 일수 차이 (to - from) */
export function diffInDays(from: string, to: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.round(
    (fromDateOnly(to).getTime() - fromDateOnly(from).getTime()) / MS_PER_DAY
  )
}

/** "2026년 8월 11일 화요일" */
export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(fromDateOnly(value))
}

/** "8월 11일 (화)" */
export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(fromDateOnly(value))
}

export type PeriodTone = 'upcoming' | 'active' | 'due' | 'overdue'

export type PeriodStatus = {
  /** "8월 11일 (화) ~ 8월 20일 (목)" */
  range: string
  /** "시작까지 3일" / "종료까지 5일" / "오늘 마감" / "기간 지남" */
  label: string
  tone: PeriodTone
}

/** 오늘 날짜를 기준으로 기간 할 일의 진행 상태를 설명한다. */
export function describePeriod(
  startDate: string,
  endDate: string,
  today: string | null
): PeriodStatus {
  const range = `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)}`

  if (!today) return { range, label: '', tone: 'active' }

  const untilStart = diffInDays(today, startDate)
  const untilEnd = diffInDays(today, endDate)

  if (untilStart > 0) {
    return { range, label: `시작까지 ${untilStart}일`, tone: 'upcoming' }
  }
  if (untilEnd < 0) {
    return { range, label: `${-untilEnd}일 지남`, tone: 'overdue' }
  }
  if (untilEnd === 0) {
    return { range, label: '오늘 마감', tone: 'due' }
  }
  return { range, label: `종료까지 ${untilEnd}일`, tone: 'active' }
}
