import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  applicationName: 'Tally',
  title: 'Tally | Personal finance, clearly',
  description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/tally-icon.png', type: 'image/png' }],
    shortcut: [{ url: '/tally-icon.png', type: 'image/png' }],
    apple: [{ url: '/tally-icon.png', type: 'image/png' }],
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

const directionContract = `<!--
THESIS: Tally makes the next charge as visible as the current balance. It refuses the dense finance cockpit.
OWN-WORLD: Pearl-grey ground, shallow cool Neumorphic depth, graphite type, cobalt action, 16-20px corners, quiet rows.
STORY: See what remains, record what changed, then inspect what renews next.
FIRST VIEWPORT: Mobile opens with a compact app bar, balance, two summaries, nearest renewal, and one calm chart. Desktop expands into a left overview and right subscription column.
FORM: Minimal Neumorphism hi-fi console, grounded candidate four, seed bbe0db65.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

const themeBootstrapScript = `(function(){try{var stored=window.localStorage.getItem('tally-theme');var theme=stored==='light'||stored==='dark'?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;}catch(error){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script id="tally-theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="direction-contract" aria-hidden="true" dangerouslySetInnerHTML={{ __html: directionContract }} />
        {children}
      </body>
    </html>
  );
}
