// app/api/leaderboard/rank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 },
      );
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, xp_total')
      .gt('xp_total', 0)
      .order('xp_total', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard users:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load leaderboard' },
        { status: 500 },
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        rank: null,
        totalUsers: 0,
      });
    }

    const index = users.findIndex((u) => u.id === userId);
    const rank = index === -1 ? null : index + 1;

    return NextResponse.json({
      success: true,
      rank,
      totalUsers: users.length,
    });
  } catch (error) {
    console.error('Error in GET /api/leaderboard/rank:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
