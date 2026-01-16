import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

const db = supabaseAdmin ?? supabase;
const PAGE_SIZE = 1000;

const now = () => new Date();
const sinceHours = (h: number) =>
  new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const sinceDays = (d: number) =>
  new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

const sumColumn = (rows: any[] | null | undefined, field: string) =>
  (rows || []).reduce((acc, r) => acc + (r?.[field] ?? 0), 0);

type Range = { from: number; to: number };

async function paginateRows<T>(
  fetchPage: (range: Range) => Promise<{ data: T[] | null; error: any }>,
  onPage: (rows: T[]) => void,
) {
  let from = 0;
  while (true) {
    const range = { from, to: from + PAGE_SIZE - 1 };
    const { data, error } = await fetchPage(range);
    if (error) {
      throw error;
    }
    const batch = data || [];
    if (batch.length === 0) break;
    onPage(batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
}

async function aggregateXpTable(
  table: string,
  timestampColumn: string,
  threshold24h: number,
  threshold30d: number,
) {
  let total = 0;
  let last24h = 0;
  let last30d = 0;

  await paginateRows<any>(
    ({ from, to }) =>
      db
        .from(table)
        .select(`xp_earned, ${timestampColumn}`)
        .range(from, to),
    (rows) => {
      rows.forEach((row) => {
        const xp = Number(row.xp_earned) || 0;
        total += xp;
        const ts = row[timestampColumn] ? Date.parse(row[timestampColumn]) : NaN;
        if (!Number.isNaN(ts)) {
          if (ts >= threshold30d) {
            last30d += xp;
          }
          if (ts >= threshold24h) {
            last24h += xp;
          }
        }
      });
    },
  );

  return { total, last24h, last30d };
}

async function aggregateBlogReads(thresholds: {
  threshold24h: number;
  threshold30d: number;
  threshold7d: number;
  threshold365d: number;
}) {
  const counts7d = new Map<string, number>();
  const counts30d = new Map<string, number>();
  const counts365d = new Map<string, number>();

  let xpTotal = 0;
  let xp24h = 0;
  let xp30d = 0;
  let viewsLogged = 0;

  await paginateRows<BlogReadRow>(
    ({ from, to }) =>
      db
        .from('blog_reads')
        .select('blog_post_id, xp_earned, completed_at')
        .range(from, to),
    (rows) => {
      rows.forEach((row) => {
        viewsLogged += 1;
        const xp = Number(row.xp_earned) || 0;
        xpTotal += xp;
        const ts = row.completed_at ? Date.parse(row.completed_at) : NaN;
        if (!Number.isNaN(ts)) {
          if (ts >= thresholds.threshold24h) {
            xp24h += xp;
          }
          if (ts >= thresholds.threshold30d) {
            xp30d += xp;
            incrementMap(counts30d, row.blog_post_id);
          }
          if (ts >= thresholds.threshold7d) {
            incrementMap(counts7d, row.blog_post_id);
          }
          if (ts >= thresholds.threshold365d) {
            incrementMap(counts365d, row.blog_post_id);
          }
        }
      });
    },
  );

  return {
    xp: {
      total: xpTotal,
      last24h: xp24h,
      last30d: xp30d,
    },
    viewsLogged,
    counts: {
      last7d: counts7d,
      last30d: counts30d,
      last365d: counts365d,
    },
  };
}

async function fetchAllRows<T>(
  fetchPage: (range: Range) => Promise<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const result: T[] = [];
  await paginateRows(fetchPage, (rows) => {
    result.push(...rows);
  });
  return result;
}

function incrementMap(map: Map<string, number>, key?: string | null) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

type BlogPostRow = {
  id: string;
  published?: boolean | null;
  views?: number | null;
  title?: any;
};

type BlogReadRow = {
  blog_post_id?: string | null;
  xp_earned?: number | null;
  completed_at?: string | null;
};

type UserRow = {
  id: string;
  role?: string | null;
  created_at?: string | null;
};

type CourseRow = {
  id: string;
  published?: boolean | null;
  curriculum?: any;
};

type HouseRow = {
  id: string;
  status?: string | null;
};

function resolveBlogTitle(post?: BlogPostRow | null) {
  if (!post) return null;
  const title = post.title;
  if (!title) return null;
  if (typeof title === 'string') return title;
  return (
    title.en ||
    title.pt ||
    title.es ||
    title.fr ||
    title.de ||
    title.it ||
    null
  );
}

function buildTopPosts(
  map: Map<string, number>,
  blogPosts: BlogPostRow[] | null | undefined,
) {
  const posts = blogPosts || [];
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, views]) => {
      const post = posts.find((p) => p.id === id);
      return { id, views, title: resolveBlogTitle(post) };
    });
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const window24h = sinceHours(24);
    const window30d = sinceDays(30);
    const threshold24h = Date.parse(window24h);
    const threshold30d = Date.parse(window30d);
    const threshold7d = Date.parse(sinceDays(7));
    const threshold365d = Date.parse(sinceDays(365));

    const [
      users,
      courses,
      blogPosts,
      houses,
      courseXp,
      lessonXp,
      xpAllAgg,
    ] = await Promise.all([
      fetchAllRows<UserRow>(({ from, to }) =>
        db.from('users').select('id, role, created_at').range(from, to),
      ),
      fetchAllRows<CourseRow>(({ from, to }) =>
        db.from('courses').select('id, published, curriculum').range(from, to),
      ),
      fetchAllRows<BlogPostRow>(({ from, to }) =>
        db.from('blog_posts').select('id, published, views, title').range(from, to),
      ),
      fetchAllRows<HouseRow>(({ from, to }) =>
        db.from('houses_of_sports').select('id, status').range(from, to),
      ),
      aggregateXpTable('course_completions', 'completed_at', threshold24h, threshold30d),
      aggregateXpTable('lesson_completions', 'completed_at', threshold24h, threshold30d),
      aggregateXpTable('xp_transactions', 'created_at', threshold24h, threshold30d),
    ]);

    const blogReadsAggregated = await aggregateBlogReads({
      threshold24h,
      threshold30d,
      threshold7d,
      threshold365d,
    });

    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.role === 'Admin').length;
    const totalSuperAdmins = users.filter((u) => u.role === 'Super Admin').length;
    const totalMembers = users.filter((u) => u.role === 'Member').length;
    const newUsers24h = users.filter((u) => u.created_at && u.created_at >= window24h).length;
    const newUsers30d = users.filter((u) => u.created_at && u.created_at >= window30d).length;

    const totalCourses = courses.length;
    const activeCourses = courses.filter((c) => !!c.published).length;

    let totalModules = 0;
    let totalLessons = 0;
    courses.forEach((course) => {
      const topics: any[] = Array.isArray(course.curriculum?.topics)
        ? course.curriculum!.topics
        : [];
      totalModules += topics.length;
      topics.forEach((topic: any) => {
        if (Array.isArray(topic?.lessons)) {
          totalLessons += topic.lessons.length;
        }
      });
    });

    const xpCoursesTotal = courseXp.total;
    const xpCourses24h = courseXp.last24h;
    const xpCourses30d = courseXp.last30d;

    const xpModulesTotal = 0;
    const xpModules24h = 0;
    const xpModules30d = 0;

    const xpLessonsTotal = lessonXp.total;
    const xpLessons24h = lessonXp.last24h;
    const xpLessons30d = lessonXp.last30d;

    const totalXpAll = xpAllAgg.total;
    const totalXpAll24h = xpAllAgg.last24h;
    const totalXpAll30d = xpAllAgg.last30d;

    const publishedPosts = blogPosts.filter((p) => !!p.published);
    const totalBlogPosts = publishedPosts.length;
    const blogXpTotal = blogReadsAggregated.xp.total;
    const blogXp24h = blogReadsAggregated.xp.last24h;
    const blogXp30d = blogReadsAggregated.xp.last30d;
    const blogViewsTotal = sumColumn(blogPosts, 'views');
    const blogViewsLogged = blogReadsAggregated.viewsLogged;

    const blogTop7d = buildTopPosts(
      blogReadsAggregated.counts.last7d,
      blogPosts,
    );
    const blogTop30d = buildTopPosts(
      blogReadsAggregated.counts.last30d,
      blogPosts,
    );
    const blogTop365d = buildTopPosts(
      blogReadsAggregated.counts.last365d,
      blogPosts,
    );

    const statusMap = {
      active: 'active',
      building: 'building',
      under_construction: 'building',
      in_development: 'developing',
      developing: 'developing',
      development: 'developing',
    } as Record<string, 'active' | 'building' | 'developing' | 'other'>;

    const totalHouses = houses?.length || 0;
    const activeHouses =
      houses?.filter(
        (h: HouseRow) => statusMap[(h.status || '').toLowerCase()] === 'active',
      )
        .length || 0;
    const buildingHouses =
      houses?.filter(
        (h: HouseRow) => statusMap[(h.status || '').toLowerCase()] === 'building',
      ).length || 0;
    const developingHouses =
      houses?.filter(
        (h: HouseRow) => statusMap[(h.status || '').toLowerCase()] === 'developing',
      ).length || 0;

    return NextResponse.json({
      success: true,
      stats: {
        // legacy flat fields (compat)
        totalUsers,
        totalAdmins,
        totalSuperAdmins,
        activeCourses,
        totalCourses,
        totalLessons,
        totalBlogPosts,
        totalHouses,
        activeHouses,
        buildingHouses,
        developingHouses,
        // structured
        users: {
          total: totalUsers,
          superAdmins: totalSuperAdmins,
          admins: totalAdmins,
          members: totalMembers,
          new24h: newUsers24h,
          new30d: newUsers30d,
        },
        courses: {
          totalCourses,
          activeCourses,
          totalModules,
          totalLessons,
          xp: {
            totalCourses: xpCoursesTotal,
            totalModules: xpModulesTotal,
            totalLessons: xpLessonsTotal,
            last24h: {
              courses: xpCourses24h,
              modules: xpModules24h,
              lessons: xpLessons24h,
            },
            last30d: {
              courses: xpCourses30d,
              modules: xpModules30d,
              lessons: xpLessons30d,
            },
            allActions: {
              total: totalXpAll,
              last24h: totalXpAll24h,
              last30d: totalXpAll30d,
            },
          },
        },
        blog: {
          totalPosts: totalBlogPosts,
          xp: {
            total: blogXpTotal,
            last24h: blogXp24h,
            last30d: blogXp30d,
          },
          views: {
            total: blogViewsTotal,
            logged: blogViewsLogged,
          },
          topPosts: {
            last7d: blogTop7d,
            last30d: blogTop30d,
            last365d: blogTop365d,
          },
        },
        houses: {
          total: totalHouses,
          active: activeHouses,
          building: buildingHouses,
          developing: developingHouses,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 },
    );
  }
}
