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

    const {
      data: commentRows,
      count: commentsAuthored,
    } = await supabase
      .from('content_comments')
      .select('positive_count, fire_count', { count: 'exact' })
      .eq('author_id', user.id)
      .is('deleted_at', null);

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
      community: 0,
      missions: 0,
      streaks: 0,
      profile: 0,
    };

    (xpTransactions || []).forEach((tx) => {
      const reason = tx.reason || '';
      if (reason === 'lesson_complete') xpBreakdown.lessons += tx.amount;
      else if (reason === 'article_read') xpBreakdown.articles += tx.amount;
      else if (reason.includes('forum') || reason.includes('comment'))
        xpBreakdown.community += tx.amount;
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

    type CommentAggregate = {
      positive_count: number | null;
      fire_count: number | null;
    };

    const commentAggregates = (commentRows || []) as CommentAggregate[];

    const reactionTotals = commentAggregates.reduce(
      (acc, row) => ({
        positive: acc.positive + (row.positive_count ?? 0),
        fire: acc.fire + (row.fire_count ?? 0),
      }),
      { positive: 0, fire: 0 }
    );

    const reactionPoints =
      reactionTotals.positive + reactionTotals.fire * 2;

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
        community: {
          commentsAuthored: commentsAuthored || 0,
          positiveReactions: reactionTotals.positive,
          fireReactions: reactionTotals.fire,
          reactionPoints,
          totalContributions: commentsAuthored || 0,
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
    forum_topic: 'Legacy Forum Topic',
    forum_post: 'Legacy Forum Reply',
    forum_comment: 'Legacy Forum Comment',
    comment_weekly_top: 'Comment of the Week',
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
    forum_topic: 'Created a topic in the legacy forum',
    forum_post: 'Posted in the legacy forum',
    forum_comment: 'Commented in the legacy forum',
    comment_weekly_top: 'Won Comment of the Week',
    profile_bio: 'Added profile bio',
  };

  return descriptions[reason] || 'Earned XP';
}
