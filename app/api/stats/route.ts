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
      .from('content_consumption')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true)
      .not('lesson_id', 'is', null);

    const { data: totalLessons } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true });

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
      const reason = tx.reason || '';
      if (reason === 'lesson_complete') xpBreakdown.lessons += tx.amount;
      else if (reason === 'article_read') xpBreakdown.articles += tx.amount;
      else if (reason === 'daily_mission') xpBreakdown.missions += tx.amount;
      else if (reason === 'streak_bonus') xpBreakdown.streaks += tx.amount;
      else if (reason.includes('profile')) xpBreakdown.profile += tx.amount;
    });

    const { data: recentXP } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentAchievements = (recentXP || [])
      .filter((tx) => tx.amount >= 10)
      .map((tx) => ({
        id: tx.id,
        title: getAchievementTitle(tx.reason, tx.amount),
        description: getAchievementDescription(tx.reason),
        date: new Date(tx.created_at).toLocaleDateString(),
        xp: tx.amount,
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
          totalLessons: totalLessons?.length || 0,
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

function getAchievementTitle(reason: string, amount: number): string {
  const titles: Record<string, string> = {
    lesson_complete: 'Lesson Master',
    article_read: 'Avid Reader',
    streak_bonus: 'Streak Champion',
    daily_mission: 'Mission Complete',
    profile_bio: 'Profile Complete',
  };

  return titles[reason] || 'Achievement Unlocked';
}

function getAchievementDescription(reason: string): string {
  const descriptions: Record<string, string> = {
    lesson_complete: 'Completed a lesson',
    article_read: 'Read an article',
    streak_bonus: 'Maintained a 7-day streak',
    daily_mission: 'Completed a daily mission',
    profile_bio: 'Added profile bio',
  };

  return descriptions[reason] || 'Earned XP';
}
