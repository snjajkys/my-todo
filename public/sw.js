/*
 * 알림을 받아 띄우는 서비스 워커.
 *
 * 앱이 닫혀 있어도 브라우저가 이 파일을 깨워 실행한다. 그래서 여기에는
 * 화면 코드가 들어갈 수 없고, 페이지의 변수도 쓸 수 없다. 받은 내용만으로
 * 알림을 만들 수 있어야 한다.
 *
 * 캐싱(오프라인 기능)은 일부러 넣지 않았다. 지금 필요한 것은 알림뿐이고,
 * 캐싱까지 맡기면 배포한 새 화면이 옛 화면에 가려지는 문제를 따로 다뤄야 한다.
 */

// 배포해도 브라우저가 옛 서비스 워커를 붙잡고 있는 일을 막는다.
// 새 파일을 받으면 기다리지 않고 바로 교체하고, 열려 있는 탭까지 넘겨받는다.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

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
