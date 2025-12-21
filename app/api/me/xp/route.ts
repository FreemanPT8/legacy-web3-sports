// app/api/me/xp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

type XPTransaction = {
  id: string;
  user_id: string | null;
  action: string;
  xp_earned: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const headerToken = request.headers.get('Authorization');
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('token')?.value ||
      null;

    const bearerToken =
      headerToken ||
      (cookieToken ? `Bearer ${cookieToken}` : null);

    const user = bearerToken ? await verifyAuth(bearerToken) : null;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const userId = user.id;

    // Datas em UTC
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setUTCDate(startOfToday.getUTCDate() - 6); // hoje + 6 dias anteriores

    const thirtyDaysAgo = new Date(startOfToday);
    thirtyDaysAgo.setUTCDate(startOfToday.getUTCDate() - 29); // hoje + 29 dias anteriores

    const nowISO = now.toISOString();
    const startTodayISO = startOfToday.toISOString();
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // 1) Dados base do user: xp_total, streak, etc.
    const { data: userRow, error: userError } = await db
      .from('users')
      .select(
        `
        id,
        username,
        xp_total,
        streak_count,
        streak_updated_at,
        streak_long_count,
        streak_long_updated_at,
        created_at
      `,
      )
      .eq('id', userId)
      .maybeSingle();

    const fallbackUserRow = {
      id: user.id,
      username: user.username,
      xp_total: user.xp_total ?? 0,
      streak_count: user.streak_count ?? 0,
      streak_updated_at: null,
      streak_long_count: 0,
      streak_long_updated_at: null,
      created_at: user.created_at ?? null,
    };

    const hydratedUser = userRow ?? fallbackUserRow;

    if (userError) {
      console.error('Error fetching user for XP summary:', userError);
    }

    const safeXpTotal = Number(hydratedUser.xp_total ?? 0);
    const streakCount = Number(hydratedUser.streak_count ?? 0);
    const longStreakCount = Number(hydratedUser.streak_long_count ?? 0);

    // 2) Transações dos últimos 30 dias
    const { data: txData, error: txError } = await db
      .from('xp_transactions')
      .select(
        `
        id,
        user_id,
        action,
        xp_earned,
        reference_id,
        reference_type,
        created_at
      `,
      )
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgoISO)
      .lte('created_at', nowISO)
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('Error fetching XP transactions:', txError);
      return NextResponse.json(
        { success: false, error: 'Failed to load XP transactions' },
        { status: 500 },
      );
    }

    const transactions: XPTransaction[] = (txData || []) as XPTransaction[];

    // 3) Cálculos agregados
    let xpToday = 0;
    let xpLast7 = 0;
    let xpLast30 = 0;

    transactions.forEach((tx) => {
      const ts = new Date(tx.created_at).getTime();
      const createdISO = tx.created_at;

      if (createdISO >= startTodayISO && createdISO <= nowISO) {
        xpToday += tx.xp_earned;
      }
      if (createdISO >= sevenDaysAgoISO && createdISO <= nowISO) {
        xpLast7 += tx.xp_earned;
      }
      if (createdISO >= thirtyDaysAgoISO && createdISO <= nowISO) {
        xpLast30 += tx.xp_earned;
      }
    });

    // 4) Opcional: breakdown simples por tipo de ação
    const actionBreakdown: Record<string, number> = {};
    transactions.forEach((tx) => {
      const key = tx.action || 'other';
      actionBreakdown[key] = (actionBreakdown[key] || 0) + tx.xp_earned;
    });

    // Últimas 20 transações para mostrar na dashboard
    const recentTransactions = transactions.slice(0, 20);

    return NextResponse.json(
      {
        success: true,
        xp: {
      xp_total: safeXpTotal,
      xp_today: xpToday,
      xp_last_7_days: xpLast7,
      xp_last_30_days: xpLast30,
      streak_count: streakCount,
      streak_updated_at: hydratedUser.streak_updated_at,
      streak_long_count: longStreakCount,
      streak_long_updated_at: hydratedUser.streak_long_updated_at,
          action_breakdown: actionBreakdown,
          recent_transactions: recentTransactions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/me/xp:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
