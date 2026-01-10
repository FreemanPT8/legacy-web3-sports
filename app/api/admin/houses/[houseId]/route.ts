import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingColumn, isMissingTable } from '@/lib/postgres';

type HouseStatus = 'development' | 'under_construction' | 'active';

type HouseRow = {
  id: string;
  sport_id: string | null;
  country_code: string | null;
  status: string | null;
  name_i18n?: Record<string, string> | null;
  created_at: string | null;
  avatar_url: string | null;
  description?: string | null;
};

type SportRow = {
  id: string;
  code: string;
  name_i18n: Record<string, string> | null;
};

type HouseHeadRow = {
  house_id: string;
  admin_id: string;
};

type AdminAssignmentRow = {
  id: string;
  user_id: string;
};

type UserRow = {
  id: string;
  username: string | null;
  full_name?: string | null;
  role: string | null;
  avatar_url?: string | null;
};

type HouseModeratorRow = {
  house_id: string;
  user_id: string;
  permissions: Record<string, any> | null;
};

const DETAIL_SELECT =
  'id, sport_id, country_code, status, name_i18n, created_at, avatar_url, description';
const LEGACY_DETAIL_SELECT = 'id, sport_id, country_code, status, created_at, avatar_url';

function missingTableResponse(table: string) {
  return NextResponse.json({ success: false, error: formatMissingResourceError(table) }, { status: 500 });
}

function normalizeStatus(raw: string | null): HouseStatus {
  if (raw === 'active' || raw === 'under_construction') {
    return raw as HouseStatus;
  }
  return 'development';
}

function resolveLocaleName(name_i18n: Record<string, string> | null | undefined, fallback?: string | null) {
  if (!name_i18n) return fallback ?? null;
  return (
    name_i18n.en ||
    name_i18n.pt ||
    name_i18n.es ||
    name_i18n.fr ||
    name_i18n.de ||
    name_i18n.it ||
    fallback ||
    null
  );
}

type LoadHouseResult = { response: NextResponse } | { house: HouseRow | null };

async function loadHouse(houseId: string): Promise<LoadHouseResult> {
  if (!supabaseAdmin) return { response: NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 }) };

  let detailQuery = await supabaseAdmin
    .from('houses_of_sports')
    .select(DETAIL_SELECT)
    .eq('id', houseId)
    .maybeSingle();

  if (detailQuery.error) {
    if (isMissingColumn(detailQuery.error)) {
      console.warn('[admin/houses] houses_of_sports missing new columns, retrying with legacy select');
      const legacyResult = await supabaseAdmin
        .from('houses_of_sports')
        .select(LEGACY_DETAIL_SELECT)
        .eq('id', houseId)
        .maybeSingle();
      detailQuery = legacyResult;
    } else if (isMissingTable(detailQuery.error)) {
      return { response: missingTableResponse('houses_of_sports') };
    } else {
      console.error('Supabase error (house detail load):', detailQuery.error);
      return { response: NextResponse.json({ success: false, error: 'Error loading House of Sports.' }, { status: 500 }) };
    }
  }

  return { house: (detailQuery.data as HouseRow | null) ?? null };
}

// GET /api/admin/houses/[houseId]
export async function GET(
  request: NextRequest,
  { params }: { params: { houseId: string } },
): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    if (authResult.response) return authResult.response;
    return NextResponse.json({ success: false, error: 'Autenticação obrigatória.' }, { status: 401 });
  }
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const loadResult = await loadHouse(houseId);
  if ('response' in loadResult) return loadResult.response;
  const house = loadResult.house;

  if (!house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  let sport: SportRow | null = null;
  if (house.sport_id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('sports')
        .select('id, code, name_i18n')
        .eq('id', house.sport_id)
        .maybeSingle();
      if (error && !isMissingTable(error)) throw error;
      sport = (data as SportRow | null) ?? null;
    } catch (error) {
      console.error('Supabase error (house sport):', error);
    }
  }

  let headUser: UserRow | null = null;
  try {
    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .eq('house_id', house.id)
      .maybeSingle();
    if (headError) throw headError;

    if (headRow) {
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('admin_assignments')
        .select('id, user_id')
        .eq('id', (headRow as HouseHeadRow).admin_id)
        .maybeSingle();
      if (assignmentError) throw assignmentError;

      if (assignment?.user_id) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, full_name, role, avatar_url')
          .eq('id', assignment.user_id)
          .maybeSingle();
        if (userError) throw userError;
        headUser = (userData as UserRow | null) ?? null;
      }
    }
  } catch (error: any) {
    if (isMissingTable(error)) {
      console.warn('[admin/houses] head tables missing. Continuing without head info.');
    } else {
      console.error('Supabase error (head resolution):', error);
    }
  }

  let moderators: {
    id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
    permissions: Record<string, any> | null;
  }[] = [];

  try {
    const { data: moderatorRows, error: moderatorsError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id, permissions')
      .eq('house_id', house.id);
    if (moderatorsError) throw moderatorsError;

    const rows = (moderatorRows as HouseModeratorRow[] | null) ?? [];
    const ids = rows.map((row) => row.user_id);
    if (ids.length) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, role, avatar_url')
        .in('id', ids);
      if (usersError) throw usersError;
      const usersById = new Map<string, UserRow>();
      (usersData as UserRow[] | null)?.forEach((user) => usersById.set(user.id, user));
      moderators = rows
        .map((row) => {
          const user = usersById.get(row.user_id);
          if (!user) return null;
          return {
            id: user.id,
            username: user.username,
            full_name: user.full_name ?? null,
            role: user.role,
            avatar_url: user.avatar_url ?? null,
            permissions: row.permissions ?? null,
          };
        })
        .filter(Boolean) as any[];
    }
  } catch (error: any) {
    if (isMissingTable(error)) {
      console.warn('[admin/houses] house_moderators table missing. Moderators list empty.');
    } else {
      console.error('Supabase error (house moderators):', error);
    }
  }

  const status: HouseStatus = normalizeStatus(house.status);
  const sportName = sport ? resolveLocaleName(sport.name_i18n, sport.code) : null;
  const houseName =
    resolveLocaleName(house.name_i18n, sportName ? `House of ${sportName} ${house.country_code ?? ''}` : null) ??
    'House of Sports';

  return NextResponse.json(
    {
      success: true,
      house: {
        id: house.id,
        sport_id: house.sport_id,
        name: houseName,
        sport_name: sportName,
        sport_code: sport?.code ?? null,
        country_code: house.country_code ?? '',
        status,
        created_at: house.created_at,
        avatar_url: house.avatar_url ?? null,
        description: house.description ?? null,
      },
      head: headUser
        ? {
            id: headUser.id,
            username: headUser.username,
            full_name: headUser.full_name ?? null,
            role: headUser.role,
            avatar_url: headUser.avatar_url ?? null,
          }
        : null,
      moderators,
    },
    { status: 200 },
  );
}

