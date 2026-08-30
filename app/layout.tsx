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

export const metadata: Metadata = {
  applicationName: 'Tally',
  title: 'Tally | Personal finance, clearly',
  description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
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
    title: 'Tally | Clear cash flow',
    description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
    locale: 'en_US',
    alternateLocale: ['vi_VN'],
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Tally personal finance dashboard' }],
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

const directionContract = `<!--
THESIS: Tally makes the next charge as visible as the current balance. It refuses the dense finance cockpit.
OWN-WORLD: Pearl-grey ground, shallow cool Neumorphic depth, graphite type, cobalt action, 16-20px corners, quiet rows.
STORY: See what remains, record what changed, then inspect what renews next.
FIRST VIEWPORT: Mobile opens with a compact app bar, balance, two summaries, nearest renewal, and one calm chart. Desktop expands into a left overview and right subscription column.
FORM: Minimal Neumorphism hi-fi console, grounded candidate four, seed bbe0db65.
FINISH: Local-first finance state, responsive interactions, documentation, automated tests, and production build verification are part of the shipping bar.
-->`;

const themeBootstrapScript = `(function(){try{var stored=window.localStorage.getItem('tally-theme');var theme=stored==='light'||stored==='dark'?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;}catch(error){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script id="tally-theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body className={geistSans.variable}>
        <div className="direction-contract" aria-hidden="true" dangerouslySetInnerHTML={{ __html: directionContract }} />
        {children}
      </body>
    </html>
  );
}
