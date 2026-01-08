import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type JoinRequestBody = {
  note?: string;
};

export async function POST(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = params.houseKey?.toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as JoinRequestBody;
  const note = (body.note ?? '').slice(0, 500);

  const { data: house, error: houseError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (houseError || !house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const upsertAccept = await supabaseAdmin.from('house_term_acceptances').upsert(
    {
      user_id: authResult.user!.userId,
      house_key: houseKey,
      accepted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,house_key' },
  );
  if (upsertAccept.error) {
    console.error('[house join] failed to store acceptance', upsertAccept.error);
    return NextResponse.json({ success: false, error: 'Failed to store acceptance.' }, { status: 500 });
  }

  const { data: existing } = await supabaseAdmin
    .from('house_join_requests')
    .select('id, status')
    .eq('house_id', house.id)
    .eq('user_id', authResult.user!.userId)
    .maybeSingle();

  const payload = {
    note,
    ip: request.ip ?? null,
  };

  if (existing?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('house_join_requests')
      .update({ status: 'pending', payload, resolved_at: null, resolved_by: null })
      .eq('id', existing.id);
    if (updateError) {
      console.error('[house join] failed to update existing request', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update request.' }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from('house_join_requests').insert({
      house_id: house.id,
      user_id: authResult.user!.userId,
      payload,
    });
    if (insertError) {
      console.error('[house join] failed to create request', insertError);
      return NextResponse.json({ success: false, error: 'Failed to create request.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
