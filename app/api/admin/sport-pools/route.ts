import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { syncUserHouseMembership } from '@/lib/user-houses';

const POOL_TYPES = ['no_sport', 'sport_pending', 'suggestion'] as const;
const STATUS_TYPES = ['pending', 'assigned', 'dismissed'] as const;

type PoolType = (typeof POOL_TYPES)[number];
type PoolStatus = (typeof STATUS_TYPES)[number];

type SportPoolEntryRow = {
  id: string;
  user_id: string;
  pool_type: string;
  status: string;
  sport_id: string | null;
  house_id: string | null;
  country_code: string | null;
  suggested_sport_name: string | null;
  suggested_country_code: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  user?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    country: string | null;
    primary_country_code: string | null;
    primary_sport_id: string | null;
    sport_selection_method: string | null;
    requires_sport_assignment: boolean | null;
    sport_assignment_notes: string | null;
    created_at: string | null;
  } | null;
  sport?: {
    id: string;
    code: string | null;
    name_i18n: Record<string, string> | null;
  } | null;
  house?: {
    id: string;
    country_code: string | null;
    status: string | null;
    name_i18n: Record<string, string> | null;
  } | null;
};

function normalizePool(value: string | null): PoolType {
  const normalized = (value || '').toLowerCase();
  if (POOL_TYPES.includes(normalized as PoolType)) {
    return normalized as PoolType;
  }
  return 'no_sport';
}

function normalizeStatus(value: string | null): PoolStatus {
  const normalized = (value || '').toLowerCase();
  if (STATUS_TYPES.includes(normalized as PoolStatus)) {
    return normalized as PoolStatus;
  }
  return 'pending';
}

function clampLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

function resolveLocalizedName(
  names: Record<string, string> | null | undefined,
  fallback?: string | null,
): string | null {
  if (!names) return fallback ?? null;
  const priority = ['pt', 'en', 'es', 'fr', 'de', 'it'];
  for (const locale of priority) {
    if (names[locale]) return names[locale];
  }
  return fallback ?? null;
}

async function countEntries(pool: PoolType, status: PoolStatus) {
  if (!supabaseAdmin) return 0;
  const { count, error } = await supabaseAdmin
    .from('sport_pool_entries')
    .select('*', { head: true, count: 'exact' })
    .eq('pool_type', pool)
    .eq('status', status);
  if (error) {
    console.error('[sport-pools] Failed to count entries', { pool, status, error });
    return 0;
  }
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Admin client is not configured.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const poolType = normalizePool(searchParams.get('pool'));
  const status = normalizeStatus(searchParams.get('status'));
  const limit = clampLimit(searchParams.get('limit'));

  try {
    const { data, error } = await supabaseAdmin
      .from('sport_pool_entries')
      .select(
        `
          id,
          user_id,
          pool_type,
          status,
          sport_id,
          house_id,
          country_code,
          suggested_sport_name,
          suggested_country_code,
          notes,
          metadata,
          created_at,
          updated_at,
          assigned_at,
          assigned_by,
          user:users(
            id,
            username,
            full_name,
            email,
            country,
            primary_country_code,
            primary_sport_id,
            sport_selection_method,
            requires_sport_assignment,
            sport_assignment_notes,
            created_at
          ),
          sport:sports(
            id,
            code,
            name_i18n
          ),
          house:houses_of_sports(
            id,
            country_code,
            status,
            name_i18n
          )
        `,
      )
      .eq('pool_type', poolType)
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[sport-pools] Failed to load entries', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load sport pool entries.' },
        { status: 500 },
      );
    }

    const entries = ((data ?? []) as SportPoolEntryRow[]).map((row) => ({
      id: row.id,
      poolType: row.pool_type as PoolType,
      status: row.status as PoolStatus,
      sportId: row.sport_id,
      houseId: row.house_id,
      countryCode: row.country_code,
      suggestedSportName: row.suggested_sport_name,
      suggestedCountryCode: row.suggested_country_code,
      notes: row.notes,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assignedAt: row.assigned_at,
      assignedBy: row.assigned_by,
      user: row.user
        ? {
            id: row.user.id,
            username: row.user.username,
            fullName: row.user.full_name,
            email: row.user.email,
            country: row.user.country,
            primaryCountryCode: row.user.primary_country_code,
            primarySportId: row.user.primary_sport_id,
            sportSelectionMethod: row.user.sport_selection_method,
            requiresAssignment: Boolean(row.user.requires_sport_assignment),
            assignmentNotes: row.user.sport_assignment_notes,
            createdAt: row.user.created_at,
          }
        : null,
      sport: row.sport
        ? {
            id: row.sport.id,
            code: row.sport.code,
            name: resolveLocalizedName(row.sport.name_i18n, row.sport.code),
          }
        : null,
      house: row.house
        ? {
            id: row.house.id,
            countryCode: row.house.country_code,
            status: row.house.status,
            name: resolveLocalizedName(row.house.name_i18n),
          }
        : null,
    }));

    const [pendingCount, assignedCount, dismissedCount] = await Promise.all(
      STATUS_TYPES.map((state) => countEntries(poolType, state as PoolStatus)),
    );

    return NextResponse.json({
      success: true,
      pool: poolType,
      status,
      total: entries.length,
      totals: {
        pending: pendingCount,
        assigned: assignedCount,
        dismissed: dismissedCount,
      },
      entries,
    });
  } catch (err) {
    console.error('[sport-pools] Unexpected error', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading sport pools.' },
      { status: 500 },
    );
  }
}

