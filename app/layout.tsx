import type { Metadata } from "next";
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
  title: "TechLead - テレアポ管理",
  description: "コールリスト管理・日報自動生成・AI戦略分析をワンストップで。インサイドセールスチームの成果を最大化するツールです。",
  openGraph: {
    title: "TechLead - テレアポ管理",
    description: "コールリスト管理・日報自動生成・AI戦略分析をワンストップで。インサイドセールスチームの成果を最大化するツールです。",
    url: "https://techlead-ebon.vercel.app",
    siteName: "TechLead",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="border-t border-slate-200 bg-white mt-auto py-4 px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-400">
            <span>© 2026 TechLead</span>
            <div className="flex gap-4">
              <a href="/terms" className="hover:text-violet-600 transition-colors">利用規約</a>
              <a href="/privacy" className="hover:text-violet-600 transition-colors">プライバシーポリシー</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
