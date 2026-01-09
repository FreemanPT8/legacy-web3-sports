// app/api/admin/houses/[houseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HouseStatus = 'development' | 'under_construction' | 'active';

type HouseRow = {
  id: string;
  sport_id: string | null;
  country_code: string | null;
  status: string | null;
  name_i18n: Record<string, string> | null;
  created_at: string | null;
  avatar_url: string | null;
  description: string | null;
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

function normalizeStatus(raw: string | null): HouseStatus {
  if (raw === 'active' || raw === 'under_construction') {
    return raw as HouseStatus;
  }
  return 'development';
}

function resolveLocaleName(
  name_i18n: Record<string, string> | null,
  fallback?: string | null
): string {
  if (!name_i18n) return fallback ?? 'Unnamed House';
  return (
    name_i18n.en ||
    name_i18n.pt ||
    name_i18n.es ||
    name_i18n.fr ||
    name_i18n.de ||
    name_i18n.it ||
    fallback ||
    'Unnamed House'
  );
}

// GET /api/admin/houses/[houseId]  -> detalhe + head + moderators
export async function GET(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const houseId = params.houseId;

  try {
    // 1) House base
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select(
        'id, sport_id, country_code, status, name_i18n, created_at, avatar_url, description'
      )
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error('Supabase error (house detail):', houseError);
      return NextResponse.json(
        { success: false, error: 'Error loading House of Sports.' },
        { status: 500 }
      );
    }

    if (!houseRow) {
      return NextResponse.json(
        { success: false, error: 'House not found.' },
        { status: 404 }
      );
    }

    const house = houseRow as HouseRow;

    // 2) Sport
    let sport: SportRow | null = null;
    if (house.sport_id) {
      const { data: sportData, error: sportError } = await supabaseAdmin
        .from('sports')
        .select('id, code, name_i18n')
        .eq('id', house.sport_id)
        .maybeSingle();

      if (sportError) {
        console.error('Supabase error (house sport):', sportError);
      } else if (sportData) {
        sport = sportData as SportRow;
      }
    }

    // 3) Head
    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .eq('house_id', house.id)
      .maybeSingle();

    if (headError) {
      console.error('Supabase error (house head):', headError);
    }

    let headUser: UserRow | null = null;
    if (headRow) {
      const head = headRow as HouseHeadRow;
      const { data: adminAssign, error: adminAssignError } =
        await supabaseAdmin
          .from('admin_assignments')
          .select('id, user_id')
          .eq('id', head.admin_id)
          .maybeSingle();

      if (adminAssignError) {
        console.error('Supabase error (head admin assignment):', adminAssignError);
      } else if (adminAssign) {
        const assignment = adminAssign as AdminAssignmentRow;
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, username, full_name, role, avatar_url')
          .eq('id', assignment.user_id)
          .maybeSingle();

        if (userError) {
          console.error('Supabase error (head user):', userError);
        } else if (userData) {
          headUser = userData as UserRow;
        }
      }
    }

    // 4) Moderadores
    const { data: modsRows, error: modsError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id, permissions')
      .eq('house_id', house.id);

    if (modsError) {
      console.error('Supabase error (house moderators):', modsError);
    }

    const moderatorsRows = (modsRows ?? []) as HouseModeratorRow[];

    const moderatorUserIds = moderatorsRows.map((m) => m.user_id);
    let moderatorsUsers: UserRow[] = [];

    if (moderatorUserIds.length > 0) {
      const { data: modsUsersData, error: modsUsersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, role, avatar_url')
        .in('id', moderatorUserIds);

      if (modsUsersError) {
        console.error('Supabase error (moderator users):', modsUsersError);
      } else if (modsUsersData) {
        moderatorsUsers = modsUsersData as UserRow[];
      }
    }

    const userById = new Map<string, UserRow>();
    for (const u of moderatorsUsers) {
      userById.set(u.id, u);
    }

    const moderators = moderatorsRows
      .map((m) => {
        const u = userById.get(m.user_id);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name ?? null,
          role: u.role,
          avatar_url: u.avatar_url ?? null,
          permissions: m.permissions ?? null,
        };
      })
      .filter(Boolean);

    const status: HouseStatus = normalizeStatus(house.status);

    const sportName = sport
      ? resolveLocaleName(sport.name_i18n, sport.code)
      : null;

    const houseName = resolveLocaleName(
      house.name_i18n,
      sportName ? `House of ${sportName} ${house.country_code ?? ''}` : null
    );

    return NextResponse.json(
      {
        success: true,
        house: {
          id: house.id,
          // incluímos sport_id para a página /edit
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
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/houses/[houseId]:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading house detail' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/houses/[houseId]  -> atualizar status / avatar / descrição / país / sport_id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const houseId = params.houseId;
  const currentUser = authResult.user!;

  try {
    const body = await request.json().catch(() => ({} as any));

    const {
      status,
      avatar_url,
      description,
      country_code,
      sport_id,
    } = body as {
      status?: HouseStatus;
      avatar_url?: string | null;
      description?: string | null;
      country_code?: string;
      sport_id?: string | null;
    };

    const updates: Partial<HouseRow> = {};

    if (status) {
      if (!['development', 'under_construction', 'active'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status value.' },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (typeof avatar_url !== 'undefined') {
      updates.avatar_url = avatar_url;
    }

    if (typeof description !== 'undefined') {
      updates.description = description;
    }

    // Só Super Admin pode alterar país e sport_id (campos estruturais)
    if (typeof country_code !== 'undefined') {
      if (currentUser.role !== 'Super Admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Only Super Admin can change country_code of a House.',
          },
          { status: 403 }
        );
      }
      updates.country_code = country_code;
    }

    if (typeof sport_id !== 'undefined') {
      if (currentUser.role !== 'Super Admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Only Super Admin can change sport_id of a House.',
          },
          { status: 403 }
        );
      }
      updates.sport_id = sport_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('houses_of_sports')
      .update(updates)
      .eq('id', houseId);

    if (updateError) {
      console.error(
        'Supabase error in PATCH /api/admin/houses/[houseId]:',
        updateError
      );
      return NextResponse.json(
        { success: false, error: 'Error updating House of Sports.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/admin/houses/[houseId]:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error updating House of Sports' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Supabase admin client unavailable.' },
      { status: 500 }
    );
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json(
      { success: false, error: 'Missing house id.' },
      { status: 400 }
    );
  }

  const role = authResult.user?.role ?? 'Member';
  if (role !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'Only Super Admin can delete Houses.' },
      { status: 403 }
    );
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, house_key, name_i18n')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error('[admin/houses] delete load failed', houseError);
      return NextResponse.json(
        { success: false, error: 'Failed to load House.' },
        { status: 500 }
      );
    }
    if (!houseRow) {
      return NextResponse.json(
        { success: false, error: 'House not found.' },
        { status: 404 }
      );
    }

    const houseKey: string | null = houseRow.house_key ?? null;

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
      const { error } = await supabaseAdmin
        .from(target.table)
        .delete()
        .eq(target.column, target.value);
      if (error) {
        console.error(
          `[admin/houses] delete step failed for ${target.table}`,
          error
        );
      }
    }

    const { error: deleteHouseError } = await supabaseAdmin
      .from('houses_of_sports')
      .delete()
      .eq('id', houseId);

    if (deleteHouseError) {
      console.error('[admin/houses] failed to delete house row', deleteHouseError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete House.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/houses] unexpected delete error', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error while deleting House.' },
      { status: 500 }
    );
  }
}
