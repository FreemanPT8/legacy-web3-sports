import { NextRequest, NextResponse } from 'next/server';

import type { OnboardingLogEntry, OnboardingLogAction } from '@/types/onboarding';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware';
import { isAdminRole } from '@/lib/roles';

const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'onboarding_popup_logs';
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 200);
  const houseKey = searchParams.get('house')?.toUpperCase() ?? null;
  const popupId = searchParams.get('popupId') ?? null;
  const userId = searchParams.get('userId') ?? searchParams.get('user') ?? null;
  try {
    if (!db) {
      console.warn('[onboarding.logs] Supabase admin client not available. Returning empty logs.');
      return NextResponse.json({ success: true, logs: [] });
    }
    let query = db
      .from(TABLE_NAME)
      .select('id, popup_id, house_key, action, user_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (houseKey) query = query.eq('house_key', houseKey);
    if (popupId) query = query.eq('popup_id', popupId);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    type LogRow = {
      id: string;
      popup_id: string;
      house_key: string;
      action: string;
      user_id?: string | null;
      metadata?: Record<string, unknown> | null;
      created_at: string;
    };
    const logs: OnboardingLogEntry[] = (data ?? []).map((row: LogRow) => ({
      id: row.id,
      popupId: row.popup_id,
      house: row.house_key,
      action: row.action as OnboardingLogAction,
      timestamp: new Date(row.created_at).getTime(),
      userId: row.user_id ?? null,
      metadata: row.metadata ?? null,
    }));
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('[onboarding.logs] GET failed', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  try {
    const body = (await request.json()) as {
      popupId?: string;
      action?: OnboardingLogAction;
      house?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    };
    if (!body.popupId || !body.action) {
      return NextResponse.json({ success: false, error: 'Missing popupId or action' }, { status: 400 });
    }
    if (!db) {
      console.warn('[onboarding.logs] Supabase admin client not available. Skipping persistence.');
      return NextResponse.json({ success: true, entry: null });
    }
    const resolvedUserId = isAdminRole(user.role) && body.userId ? body.userId : user.userId;
    const entry = {
      popup_id: body.popupId,
      house_key: (body.house || 'LEGACY').toUpperCase(),
      action: body.action,
      user_id: resolvedUserId,
      metadata: body.metadata ?? null,
    };
    const { data, error } = await db
      .from(TABLE_NAME)
      .insert(entry)
      .select('id, created_at, house_key, popup_id, action, user_id');
    if (error) throw error;
    const inserted = data?.[0];
    return NextResponse.json({
      success: true,
      entry: inserted
        ? {
            id: inserted.id,
            popupId: inserted.popup_id,
            house: inserted.house_key,
            action: inserted.action as OnboardingLogAction,
            timestamp: new Date(inserted.created_at).getTime(),
            userId: inserted.user_id ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[onboarding.logs] POST failed', error);
    return NextResponse.json({ success: false, error: 'Failed to record log' }, { status: 500 });
  }
}
