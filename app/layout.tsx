import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/400-italic.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/600-italic.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/700-italic.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
});

const siteUrl = 'https://tally-finance.cheapdreams02.chatgpt.site';

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
    apple: [{ url: '/tally-icon-192.png', sizes: '192x192', type: 'image/png' }],
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
  colorScheme: 'light dark',
};

const themeBootstrapScript = `(function(){try{var stored=window.localStorage.getItem('tally-theme');var theme=stored==='light'||stored==='dark'?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;}catch(error){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script id="tally-theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body className={geistSans.variable}>
        {children}
      </body>
    </html>
  );
}
