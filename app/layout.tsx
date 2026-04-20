import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Finance",
  description: "개인 재무 · 가계부 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={dmSans.variable}>
      <body
        className={`${dmSans.className} min-h-screen bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.12),transparent)] bg-slate-50 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
