import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

function safeUnique<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const set = new Set<string>();
  rows.forEach((row) => {
    const value = key(row);
    if (value) set.add(value);
  });
  return set;
}

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
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from('user_houses')
      .select('user_id')
      .eq('house_id', houseId)
      .is('removed_at', null);
    if (membersError) throw membersError;

    const memberIds =
      membersData
        ?.map((row: { user_id: string | null }) => row.user_id)
        .filter((id: string | null): id is string => Boolean(id)) ?? [];
    const memberCount = memberIds.length;

    let completionRate = 0;
    let completionUsers = 0;
    let totalCompletions = 0;
    let retention30 = 0;
    let retention60 = 0;
    let retention90 = 0;

    if (memberCount > 0) {
      const { data: completionRows, error: completionError } = await supabaseAdmin
        .from('course_completions')
        .select('user_id')
        .in('user_id', memberIds);
      if (completionError) throw completionError;
      totalCompletions = completionRows?.length ?? 0;
      completionUsers = safeUnique(completionRows ?? [], (row: any) => row.user_id).size;
      completionRate = completionUsers / memberCount;

      const cutoff90 = new Date();
      cutoff90.setDate(cutoff90.getDate() - 90);
      const { data: xpRows, error: xpError } = await supabaseAdmin
        .from('xp_transactions')
        .select('user_id, created_at')
        .in('user_id', memberIds)
        .gte('created_at', cutoff90.toISOString());
      if (xpError) throw xpError;

      const lastActivity = new Map<string, number>();
      xpRows?.forEach((row: { user_id: string | null; created_at: string | null }) => {
        const id = row.user_id;
        const createdAt = row.created_at ? new Date(row.created_at).getTime() : null;
        if (!id || !createdAt) return;
        const previous = lastActivity.get(id) ?? 0;
        if (createdAt > previous) {
          lastActivity.set(id, createdAt);
        }
      });

      const now = Date.now();
      memberIds.forEach((id: string) => {
        const last = lastActivity.get(id);
        if (!last) return;
        const diffDays = (now - last) / (1000 * 60 * 60 * 24);
        if (diffDays <= 90) retention90 += 1;
        if (diffDays <= 60) retention60 += 1;
        if (diffDays <= 30) retention30 += 1;
      });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        members: memberCount,
        completionRate,
        completionUsers,
        totalCompletions,
        retention: {
          d30: memberCount ? retention30 / memberCount : 0,
          d60: memberCount ? retention60 / memberCount : 0,
          d90: memberCount ? retention90 / memberCount : 0,
        },
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[admin/houses/metrics] Failed to load metrics', err);
    return NextResponse.json({ success: false, error: 'Failed to load metrics.' }, { status: 500 });
  }
}
