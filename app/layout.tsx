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
      <body className="min-h-full flex flex-col bg-slate-50">
        {children}
      </body>
    </html>
  );
}
