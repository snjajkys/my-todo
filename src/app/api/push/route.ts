import { NextResponse } from 'next/server'
import { getActiveUserId } from '@/lib/currentUser'
import { prisma } from '@/lib/prisma'
import { morningDigestFor, pushPublicKey, sendToUser } from '@/lib/push'

// 프록시가 쿠키 없는 요청을 이미 막지만, 여기서도 확인한다.
// 프록시 matcher 가 바뀌면 이 경로가 조용히 무방비가 될 수 있다.
const unauthorized = () =>
  NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

/** 브라우저가 보내온 구독 정보를 검증한다. */
function readSubscription(body: unknown) {
  const input = (body ?? {}) as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown }
  }

  const endpoint = input.endpoint
  const p256dh = input.keys?.p256dh
  const auth = input.keys?.auth

  if (
    typeof endpoint !== 'string' ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string' ||
    !endpoint ||
    !p256dh ||
    !auth
  ) {
    return null
  }

  // 푸시 서비스 주소는 언제나 https 다. 다른 주소가 저장되면 발송할 때마다
  // 엉뚱한 곳으로 요청이 나간다.
  if (!endpoint.startsWith('https://')) return null

  return { endpoint, p256dh, auth }
}

// GET /api/push - 이 계정의 알림 상태
// 브라우저는 자기 구독 주소를 알고 있으므로, 그 주소가 목록에 있는지로 켜짐/꺼짐을 판단한다.
export async function GET() {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true },
    })

    return NextResponse.json({
      publicKey: pushPublicKey(),
      endpoints: subs.map((sub) => sub.endpoint),
    })
  } catch (error) {
    console.error('[GET /api/push]', error)
    return NextResponse.json(
      { error: '알림 설정을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/push - 이 기기로 알림 받기 (켜기)
export async function POST(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const parsed = readSubscription(await request.json().catch(() => null))
    if (!parsed) {
      return NextResponse.json(
        { error: '구독 정보가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // 같은 기기가 다시 켜면 같은 endpoint 가 온다. 새로 만들지 않고 덮어쓴다.
    //
    // userId 까지 갱신하는 것이 요점이다. 한 기기에서 계정을 바꿔 로그인하면
    // endpoint 는 그대로인 채 주인만 바뀌어야 한다. 그러지 않으면 새 계정의
    // 알림이 아니라 앞사람 계정의 할 일이 계속 온다.
    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      create: { ...parsed, userId },
      update: { p256dh: parsed.p256dh, auth: parsed.auth, userId },
    })

    // 켜자마자 한 번 보낸다. 내일 아침까지 기다리지 않고 지금 확인할 수 있고,
    // 오는 문구가 실제 아침에 올 문구와 같아서 무엇을 받게 되는지 바로 안다.
    //
    // 실패해도 켜기 자체는 성공으로 본다. 구독은 이미 저장됐으므로 내일 아침은
    // 정상으로 온다. 여기서 500 을 돌려주면 화면은 "꺼짐"인데 DB 에는 구독이
    // 남아, 매일 아침 아무도 모르는 알림이 가게 된다.
    try {
      const digest = await morningDigestFor(userId)

      await sendToUser(userId, {
        title: digest.hasWork
          ? `내일 아침엔 이렇게 옵니다 · ${digest.title}`
          : '알림을 켰습니다',
        body: digest.hasWork
          ? digest.body
          : '매일 아침 8시쯤, 그날 할 일이 있으면 알려 드릴게요.',
        url: '/',
        tag: 'push-enabled',
      })
    } catch (error) {
      console.error('[POST /api/push] 확인 알림 발송 실패', error)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/push]', error)
    return NextResponse.json(
      { error: '알림을 켜지 못했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/push - 이 기기의 알림 끄기
export async function DELETE(request: Request) {
  try {
    const userId = await getActiveUserId()
    if (userId === null) return unauthorized()

    const body = (await request.json().catch(() => null)) as {
      endpoint?: unknown
    } | null

    if (typeof body?.endpoint !== 'string' || !body.endpoint) {
      return NextResponse.json(
        { error: '구독 정보가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // userId 를 함께 건 것은 남의 기기 구독을 endpoint 만으로 지우지 못하게 하기 위해서다.
    // 이미 없으면 지울 게 없을 뿐이므로 성공으로 본다.
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/push]', error)
    return NextResponse.json(
      { error: '알림을 끄지 못했습니다.' },
      { status: 500 }
    )
  }
}
