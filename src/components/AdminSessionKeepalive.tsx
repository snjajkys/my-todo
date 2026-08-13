'use client'

import { useEffect } from 'react'

// 관리자 세션은 30초짜리다. 조작이 있는 동안에는 계속 늘려 주고,
// 손을 떼거나 창을 닫으면 늘려 줄 요청이 끊겨 그대로 만료된다.
// 화면을 열어만 두는 것으로는 유지되지 않아야 하므로, 타이머가 아니라
// 실제 입력에 반응해서 보낸다.
const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'mousemove',
  'scroll',
] as const

// 30초 만료에 견주어 넉넉히 앞서도록, 조작 중에는 10초에 한 번만 보낸다.
const THROTTLE_MS = 10_000

export default function AdminSessionKeepalive() {
  useEffect(() => {
    let lastSent = Date.now()
    let stopped = false

    const ping = async () => {
      if (stopped) return

      const now = Date.now()
      if (now - lastSent < THROTTLE_MS) return
      lastSent = now

      try {
        const res = await fetch('/api/session', { cache: 'no-store' })

        if (res.status === 401) {
          stopped = true
          // router.refresh() 는 되살아난 페이지에서 화면을 바꾸지 못하는 경우가 있다.
          // 만료됐다면 확실히 로그인 화면으로 보내야 하므로 통째로 이동한다.
          window.location.replace('/login')
        }
      } catch {
        // 일시적인 네트워크 오류는 다음 조작 때 다시 시도한다.
      }
    }

    // 되살아난 화면에서는 갱신이 아니라 "아직 유효한가"를 물어야 한다.
    const recheck = () => {
      lastSent = 0
      ping()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, ping, { passive: true })
    }

    // 탭으로 돌아왔을 때는 만료됐을 수 있으므로 즉시 확인한다.
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck()
    }
    document.addEventListener('visibilitychange', onVisible)

    // 모바일 브라우저는 탭을 뒤로 보낼 때 페이지를 통째로 캐시(bfcache)해 두었다가
    // 그대로 되살린다. 이때 visibilitychange 가 오지 않는 브라우저가 있어,
    // 세션이 끊겼는데도 로그인된 화면이 그대로 보일 수 있다. pageshow 로 함께 잡는다.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) recheck()
    }
    window.addEventListener('pageshow', onPageShow)

    return () => {
      stopped = true
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, ping)
      }
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return null
}
