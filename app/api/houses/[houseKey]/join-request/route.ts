import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { houseKey: string } }) {
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
      .select('id, monthly_capacity, governance_status')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }
    if (houseRow.governance_status && houseRow.governance_status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta House está temporariamente limitada. Volta mais tarde ou contacta o suporte oficial.',
        },
        { status: 409 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { note?: string | null };
    const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null;

    const clientHeaders = headers();
    const ip = clientHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = clientHeaders.get('user-agent') ?? null;

    const payloadData = {
      note,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      version: 'member-cta-v1',
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pendingSnapshot, memberSnapshot] = await Promise.all([
      supabaseAdmin
        .from('house_join_requests')
        .select('*', { head: true, count: 'exact' })
        .eq('house_id', houseRow.id)
        .eq('status', 'pending')
        .gte('created_at', startOfMonth.toISOString()),
      supabaseAdmin
        .from('user_houses')
        .select('*', { head: true, count: 'exact' })
        .eq('house_id', houseRow.id)
        .is('removed_at', null),
    ]);

    if (pendingSnapshot.error) throw pendingSnapshot.error;
    if (memberSnapshot.error) throw memberSnapshot.error;

    const monthlyCapacity = houseRow.monthly_capacity ?? null;
    const pendingCount = pendingSnapshot.count ?? 0;
    const memberCount = memberSnapshot.count ?? 0;
    if (monthlyCapacity !== null && monthlyCapacity >= 0 && memberCount + pendingCount >= monthlyCapacity) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A capacidade mensal desta House já foi atingida. Acompanha as novidades ou tenta novamente no próximo ciclo.',
        },
        { status: 429 },
      );
    }

    await supabaseAdmin
      .from('house_join_requests')
      .delete()
      .eq('house_id', houseRow.id)
      .eq('user_id', user.userId)
      .eq('status', 'pending');

    const { error: insertError } = await supabaseAdmin.from('house_join_requests').insert({
      house_id: houseRow.id,
      user_id: user.userId,
      payload: payloadData,
      status: 'pending',
    });
    if (insertError) throw insertError;

    const { error: acceptanceError } = await supabaseAdmin
      .from('house_term_acceptances')
      .upsert(
        {
          user_id: user.userId,
          house_key: houseKey,
          accepted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,house_key' },
      );
    if (acceptanceError) throw acceptanceError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[houses/join-request] failed to submit request', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit request.' },
      { status: 500 },
    );
  }
}
