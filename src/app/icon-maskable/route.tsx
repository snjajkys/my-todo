import { ImageResponse } from 'next/og'
import { AppIcon } from '@/lib/appIcon'

// 안드로이드 런처가 원형·둥근사각형 등으로 잘라 쓰는(maskable) 아이콘.
// 잘려도 다이어리가 남도록, 같은 그림을 여백을 더 두고 그린다.
const SIZE = 512

export function GET() {
  return new ImageResponse(<AppIcon size={SIZE} maskable />, {
    width: SIZE,
    height: SIZE,
  })
}
