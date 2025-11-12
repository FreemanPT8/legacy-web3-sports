import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

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

    const { count: forumTopics } = await supabase
      .from('forum_topics')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id);

    const { count: forumPosts } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id);

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
      forum: 0,
      missions: 0,
      streaks: 0,
      profile: 0,
    };

    (xpTransactions || []).forEach((tx) => {
      if (tx.reason === 'lesson_complete') xpBreakdown.lessons += tx.amount;
      else if (tx.reason === 'article_read') xpBreakdown.articles += tx.amount;
      else if (tx.reason.includes('forum')) xpBreakdown.forum += tx.amount;
      else if (tx.reason === 'daily_mission') xpBreakdown.missions += tx.amount;
      else if (tx.reason === 'streak_bonus') xpBreakdown.streaks += tx.amount;
      else if (tx.reason.includes('profile')) xpBreakdown.profile += tx.amount;
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

    const getLevel = (xp: number) => {
      if (xp >= 10000) return 'Legend';
      if (xp >= 5000) return 'Master';
      if (xp >= 3333) return 'Hall of Fame';
      if (xp >= 1000) return 'Expert';
      if (xp >= 555) return 'Advanced';
      if (xp >= 369) return 'Intermediate';
      if (xp >= 99) return 'Beginner';
      return 'Newcomer';
    };

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalXP: user.xp_total || 0,
          level: getLevel(user.xp_total || 0),
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
        community: {
          forumTopics: forumTopics || 0,
          forumPosts: forumPosts || 0,
          forumLikes: 0,
          totalContributions: (forumTopics || 0) + (forumPosts || 0),
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
    forum_topic: 'Discussion Starter',
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
    forum_topic: 'Created a forum topic',
    profile_bio: 'Added profile bio',
  };

  return descriptions[reason] || 'Earned XP';
}
