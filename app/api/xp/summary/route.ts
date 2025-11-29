// app/api/xp/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

type UserRow = {
  id: string;
  username: string | null;
  xp_total: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    if (
      !user ||
      (user.role !== 'Super Admin' && user.role !== 'Admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    // Vamos usar a tabela users, que já tem xp_total atualizado
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, username, xp_total');

    if (usersError) {
      console.error('Error fetching users for XP summary:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to load XP summary' },
        { status: 500 },
      );
    }

    const rawUsers = (users || []) as UserRow[];

    const safeUsers = rawUsers.map((u: UserRow) => ({
      ...u,
      xp_total: Number(u.xp_total || 0),
    }));

    const totalXP = safeUsers.reduce(
      (sum, u) => sum + (u.xp_total || 0),
      0,
    );

    const usersWithXP = safeUsers.filter((u) => (u.xp_total || 0) > 0);
    const totalUsersWithXP = usersWithXP.length;

    const avgXPPerUser =
      totalUsersWithXP > 0 ? Math.round(totalXP / totalUsersWithXP) : 0;

    let topUser:
      | {
          id: string;
          username: string | null;
          xp_total: number;
        }
      | null = null;

    if (safeUsers.length > 0) {
      const sorted = safeUsers
        .slice()
        .sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0));
      const t = sorted[0];
      topUser = {
        id: t.id,
        username: t.username,
        xp_total: t.xp_total || 0,
      };
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_xp: totalXP,
        avg_xp_per_user: avgXPPerUser,
        top_user: topUser,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/xp/summary:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
