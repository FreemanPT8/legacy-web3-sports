import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const staticRoutes = [
  '/',
  '/blog',
  '/education/courses',
  '/sports/houses',
  '/events',
  '/login',
  '/signup',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return staticRoutes.map((path) => ({
    url: new URL(path, appUrl).toString(),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1.0 : 0.6,
  }));
}
