/*
 * 알림을 받아 띄우는 서비스 워커.
 *
 * 앱이 닫혀 있어도 브라우저가 이 파일을 깨워 실행한다. 그래서 여기에는
 * 화면 코드가 들어갈 수 없고, 페이지의 변수도 쓸 수 없다. 받은 내용만으로
 * 알림을 만들 수 있어야 한다.
 *
 * 캐싱은 하지 않는다. 배포한 새 화면이 캐시에 가려지는 문제를 따로 다뤄야 하는데,
 * 지금 그럴 이유가 없다. 아래 fetch 처리기도 캐시를 쓰지 않는다.
 */

// 배포해도 브라우저가 옛 서비스 워커를 붙잡고 있는 일을 막는다.
// 새 파일을 받으면 기다리지 않고 바로 교체하고, 열려 있는 탭까지 넘겨받는다.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

/* ── 화면 이동 가로채기 ──────────────────────────────
   이게 있어야 크롬이 이 사이트를 "설치할 수 있는 앱"으로 본다.

   처리기가 없으면 홈 화면에 추가해도 진짜 앱(WebAPK)이 아니라 단순 바로가기가
   만들어진다. 바로가기는 크롬 안에서 실행되기 때문에, 크롬이 "탭하여 이 앱의
   URL 복사하기" 알림을 앱이 켜져 있는 내내 띄운다. 그 알림은 크롬 것이라
   끄려고 하면 우리 아침 알림까지 함께 막힌다. 그래서 알림을 끄는 것으로는
   풀 수 없고, 제대로 설치되게 만드는 수밖에 없다.

   비어 있는 처리기는 크롬이 알아보고 없는 것으로 친다. 그래서 실제로 하는 일을
   하나 준다 — 네트워크가 끊겼을 때 안내를 돌려주는 것. 화면 이동만 맡고
   이미지·스크립트·API 요청은 respondWith 를 부르지 않아 브라우저가 평소대로 처리한다. */

const OFFLINE_PAGE = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MY TODO</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#fdfaf3;color:#2f4574;font-family:system-ui,sans-serif;text-align:center;padding:24px}
  h1{font-size:18px;margin:0 0 8px}
  p{font-size:14px;color:#6b6257;margin:0 0 20px;line-height:1.6}
  button{border:1px solid #d9d2c4;background:#fff;color:#2f4574;border-radius:10px;
         padding:10px 18px;font-size:14px;font-weight:600}
</style></head>
<body><div>
  <h1>연결이 끊겼습니다</h1>
  <p>인터넷에 닿지 못했습니다.<br>연결을 확인하고 다시 시도해 주세요.</p>
  <button onclick="location.reload()">다시 시도</button>
</div></body></html>`

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_PAGE, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    )
  )
})

self.addEventListener('push', (event) => {
  // 서버가 보내는 것은 항상 JSON 이지만, 형식이 어긋나도 알림은 떠야 한다.
  // 아무것도 띄우지 않으면 브라우저가 "이 사이트가 백그라운드에서 갱신됨" 같은
  // 기본 알림을 대신 띄우기 때문이다.
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'MY TODO'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      // 큰 아이콘. 알림 안에 원래 색 그대로 보인다.
      icon: '/icon',
      // 상태 표시줄의 작은 아이콘. 안드로이드가 알파 채널만 읽어 실루엣으로
      // 쓰므로 배경 없는 전용 그림이라야 한다. 앱 아이콘을 여기 주면 배경까지
      // 실루엣이 되어 검은 네모가 뜬다.
      badge: '/icon-badge',
      // 같은 tag 의 알림은 서로를 덮어쓴다. 며칠치가 쌓이지 않게 한다.
      tag: data.tag || 'my-todo',
      // 알림을 누르면 어디로 갈지. notificationclick 에서 꺼내 쓴다.
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    // 이미 열려 있는 창이 있으면 새 탭을 열지 않고 그 창을 앞으로 가져온다.
    // 알림을 누를 때마다 탭이 하나씩 늘어나는 일을 막는다.
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).pathname === target && 'focus' in client) {
            return client.focus()
          }
        }

        return self.clients.openWindow(target)
      })
  )
})
