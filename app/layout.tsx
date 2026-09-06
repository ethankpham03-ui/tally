import type { Metadata, Viewport } from 'next';
import './globals.css';
import { APP_THEME_COLORS } from './theme-colors.ts';
import { THEME_BOOTSTRAP_SCRIPT } from './theme.ts';

const siteUrl = 'https://tally.ethankpham.workers.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Tally',
  title: 'Tally | Personal finance, clearly',
  description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
  creator: 'ethankpham03-ui',
  publisher: 'ethankpham03-ui',
  keywords: ['personal finance', 'expense tracker', 'budgeting', 'subscription tracker', 'local-first'],
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/tally-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/tally-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/tally-icon-192.png',
    apple: [{ url: '/tally-icon-maskable-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    siteName: 'Tally',
    title: 'Tally | Clear cash flow',
    description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
    url: '/',
    locale: 'en_US',
    alternateLocale: ['vi_VN'],
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Tally logo and cash-flow illustration' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tally | Clear cash flow',
    description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={APP_THEME_COLORS.light} />
        <meta name="color-scheme" content="light dark" />
        <link rel="preload" href="/fonts/pf-beau-sans-book.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/cookie-run-bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script id="tally-theme-bootstrap" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
