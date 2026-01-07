import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { isAdminRole } from '@/lib/roles';
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

  const { searchParams } = new URL(request.url);
  const requestedHouse = normalizeHouseKey(searchParams.get('house'));
  const requestedUserId = searchParams.get('userId') ?? searchParams.get('user');
  const targetUserId = requestedUserId && isAdminRole(user.role) ? requestedUserId : user.userId;

  if (!db) {
    return NextResponse.json({ success: true, queue: [], signature: null, house: requestedHouse });
  }

  try {
    const targetHouse = requestedHouse ?? 'LEGACY';
    let result = await fetchQueueRow(targetUserId, targetHouse);
    if (!result.data && targetHouse !== null) {
      // backwards compatibility: rows guardadas sem house_key
      result = await fetchQueueRow(targetUserId, null);
    }

    if (result.error) throw result.error;
    const row = result.data;

    if (!row) {
      return NextResponse.json({ success: true, queue: [], signature: null, house: targetHouse, user: targetUserId });
    }

    return NextResponse.json({
      success: true,
      queue: row.queue_payload ?? [],
      signature: row.queue_signature ?? null,
      house: row.house_key ?? targetHouse,
      user: targetUserId,
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

  const { searchParams } = new URL(request.url);
  const requestedHouse = normalizeHouseKey(searchParams.get('house'));

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
    const houseKey = normalizeHouseKey(body.house ?? requestedHouse) ?? 'LEGACY';

    // remove fila anterior da mesma House para evitar conflitos em schemas antigos
    await db
      .from(TABLE)
      .delete()
      .eq('user_id', user.userId)
      .eq('house_key', houseKey);
    if (houseKey === 'LEGACY') {
      await db.from(TABLE).delete().eq('user_id', user.userId).is('house_key', null);
    }

    const { error } = await db.from(TABLE).insert({
      user_id: user.userId,
      house_key: houseKey,
      queue_payload: payload,
      queue_signature: signature,
      updated_at: new Date().toISOString(),
    });

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

function normalizeHouseKey(value?: string | null) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

async function fetchQueueRow(userId: string, houseKey: string | null) {
  if (!db) return { data: null, error: null };
  try {
    let query = db
      .from(TABLE)
      .select('queue_payload, queue_signature, house_key, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (houseKey) {
      query = query.eq('house_key', houseKey);
    } else {
      query = query.is('house_key', null);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('[onboarding.queue] GET failed:', error);
      return { data: null, error };
    }
    return { data: (data as QueueRow | null) ?? null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
