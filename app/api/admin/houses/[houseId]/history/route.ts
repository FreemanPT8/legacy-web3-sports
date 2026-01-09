import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('house_history')
      .select(
        'id, action, payload, created_at, actor:users!house_history_created_by_fkey(id, full_name, username, avatar_url)',
      )
      .eq('house_id', houseId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const entries =
      data?.map((row: any) => ({
        id: row.id as string,
        action: row.action as string,
        payload: (row.payload as Record<string, unknown>) ?? {},
        createdAt: row.created_at as string,
        author: row.actor
          ? {
              id: row.actor.id as string,
              name: row.actor.full_name ?? row.actor.username ?? 'Admin',
              username: row.actor.username as string | null,
              avatarUrl: (row.actor.avatar_url as string | null) ?? null,
            }
          : null,
      })) ?? [];

    return NextResponse.json({ success: true, entries });
  } catch (err) {
    console.error('[admin/houses/history] Failed to load history', err);
    return NextResponse.json({ success: false, error: 'Failed to load house history.' }, { status: 500 });
  }
}
