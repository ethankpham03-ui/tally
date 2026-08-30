import type { MetadataRoute } from 'next';

const siteUrl = 'https://tally.ethankpham.workers.dev';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
