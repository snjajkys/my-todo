'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------ *
 * 아침 알림 켜기/끄기
 *
 * 켜짐/꺼짐은 기기마다 따로다. 폰에서 켜도 태블릿은 꺼져 있고, 그 반대도 같다.
 * 푸시 구독을 브라우저가 기기별로 발급하기 때문이지, 일부러 나눈 것은 아니다.
 * 그래서 화면에도 "이 기기에서"라고 적어 둔다.
 * ------------------------------------------------------------------ */

type Status =
  // 브라우저 상태를 확인하는 중
  | 'checking'
  // 이 브라우저는 웹 푸시를 지원하지 않는다
  | 'unsupported'
  // 아이폰/아이패드: 홈 화면에 추가해야만 알림을 받을 수 있다
  | 'needs-install'
  // 서버에 VAPID 키가 없다 (배포 설정이 덜 됐다)
  | 'unconfigured'
  // 사용자가 브라우저 알림 권한을 거부해 두었다
  | 'denied'
  // 상태를 확인하지 못했다 (로그인이 풀렸거나 통신이 끊겼거나)
  | 'unknown'
  | 'off'
  | 'on'

/**
 * 공개키는 URL-safe base64 문자열인데, 브라우저는 바이트 배열을 요구한다.
 * (`applicationServerKey` 는 문자열을 받지 않는다)
 */
function decodeKey(base64: string) {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return bytes
}

/** 홈 화면 바로가기로 실행 중인지 */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS 사파리는 표준 display-mode 대신 예전부터 쓰던 이 값을 쓴다.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isApple(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function PushToggle() {
  const [status, setStatus] = useState<Status>('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 켤 때마다 서버에 다시 묻지 않도록 들고 있는다.
  const publicKey = useRef<string | null>(null)

  const registration = useCallback(async () => {
    // 이미 등록돼 있으면 같은 등록을 돌려준다. 여러 번 불러도 안전하다.
    return navigator.serviceWorker.register('/sw.js')
  }, [])

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window

      if (!supported) {
        // 아이폰에서 사파리 탭으로 열었을 때가 여기다. 지원하지 않는 브라우저가
        // 아니라 홈 화면에 추가하지 않은 것뿐이므로, 방법을 알려 준다.
        if (!cancelled) {
          setStatus(isApple() && !isStandalone() ? 'needs-install' : 'unsupported')
        }
        return
      }

      try {
        const res = await fetch('/api/push')
        if (!res.ok) throw new Error('상태를 불러오지 못했습니다.')

        const data = (await res.json()) as {
          publicKey: string | null
          endpoints: string[]
        }

        if (cancelled) return

        if (!data.publicKey) {
          setStatus('unconfigured')
          return
        }

        publicKey.current = data.publicKey

        const reg = await registration()
        const sub = await reg.pushManager.getSubscription()

        if (cancelled) return

        if (sub && data.endpoints.includes(sub.endpoint)) {
          setStatus('on')
          return
        }

        // 브라우저에는 구독이 남았는데 서버가 모르는 경우. 계정을 지웠다 다시
        // 만들었거나, 다른 계정으로 로그인했을 때 생긴다. 이대로 두면 화면은
        // "켜짐"인데 알림은 오지 않으므로, 브라우저 쪽을 정리해 꺼짐으로 맞춘다.
        if (sub) await sub.unsubscribe()

        setStatus(Notification.permission === 'denied' ? 'denied' : 'off')
      } catch {
        // 지원하지 않는 것과 확인하지 못한 것은 다르다. 세션이 풀렸을 뿐인데
        // "이 브라우저는 알림을 지원하지 않습니다" 라고 하면 원인을 못 찾는다.
        if (!cancelled) setStatus('unknown')
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [registration])

  const turnOn = async () => {
    setError(null)
    setBusy(true)

    let sub: PushSubscription | null = null

    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }

      const key = publicKey.current
      if (!key) throw new Error('서버에 알림 설정이 되어 있지 않습니다.')

      const reg = await registration()

      sub = await reg.pushManager.subscribe({
        // 받은 푸시는 반드시 눈에 보이는 알림으로 띄우겠다는 약속이다.
        // false 로 두면 크롬이 구독 자체를 거절한다.
        userVisibleOnly: true,
        applicationServerKey: decodeKey(key),
      })

      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? '알림을 켜지 못했습니다.')
      }

      setStatus('on')
    } catch (caught) {
      // 서버에 저장하지 못했으면 브라우저 구독도 되돌린다. 남겨 두면 다음에
      // 켤 때 "이미 구독돼 있다"는 상태에서 시작해 서버와 계속 어긋난다.
      await sub?.unsubscribe().catch(() => undefined)

      setError(caught instanceof Error ? caught.message : '알림을 켜지 못했습니다.')
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    setError(null)
    setBusy(true)

    try {
      const reg = await registration()
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        // 서버를 먼저 지운다. 브라우저 쪽을 먼저 끊으면 endpoint 를 잃어버려
        // 서버에 죽은 구독이 남고, 매일 아침 그리로 헛 요청이 나간다.
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })

        await sub.unsubscribe()
      }

      setStatus('off')
    } catch {
      setError('알림을 끄지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking') return null

  const note = {
    unsupported: '이 브라우저는 알림을 지원하지 않습니다.',
    'needs-install':
      '아이폰·아이패드는 홈 화면에 추가한 뒤에만 알림을 받을 수 있습니다. 공유 버튼 → "홈 화면에 추가" 를 누르고, 생긴 아이콘으로 다시 열어 주세요.',
    unconfigured: '서버에 알림 설정이 아직 되어 있지 않습니다.',
    unknown: '알림 상태를 확인하지 못했습니다. 화면을 새로 고쳐 주세요.',
    denied:
      '브라우저에서 이 사이트의 알림을 차단해 두었습니다. 주소창 왼쪽 자물쇠(또는 설정 → 사이트 설정)에서 알림을 허용으로 바꾼 뒤 다시 시도해 주세요.',
    off: '매일 아침 8시쯤, 그날 할 일이 있으면 이 기기로 알려 드립니다.',
    on: '이 기기로 아침 알림을 받고 있습니다. 할 일이 없는 날은 보내지 않습니다.',
  }[status]

  const canToggle = status === 'off' || status === 'on'

  return (
    <div className="mb-5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">아침 알림</span>

        {canToggle && (
          <button
            type="button"
            onClick={status === 'on' ? turnOff : turnOn}
            disabled={busy}
            aria-pressed={status === 'on'}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              status === 'on'
                ? 'border-ink bg-ink text-white hover:bg-ink-strong'
                : 'border-border text-muted hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {busy ? '잠시만요...' : status === 'on' ? '켜짐' : '켜기'}
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted">{note}</p>

      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
