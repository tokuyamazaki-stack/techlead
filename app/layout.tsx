import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0b0d14]">
        {children}
      </body>
    </html>
  );
}
