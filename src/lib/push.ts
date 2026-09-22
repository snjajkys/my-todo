import {
  WebPushError,
  sendNotification,
  setVapidDetails,
  type PushSubscription as WebPushSubscription,
} from 'web-push'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/date'
import {
  buildMorningDigest,
  secondsLeftInKstDay,
  todayInKst,
  type Digest,
} from '@/lib/morningDigest'
import { serializeTodo } from '@/lib/todo'

/* ------------------------------------------------------------------ *
 * 웹 푸시 발송
 *
 * VAPID 는 푸시 서비스(구글·애플 등)에 "이 서버가 보낸 게 맞다"를 증명하는
 * 키 한 쌍이다. 공개키는 브라우저가 구독을 만들 때 쓰고, 개인키로 발송할 때 서명한다.
 *
 * 키를 새로 만들면 그전에 만들어진 구독은 전부 무효가 된다. 기기마다 알림을
 * 다시 켜야 하므로, 한 번 정한 뒤로는 바꾸지 않는다.
 * ------------------------------------------------------------------ */

let configured = false

function configure() {
  if (configured) return

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  // 키가 없으면 조용히 넘어가지 않는다. 알림이 안 오는 이유를 로그에서 바로 알아야 한다.
  if (!publicKey || !privateKey) {
    throw new Error(
      '환경변수 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 가 설정되지 않았습니다.'
    )
  }

  // subject 는 푸시 서비스가 발송량이 이상하거나 신고가 들어왔을 때 찾아올 창구다.
  // mailto: 또는 https: 주소면 된다. 개인 메일 대신 앱 주소를 기본값으로 둔다.
  setVapidDetails(
    process.env.VAPID_SUBJECT || 'https://my-todo-diary.vercel.app',
    publicKey,
    privateKey
  )

  configured = true
}

/** 브라우저가 구독을 만들 때 필요한 공개키. 설정 전이면 null. */
export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null
}

export type PushPayload = {
  title: string
  body: string
  /** 알림을 눌렀을 때 열 주소 */
  url: string
  /**
   * 같은 tag 의 알림은 서로를 덮어쓴다.
   * 며칠 못 본 사이 아침 알림이 일곱 개 쌓여 있는 일을 막는다.
   */
  tag: string
}

type StoredSubscription = {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

function toWebPush(sub: StoredSubscription): WebPushSubscription {
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }
}

/**
 * 아직 배달되지 않은 알림끼리 덮어쓰게 하는 값.
 *
 * `tag` 는 이미 화면에 뜬 알림끼리 덮어쓰고, `Topic` 은 푸시 서비스가 들고만 있는
 * 알림끼리 덮어쓴다. 뜻이 같으니 같은 값을 쓴다. 다만 Topic 에는 영문·숫자·`-`·`_`
 * 32자까지만 허용되고 그 밖의 글자를 주면 web-push 가 예외를 던지므로 다듬는다.
 */
function toTopic(tag: string): string | undefined {
  const cleaned = tag.replace(/[^A-Za-z0-9\-_]/g, '-').slice(0, 32)

  return cleaned || undefined
}

/**
 * 기기 한 대로 보낸다.
 *
 * 404/410 은 그 구독이 사라졌다는 뜻이다(앱을 지웠거나, 브라우저 데이터를 비웠거나,
 * 푸시 서비스가 정리했거나). 그때는 DB 에서도 지운다. 남겨 두면 매일 아침
 * 죽은 주소로 요청을 보내게 되고, 사용자 화면에는 "켜짐"으로 잘못 남는다.
 *
 * `ttl` 은 푸시 서비스가 이 알림을 최대 몇 초까지 들고 있어도 되는지다.
 */
