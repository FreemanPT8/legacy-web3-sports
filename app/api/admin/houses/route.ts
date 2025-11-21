// app/api/admin/houses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

interface HouseRow {
  id: string;
  sport_id: string | null;
  country_code: string | null;
  created_at: string | null;
}

interface SportRow {
  id: string;
  code: string | null;
  name: string | null;
}

interface HouseHeadRow {
  id: string;
  house_id: string;
  admin_id: string;
  created_at: string | null;
}

interface AdminAssignmentRow {
  id: string;
  user_id: string;
}

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: 'Super Admin' | 'Admin' | 'Member';
}

interface HouseDTO {
  id: string;
  sport_id: string | null;
  sport_code: string | null;
  sport_name: string | null;
  country_code: string | null;
  created_at: string | null;
  head_user_id: string | null;
  head_full_name: string | null;
  head_username: string | null;
  head_email: string | null;
}

interface HousesGetResponse {
  success: boolean;
  houses?: HouseDTO[];
  error?: string;
}

interface HousesPostBody {
  houseId: string;
  headUserId: string | null; // null => remover Head
}

interface HousesPostResponse {
  success: boolean;
  error?: string;
}

// GET /api/admin/houses
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  const currentUser = authResult.user!;

  // Admin e Super Admin podem ver
  try {
    // 1) Houses
    const { data: housesData, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code, created_at')
      .order('created_at', { ascending: true });

    if (housesError) {
      console.error('Error loading houses_of_sports:', housesError);
      return NextResponse.json<HousesGetResponse>(
        { success: false, error: 'Failed to load houses_of_sports' },
        { status: 500 }
      );
    }

    const houses = (housesData || []) as HouseRow[];
    if (houses.length === 0) {
      return NextResponse.json<HousesGetResponse>({
        success: true,
        houses: [],
      });
    }

    // 2) Sports para estes houses
    const sportIds = Array.from(
      new Set(
        houses
          .map((h) => h.sport_id)
          .filter((id): id is string => !!id)
      )
    );

    let sportsById: Record<string, SportRow> = {};
    if (sportIds.length > 0) {
      const { data: sportsData, error: sportsError } = await supabaseAdmin
        .from('sports')
        .select('id, code, name')
        .in('id', sportIds);

      if (sportsError) {
        console.error('Error loading sports for houses:', sportsError);
      } else {
        for (const s of (sportsData || []) as SportRow[]) {
          sportsById[s.id] = s;
        }
      }
    }

    // 3) house_heads para estes houses
    const houseIds = houses.map((h) => h.id);
    const { data: headsData, error: headsError } = await supabaseAdmin
      .from('house_heads')
      .select('id, house_id, admin_id, created_at')
      .in('house_id', houseIds);

    if (headsError) {
      console.error('Error loading house_heads:', headsError);
    }

    const heads = (headsData || []) as HouseHeadRow[];
    const headByHouseId: Record<string, HouseHeadRow> = {};
    for (const h of heads) {
      const existing = headByHouseId[h.house_id];
      if (!existing) {
        headByHouseId[h.house_id] = h;
      } else {
        const existingDate = existing.created_at
          ? new Date(existing.created_at).getTime()
          : 0;
        const newDate = h.created_at ? new Date(h.created_at).getTime() : 0;
        if (newDate > existingDate) {
          headByHouseId[h.house_id] = h;
        }
      }
    }

    // 4) admin_assignments -> users
    const adminIds = Array.from(
      new Set(
        Object.values(headByHouseId)
          .map((h) => h.admin_id)
          .filter((id): id is string => !!id)
      )
    );

    let adminAssignById: Record<string, AdminAssignmentRow> = {};
    if (adminIds.length > 0) {
      const { data: adminAssignData, error: adminAssignError } =
        await supabaseAdmin
          .from('admin_assignments')
          .select('id, user_id')
          .in('id', adminIds);

      if (adminAssignError) {
        console.error(
          'Error loading admin_assignments for house_heads:',
          adminAssignError
        );
      } else {
        for (const a of (adminAssignData || []) as AdminAssignmentRow[]) {
          adminAssignById[a.id] = a;
        }
      }
    }

    const userIds = Array.from(
      new Set(
        Object.values(adminAssignById)
          .map((a) => a.user_id)
          .filter((id): id is string => !!id)
      )
    );

    let usersById: Record<string, UserRow> = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, email, role')
        .in('id', userIds);

      if (usersError) {
        console.error('Error loading users for house_heads:', usersError);
      } else {
        for (const u of (usersData || []) as UserRow[]) {
          usersById[u.id] = u;
        }
      }
    }

    const result: HouseDTO[] = houses.map((h) => {
      const sport = h.sport_id ? sportsById[h.sport_id] : undefined;
      const headRow = headByHouseId[h.id];
      const adminAssign = headRow ? adminAssignById[headRow.admin_id] : null;
      const headUser = adminAssign ? usersById[adminAssign.user_id] : null;

      return {
        id: h.id,
        sport_id: h.sport_id,
        sport_code: sport?.code ?? null,
        sport_name: sport?.name ?? null,
        country_code: h.country_code ?? null,
        created_at: h.created_at ?? null,
        head_user_id: headUser?.id ?? null,
        head_full_name: headUser?.full_name ?? null,
        head_username: headUser?.username ?? null,
        head_email: headUser?.email ?? null,
      };
    });

    return NextResponse.json<HousesGetResponse>({
      success: true,
      houses: result,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/houses:', err);
    return NextResponse.json<HousesGetResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/houses
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  const currentUser = authResult.user!;

  // Só Super Admin pode alterar Heads
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json<HousesPostResponse>(
      { success: false, error: 'Only Super Admin can manage Heads of Houses' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as HousesPostBody;

    if (!body || !body.houseId) {
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Missing houseId' },
        { status: 400 }
      );
    }

    const houseId = body.houseId;
    const headUserId = body.headUserId;

    // 1) Se headUserId === null -> remover Head
    if (!headUserId) {
      const { error: deleteError } = await supabaseAdmin
        .from('house_heads')
        .delete()
        .eq('house_id', houseId);

      if (deleteError) {
        console.error('Error removing house_head:', deleteError);
        return NextResponse.json<HousesPostResponse>(
          { success: false, error: 'Failed to remove Head of House' },
          { status: 500 }
        );
      }

      return NextResponse.json<HousesPostResponse>({ success: true });
    }

    // 2) Validar que esse user é Admin/Super Admin (tem admin_assignment)
    const { data: adminAssignRow, error: adminAssignError } =
      await supabaseAdmin
        .from('admin_assignments')
        .select('id, user_id')
        .eq('user_id', headUserId)
        .maybeSingle();

    if (adminAssignError) {
      console.error(
        'Error loading admin_assignments for user:',
        adminAssignError
      );
      return NextResponse.json<HousesPostResponse>(
        {
          success: false,
          error: 'Failed to verify admin assignment for selected user',
        },
        { status: 500 }
      );
    }

    if (!adminAssignRow) {
      return NextResponse.json<HousesPostResponse>(
        {
          success: false,
          error:
            'Selected user does not have an admin assignment. Only Admins / Super Admins can be Heads of House.',
        },
        { status: 400 }
      );
    }

    const adminId = (adminAssignRow as AdminAssignmentRow).id;

    // 3) Limpar Head anterior
    const { error: deleteOldError } = await supabaseAdmin
      .from('house_heads')
      .delete()
      .eq('house_id', houseId);

    if (deleteOldError) {
      console.error('Error clearing previous house_heads:', deleteOldError);
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Failed to clear existing Head of House' },
        { status: 500 }
      );
    }

    // 4) Criar novo Head
    const { error: insertError } = await supabaseAdmin
      .from('house_heads')
      .insert({
        house_id: houseId,
        admin_id: adminId,
      });

    if (insertError) {
      console.error('Error inserting new house_head:', insertError);
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Failed to set new Head of House' },
        { status: 500 }
      );
    }

    return NextResponse.json<HousesPostResponse>({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/houses:', err);
    return NextResponse.json<HousesPostResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
