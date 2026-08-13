import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MY TODO",
  description: "다이어리처럼 쓰는 할 일 관리",
  // 홈 화면에 추가하면 주소창 없이 앱처럼 열리고, 이름도 짧게 나온다.
  appleWebApp: {
    capable: true,
    title: "MY TODO",
    statusBarStyle: "default",
  },
};

// 주소창과 상단 바 색을 잉크색으로 맞춰 화면과 이어지게 한다.
export const viewport: Viewport = {
  themeColor: "#2f4574",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
