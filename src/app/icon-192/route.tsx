import { ImageResponse } from 'next/og'
import { AppIcon } from '@/lib/appIcon'

// 192px 아이콘. 크롬은 홈 화면에 추가할 때 192 와 512 를 함께 요구한다.
// 512 하나만 있으면 진짜 앱(WebAPK) 대신 단순 바로가기가 만들어진다.
const SIZE = 192

export function GET() {
  return new ImageResponse(<AppIcon size={SIZE} />, {
    width: SIZE,
    height: SIZE,
  })
}
