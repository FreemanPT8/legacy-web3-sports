import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = (params.houseKey || '').toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const { error: membershipError, count: membershipCount } = await supabaseAdmin
      .from('user_houses')
      .select('*', { head: true, count: 'exact' })
      .eq('user_id', user.userId)
      .eq('house_id', houseRow.id)
      .is('removed_at', null);
    if (membershipError) throw membershipError;
    if (!membershipCount) {
      return NextResponse.json({ success: false, error: 'Membership required.' }, { status: 403 });
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 5, 10);
    const { data: popupRows, error: popupError } = await supabaseAdmin
      .from('onboarding_popups')
      .select('id, title, body, badge_label, updated_at')
      .eq('house_key', houseKey)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (popupError) throw popupError;

    const messages =
      (popupRows ?? []).map(
        (row: {
          id: string;
          title: string;
          body: string;
          badge_label?: string | null;
          updated_at?: string | null;
        }) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          badgeLabel: row.badge_label ?? null,
          updatedAt: row.updated_at ?? null,
        }),
      ) ?? [];

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('[houses/messages] failed to load messages', error);
    return NextResponse.json({ success: false, error: 'Failed to load messages.' }, { status: 500 });
  }
}