async function sendOne(
  sub: StoredSubscription,
  payload: PushPayload,
  ttl: number
): Promise<boolean> {
  try {
    await sendNotification(toWebPush(sub), JSON.stringify(payload), {
      // 급한 알림이라고 알려 준다. 이 값을 주지 않으면 normal 로 나가는데,
      // 안드로이드(FCM)는 normal 을 절전(Doze) 중에 쌓아 두었다가 기기가 깨어날 때
      // 한꺼번에 풀어 놓는다. 아침 8시대에 보낸 알림이 정작 앱을 켠 순간에 뜨던
      // 이유가 이것이다. high 는 절전 중에도 바로 깨워 띄운다.
      urgency: 'high',
      TTL: ttl,
      topic: toTopic(payload.tag),
    })
    return true
  } catch (error) {
    if (error instanceof WebPushError && [404, 410].includes(error.statusCode)) {
      // 이미 다른 요청이 지웠을 수 있으므로 없어도 조용히 넘어간다.
      await prisma.pushSubscription
        .deleteMany({ where: { id: sub.id } })
        .catch(() => undefined)

      return false
    }

    console.error('[push] 발송 실패', sub.endpoint, error)
    return false
  }
}

/**
 * 한 사람의 모든 기기로 보낸다. 실제로 닿은 기기 수를 돌려준다.
 *
 * 기본 `ttl` 은 한 시간이다. 이 길로 나가는 것은 알림을 켠 직후 보내는 확인용
 * 알림이라, 지금 오지 않으면 의미가 없다.
 */
export async function sendToUser(
  userId: number,
  payload: PushPayload,
  ttl: number = 60 * 60
): Promise<number> {
  configure()

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })

  const results = await Promise.all(subs.map((sub) => sendOne(sub, payload, ttl)))

  return results.filter(Boolean).length
}

/** 그 사람의 오늘 아침 알림 문구. 알림을 켤 때 미리 보여 주는 데에도 쓴다. */
export async function morningDigestFor(
  userId: number,
  today: string = todayInKst()
): Promise<Digest> {
  const todayDate = parseDateOnly(today)

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      completed: false,
      // 시작하지 않은 앞날의 일은 빼고 가져온다. 최종 판단은 isDueOn 이 하지만,
      // 몇 달치 예정을 통째로 끌어올 이유는 없다.
      ...(todayDate
        ? { OR: [{ startDate: null }, { startDate: { lte: todayDate } }] }
        : {}),
    },
  })

  return buildMorningDigest(todos.map(serializeTodo), today)
}

export type MorningRun = {
  /** 알림을 켜 둔 사람 수 */
  users: number
  /** 보낼 할 일이 있어 실제로 발송한 사람 수 */
  sent: number
  /** 닿은 기기 수 */
  devices: number
}

/**
 * 아침 알림 한 바퀴. 알림을 켜 둔 모든 사람에게 그날의 할 일 요약을 보낸다.
 *
 * 할 일이 없는 사람은 건너뛴다. 매일 아침 "오늘은 없습니다"가 오면
 * 알림을 꺼 버리게 되고, 그러면 정작 필요한 날에도 못 받는다.
 */
export async function runMorningPush(now: Date = new Date()): Promise<MorningRun> {
  configure()

  const today = todayInKst(now)

  // 오늘 안에 못 닿으면 버린다. 어제 아침 요약이 다음 날 배달되는 편보다 낫다.
  const ttl = secondsLeftInKstDay(now)

  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true, userId: true },
  })

  // 한 사람이 폰·태블릿처럼 여러 대를 켜 둘 수 있다. 할 일 조회는 사람당 한 번만 한다.
  const byUser = new Map<number, StoredSubscription[]>()
  for (const sub of subs) {
    const list = byUser.get(sub.userId)
    if (list) list.push(sub)
    else byUser.set(sub.userId, [sub])
  }

  let sent = 0
  let devices = 0

  for (const [userId, userSubs] of byUser) {
    const digest = await morningDigestFor(userId, today)
    if (!digest.hasWork) continue

    const results = await Promise.all(
      userSubs.map((sub) =>
        sendOne(
          sub,
          {
            title: digest.title,
            body: digest.body,
            url: '/',
            // 날짜를 빼고 고정값으로 둔다. 어제 알림이 남아 있으면 오늘 것이 덮어쓴다.
            tag: 'morning-digest',
          },
          ttl
        )
      )
    )

    const reached = results.filter(Boolean).length
    if (reached > 0) sent += 1
    devices += reached
  }

  return { users: byUser.size, sent, devices }
}
