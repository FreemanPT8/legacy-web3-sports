import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    const { data: courses } = await supabase
      .from('courses')
      .select('id, published');

    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('id, published');

    const { data: onboardingForms } = await supabase
      .from('onboarding_forms')
      .select('id, reviewed');

    const totalUsers = users?.length || 0;
    const usersThisMonth = users?.filter(u => {
      const created = new Date(u.created_at);
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return created > monthAgo;
    }).length || 0;

    const lastMonthUsers = users?.filter(u => {
      const created = new Date(u.created_at);
      const now = new Date();
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return created > twoMonthsAgo && created <= monthAgo;
    }).length || 1;

    const userGrowth = lastMonthUsers > 0
      ? Math.round(((usersThisMonth - lastMonthUsers) / lastMonthUsers) * 100)
      : 0;

    const activeCourses = courses?.filter(c => c.published).length || 0;
    const totalCourses = courses?.length || 0;

    const publishedPosts = blogPosts?.filter(p => p.published).length || 0;
    const totalPosts = blogPosts?.length || 0;

    const pendingOnboarding = onboardingForms?.filter(f => !f.reviewed).length || 0;

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id');
    const totalLessons = lessons?.length || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        usersThisMonth,
        userGrowth: userGrowth > 0 ? `+${userGrowth}%` : `${userGrowth}%`,
        activeCourses,
        totalCourses,
        totalLessons,
        publishedPosts,
        totalPosts,
        pendingOnboarding
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
