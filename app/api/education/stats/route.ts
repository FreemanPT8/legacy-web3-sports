import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 1) Cursos publicados + curriculum
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(
        `
        id,
        title,
        description,
        xp_threshold,
        published,
        level,
        image_url,
        curriculum
      `,
      )
      .eq('published', true);

    if (coursesError) {
      return NextResponse.json(
        { success: false, error: coursesError.message },
        { status: 500 },
      );
    }

    const enrichedCourses =
      courses?.map((course: any) => {
        const topics: any[] = Array.isArray(course.curriculum?.topics)
          ? course.curriculum!.topics
          : [];

        const modules = topics.map((topic: any, topicIndex: number) => ({
          id: topic?.id || `topic-${topicIndex + 1}`,
          lessons: Array.isArray(topic?.lessons)
            ? topic.lessons
            : [],
        }));

        const lessonsCount = modules.reduce(
          (sum: number, module: any) =>
            sum +
            (Array.isArray(module.lessons)
              ? module.lessons.length
              : 0),
          0,
        );

        return {
          ...course,
          modules,
          lessonsCount,
          topicsCount: modules.length,
          xp_required: course.xp_threshold ?? 0,
        };
      }) || [];

    const totalCourses = enrichedCourses.length;
    const totalLessons = enrichedCourses.reduce(
      (sum: number, course: any) =>
        sum + (course.lessonsCount || 0),
      0,
    );

    // 2) Utilizadores ativos / totais
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('xp_total', 0);

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 3) XP total distribuído
    const { data: xpData, error: xpError } = await supabase
      .from('xp_transactions')
      .select('xp_earned');

    if (xpError) {
      return NextResponse.json(
        { success: false, error: xpError.message },
        { status: 500 },
      );
    }

    const totalXPDistributed = (xpData || []).reduce(
      (sum, tx: any) => sum + (tx.xp_earned || 0),
      0,
    );

    // 4) Top cursos (por nº de módulos)
    const topCourses =
      enrichedCourses
        ?.slice()
        .sort((a, b) => {
          const aModules = a.topicsCount || 0;
          const bModules = b.topicsCount || 0;
          return bModules - aModules;
        })
        .slice(0, 3) || [];

    // 5) Top leaderboard
    const { data: topLeaderboard } = await supabase
      .from('users')
      .select('id, username, xp_total, avatar_url, country')
      .order('xp_total', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      stats: {
        totalCourses,
        totalLessons,
        activeUsers: activeUsers || 0,
        totalUsers: totalUsers || 0,
        totalXPDistributed,
      },
      topCourses,
      topLeaderboard: topLeaderboard || [],
    });
  } catch (error) {
    console.error('Education stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
