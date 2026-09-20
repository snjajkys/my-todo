import { NextResponse } from 'next/server'
import { runMorningPush } from '@/lib/push'
import { safeEqual } from '@/lib/session'

/* ------------------------------------------------------------------ *
 * 매일 아침 알림을 내보내는 자리. vercel.json 의 크론이 부른다.
 *
 * 크론은 UTC 로 돌기 때문에 스케줄은 `0 23 * * *`(= 한국 시각 오전 8시)이다.
 * Hobby 요금제에서는 정각이 보장되지 않아 8:00 ~ 8:59 사이에 도착한다.
 * (Pro 로 올리면 정각에 온다. 바꿀 곳은 요금제뿐이고 이 코드는 그대로다)
 *
 * 로그인 없이 닿는 경로이므로 인증은 CRON_SECRET 하나에 달려 있다.
 * CRON_SECRET 환경변수가 있으면 Vercel 이 크론 요청에 Authorization 헤더를
 * 자동으로 실어 준다. 우리는 그 값만 확인한다.
 * ------------------------------------------------------------------ */

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET

  // 비밀값이 없으면 열어 두는 게 아니라 막는다. 이 경로는 남의 알림을
  // 아무 때나 울릴 수 있는 자리라, 설정을 빠뜨렸을 때 공개되면 안 된다.
  if (!secret) return false

  const header = request.headers.get('authorization')
  if (!header) return false

  return safeEqual(header, `Bearer ${secret}`)
}

// GET /api/push/send - 알림을 켜 둔 모든 사람에게 오늘의 할 일 요약을 보낸다
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 401 })
  }

  try {
    const result = await runMorningPush()

    // 알림이 안 왔을 때 어디까지 갔는지 봐야 하므로 결과를 로그에 남긴다.
    // (Vercel 대시보드 → Deployments → Functions 에서 볼 수 있다)
    console.log('[cron] 아침 알림', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/push/send]', error)
    return NextResponse.json(
      { error: '알림을 보내지 못했습니다.' },
      { status: 500 }
    )
  }
}
