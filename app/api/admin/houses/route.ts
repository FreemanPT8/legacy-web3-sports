// app/api/admin/houses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { getCountryName } from '@/lib/countries'; // 👈 NOVO

type HouseStatus = 'development' | 'under_construction' | 'active';

interface HouseRow {
  id: string;
  sport_id: string | null;
  country_code: string | null;
  status: string | null;
  created_at: string | null;
}

interface SportRow {
  id: string;
  code: string | null;
  name_i18n: Record<string, string> | null;
}

interface HouseHeadRow {
  house_id: string;
  admin_id: string;
}

interface AdminAssignmentRow {
  id: string;
  user_id: string;
}

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface HouseModeratorRow {
  house_id: string;
  user_id: string;
}

interface AdminHouseDTO {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  head: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  moderators_count: number;
}

interface HousesGetResponse {
  success: boolean;
  houses?: AdminHouseDTO[];
  totalHouses?: number;
  activeHouses?: number;
  buildingHouses?: number;
  developingHouses?: number;
  error?: string;
}

// Aceita tanto o formato novo (sport_id/country_code) como o formato do teu form (sportId/countryCode)
interface HousesPostBody {
  sport_id?: string;
  country_code?: string;
  sportId?: string;
  countryCode?: string;
  status?: HouseStatus;
  avatar_url?: string | null;
  description?: string | null;
}

interface HousesPostResponse {
  success: boolean;
  houseId?: string;
  house?: { id: string };
  error?: string;
}

function normalizeStatus(raw: string | null): HouseStatus {
  if (raw === 'active' || raw === 'under_construction') {
    return raw as HouseStatus;
  }
  return 'development';
}

