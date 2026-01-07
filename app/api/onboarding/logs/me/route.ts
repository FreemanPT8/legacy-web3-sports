import { NextRequest, NextResponse } from 'next/server';

import type { OnboardingLogEntry, OnboardingLogAction } from '@/types/onboarding';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin, supabase } from '@/lib/supabase';

const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'onboarding_popup_logs';
const DEFAULT_LIMIT = 25;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!db) {
    console.warn('[onboarding.logs.me] Supabase admin client not available.');
    return NextResponse.json({ success: true, logs: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 100);
    const houseKey = searchParams.get('house')?.toUpperCase() ?? null;
    const popupId = searchParams.get('popupId') ?? null;

    let query = db
      .from(TABLE_NAME)
      .select('id, popup_id, house_key, action, metadata, created_at')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (houseKey) query = query.eq('house_key', houseKey);
    if (popupId) query = query.eq('popup_id', popupId);

    const { data, error } = await query;
    if (error) throw error;

    type Row = {
      id: string;
      popup_id: string;
      house_key: string;
      action: string;
      metadata?: Record<string, unknown> | null;
      created_at: string;
    };

    const logs: OnboardingLogEntry[] = ((data as Row[]) ?? []).map((row) => ({
      id: row.id,
      popupId: row.popup_id,
      house: row.house_key,
      action: row.action as OnboardingLogAction,
      timestamp: new Date(row.created_at).getTime(),
      userId: user.userId,
      metadata: row.metadata ?? null,
    }));

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('[onboarding.logs.me] GET failed', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch personal logs.' }, { status: 500 });
  }
}
