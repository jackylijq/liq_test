import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Study",
  description: "Local English learning and testing MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
