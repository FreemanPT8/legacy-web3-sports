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
      .select('id')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[houses/join-request] failed to submit request', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit request.' },
      { status: 500 },
    );
  }
}
