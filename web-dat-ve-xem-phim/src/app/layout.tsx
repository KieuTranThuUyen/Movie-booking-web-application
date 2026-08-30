import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { AdminSidebarWrapper } from '@/components/layout/admin-sidebar-wrapper';
import { AppSessionProvider } from '@/components/layout/session-provider';

import './globals.css';

const manrope = Manrope({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-manrope',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'DatVeXemPhim',
  description:
    'Hệ thống đặt vé xem phim trực tuyến bằng Next.js, TypeScript, MySQL và Docker.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} font-sans text-slate-100`}
      >
        <AppSessionProvider>

          {/* Sidebar - không in */}
          <div className="print:hidden">
            <AdminSidebarWrapper />
          </div>

          {/* Header - không in */}
          <div className="print:hidden">
            <SiteHeader />
          </div>

          {children}

          {/* Footer - không in */}
          <div className="print:hidden">
            <SiteFooter />
          </div>

        </AppSessionProvider>
      </body>
    </html>
  );
}