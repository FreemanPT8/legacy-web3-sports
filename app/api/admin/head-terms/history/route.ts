import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HistoryEntry = {
  id: string;
  version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  users: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
  } | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const houseId = searchParams.get('houseId');
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing houseId.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('house_head_terms')
      .select(
        `
        id,
        version,
        accepted_at,
        ip_address,
        user_agent,
        users (
          id,
          full_name,
          username,
          email
        )
      `,
      )
      .eq('house_id', houseId)
      .order('accepted_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const entries =
      data?.map((row: HistoryEntry) => ({
        id: row.id,
        version: row.version,
        acceptedAt: row.accepted_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        user: row.users
          ? {
              id: row.users.id,
              name: row.users.full_name,
              username: row.users.username,
              email: row.users.email,
            }
          : null,
      })) ?? [];

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error('[admin/head-terms/history] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load history.' }, { status: 500 });
  }
}
