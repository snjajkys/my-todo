'use client'

import { useEffect } from 'react'

// 관리자 세션은 10초짜리다. 화면이 열려 있는 동안에만 3초마다 갱신하고,
// 창이 닫히거나 화면이 가려지면 갱신이 끊겨 곧바로 만료된다.
//
// 조작(마우스·키보드)이 아니라 "화면이 떠 있는가"를 기준으로 삼는 것은,
// 창을 닫는 즉시 끊기게 하려면 그편이 확실하기 때문이다. 조작 기준이면
// 창을 열어 둔 채 손만 떼도 끊기고, 반대로 닫은 뒤에도 마지막 조작 시점까지
// 남아 있게 된다.
const PING_INTERVAL_MS = 3_000

export default function AdminSessionKeepalive() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    let stopped = false

    const ping = async () => {
      if (stopped || document.visibilityState !== 'visible') return

      try {
        const res = await fetch('/api/session', { cache: 'no-store' })

        if (res.status === 401) {
          stopped = true
          // 되살아난 화면에서는 router.refresh() 가 듣지 않는 경우가 있어
          // 통째로 이동한다.
          window.location.replace('/login')
        }
      } catch {
        // 일시적인 네트워크 오류는 다음 차례에 다시 시도한다.
      }
    }

    const start = () => {
      if (timer) return
      timer = setInterval(ping, PING_INTERVAL_MS)
      ping()
    }

    const stop = () => {
      if (!timer) return
      clearInterval(timer)
      timer = undefined
    }

    // 화면이 가려지거나 창이 닫히는 순간 세션을 3초로 줄여 달라고 알린다.
    // sendBeacon 은 페이지가 사라지는 중에도 전송이 보장된다.
    const suspend = () => {
      stop()
      navigator.sendBeacon?.('/api/session/suspend')
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') start()
      else suspend()
    }

    // 뒤로가기 캐시에서 되살아났다면 만료됐을 수 있으므로 즉시 확인한다.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) start()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', suspend)
    window.addEventListener('pageshow', onPageShow)
    start()

    return () => {
      stopped = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', suspend)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return null
}
