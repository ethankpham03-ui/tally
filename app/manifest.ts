import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tally',
    short_name: 'Tally',
    description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f0f1f4',
    theme_color: '#00758a',
    lang: 'en',
    dir: 'ltr',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: '/tally-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/tally-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
