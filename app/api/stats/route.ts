import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { getXpLevelLabel } from '@/lib/education/xpLevels';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { count: lessonsCompleted } = await supabase
      .from('lesson_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('curriculum');

    if (coursesError) {
      console.error('Failed to load courses for lesson stats:', coursesError);
    }

    const totalLessons = (courses || []).reduce((acc, course: any) => {
      const topics = Array.isArray(course?.curriculum?.topics)
        ? course.curriculum.topics
        : [];
      const lessonsInCourse = topics.reduce(
        (sum: number, topic: any) =>
          sum + (Array.isArray(topic?.lessons) ? topic.lessons.length : 0),
        0,
      );
      return acc + lessonsInCourse;
    }, 0);

    const { count: articlesRead } = await supabase
      .from('blog_reads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, xp_total')
      .order('xp_total', { ascending: false });

    const rank = (allUsers?.findIndex((u) => u.id === user.id) || 0) + 1;

    const { data: xpTransactions } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user.id);

    const xpBreakdown = {
      lessons: 0,
      articles: 0,
      missions: 0,
      streaks: 0,
      profile: 0,
    };

    (xpTransactions || []).forEach((tx) => {
      const action = (tx.action || '').toLowerCase();
      const amount = Number(tx.xp_earned || 0);
      if (action.includes('lesson')) xpBreakdown.lessons += amount;
      else if (action.includes('blog')) xpBreakdown.articles += amount;
      else if (action.includes('mission')) xpBreakdown.missions += amount;
      else if (action.includes('streak')) xpBreakdown.streaks += amount;
      else if (action.includes('profile')) xpBreakdown.profile += amount;
    });

    const { data: recentXP } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentAchievements = (recentXP || [])
      .filter((tx) => (tx.xp_earned ?? 0) >= 10)
      .map((tx) => ({
        id: tx.id,
        title: getAchievementTitle(tx.action, tx.xp_earned),
        description: getAchievementDescription(tx.action),
        date: new Date(tx.created_at).toLocaleDateString(),
        xp: tx.xp_earned,
      }));


    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalXP: user.xp_total || 0,
          level: getXpLevelLabel(user.xp_total || 0),
          rank,
          streakCount: user.streak_count || 0,
          joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
        },
        learning: {
          coursesStarted: 0,
          coursesCompleted: 0,
          lessonsCompleted: lessonsCompleted || 0,
          totalLessons,
          articlesRead: articlesRead || 0,
          totalReadingTime: (articlesRead || 0) * 5,
        },
        xpBreakdown,
        recentAchievements,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

function getAchievementTitle(action: string, amount: number): string {
  const key = (action || '').toLowerCase();
  if (key.includes('lesson')) return 'Lesson Master';
  if (key.includes('blog')) return 'Avid Reader';
  if (key.includes('streak')) return 'Streak Champion';
  if (key.includes('mission')) return 'Mission Complete';
  if (key.includes('profile')) return 'Profile Complete';
  return amount >= 50 ? 'Big XP Gain' : 'Achievement Unlocked';
}

function getAchievementDescription(action: string): string {
  const key = (action || '').toLowerCase();
  if (key.includes('lesson')) return 'Completed a lesson';
  if (key.includes('blog')) return 'Read an article';
  if (key.includes('streak')) return 'Maintained a streak';
  if (key.includes('mission')) return 'Completed a daily mission';
  if (key.includes('profile')) return 'Updated profile details';
  return 'Earned XP';
}
