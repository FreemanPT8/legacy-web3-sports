import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 1) Cursos + módulos + lições publicados
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(
        `
        id,
        title,
        description,
        xp_threshold,
        published,
        modules:modules(
          id,
          lessons:lessons(id)
        )
      `,
      )
      .eq('published', true);

    if (coursesError) {
      return NextResponse.json(
        { success: false, error: coursesError.message },
        { status: 500 },
      );
    }

    const totalCourses = courses?.length || 0;

    let totalLessons = 0;
    courses?.forEach((course) => {
      const modules = Array.isArray(course.modules) ? course.modules : [];
      modules.forEach((module: any) => {
        const lessons = Array.isArray(module.lessons)
          ? module.lessons
          : [];
        totalLessons += lessons.length;
      });
    });

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
      courses
        ?.slice()
        .sort((a, b) => {
          const aModules = Array.isArray(a.modules) ? a.modules : [];
          const bModules = Array.isArray(b.modules) ? b.modules : [];
          return bModules.length - aModules.length;
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
