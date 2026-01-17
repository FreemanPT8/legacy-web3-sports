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
      .from('lesson_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: articlesCount } = await supabase
      .from('blog_reads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

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
      type: tx.action,
      description: getActivityDescription(tx.action),
      xp: tx.xp_earned,
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

function getActivityDescription(action: string): string {
  const key = (action || '').toLowerCase();
  if (key.includes('lesson')) return 'Completed a lesson';
  if (key.includes('blog')) return 'Read an article';
  if (key.includes('profile')) return 'Updated profile';
  if (key.includes('mission')) return 'Completed daily mission';
  if (key.includes('streak')) return 'Earned streak bonus';
  return 'Earned XP';
}
