import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "体育竞猜 - 2026 FIFA 世界杯",
  description: "2026 FIFA 世界杯虚拟竞猜平台",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "体育竞猜",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060912",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <footer className="hidden md:block border-t border-white/5 bg-pitch-dark/50 py-4 px-4 text-center">
          <p className="text-white/25 text-[11px] leading-relaxed">
            ⚠️ 本平台为纯虚拟模拟器，所有「货币」仅供娱乐，<strong className="text-white/35">无任何真实价值</strong>，不可兑换真金白银。
            <Link href="/disclaimer" className="text-amber-300/50 hover:text-amber-300/80 underline underline-offset-2 ml-1">
              查看完整免责声明 →
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
