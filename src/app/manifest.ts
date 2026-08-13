import type { MetadataRoute } from 'next'

// 홈 화면에 추가했을 때 주소창 없이 앱처럼 열리도록 한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MY TODO',
    short_name: 'MY TODO',
    description: '다이어리처럼 쓰는 할 일 관리',
    start_url: '/',
    display: 'standalone',
    lang: 'ko',
    // 종이색과 잉크색. 실행 화면과 상단 바가 앱과 이어지게 한다.
    background_color: '#fdfaf3',
    theme_color: '#2f4574',
    icons: [
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
