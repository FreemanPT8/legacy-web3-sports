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
};

type SportRow = {
  id: string;
  code: string | null;
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
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
};

type HouseModeratorRow = {
  house_id: string;
  user_id: string;
};

function normalizeStatus(raw?: string | null): HouseStatus {
  if (raw === 'active' || raw === 'under_construction') return raw;
  return 'development';
}

function resolveName(
  name_i18n: Record<string, string> | null,
  fallbacks: string[]
): string {
  if (!name_i18n) {
    const firstFallback = fallbacks.find(Boolean);
    return firstFallback || 'Unnamed House';
  }

  const preferredOrder = ['en', 'pt', 'es', 'fr', 'de', 'it'];

  for (const lang of preferredOrder) {
    if (name_i18n[lang]) return name_i18n[lang];
  }

  const firstValue = Object.values(name_i18n)[0];
  if (firstValue) return firstValue;

  const firstFallback = fallbacks.find(Boolean);
  return firstFallback || 'Unnamed House';
}

// GET /api/admin/houses/[houseId]
// Devolve info detalhada da House + Head + Moderadores
export async function GET(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const houseId = params.houseId;

  try {
    // 1) House
    const { data: houseData, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code, status, name_i18n, created_at')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error(
        'Supabase error in GET /api/admin/houses/[houseId] (house):',
        houseError
      );
      return NextResponse.json(
        { success: false, error: 'Error loading House of Sports.' },
        { status: 500 }
      );
    }

    if (!houseData) {
      return NextResponse.json(
        { success: false, error: 'House not found.' },
        { status: 404 }
      );
    }

    const houseRow = houseData as HouseRow;

    // 2) Sport
    let sportRow: SportRow | null = null;

    if (houseRow.sport_id) {
      const { data: sportData, error: sportError } = await supabaseAdmin
        .from('sports')
        .select('id, code, name_i18n')
        .eq('id', houseRow.sport_id)
        .maybeSingle();

      if (sportError) {
        console.error(
          'Supabase error in GET /api/admin/houses/[houseId] (sport):',
          sportError
        );
        return NextResponse.json(
          { success: false, error: 'Error loading sport for House.' },
          { status: 500 }
        );
      }

      if (sportData) {
        sportRow = sportData as SportRow;
      }
    }

    // 3) Head of House (house_heads -> admin_assignments -> users)
    const { data: headRowData, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .eq('house_id', houseId)
      .maybeSingle();

    if (headError && headError.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error(
        'Supabase error in GET /api/admin/houses/[houseId] (head):',
        headError
      );
      return NextResponse.json(
        { success: false, error: 'Error loading Head of House.' },
        { status: 500 }
      );
    }

    const headRow = headRowData
      ? (headRowData as HouseHeadRow)
      : null;

    let adminAssignment: AdminAssignmentRow | null = null;
    let headUser: UserRow | null = null;

    if (headRow) {
      const { data: adminAssignData, error: adminAssignError } =
        await supabaseAdmin
          .from('admin_assignments')
          .select('id, user_id')
          .eq('id', headRow.admin_id)
          .maybeSingle();

      if (adminAssignError && adminAssignError.code !== 'PGRST116') {
        console.error(
          'Supabase error in GET /api/admin/houses/[houseId] (admin_assignments):',
          adminAssignError
        );
        return NextResponse.json(
          { success: false, error: 'Error loading admin assignment.' },
          { status: 500 }
        );
      }

      if (adminAssignData) {
        adminAssignment = adminAssignData as AdminAssignmentRow;

        const { data: headUserData, error: headUserError } =
          await supabaseAdmin
            .from('users')
            .select('id, username, full_name, role, avatar_url')
            .eq('id', adminAssignment.user_id)
            .maybeSingle();

        if (headUserError && headUserError.code !== 'PGRST116') {
          console.error(
            'Supabase error in GET /api/admin/houses/[houseId] (head user):',
            headUserError
          );
          return NextResponse.json(
            { success: false, error: 'Error loading Head user.' },
            { status: 500 }
          );
        }

        if (headUserData) {
          headUser = headUserData as UserRow;
        }
      }
    }

    // 4) Moderadores
    const { data: moderatorsData, error: moderatorsError } =
      await supabaseAdmin
        .from('house_moderators')
        .select('house_id, user_id')
        .eq('house_id', houseId);

    if (moderatorsError) {
      console.error(
        'Supabase error in GET /api/admin/houses/[houseId] (moderators):',
        moderatorsError
      );
      return NextResponse.json(
        { success: false, error: 'Error loading moderators.' },
        { status: 500 }
      );
    }

    const moderatorsRows = (moderatorsData ?? []) as HouseModeratorRow[];
    const moderatorsUserIds = Array.from(
      new Set(moderatorsRows.map((m) => m.user_id))
    );

    let moderatorsUsers: UserRow[] = [];
    if (moderatorsUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, role, avatar_url')
        .in('id', moderatorsUserIds);

      if (usersError) {
        console.error(
          'Supabase error in GET /api/admin/houses/[houseId] (moderator users):',
          usersError
        );
        return NextResponse.json(
          { success: false, error: 'Error loading moderators users.' },
          { status: 500 }
        );
      }

      moderatorsUsers = (usersData ?? []) as UserRow[];
    }

    const moderators = moderatorsRows
      .map((row) => {
        const u = moderatorsUsers.find((x) => x.id === row.user_id);
        if (!u) return null;

        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          role: u.role,
        };
      })
      .filter(Boolean) as {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
      role: string | null;
    }[];

    // 5) Montar resposta
    const sportName = sportRow
      ? resolveName(sportRow.name_i18n, [sportRow.code ?? ''])
      : '';

    const houseName = resolveName(houseRow.name_i18n, [sportName]);

    return NextResponse.json(
      {
        success: true,
        house: {
          id: houseRow.id,
          name: houseName,
          sport_name: sportName || null,
          sport_code: sportRow?.code ?? null,
          country_code: houseRow.country_code ?? '',
          status: normalizeStatus(houseRow.status),
          created_at: houseRow.created_at,
        },
        head: headUser
          ? {
              id: headUser.id,
              username: headUser.username,
              full_name: headUser.full_name,
              avatar_url: headUser.avatar_url,
              role: headUser.role,
            }
          : null,
        moderators,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/houses/[houseId]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error loading House detail.',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/houses/[houseId]
// Atualiza apenas o status da House
export async function PATCH(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const houseId = params.houseId;

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const { status } = body as { status?: HouseStatus };

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required.' },
        { status: 400 }
      );
    }

    if (
      status !== 'development' &&
      status !== 'under_construction' &&
      status !== 'active'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('houses_of_sports')
      .update({ status })
      .eq('id', houseId);

    if (updateError) {
      console.error(
        'Supabase error in PATCH /api/admin/houses/[houseId]:',
        updateError
      );
      return NextResponse.json(
        { success: false, error: 'Error updating House status.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/admin/houses/[houseId]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error updating House status.',
      },
      { status: 500 }
    );
  }
}
