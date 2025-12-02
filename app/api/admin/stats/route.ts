import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    // USERS
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, role');
    if (usersError) console.error('Error fetching users in admin stats:', usersError);

    const totalUsers = users?.length || 0;
    const totalAdmins = users?.filter((u) => u.role === 'Admin').length || 0;
    const totalSuperAdmins = users?.filter((u) => u.role === 'Super Admin').length || 0;

    // COURSES
    const { data: courses, error: coursesError } = await db
      .from('courses')
      .select('id, published');
    if (coursesError) console.error('Error fetching courses in admin stats:', coursesError);

    const totalCourses = courses?.length || 0;
    const activeCourses = courses?.filter((c) => c.published).length || 0;

    // LESSONS
    const { data: lessons, error: lessonsError } = await db
      .from('lessons')
      .select('id');
    if (lessonsError) console.error('Error fetching lessons in admin stats:', lessonsError);

    const totalLessons = lessons?.length || 0;

    // BLOG POSTS
    const { data: blogPosts, error: blogError } = await db
      .from('blog_posts')
      .select('id, published');
    if (blogError) console.error('Error fetching blog posts in admin stats:', blogError);

    const totalBlogPosts = blogPosts?.filter((p) => p.published).length || 0;

    // ONBOARDING FORMS
    const { data: onboardingForms, error: onboardingError } = await db
      .from('onboarding_forms')
      .select('id, reviewed, status');
    if (onboardingError) {
      console.error('Error fetching onboarding forms in admin stats:', onboardingError);
    }

    const totalOnboardingPending =
      onboardingForms?.filter((f) => !f.reviewed).length || 0;

    // Contagens por estado (fallback para 0)
    const onboardingByStatus = (onboardingForms || []).reduce(
      (acc: Record<string, number>, form: any) => {
        const s = form?.status || 'unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {},
    );

    // HOUSES OF SPORTS
    const { data: houses, error: housesError } = await db
      .from('houses_of_sports')
      .select('id, status');
    if (housesError) console.error('Error fetching houses in admin stats:', housesError);

    const totalHouses = houses?.length || 0;
    const activeHouses = houses?.filter((h) => h.status === 'active').length || 0;
    const buildingHouses = houses?.filter((h) => h.status === 'building').length || 0;
    const developingHouses =
      houses?.filter((h) => h.status === 'developing').length || 0;

    return NextResponse.json({
      success: true,
      stats: {
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