// PATCH /api/admin/houses/[houseId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { houseId: string } },
): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const houseId = params.houseId;
  const currentUser = authResult.user!;

  try {
    const body = await request.json().catch(() => ({} as any));
    const { status, avatar_url, description, country_code, sport_id } = body as {
      status?: HouseStatus;
      avatar_url?: string | null;
      description?: string | null;
      country_code?: string;
      sport_id?: string | null;
    };

    const updates: Partial<HouseRow> = {};

    if (status) {
      if (!['development', 'under_construction', 'active'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid status value.' }, { status: 400 });
      }
      updates.status = status;
    }

    if (typeof avatar_url !== 'undefined') {
      updates.avatar_url = avatar_url;
    }

    if (typeof description !== 'undefined') {
      updates.description = description;
    }

    if (typeof country_code !== 'undefined') {
      if (currentUser.role !== 'Super Admin') {
        return NextResponse.json(
          { success: false, error: 'Only Super Admin can change country_code of a House.' },
          { status: 403 },
        );
      }
      updates.country_code = country_code;
    }

    if (typeof sport_id !== 'undefined') {
      if (currentUser.role !== 'Super Admin') {
        return NextResponse.json(
          { success: false, error: 'Only Super Admin can change sport_id of a House.' },
          { status: 403 },
        );
      }
      updates.sport_id = sport_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin!.from('houses_of_sports').update(updates).eq('id', houseId);
    if (updateError) {
      if (isMissingTable(updateError)) return missingTableResponse('houses_of_sports');
      console.error('Supabase error in PATCH /api/admin/houses/[houseId]:', updateError);
      return NextResponse.json({ success: false, error: 'Error updating House of Sports.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/admin/houses/[houseId]:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error updating House of Sports' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/houses/[houseId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { houseId: string } },
): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  if ((authResult.user?.role ?? 'Member') !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'Only Super Admin can delete Houses.' },
      { status: 403 },
    );
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, house_key, name_i18n')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      if (isMissingTable(houseError)) return missingTableResponse('houses_of_sports');
      console.error('[admin/houses] delete load failed', houseError);
      return NextResponse.json({ success: false, error: 'Failed to load House.' }, { status: 500 });
    }
    if (!houseRow) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const houseKey: string | null = (houseRow as any).house_key ?? null;

    const deletionTargets: { table: string; column: string; value: string | null }[] = [
      { table: 'house_notes', column: 'house_id', value: houseId },
      { table: 'house_moderators', column: 'house_id', value: houseId },
      { table: 'house_heads', column: 'house_id', value: houseId },
      { table: 'house_head_invites', column: 'house_id', value: houseId },
      { table: 'house_head_terms', column: 'house_id', value: houseId },
      { table: 'house_history', column: 'house_id', value: houseId },
      { table: 'house_alerts', column: 'house_id', value: houseId },
      { table: 'house_profiles', column: 'house_id', value: houseId },
      { table: 'house_join_requests', column: 'house_id', value: houseId },
      { table: 'house_term_acceptances', column: 'house_key', value: houseKey },
      { table: 'house_onboarding_sequences', column: 'house_key', value: houseKey },
      { table: 'user_houses', column: 'house_id', value: houseId },
    ];

    for (const target of deletionTargets) {
      if (!target.value) continue;
      const { error } = await supabaseAdmin.from(target.table).delete().eq(target.column, target.value);
      if (error && !isMissingTable(error)) {
        console.error(`[admin/houses] delete step failed for ${target.table}`, error);
      }
    }

    const { error: deleteHouseError } = await supabaseAdmin.from('houses_of_sports').delete().eq('id', houseId);
    if (deleteHouseError) {
      console.error('[admin/houses] failed to delete house row', deleteHouseError);
      return NextResponse.json({ success: false, error: 'Failed to delete House.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/houses] unexpected delete error', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error while deleting House.' },
      { status: 500 },
    );
  }
}
