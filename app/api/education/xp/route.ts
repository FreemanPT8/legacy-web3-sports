import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const db = supabase;
  try {
    const rewardsPromise = db.from('xp_rewards').select('*');
    const thresholdsPromise = db.from('xp_thresholds').select('*').order('xp_total', { ascending: true });

    const [rewards, thresholds] = await Promise.all([
      rewardsPromise,
      thresholdsPromise,
    ]);

    if (rewards.error || thresholds.error) {
      console.error('Failed to load xp metadata', rewards.error || thresholds.error);
      return NextResponse.json({ success: false, error: 'Failed to load XP metadata' }, { status: 500 });
    }

    let streak = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const user = await verifyAuth(authHeader);
      if (user) {
        const { data: xpData } = await db
          .from('xp_transactions')
          .select('xp_earned, action, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        streak = xpData ? { latestXp: xpData.xp_earned, action: xpData.action } : null;
      }
    }

    return NextResponse.json({
      success: true,
      rewards: rewards.data || [],
      thresholds: thresholds.data || [],
      streak,
    });
  } catch (error) {
    console.error('GET /api/education/xp', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
