import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', params.username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { count: lessonsCount } = await supabase
      .from('content_consumption')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true)
      .not('lesson_id', 'is', null);

    const { count: articlesCount } = await supabase
      .from('blog_reads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: commentsAuthored } = await supabase
      .from('content_comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .is('deleted_at', null);

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, xp_total')
      .order('xp_total', { ascending: false });

    const rank = (allUsers?.findIndex((u) => u.id === user.id) || 0) + 1;

    const { data: recentXP } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentActivity = (recentXP || []).map((tx) => ({
      id: tx.id,
      type: tx.reason,
      description: getActivityDescription(tx.reason),
      xp: tx.amount,
      created_at: tx.created_at,
    }));

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        sports_role: user.sports_role,
        dao1_did_nft: user.dao1_did_nft,
        xp_total: user.xp_total,
        created_at: user.created_at,
        streak_count: user.streak_count || 0,
        stats: {
          lessonsCompleted: lessonsCount || 0,
          articlesRead: articlesCount || 0,
          commentsAuthored: commentsAuthored || 0,
          rank,
        },
        recentActivity,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

function getActivityDescription(reason: string): string {
  const descriptions: Record<string, string> = {
    lesson_complete: 'Completed a lesson',
    article_read: 'Read an article',
    profile_bio: 'Added profile bio',
    profile_role: 'Set sports role',
    profile_nft: 'Added DAO1 DID NFT',
    comment_weekly_top: 'Won Comment of the Week',
    daily_mission: 'Completed daily mission',
    streak_bonus: 'Earned streak bonus',
  };

  return descriptions[reason] || 'Earned XP';
}
