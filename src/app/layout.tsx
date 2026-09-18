import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND_NAME } from '@/config/system';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: `${BRAND_NAME} - 让每个人都有面试机会`,
  description:
    `AI驱动的简历制作Agent。不知道适合什么岗位？不知道简历怎么写？交给${BRAND_NAME}，帮你制作专业简历，获得面试机会。`,
  keywords: [
    'AI简历',
    '简历制作',
    '简历优化',
    '求职',
    '面试',
    'AI Agent',
    '简历生成',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
