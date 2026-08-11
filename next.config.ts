import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 는 개발 모드에서 localhost 이외의 origin 이 보내는 /_next/* 요청을
  // 403 으로 차단한다. 그래서 같은 와이파이의 휴대폰에서 LAN IP 로 접속하면
  // HTML(SSR 결과)은 보이지만 JS 번들과 HMR 웹소켓이 막혀 하이드레이션이 안 되고,
  // 결과적으로 추가/수정/삭제 버튼이 전혀 반응하지 않는다.
  // 사설 IP 대역을 허용해 두면 공유기가 IP 를 바꿔도 그대로 동작한다.
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    // 172.16.*.* ~ 172.31.*.* (사설 IP 대역)
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  ],
};

export default nextConfig;
