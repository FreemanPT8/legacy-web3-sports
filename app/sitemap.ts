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

let clientPromise: Promise<any> | null = null;
let clientUnavailable = false;

async function getServerSupabaseClient() {
  if (clientUnavailable) {
    return null;
  }
  if (clientPromise) {
    return clientPromise;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRole && !anonKey)) {
    console.warn(
      'Sitemap: missing Supabase configuration, only static routes will be included.',
    );
    clientUnavailable = true;
    return null;
  }

  clientPromise = import('@supabase/supabase-js/dist/module/index.js').then(
    ({ createClient }) =>
      createClient(
        supabaseUrl,
        serviceRole ?? anonKey!,
        serviceRole
          ? {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          : undefined,
      ),
  );

  return clientPromise;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: new URL(path, appUrl).toString(),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1.0 : 0.6,
  }));

  const client = await getServerSupabaseClient();
  if (!client) {
    return entries;
  }

  try {
    // Blog posts publicados
    const { data: posts } = await client
      .from('blog_posts')
      .select('id, updated_at, created_at')
      .eq('published', true);

    posts?.forEach((p: DbRow) => {
      entries.push({
        url: `${appUrl}/blog/${p.id}`,
        lastModified: mapDate(p),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    // Cursos publicados
    const { data: courses } = await client
      .from('courses')
      .select('id, updated_at, created_at, published, is_published')
      .or('published.eq.true,is_published.eq.true');

    courses?.forEach((c: DbRow) => {
      entries.push({
        url: `${appUrl}/education/courses/${c.id}`,
        lastModified: mapDate(c),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    // Lessons publicadas (se existirem)
    const { data: lessons } = await client
      .from('lessons')
      .select('id, updated_at, created_at, published')
      .eq('published', true);

    lessons?.forEach((l: DbRow) => {
      entries.push({
        url: `${appUrl}/education/lessons/${l.id}`,
        lastModified: mapDate(l),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    });

    // Houses públicas
    const { data: houses } = await client
      .from('houses_of_sports')
      .select('id, updated_at, created_at');

    houses?.forEach((h: DbRow) => {
      entries.push({
        url: `${appUrl}/sports/houses/${h.id}`,
        lastModified: mapDate(h),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  } catch (err) {
    console.error('Error building sitemap:', err);
  }

  return entries;
}
