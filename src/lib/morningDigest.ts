import type { Todo } from '@/types/todo'

/* ------------------------------------------------------------------ *
 * 아침 알림에 실을 문구를 만든다.
 *
 * 순수 함수만 둔 것은 이 판단이 두 곳에서 똑같이 쓰이기 때문이다.
 * 하나는 매일 아침 크론이고, 다른 하나는 사용자가 알림을 켤 때 바로 보내는
 * 확인용 알림이다. 두 문구가 갈라지면 "켤 때 본 것"과 "아침에 오는 것"이 달라진다.
 * ------------------------------------------------------------------ */

// 이 앱을 쓰는 사람은 모두 한국에 있다. 크론은 UTC 로 도는데 "오늘"은 KST 기준이라야
// 하므로, 시각을 9시간 밀어 놓고 날짜만 읽는다.
//
// 한국은 서머타임이 없어 고정 오프셋으로 충분하다. 쓰는 사람이 다른 시간대로
// 나가게 되면 이 값이 아니라 사용자별 시간대를 저장하는 쪽으로 바꿔야 한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 지금이 한국에서 며칠인지 ("YYYY-MM-DD") */
export function todayInKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * 아침에 알려 줄 할 일인지 판단한다.
 *
 * 오늘 화면(`isVisibleOn`)의 미완료 규칙과 같다. 두 종류 모두
 * "시작했고 아직 못 끝낸 것" 이라는 한 가지 규칙으로 본다.
 * - TODAY: 기준 날짜가 지났으면 계속 포함된다 (밀린 일도 알려 준다)
 * - PERIOD: 진행 중이거나 종료일이 지났는데 못 끝낸 것
 *
 * 아직 시작하지 않은 기간 할 일은 뺀다. 매일 아침 알림으로 받으면 한 달 내내
 * 같은 알림이 오기 때문이다. 한때 화면만 "시작까지 30일" 로 미리 보여 준 적이
 * 있는데, 앞날 일이 오늘 목록을 채우는 문제가 있어 화면도 이 규칙으로 맞췄다.
 *
 * 완료한 일은 여기서는 언제나 뺀다. 화면은 완료한 날 하루 완료 칸에 남겨 두지만,
 * 아침에 "오늘 할 일" 로 알릴 것은 아니다. 이 한 가지 때문에 `isVisibleOn` 을
 * 그대로 가져다 쓰지 않는다.
 */
export function isDueOn(todo: Todo, today: string): boolean {
  if (todo.completed) return false

  // 날짜 없는 항목은 예전 데이터에만 있다. 묻어 두기보다 알려 주는 편이 낫다.
  if (!todo.startDate) return true

  return todo.startDate <= today
}

// 우선순위가 높은 것부터 보여 준다. 알림에는 제목 몇 개밖에 못 싣기 때문에
// 무엇이 잘리느냐가 곧 무엇을 못 보느냐가 된다.
const PRIORITY_RANK: Record<Todo['priority'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

/** 같은 우선순위면 오래 묵은 것이 먼저다. 밀린 일이 뒤로 밀리지 않게 한다. */
function compare(a: Todo, b: Todo): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (byPriority !== 0) return byPriority

  return (a.startDate ?? '9999-12-31').localeCompare(b.startDate ?? '9999-12-31')
}

// 알림 한 줄에 들어가는 글자 수는 기기마다 다르다. 제목 하나가 줄을 다 잡아먹어
// 나머지가 안 보이는 일이 없도록 자른다.
const MAX_TITLE_LENGTH = 18

// 본문에 이름을 그대로 적을 개수. 그보다 많으면 "외 N개" 로 묶는다.
const MAX_LISTED = 3

function shorten(title: string): string {
  return title.length > MAX_TITLE_LENGTH
    ? `${title.slice(0, MAX_TITLE_LENGTH)}…`
    : title
}

export type Digest = {
  title: string
  body: string
  /** 알림을 보낼 만한 내용이 있는지. 할 일이 없으면 아침에 보내지 않는다. */
  hasWork: boolean
}

/**
 * 그날 아침에 보낼 알림 문구.
 *
 * 할 일이 없으면 `hasWork: false` 로 돌려준다. 크론은 그런 사람을 건너뛰지만,
 * 알림을 켜는 순간에는 "지금은 보낼 게 없다"는 것도 알려 줘야 하므로
 * 보내지 않는 판단은 부르는 쪽에 맡긴다.
 */
export function buildMorningDigest(todos: Todo[], today: string): Digest {
  const due = todos.filter((todo) => isDueOn(todo, today)).sort(compare)

  if (due.length === 0) {
    return {
      title: '오늘 할 일이 없습니다',
      body: '오늘은 비어 있어요. 새로 적을 일이 있으면 눌러서 열어 보세요.',
      hasWork: false,
    }
  }

  const listed = due.slice(0, MAX_LISTED).map((todo) => shorten(todo.title))
  const rest = due.length - listed.length

  return {
    title: `오늘 할 일 ${due.length}개`,
    body: rest > 0 ? `${listed.join(' · ')} 외 ${rest}개` : listed.join(' · '),
    hasWork: true,
  }
}