function resolveLocaleName(
  name_i18n: Record<string, string> | null,
  fallback?: string | null
): string | null {
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

// GET /api/admin/houses -> lista para painel admin
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;
  // Admin e Super Admin podem ver

  try {
    // 1) Houses base
    const { data: housesData, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code, status, created_at')
      .order('created_at', { ascending: true });

    if (housesError) {
      console.error('Error loading houses_of_sports:', housesError);
      return NextResponse.json<HousesGetResponse>(
        { success: false, error: 'Failed to load Houses of Sports.' },
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

    const houseIds = houses.map((h) => h.id);

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
        .select('id, code, name_i18n')
        .in('id', sportIds);

      if (sportsError) {
        console.error('Error loading sports for houses:', sportsError);
      } else {
        for (const s of (sportsData || []) as any[]) {
          sportsById[s.id as string] = {
            id: s.id as string,
            code: (s.code as string) ?? null,
            name_i18n: (s.name_i18n as Record<string, string> | null) ?? null,
          };
        }
      }
    }

    // 3) house_heads para estes houses
    const { data: headsData, error: headsError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .in('house_id', houseIds);

    if (headsError) {
      console.error('Error loading house_heads:', headsError);
    }

    const heads = (headsData || []) as HouseHeadRow[];
    const headByHouseId = new Map<string, HouseHeadRow>();
    for (const h of heads) {
      headByHouseId.set(h.house_id, h);
    }

    // 4) admin_assignments -> users
    const adminIds = Array.from(
      new Set(
        heads
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
        for (const a of (adminAssignData || []) as any[]) {
          adminAssignById[a.id as string] = {
            id: a.id as string,
            user_id: a.user_id as string,
          };
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
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (usersError) {
        console.error('Error loading users for house_heads:', usersError);
      } else {
        for (const u of (usersData || []) as any[]) {
          usersById[u.id as string] = {
            id: u.id as string,
            username: (u.username as string) ?? null,
            full_name: (u.full_name as string) ?? null,
            avatar_url: (u.avatar_url as string) ?? null,
          };
        }
      }
    }

    // 5) Moderators count por house
    const { data: modsData, error: modsError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id')
      .in('house_id', houseIds);

    if (modsError) {
      console.error('Error loading house_moderators:', modsError);
    }

    const moderators = (modsData || []) as HouseModeratorRow[];
    const moderatorsCountByHouseId = new Map<string, number>();
    for (const m of moderators) {
      moderatorsCountByHouseId.set(
        m.house_id,
        (moderatorsCountByHouseId.get(m.house_id) || 0) + 1
      );
    }

    // 6) Montar DTO final
    const result: AdminHouseDTO[] = houses.map((h) => {
      const sport = h.sport_id ? sportsById[h.sport_id] : undefined;
      const sportName = sport
        ? resolveLocaleName(sport.name_i18n, sport.code)
        : null;

      const normalizedStatus = normalizeStatus(h.status);

      const headRow = headByHouseId.get(h.id) || null;
      const adminAssign = headRow ? adminAssignById[headRow.admin_id] : null;
      const headUser = adminAssign ? usersById[adminAssign.user_id] : null;

      return {
        id: h.id,
        sport_name: sportName,
        sport_code: sport?.code ?? null,
        country_code: (h.country_code || '').toUpperCase(),
        status: normalizedStatus,
        created_at: h.created_at || new Date().toISOString(),
        head: headUser
          ? {
              user_id: headUser.id,
              username: headUser.username,
              full_name: headUser.full_name,
              avatar_url: headUser.avatar_url,
            }
          : null,
        moderators_count: moderatorsCountByHouseId.get(h.id) || 0,
      };
    });

    // Totais por estado
    const totalHouses = result.length;
    const activeHouses = result.filter((h) => h.status === 'active').length;
    const buildingHouses = result.filter(
      (h) => h.status === 'under_construction',
    ).length;
    const developingHouses = result.filter(
      (h) => h.status === 'development',
    ).length;

    return NextResponse.json<HousesGetResponse>({
      success: true,
      houses: result,
      totalHouses,
      activeHouses,
      buildingHouses,
      developingHouses,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/houses:', err);
    return NextResponse.json<HousesGetResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/houses -> criar nova House
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;
  // Admin + Super Admin podem criar Houses
  if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin') {
    return NextResponse.json<HousesPostResponse>(
      { success: false, error: 'Only Admin or Super Admin can create Houses.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as HousesPostBody;

    // aceitar sport_id ou sportId
    const rawSportId = (body.sport_id ?? body.sportId ?? '').trim();
    const rawCountryCode = (body.country_code ?? body.countryCode ?? '')
      .trim()
      .toUpperCase();

    const status: HouseStatus = body.status ?? 'development';

    const avatar_url =
      typeof body.avatar_url === 'string' && body.avatar_url.trim()
        ? body.avatar_url.trim()
        : null;
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;

    if (!rawSportId) {
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'sport_id / sportId is required.' },
        { status: 400 }
      );
    }

    if (!rawCountryCode) {
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'country_code / countryCode is required.' },
        { status: 400 }
      );
    }

    if (!['development', 'under_construction', 'active'].includes(status)) {
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Invalid status value.' },
        { status: 400 }
      );
    }

    // 🔹 1) Garantir que o sport existe e obter nome
    const { data: sportData, error: sportError } = await supabaseAdmin
      .from('sports')
      .select('id, code, name_i18n')
      .eq('id', rawSportId)
      .maybeSingle();

    if (sportError) {
      console.error('Supabase error loading sport in Houses POST:', sportError);
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Failed to validate sport_id.' },
        { status: 500 }
      );
    }

    if (!sportData) {
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Sport not found.' },
        { status: 404 }
      );
    }

    const sportRow = sportData as SportRow;
    const sportName =
      resolveLocaleName(sportRow.name_i18n, sportRow.code) || 'Sport';

    // 🔹 2) Obter nome do país e gerar nome base da House
    const countryName = getCountryName(rawCountryCode); // 👈 AQUI
    const baseName = `House of ${sportName} ${countryName}`;

    const name_i18n = {
      en: baseName,
      pt: baseName,
      es: baseName,
      fr: baseName,
      de: baseName,
      it: baseName,
    };

    // 🔹 3) Criar House com name_i18n preenchido
    const { data, error } = await supabaseAdmin
      .from('houses_of_sports')
      .insert({
        sport_id: rawSportId,
        country_code: rawCountryCode,
        status,
        avatar_url,
        description,
        name_i18n,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Supabase error inserting new House of Sports:', error);
      return NextResponse.json<HousesPostResponse>(
        { success: false, error: 'Failed to create House of Sports.' },
        { status: 500 }
      );
    }

    const id = data.id as string;

    // Responder de forma compatível com o teu CreateHousePage
    return NextResponse.json<HousesPostResponse>(
      {
        success: true,
        houseId: id,
        house: { id },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/houses:', err);
    return NextResponse.json<HousesPostResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
