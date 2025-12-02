import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    // ----------------------------
    // USERS
    // ----------------------------
    const { data: users } = await supabase
      .from('users')
      .select('id, created_at, role');

    const totalUsers = users?.length || 0;
    const totalAdmins = users?.filter(u => u.role === 'Admin').length || 0;
    const totalSuperAdmins = users?.filter(u => u.role === 'Super Admin').length || 0;

    // Growth calculation
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const usersThisMonth =
      users?.filter(u => new Date(u.created_at) > monthAgo).length || 0;

    const lastMonthUsers =
      users?.filter(u => {
        const created = new Date(u.created_at);
        return created > twoMonthsAgo && created <= monthAgo;
      }).length || 1;

    const userGrowth = lastMonthUsers
      ? Math.round(((usersThisMonth - lastMonthUsers) / lastMonthUsers) * 100)
      : 0;

    // ----------------------------
    // COURSES + LESSONS
    // ----------------------------
    const { data: courses } = await supabase
      .from('courses')
      .select('id, published');

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id');

    const totalCourses = courses?.length || 0;
    const totalLessons = lessons?.length || 0;

    // ----------------------------
    // BLOG POSTS
    // ----------------------------
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('id, published');

    const totalBlogPosts = blogPosts?.filter(p => p.published).length || 0;

    // ----------------------------
    // ONBOARDING
    // ----------------------------
    const { data: onboardingForms } = await supabase
      .from('onboarding_forms')
      .select('id, reviewed');

    const totalOnboardingPending =
      onboardingForms?.filter(f => !f.reviewed).length || 0;

    // ----------------------------
    // HOUSES OF SPORTS
    // ----------------------------
    const { data: houses } = await supabase
      .from('houses_of_sports')
      .select('id, status');

    const totalHouses = houses?.length || 0;
    const activeHouses = houses?.filter(h => h.status === 'active').length || 0;
    const buildingHouses = houses?.filter(h => h.status === 'building').length || 0;
    const developingHouses = houses?.filter(h => h.status === 'developing').length || 0;

    // ----------------------------
    // RETURN FINAL STATS OBJECT
    // ----------------------------
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalSuperAdmins,

        usersThisMonth,
        userGrowth: userGrowth > 0 ? `+${userGrowth}%` : `${userGrowth}%`,

        totalCourses,
        totalLessons,

        totalBlogPosts,

        totalOnboardingPending,

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
      { status: 500 }
    );
  }
}
