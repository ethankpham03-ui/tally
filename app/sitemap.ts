import type { MetadataRoute } from 'next';

const siteUrl = 'https://tally-finance.cheapdreams02.chatgpt.site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
