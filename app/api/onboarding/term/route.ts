import { NextResponse } from 'next/server';

import { supabaseAdmin, supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'house_term_acceptances';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const houseKey = (searchParams.get('house') || 'LEGACY').toUpperCase();

    if (!db) {
      return NextResponse.json({ success: true, accepted: false });
    }

    const token = request.headers.get('Authorization');
    const user = token ? await verifyAuth(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await db
      .from(TABLE_NAME)
      .select('accepted_at')
      .eq('user_id', user.id)
      .eq('house_key', houseKey)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      success: true,
      accepted: Boolean(data?.accepted_at),
      acceptedAt: data?.accepted_at ?? null,
    });
  } catch (error) {
    console.error('[onboarding.term] GET failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load term status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 });
    }
    const token = request.headers.get('Authorization');
    const user = token ? await verifyAuth(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as { house?: string };
    const houseKey = (body?.house || 'LEGACY').toUpperCase();
    const { error } = await db.from(TABLE_NAME).upsert(
      {
        user_id: user.id,
        house_key: houseKey,
      },
      { onConflict: 'user_id,house_key' },
    );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding.term] POST failed', error);
    return NextResponse.json({ success: false, error: 'Failed to accept term' }, { status: 500 });
  }
}
