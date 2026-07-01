import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function generateMetadata(): Promise<Metadata> {
  let title = "おてがる整体 | 仙台・一番町のもみほぐし・整体"
  let description = "仙台市青葉区一番町の「おてがる整体」です。火・水曜限定営業。心地よいもみほぐしで日々の疲れを手軽にリセットします。ネット予約受付中。"
  let keywords = "仙台,一番町,整体,もみほぐし,マッサージ,肩こり,腰痛"

  try {
    const settingsArray = await prisma.siteSetting.findMany({
      where: { key: { in: ['seo_title', 'seo_description', 'seo_keywords'] } }
    })
    
    settingsArray.forEach(s => {
      if (s.key === 'seo_title') title = s.value
      if (s.key === 'seo_description') description = s.value
      if (s.key === 'seo_keywords') keywords = s.value
    })
  } catch (e) {
    console.error("Failed to load SEO metadata", e)
  }

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ja_JP'
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>{children}</body>
    </html>
  );
}
