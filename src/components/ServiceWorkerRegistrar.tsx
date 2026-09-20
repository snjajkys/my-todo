'use client'

import { useEffect } from 'react'

/**
 * 서비스 워커를 등록만 하는 조각. 아무것도 그리지 않는다.
 *
 * 등록을 알림 화면(PushToggle)에만 맡겨 두면, 홈 화면에 추가하는 시점에 서비스
 * 워커가 없을 수 있다. 크롬은 그때 이 사이트를 "설치할 수 있는 앱"으로 보지 않고
 * 단순 바로가기를 만들어 버린다 — 그러면 크롬의 상시 알림이 따라붙는다.
 *
 * 그래서 어느 화면으로 들어오든 등록되도록 최상위에 둔다. 여러 번 불려도
 * `register` 는 이미 있는 등록을 돌려주므로 중복 등록은 생기지 않는다.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // 첫 화면이 그려지는 일을 방해하지 않도록 뒤로 미룬다.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[sw] 등록 실패', error)
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
