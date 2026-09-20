import type { MetadataRoute } from 'next'

// 홈 화면에 추가했을 때 주소창 없이 앱처럼 열리도록 한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MY TODO',
    short_name: 'MY TODO',
    description: '다이어리처럼 쓰는 할 일 관리',
    // 이 앱을 다른 앱과 구별하는 이름. 주소가 바뀌어도 같은 앱으로 이어진다.
    id: '/',
    start_url: '/',
    // 앱 안에서 다룰 주소의 범위. 벗어나면 주소창이 나타난다.
    scope: '/',
    display: 'standalone',
    lang: 'ko',
    // 종이색과 잉크색. 실행 화면과 상단 바가 앱과 이어지게 한다.
    background_color: '#fdfaf3',
    theme_color: '#2f4574',
    // 192 와 512 를 함께 둔다. 크롬은 둘 다 있어야 홈 화면에 추가할 때
    // 진짜 앱(WebAPK)을 만들어 준다. 하나만 있으면 단순 바로가기가 되고,
    // 그 바로가기는 크롬 안에서 돌아 크롬의 상시 알림을 달고 다닌다.
    icons: [
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // 잘라내는 런처에서는 모서리가 남도록 여백을 더 둔 쪽을 쓴다.
        src: '/icon-maskable',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