type PatchPayload = {
  entryId?: string;
  action?: 'assign' | 'dismiss';
  sportId?: string;
  houseId?: string;
  note?: string;
  clearAssignment?: boolean;
};

function normalizeNote(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Admin client is not configured.' },
      { status: 500 },
    );
  }

  const body = (await request.json()) as PatchPayload;
  if (!body.entryId || typeof body.entryId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'entryId is required.' },
      { status: 400 },
    );
  }

  const { data: entryRaw, error: entryError } = await supabaseAdmin
    .from('sport_pool_entries')
    .select(
      `
        *,
        user:users(
          id,
          country,
          primary_country_code,
          sport_selection_method
        )
      `,
    )
    .eq('id', body.entryId)
    .maybeSingle();

  if (entryError) {
    console.error('[sport-pools] Failed to load entry for update', entryError);
    return NextResponse.json(
      { success: false, error: 'Failed to load pool entry.' },
      { status: 500 },
    );
  }

  if (!entryRaw) {
    return NextResponse.json(
      { success: false, error: 'Pool entry not found.' },
      { status: 404 },
    );
  }

  const entry = entryRaw as SportPoolEntryRow;
  const timestamp = new Date().toISOString();
  const note = normalizeNote(body.note) ?? entry.notes ?? null;
  const adminUserId = authResult.user?.userId ?? null;

  if (body.action === 'assign') {
    const sportId = body.sportId || entry.sport_id;
    const houseId = body.houseId;
    if (!sportId || !houseId) {
      return NextResponse.json(
        { success: false, error: 'sportId and houseId are required to assign.' },
        { status: 400 },
      );
    }

    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error('[sport-pools] Failed to validate house', houseError);
      return NextResponse.json(
        { success: false, error: 'Failed to validate House of Sport.' },
        { status: 500 },
      );
    }

    if (!houseRow) {
      return NextResponse.json(
        { success: false, error: 'House not found.' },
        { status: 404 },
      );
    }

    if (houseRow.sport_id !== sportId) {
      return NextResponse.json(
        { success: false, error: 'House sport does not match selected sport.' },
        { status: 400 },
      );
    }

    const preferredCountry =
      houseRow.country_code ??
      entry.country_code ??
      entry.suggested_country_code ??
      entry.user?.primary_country_code ??
      null;

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        sport_id: sportId,
        primary_sport_id: sportId,
        primary_country_code: preferredCountry
          ? preferredCountry.toUpperCase()
          : null,
        requires_sport_assignment: false,
        sport_assignment_notes: note,
      })
      .eq('id', entry.user_id);

    if (userUpdateError) {
      console.error('[sport-pools] Failed to update user assignment', userUpdateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user profile.' },
        { status: 500 },
      );
    }

    const syncResult = await syncUserHouseMembership(entry.user_id, {
      assignedVia: 'ADMIN_SYNC',
      logPrefix: 'sport-pools',
    });

    if (!syncResult.success) {
      console.error('[sport-pools] Failed to sync membership', syncResult.error);
    }

    const { error: entryUpdateError } = await supabaseAdmin
      .from('sport_pool_entries')
      .update({
        status: 'assigned',
        sport_id: sportId,
        house_id: houseId,
        notes: note,
        assigned_at: timestamp,
        assigned_by: adminUserId,
        updated_at: timestamp,
      })
      .eq('id', entry.id);

    if (entryUpdateError) {
      console.error('[sport-pools] Failed to update entry after assignment', entryUpdateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update pool entry.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === 'dismiss') {
    const clearAssignment =
      typeof body.clearAssignment === 'boolean' ? body.clearAssignment : true;

    if (clearAssignment) {
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          requires_sport_assignment: false,
          sport_assignment_notes: note,
        })
        .eq('id', entry.user_id);

      if (userUpdateError) {
        console.error('[sport-pools] Failed to update user while dismissing', userUpdateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update user profile.' },
          { status: 500 },
        );
      }
    }

    const { error: entryUpdateError } = await supabaseAdmin
      .from('sport_pool_entries')
      .update({
        status: 'dismissed',
        notes: note,
        updated_at: timestamp,
        assigned_by: adminUserId,
      })
      .eq('id', entry.id);

    if (entryUpdateError) {
      console.error('[sport-pools] Failed to dismiss entry', entryUpdateError);
      return NextResponse.json(
        { success: false, error: 'Failed to dismiss pool entry.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: 'Unsupported action.' },
    { status: 400 },
  );
}
