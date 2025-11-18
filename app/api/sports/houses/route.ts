import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type HouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return 'en';
  const lower = raw.toLowerCase();

  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('it')) return 'it';

  return 'en';
}

// ---- tipos dos rows Supabase ----

type HouseRow = {
  id: string;
  sport_id: string;
  country_code: string | null;
  status: string | null;
  name_i18n: Record<string, string> | null;
  created_at: string | null;
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

// ---- helpers ----

function resolveLocalizedName(
  name_i18n: Record<string, string> | null,
  locale: SupportedLocale,
  fallback?: string | null
): string {
  if (name_i18n && name_i18n[locale]) return name_i18n[locale];
  if (name_i18n && name_i18n.en) return name_i18n.en;
  return fallback ?? '';
}

function normalizeStatus(raw?: string | null): HouseStatus {
  const s = (raw || '').toUpperCase();
  if (s === 'ACTIVE') return 'ACTIVE';
  if (s === 'UNDER_CONSTRUCTION') return 'UNDER_CONSTRUCTION';
  return 'IN_DEVELOPMENT';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale');
    const locale = normalizeLocale(rawLocale);

    // 1) Houses (usar supabaseAdmin para ignorar RLS)
    const { data: housesData, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select(
        'id, sport_id, country_code, status, name_i18n, created_at'
      );

    if (housesError) {
      console.error('Error loading houses_of_sports:', housesError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar Houses of Sports.',
        },
        { status: 500 }
      );
    }

    const houses = (housesData ?? []) as HouseRow[];

    if (houses.length === 0) {
      return NextResponse.json({
        success: true,
        locale,
        count: 0,
        houses: [],
      });
    }

    // 2) Sports
    const sportIds = Array.from(new Set(houses.map((h) => h.sport_id)));

    const { data: sportsData, error: sportsError } = await supabaseAdmin
      .from('sports')
      .select('id, code, name_i18n')
      .in('id', sportIds);

    if (sportsError) {
      console.error('Error loading sports for houses:', sportsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar desportos das Houses.',
        },
        { status: 500 }
      );
    }

    const sports = (sportsData ?? []) as SportRow[];
    const sportById = new Map<string, SportRow>();
    for (const s of sports) {
      sportById.set(s.id, s);
    }

    // 3) Head of House
    const houseIds = houses.map((h) => h.id);

    const { data: headsData, error: headsError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .in('house_id', houseIds);

    if (headsError) {
      console.error('Error loading house_heads:', headsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar Heads das Houses.',
        },
        { status: 500 }
      );
    }

    const heads = (headsData ?? []) as HouseHeadRow[];

    // 4) Admin assignments
    const adminIds = Array.from(new Set(heads.map((h) => h.admin_id)));

    const { data: adminAssignData, error: adminAssignError } =
      await supabaseAdmin
        .from('admin_assignments')
        .select('id, user_id')
        .in('id', adminIds);

    if (adminAssignError) {
      console.error('Error loading admin_assignments:', adminAssignError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar Admin Assignments.',
        },
        { status: 500 }
      );
    }

    const adminAssignments = (adminAssignData ?? []) as AdminAssignmentRow[];

    // 5) Moderadores
    const { data: moderatorsData, error: moderatorsError } =
      await supabaseAdmin
        .from('house_moderators')
        .select('house_id, user_id, permissions')
        .in('house_id', houseIds);

    if (moderatorsError) {
      console.error('Error loading house_moderators:', moderatorsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar moderadores das Houses.',
        },
        { status: 500 }
      );
    }

    const moderatorsRows = (moderatorsData ?? []) as HouseModeratorRow[];

    // 6) Users (heads + moderadores)
    const headUserIds = adminAssignments.map((a) => a.user_id);
    const modUserIds = moderatorsRows.map((m) => m.user_id);
    const allUserIds = Array.from(new Set([...headUserIds, ...modUserIds]));

    let users: UserRow[] = [];
    if (allUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, role, avatar_url')
        .in('id', allUserIds);

      if (usersError) {
        console.error('Error loading users for houses:', usersError);
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao carregar utilizadores das Houses.',
          },
          { status: 500 }
        );
      }

      users = (usersData ?? []) as UserRow[];
    }

    const userById = new Map<string, UserRow>();
    for (const u of users) {
      userById.set(u.id, u);
    }

    // helpers
    const headByHouse = new Map<string, HouseHeadRow>();
    for (const h of heads) {
      headByHouse.set(h.house_id, h);
    }

    const adminAssignById = new Map<string, AdminAssignmentRow>();
    for (const a of adminAssignments) {
      adminAssignById.set(a.id, a);
    }

    const moderatorsByHouse = new Map<string, HouseModeratorRow[]>();
    for (const m of moderatorsRows) {
      const arr = moderatorsByHouse.get(m.house_id) ?? [];
      arr.push(m);
      moderatorsByHouse.set(m.house_id, arr);
    }

    // 7) montar resposta final
    const result = houses.map((house) => {
      const sport = sportById.get(house.sport_id) || null;

      const sportName = sport
        ? resolveLocalizedName(sport.name_i18n, locale, sport.code)
        : null;

      // Nome da House: vem de name_i18n (já sem "Sports")
      const fallbackHouseName =
        sportName && house.country_code
          ? `House of ${sportName} ${house.country_code}`
          : sportName || 'House of Sports';

      const title = resolveLocalizedName(
        house.name_i18n,
        locale,
        fallbackHouseName
      );

      // Head da House
      const headRow = headByHouse.get(house.id) || null;
      let headUser: UserRow | null = null;

      if (headRow) {
        const admin = adminAssignById.get(headRow.admin_id) || null;
        if (admin) {
          headUser = userById.get(admin.user_id) || null;
        }
      }

      // Moderadores count
      const mods = moderatorsByHouse.get(house.id) || [];
      const moderators_count = mods.reduce((acc, mod) => {
        if (userById.has(mod.user_id)) return acc + 1;
        return acc;
      }, 0);

      return {
        id: house.id,
        sport_id: house.sport_id,
        title,
        sport_name: sportName,
        country_code: house.country_code ?? '',
        status: normalizeStatus(house.status),
        head_username: headUser?.username ?? null,
        head_full_name: headUser?.full_name ?? null,
        moderators_count,
        created_at: house.created_at ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      locale,
      count: result.length,
      houses: result,
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/sports/houses:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno no servidor ao carregar Houses of Sports.',
      },
      { status: 500 }
    );
  }
}
