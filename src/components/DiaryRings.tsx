/**
 * 스프링 제본. 구멍 하나당 코일 한 바퀴가 종이 왼쪽 끝을 감고 돈다.
 *
 * 페이지 길이에 따라 코일 개수가 달라져야 하므로 <pattern> 으로 세로 반복시킨다.
 * (SVG 를 인라인으로 두면 색을 CSS 변수로 받을 수 있어 다크 모드도 자동 대응된다)
 *
 * 좌표 기준: 이 SVG 는 종이보다 20px 왼쪽에서 시작하므로 x=20 이 종이의 왼쪽 끝이다.
 *
 * 앞뒤 관계를 그대로 그린다.
 *  - 고리 전체는 x<20(책상 위) 으로 잘라낸다. 종이 위로 넘어가는 부분은
 *    "종이 뒤" 이므로 가장자리에서 딱 끊겨 사라진다.
 *  - 구멍에서 빠져나와 종이 앞면을 가로지르는 짧은 구간만 잘라내지 않고 그려,
 *    이 부분만 종이 앞에 놓인다.
 * 고리 중심(y=15)을 구멍(y=23)보다 위에 두어 철사가 구멍을 통과해
 * 위로 넘어가는 흐름이 보이게 했다.
 */
export default function DiaryRings() {
  return (
    <svg
      className="diary-rings"
      aria-hidden
      width="48"
      height="100%"
      preserveAspectRatio="none"
    >
      <defs>
        {/* 위에서 빛을 받는 금속 단면 */}
        <linearGradient id="diary-wire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--wire-lo)" />
          <stop offset="30%" stopColor="var(--wire)" />
          <stop offset="52%" stopColor="var(--wire-hi)" />
          <stop offset="100%" stopColor="var(--wire-lo)" />
        </linearGradient>

        <filter
          id="diary-wire-shadow"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feDropShadow
            dx="1.5"
            dy="2.5"
            stdDeviation="1.5"
            floodColor="#000"
            floodOpacity="0.38"
          />
        </filter>

        {/* 종이 왼쪽 바깥(책상)만 남기는 영역 */}
        <clipPath id="diary-desk-only" clipPathUnits="userSpaceOnUse">
          <rect x="-4" y="-8" width="24" height="62" />
        </clipPath>

        <pattern
          id="diary-coil"
          width="48"
          height="46"
          patternUnits="userSpaceOnUse"
          patternTransform="translate(0 12)"
        >
          {/* ① 종이 뒤로 넘어가는 고리 — 종이 가장자리에서 끊긴다 */}
          <g clipPath="url(#diary-desk-only)">
            <g filter="url(#diary-wire-shadow)">
              <ellipse
                cx="17"
                cy="15"
                rx="10"
                ry="9"
                fill="none"
                stroke="url(#diary-wire)"
                strokeWidth="6"
              />
              <ellipse
                cx="17"
                cy="13.4"
                rx="10"
                ry="9"
                fill="none"
                stroke="var(--wire-hi)"
                strokeWidth="1.5"
                opacity="0.7"
              />
            </g>
          </g>

          {/* ② 종이에 뚫린 구멍 */}
          <ellipse cx="31" cy="23" rx="6.5" ry="6" fill="var(--hole)" />
          <ellipse
            cx="31"
            cy="22.2"
            rx="6.5"
            ry="6"
            fill="none"
            stroke="var(--hole-rim)"
            strokeWidth="1.6"
          />

          {/* ③ 구멍에서 나와 종이 앞면을 가로지르는 구간 (고리 아래쪽과 이어진다) */}
          <g filter="url(#diary-wire-shadow)">
            <path
              d="M31 22.6 C 27 23.4, 23 23.9, 19.6 23.6"
              fill="none"
              stroke="url(#diary-wire)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M31 21 C 27 21.8, 23 22.3, 19.6 22"
              fill="none"
              stroke="var(--wire-hi)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        </pattern>
      </defs>

      <rect width="48" height="100%" fill="url(#diary-coil)" />
    </svg>
  )
}
