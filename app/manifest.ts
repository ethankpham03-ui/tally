import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Flux',
    short_name: 'Flux',
    description: 'Track cash flow, budgets, and recurring subscriptions in one clear place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f0f1f4',
    theme_color: '#176dfa',
    lang: 'en',
    dir: 'ltr',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: '/flux-icon.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
