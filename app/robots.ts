import type { MetadataRoute } from 'next';

const siteUrl = 'https://tally-finance.cheapdreams02.chatgpt.site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
