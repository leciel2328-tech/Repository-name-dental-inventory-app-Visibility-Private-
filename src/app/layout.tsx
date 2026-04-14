import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "歯科在庫管理",
  description: "歯科医院向け在庫可視化システム - 医院運営可能日数の見える化",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
