import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin, supabase } from '@/lib/supabase';

const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'onboarding_global_ack';

function normalizeHouseKey(value?: string | null) {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed.toUpperCase() : 'LEGACY';
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!db) {
    return NextResponse.json({ success: true, acknowledged: false });
  }

  try {
    const { searchParams } = new URL(request.url);
    const houseKey = normalizeHouseKey(searchParams.get('house'));
    const { data, error } = await db
      .from(TABLE_NAME)
      .select('id, acknowledged_at')
      .eq('user_id', user.userId)
      .eq('house_key', houseKey)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      success: true,
      acknowledged: Boolean(data?.id),
      acknowledgedAt: data?.acknowledged_at ?? null,
    });
  } catch (error) {
    console.error('[onboarding.global-ack] GET failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load ack status.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!db) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = (await request.json().catch(() => null)) as { house?: string | null } | null;
    const houseKey = normalizeHouseKey(body?.house);
    const payload = {
      user_id: user.userId,
      house_key: houseKey,
      acknowledged_at: new Date().toISOString(),
    };
    const { error } = await db.from(TABLE_NAME).upsert(payload, {
      onConflict: 'user_id,house_key',
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding.global-ack] POST failed', error);
    return NextResponse.json({ success: false, error: 'Failed to store ack.' }, { status: 500 });
  }
}
