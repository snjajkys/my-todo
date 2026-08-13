'use client'

import { useRouter } from 'next/navigation'
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
  const router = useRouter()

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

        // 이미 만료됐다면 서버 판단을 다시 받아 로그인 화면으로 넘어간다.
        if (res.status === 401) {
          stopped = true
          router.refresh()
        }
      } catch {
        // 일시적인 네트워크 오류는 다음 조작 때 다시 시도한다.
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, ping, { passive: true })
    }

    // 탭으로 돌아왔을 때는 만료됐을 수 있으므로 즉시 확인한다.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        lastSent = 0
        ping()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, ping)
      }
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  return null
}
