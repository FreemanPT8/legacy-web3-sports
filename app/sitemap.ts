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

type DbRow = { id: string; updated_at?: string | null; created_at?: string | null };

function mapDate(row: DbRow) {
  const raw = row.updated_at || row.created_at;
  return raw ? new Date(raw) : new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: new URL(path, appUrl).toString(),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1.0 : 0.6,
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = serviceRole ?? anonKey;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Sitemap: missing Supabase configuration, only static routes will be included.',
    );
    return entries;
  }

  const supabaseHeaders: Record<string, string> = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  async function fetchSupabaseRows<T>(path: string): Promise<T[]> {
    try {
      const url = `${supabaseUrl}/rest/v1/${path}`;
      const response = await fetch(url, {
        headers: supabaseHeaders,
        // ensure we don't cache stale sitemap data for too long
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        console.error(`Sitemap: failed to fetch ${path}`, await response.text());
        return [];
      }

      return (await response.json()) as T[];
    } catch (error) {
      console.error(`Sitemap: unexpected error fetching ${path}`, error);
      return [];
    }
  }

  try {
    const blogPosts = await fetchSupabaseRows<DbRow>(
      'blog_posts?select=id,updated_at,created_at&published=eq.true',
    );

    blogPosts.forEach((p) => {
      entries.push({
        url: `${appUrl}/blog/${p.id}`,
        lastModified: mapDate(p),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    const publishedCourses = await fetchSupabaseRows<DbRow>(
      'courses?select=id,updated_at,created_at,published,is_published&or=(published.eq.true,is_published.eq.true)',
    );

    publishedCourses.forEach((course) => {
      entries.push({
        url: `${appUrl}/education/courses/${course.id}`,
        lastModified: mapDate(course),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    const publishedLessons = await fetchSupabaseRows<DbRow>(
      'lessons?select=id,updated_at,created_at,published&published=eq.true',
    );

    publishedLessons.forEach((lesson) => {
      entries.push({
        url: `${appUrl}/education/lessons/${lesson.id}`,
        lastModified: mapDate(lesson),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    });

    const houses = await fetchSupabaseRows<DbRow>(
      'houses_of_sports?select=id,updated_at,created_at',
    );

    houses.forEach((house) => {
      entries.push({
        url: `${appUrl}/sports/houses/${house.id}`,
        lastModified: mapDate(house),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  } catch (err) {
    console.error('Error building sitemap:', err);
  }

  return entries;
}
