import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Usamos o mesmo client que o sistema de XP (com service role se existir)
const db = supabaseAdmin ?? supabase;

type ActivityItem = {
  id: string;
  action: string;
  xp_earned: number;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit') || '20';
    const limit = Number.parseInt(limitParam, 10) || 20;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 },
      );
    }

    // Ler diretamente do log central de XP (xp_transactions)
    const { data, error } = await db
      .from('xp_transactions')
      .select('id, action, xp_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching xp history:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const history: ActivityItem[] = (data || []).map((tx: any) => ({
      id: tx.id,
      action: tx.action,
      xp_earned: tx.xp_earned,
      created_at: tx.created_at,
    }));

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Error in GET /api/xp/history:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
