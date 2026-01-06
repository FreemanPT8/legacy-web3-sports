import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import type { OnboardingPopup } from '@/types/onboarding';

const db = supabaseAdmin ?? supabase;
const TABLE = 'onboarding_queue';

type QueueRow = {
  user_id: string;
  house_key: string | null;
  queue_payload: OnboardingPopup[] | null;
  queue_signature: string | null;
  updated_at: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!db) {
    return NextResponse.json({ success: true, queue: [], signature: null });
  }

  try {
    const { searchParams } = new URL(request.url);
    const houseKey = searchParams.get('house')?.toUpperCase() ?? null;
    const { data, error } = await db
      .from(TABLE)
      .select('queue_payload, queue_signature, house_key, updated_at')
      .eq('user_id', user.userId)
      .maybeSingle();

    if (error) {
      console.error('[onboarding.queue] GET failed:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load onboarding queue.' },
        { status: 500 },
      );
    }

    const row = (data as QueueRow | null) ?? null;
    if (!row) {
      return NextResponse.json({ success: true, queue: [], signature: null, house: houseKey });
    }

    return NextResponse.json({
      success: true,
      queue: row.queue_payload ?? [],
      signature: row.queue_signature ?? null,
      house: row.house_key ?? houseKey,
      updatedAt: row.updated_at ?? null,
    });
  } catch (error) {
    console.error('[onboarding.queue] Unexpected GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load onboarding queue.' },
      { status: 500 },
    );
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
    const body = (await request.json()) as {
      queue?: OnboardingPopup[];
      signature?: string | null;
      house?: string | null;
    };

    if (!Array.isArray(body.queue)) {
      return NextResponse.json(
        { success: false, error: 'Queue array is required.' },
        { status: 400 },
      );
    }

    const payload = body.queue;
    const signature = (body.signature ?? null) || null;
    const houseKey = (body.house ?? '').toUpperCase() || null;

    const { error } = await db
      .from(TABLE)
      .upsert(
        {
          user_id: user.userId,
          house_key: houseKey,
          queue_payload: payload,
          queue_signature: signature,
        },
        {
          onConflict: 'user_id',
        },
      );

    if (error) {
      console.error('[onboarding.queue] POST failed:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to persist onboarding queue.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding.queue] Unexpected POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to persist onboarding queue.' },
      { status: 500 },
    );
  }
}
