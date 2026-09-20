import { ImageResponse } from 'next/og'

/* ------------------------------------------------------------------ *
 * 알림의 작은 아이콘(badge) 전용 그림.
 *
 * 안드로이드는 이 자리에 색을 쓰지 않는다. **알파 채널만 읽어 실루엣을 뜨고**
 * 시스템 색으로 칠한다. 그래서 여기에 배경이 있는 그림을 주면 배경까지 실루엣이
 * 되어 시커먼 네모 하나가 뜬다. 처음에 /icon-maskable 을 그대로 썼다가 정확히
 * 그렇게 됐다 — 앱 아이콘은 배경이 꽉 찬 불투명한 그림이기 때문이다.
 *
 * 그래서 배경을 아예 두지 않고, 남길 모양만 불투명하게 그린다.
 *
 * 다이어리 전체가 아니라 체크 표시만 그리는 것도 같은 이유다. 이 아이콘은
 * 상태 표시줄에서 24dp 안팎으로 작아지는데, 다이어리를 실루엣으로 만들면
 * 둥근 사각형 덩어리가 되어 결국 네모로 보인다. 획이 성긴 체크는 그 크기에서도
 * 형태가 남는다.
 * ------------------------------------------------------------------ */

const SIZE = 96

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // background 를 주지 않는다. 이 한 줄이 이 파일의 요점이다.
        }}
      >
        <svg
          width={SIZE * 0.82}
          height={SIZE * 0.82}
          viewBox="0 0 24 24"
          fill="none"
          // 색은 어차피 시스템이 덮어쓴다. 알파가 1 이기만 하면 된다.
          stroke="#ffffff"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12.5 L9.5 18.5 L20 6" />
        </svg>
      </div>
    ),
    { width: SIZE, height: SIZE }
  )
}
