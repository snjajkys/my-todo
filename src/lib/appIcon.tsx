// 앱 아이콘(파비콘, 홈 화면 바로가기)에 쓰는 그림.
// icon.tsx 와 apple-icon.tsx 가 크기만 달리해서 함께 쓴다.
//
// 안드로이드는 아이콘을 원형 등으로 잘라내므로(maskable), 다이어리를 화면 가득
// 채우지 않고 가운데에 여백을 두고 놓는다. 잘려도 다이어리가 남는다.

export function AppIcon({
  size,
  maskable = false,
}: {
  size: number
  maskable?: boolean
}) {
  // 크기가 32px 파비콘까지 내려가므로 모든 치수를 비율로 잡는다.
  const unit = size / 100

  // 잘라내기용은 가운데 원 안에 다이어리가 온전히 들어가야 한다.
  // 대각선 길이가 반지름(가로의 40%)을 넘지 않도록 줄인다.
  const scale = maskable ? 0.78 : 1

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2f4574',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: `${unit * 62 * scale}px`,
          height: `${unit * 72 * scale}px`,
          borderRadius: `${unit * 6 * scale}px`,
          overflow: 'hidden',
          background: '#fdfaf3',
        }}
      >
        {/* 제본 쪽. 세피아 띠에 구멍을 뚫어 다이어리임을 드러낸다 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
            width: `${unit * 16 * scale}px`,
            height: '100%',
            background: '#8a5a2b',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: `${unit * 6 * scale}px`,
                height: `${unit * 6 * scale}px`,
                borderRadius: '50%',
                background: '#fdfaf3',
              }}
            />
          ))}
        </div>

        {/* 종이 쪽. 체크 하나로 "할 일"임을 드러낸다 */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={unit * 30 * scale}
            height={unit * 30 * scale}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2f4574"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12.5 L9.5 18.5 L20 6" />
          </svg>
        </div>
      </div>
    </div>
  )
}
