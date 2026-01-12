import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

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
  name_i18n: Record<string, string> | null;
  status: string | null;
  created_at: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  house_key?: string | null;
};

type HouseStatsRow = {
  house_id: string;
  member_count: number | null;
  member_only_count: number | null;
  head_count: number | null;
  moderator_count: number | null;
  total_xp: number | null;
  head_xp: number | null;
  moderator_xp: number | null;
  member_xp: number | null;
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

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

const normalizeNumeric = (
  value: number | string | null | undefined,
  fallback = 0,
): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

/**
 * Regra de negócio:
 * - ACTIVE: se o status na DB estiver explicitamente como 'active'
 * - UNDER_CONSTRUCTION:
 *    - se tiver Head definido, mesmo que a DB diga 'development'
 *    - ou se a DB estiver como 'under_construction'
 * - IN_DEVELOPMENT:
 *    - se não tiver Head e a DB não estiver 'active'
 */
function normalizeStatusFromData(
  dbStatus: string | null,
  hasHead: boolean
): PublicHouseStatus {
  const raw = (dbStatus || '').toLowerCase();

  if (raw === 'active') {
    return 'ACTIVE';
  }

  if (hasHead || raw === 'under_construction') {
    return 'UNDER_CONSTRUCTION';
  }

  return 'IN_DEVELOPMENT';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale');
    const locale = normalizeLocale(rawLocale);

    // 1) Buscar todas as houses
    const { data: housesData, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select(
        'id, sport_id, country_code, name_i18n, status, created_at, house_key, avatar_url, cover_image_url',
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

    // 2) Buscar sports correspondentes
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

    // 3) House heads
    const houseIds = houses.map((h) => h.id);

    const statsByHouseId = new Map<
      string,
      {
        member_count: number;
        member_only_count: number;
        head_count: number;
        moderator_count: number;
        total_xp: number;
        head_xp: number;
        moderator_xp: number;
        member_xp: number;
      }
    >();
    if (houseIds.length > 0) {
      const { data: statsData, error: statsError } = await supabaseAdmin
        .from('house_xp_totals')
        .select(
          'house_id, member_count, member_only_count, head_count, moderator_count, total_xp, head_xp, moderator_xp, member_xp',
        )
        .in('house_id', houseIds);

      if (statsError) {
        console.warn('Failed to load house_xp_totals for /sports/houses', statsError);
      } else {
        for (const row of (statsData ?? []) as HouseStatsRow[]) {
          const headCount = normalizeNumeric(row.head_count);
          const moderatorCount = normalizeNumeric(row.moderator_count);
          const memberOnlyCount = normalizeNumeric(row.member_only_count);
          const headXp = normalizeNumeric(row.head_xp);
          const moderatorXp = normalizeNumeric(row.moderator_xp);
          const memberXp = normalizeNumeric(row.member_xp);
          statsByHouseId.set(row.house_id, {
            member_count: headCount + moderatorCount + memberOnlyCount,
            member_only_count: memberOnlyCount,
            head_count: headCount,
            moderator_count: moderatorCount,
            total_xp: headXp + moderatorXp + memberXp,
            head_xp: headXp,
            moderator_xp: moderatorXp,
            member_xp: memberXp,
          });
        }
      }
    }

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

    // 4) Admin assignments dos heads
    const adminIds = Array.from(new Set(heads.map((h) => h.admin_id)));

    const { data: adminAssignData, error: adminAssignError } =
      adminIds.length > 0
        ? await supabaseAdmin
            .from('admin_assignments')
            .select('id, user_id')
            .in('id', adminIds)
        : { data: [] as any[], error: null };

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
      houseIds.length > 0
        ? await supabaseAdmin
            .from('house_moderators')
            .select('house_id, user_id, permissions')
            .in('house_id', houseIds)
        : { data: [] as any[], error: null };

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

    // 6) users envolvidos (heads + moderadores)
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

    const resolveLocalizedName = (
      name_i18n: Record<string, string> | null,
      fallback?: string | null
    ): string => {
      if (name_i18n && name_i18n[locale]) return name_i18n[locale];
      if (name_i18n && name_i18n.en) return name_i18n.en;
      return fallback ?? '';
    };

    // 7) montar resposta final
    const result = houses.map((house) => {
      const sport = sportById.get(house.sport_id) || null;
      const stats = statsByHouseId.get(house.id);

      // Head da House
      const headRow = headByHouse.get(house.id) || null;
      let headUser: UserRow | null = null;

      if (headRow) {
        const admin = adminAssignById.get(headRow.admin_id) || null;
        if (admin) {
          headUser = userById.get(admin.user_id) || null;
        }
      }

      // Moderadores
      const mods = moderatorsByHouse.get(house.id) || [];
      const moderators = mods
        .map((mod) => {
          const u = userById.get(mod.user_id) || null;
          if (!u) return null;
          return {
            user_id: u.id,
            username: u.username,
            full_name: u.full_name ?? null,
            role: u.role,
            avatar_url: u.avatar_url ?? null,
            permissions: mod.permissions ?? {},
          };
        })
        .filter(Boolean) as Array<{
          user_id: string;
          username: string | null;
          full_name: string | null;
          role: string | null;
          avatar_url: string | null;
          permissions: Record<string, any>;
        }>;

      const hasHead = !!headUser;
      const publicStatus = normalizeStatusFromData(house.status, hasHead);
      const headCount = stats ? stats.head_count : headUser ? 1 : 0;
      const moderatorCount = stats
        ? stats.moderator_count
        : Array.isArray(moderators)
          ? moderators.length
          : 0;
      const memberOnlyCount = stats
        ? stats.member_only_count
        : Math.max((stats?.member_count ?? 0) - headCount - moderatorCount, 0);
      const totalMembers = stats
        ? stats.member_count
        : headCount + moderatorCount + memberOnlyCount;
      const xpBreakdown = {
        head: stats?.head_xp ?? 0,
        moderators: stats?.moderator_xp ?? 0,
        members:
          stats?.member_xp ??
          Math.max((stats?.total_xp ?? 0) - (stats?.head_xp ?? 0) - (stats?.moderator_xp ?? 0), 0),
      };
      const totalXp =
        stats?.total_xp ??
        xpBreakdown.head + xpBreakdown.moderators + xpBreakdown.members;

      return {
        id: house.id,
        avatar_url: house.avatar_url ?? null,
        cover_image_url: house.cover_image_url ?? null,
        country_code: house.country_code,
        status: publicStatus,
        created_at: house.created_at,
        house_key: (house.house_key || (sport?.code ?? '') || house.id).toUpperCase(),

        sport: sport
          ? {
              id: sport.id,
              code: sport.code,
              name: resolveLocalizedName(sport.name_i18n, sport.code),
            }
          : null,

        name: resolveLocalizedName(
          house.name_i18n,
          sport ? resolveLocalizedName(sport.name_i18n, sport.code) : null
        ),

        head: headUser
          ? {
              user_id: headUser.id,
              username: headUser.username,
              full_name: headUser.full_name ?? null,
              role: headUser.role,
              avatar_url: headUser.avatar_url ?? null,
            }
          : null,

        moderators,
        member_count: totalMembers,
        xp_total: totalXp,
        xp_breakdown: xpBreakdown,
        participant_breakdown: {
          total: totalMembers,
          head: headCount,
          moderators: moderatorCount,
          members: memberOnlyCount,
        },
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
