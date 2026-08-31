import type { MetadataRoute } from 'next';
import { APP_THEME_COLORS } from './theme-colors.ts';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tally',
    short_name: 'Tally',
    description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: APP_THEME_COLORS.light,
    theme_color: APP_THEME_COLORS.light,
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
      {
        src: '/tally-icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/tally-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
