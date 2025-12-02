import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

const db = supabaseAdmin ?? supabase;

const now = () => new Date();
const sinceHours = (h: number) =>
  new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const sinceDays = (d: number) =>
  new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

const sumColumn = (rows: any[] | null | undefined, field: string) =>
  (rows || []).reduce((acc, r) => acc + (r?.[field] ?? 0), 0);

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const window24h = sinceHours(24);
    const window30d = sinceDays(30);

    // USERS
    type UserRow = { id: string; role?: string | null; created_at?: string | null };
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, role, created_at', { count: 'exact' }) as { data: UserRow[] | null; error: any };
    if (usersError) console.error('Error fetching users in admin stats:', usersError);

    const totalUsers = users?.length || 0;
    const totalAdmins =
      users?.filter((u: UserRow) => u.role === 'Admin').length || 0;
    const totalSuperAdmins =
      users?.filter((u: UserRow) => u.role === 'Super Admin').length || 0;
    const totalMembers =
      users?.filter((u: UserRow) => u.role === 'Member').length || 0;
    const newUsers24h =
      users?.filter(
        (u: UserRow) => u.created_at && u.created_at >= window24h,
      ).length ||
      0;
    const newUsers30d =
      users?.filter(
        (u: UserRow) => u.created_at && u.created_at >= window30d,
      ).length ||
      0;

    // COURSES / MODULES / LESSONS
    type CourseRow = { id: string; published?: boolean | null };
    type ModuleRow = { id: string };
    type LessonRow = { id: string };

    const [{ data: courses, error: coursesError }, { data: modules, error: modulesError }, { data: lessons, error: lessonsError }] =
      await Promise.all([
        db.from('courses').select('id, published') as { data: CourseRow[] | null; error: any },
        db.from('modules').select('id') as { data: ModuleRow[] | null; error: any },
        db.from('lessons').select('id') as { data: LessonRow[] | null; error: any },
      ]);

    if (coursesError)
      console.error('Error fetching courses in admin stats:', coursesError);
    if (modulesError)
      console.error('Error fetching modules in admin stats:', modulesError);
    if (lessonsError)
      console.error('Error fetching lessons in admin stats:', lessonsError);

    const totalCourses = courses?.length || 0;
    const activeCourses =
      courses?.filter((c: CourseRow) => !!c.published).length || 0;
    const totalModules = modules?.length || 0;
    const totalLessons = lessons?.length || 0;

    // XP DISTRIBUÍDO (via completions para granularidade por tipo)
    const [
      { data: courseCompletions24h },
      { data: courseCompletions30d },
      { data: courseCompletionsAll },
      { data: moduleCompletions24h },
      { data: moduleCompletions30d },
      { data: moduleCompletionsAll },
      { data: lessonCompletions24h },
      { data: lessonCompletions30d },
      { data: lessonCompletionsAll },
    ] = await Promise.all([
      db.from('course_completions').select('xp_earned, completed_at').gte('completed_at', window24h),
      db.from('course_completions').select('xp_earned, completed_at').gte('completed_at', window30d),
      db.from('course_completions').select('xp_earned'),
      db.from('module_completions').select('xp_earned, completed_at').gte('completed_at', window24h),
      db.from('module_completions').select('xp_earned, completed_at').gte('completed_at', window30d),
      db.from('module_completions').select('xp_earned'),
      db.from('lesson_completions').select('xp_earned, completed_at').gte('completed_at', window24h),
      db.from('lesson_completions').select('xp_earned, completed_at').gte('completed_at', window30d),
      db.from('lesson_completions').select('xp_earned'),
    ]);

    const xpCoursesTotal = sumColumn(courseCompletionsAll, 'xp_earned');
    const xpCourses24h = sumColumn(courseCompletions24h, 'xp_earned');
    const xpCourses30d = sumColumn(courseCompletions30d, 'xp_earned');

    const xpModulesTotal = sumColumn(moduleCompletionsAll, 'xp_earned');
    const xpModules24h = sumColumn(moduleCompletions24h, 'xp_earned');
    const xpModules30d = sumColumn(moduleCompletions30d, 'xp_earned');

    const xpLessonsTotal = sumColumn(lessonCompletionsAll, 'xp_earned');
    const xpLessons24h = sumColumn(lessonCompletions24h, 'xp_earned');
    const xpLessons30d = sumColumn(lessonCompletions30d, 'xp_earned');

    // XP TOTAL (todas as ações)
    const [
      { data: xpAll },
      { data: xpAll24h },
      { data: xpAll30d },
    ] = await Promise.all([
      db.from('xp_transactions').select('xp_earned'),
      db.from('xp_transactions').select('xp_earned').gte('created_at', window24h),
      db.from('xp_transactions').select('xp_earned').gte('created_at', window30d),
    ]);

    const totalXpAll = sumColumn(xpAll, 'xp_earned');
    const totalXpAll24h = sumColumn(xpAll24h, 'xp_earned');
    const totalXpAll30d = sumColumn(xpAll30d, 'xp_earned');

    // BLOG
    type BlogPostRow = { id: string; published?: boolean | null; views?: number | null; title?: any };
    const [{ data: blogPosts, error: blogError }, { data: blogReads24h }, { data: blogReads30d }, { data: blogReadsAll }] =
      await Promise.all([
        db.from('blog_posts').select('id, published, views, title') as {
          data: BlogPostRow[] | null;
          error: any;
        },
        db.from('blog_reads').select('blog_post_id, xp_earned, completed_at').gte('completed_at', window24h),
        db.from('blog_reads').select('blog_post_id, xp_earned, completed_at').gte('completed_at', window30d),
        db.from('blog_reads').select('blog_post_id, xp_earned'),
      ]);

    if (blogError) console.error('Error fetching blog posts in admin stats:', blogError);

    const publishedPosts = (blogPosts || []).filter(
      (p: BlogPostRow) => !!p.published,
    );
    const totalBlogPosts = publishedPosts.length;
    const blogXpTotal = sumColumn(blogReadsAll, 'xp_earned');
    const blogXp24h = sumColumn(blogReads24h, 'xp_earned');
    const blogXp30d = sumColumn(blogReads30d, 'xp_earned');
    const blogViewsTotal = sumColumn(blogPosts, 'views');
    const blogViewsLogged = (blogReadsAll || []).length;

    const calcTop = (reads: any[]) => {
      const counts = (reads || []).reduce<Record<string, number>>((acc, r) => {
        const id = r.blog_post_id;
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, views]) => {
          const post = blogPosts?.find((p) => p.id === id);
          return { id, views, title: post?.title || null };
        });
      return sorted;
    };

    const blogTop7d = calcTop(
      (blogReadsAll || []).filter(
        (r) => r.completed_at && r.completed_at >= sinceDays(7),
      ),
    );
    const blogTop30d = calcTop(
      (blogReadsAll || []).filter(
        (r) => r.completed_at && r.completed_at >= window30d,
      ),
    );
    const blogTop365d = calcTop(
      (blogReadsAll || []).filter(
        (r) => r.completed_at && r.completed_at >= sinceDays(365),
      ),
    );

    // ONBOARDING
    const { data: onboardingSubmissions, error: onboardingError } = await db
      .from('onboarding_submissions')
      .select('id, status, assigned_to_user_id, created_at');
    if (onboardingError) {
      console.error('Error fetching onboarding submissions in admin stats:', onboardingError);
    }

    const pendingStatuses = [
      'PENDING_RESPONSE',
      'RESPONDED_WAITING',
      'FIRST_CONTACT_SCHEDULED',
      'FIRST_CONTACT_DONE',
      'ONBOARDING_LEGACY',
      'ONBOARDING_DAO1',
    ];

    const totalOnboardingPending =
      onboardingSubmissions?.filter((f) =>
        pendingStatuses.includes(f.status || ''),
      ).length || 0;

    const onboardingByStatus = (onboardingSubmissions || []).reduce(
      (acc: Record<string, number>, form: any) => {
        const s = form?.status || 'unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {},
    );

    const onboardingByResponsible = (onboardingSubmissions || []).reduce(
      (acc: Record<string, number>, form: any) => {
        const uid = form?.assigned_to_user_id;
        if (!uid) return acc;
        acc[uid] = (acc[uid] || 0) + 1;
        return acc;
      },
      {},
    );

    const pendingPorAbrir =
      onboardingSubmissions?.filter((f) => f.status === 'PENDING_RESPONSE')
        .length || 0;

    // HOUSES OF SPORTS
    const { data: houses, error: housesError } = await db
      .from('houses_of_sports')
      .select('id, status');
    if (housesError) console.error('Error fetching houses in admin stats:', housesError);

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
      houses?.filter((h) => statusMap[(h.status || '').toLowerCase()] === 'active')
        .length || 0;
    const buildingHouses =
      houses?.filter(
        (h) => statusMap[(h.status || '').toLowerCase()] === 'building',
      ).length || 0;
    const developingHouses =
      houses?.filter(
        (h) => statusMap[(h.status || '').toLowerCase()] === 'developing',
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
        totalOnboardingPending,
        onboardingByStatus,
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
        onboarding: {
          pendingTotal: totalOnboardingPending,
          pendingByStatus: onboardingByStatus,
          pendingPorAbrir,
          byResponsible: onboardingByResponsible,
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
