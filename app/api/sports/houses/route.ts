// app/api/sports/houses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

type HouseRow = {
  id: string;
  sport_id: string;
  country_code: string | null;
  name_i18n: Record<string, string> | null;
  status: 'development' | 'under_construction' | 'active' | null;
  hero_title_i18n: Record<string, string> | null;
  hero_subtitle_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  cover_image_url: string | null;
  is_public: boolean | null;
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
  full_name: string | null;
  role: string | null;
  avatar_url?: string | null;
};

type HouseModeratorRow = {
  house_id: string;
  user_id: string;
  permissions: Record<string, any> | null;
};

type PublicLifecycleStatus =
  | 'IN_DEVELOPMENT'
  | 'UNDER_CONSTRUCTION'
  | 'ACTIVE';

function mapLifecycleStatus(
  dbStatus: HouseRow['status'],
  hasHead: boolean
): PublicLifecycleStatus {
  if (dbStatus === 'active') return 'ACTIVE';
  if (dbStatus === 'under_construction') return 'UNDER_CONSTRUCTION';

  // development ou null
  // se já tem Head mas ainda não actualizaste o status, tratamos como UNDER_CONSTRUCTION
  if (hasHead) return 'UNDER_CONSTRUCTION';
  return 'IN_DEVELOPMENT';
}

function resolveLocalized(
  obj: Record<string, string> | null,
  locale: SupportedLocale,
  fallback?: string | null
): string {
  if (obj && obj[locale]) return obj[locale];
  if (obj && obj.en) return obj.en;
  return fallback ?? '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLocale = searchParams.get('locale');
    const locale = normalizeLocale(rawLocale);

    // 1) Houses (apenas públicas)
    const { data: housesData, error: housesError } = await supabase
      .from('houses_of_sports')
      .select(
        `
        id,
        sport_id,
        country_code,
        status,
        name_i18n,
        hero_title_i18n,
        hero_subtitle_i18n,
        description_i18n,
        cover_image_url,
        is_public
      `
      )
      .eq('is_public', true);

    if (housesError) {
      console.error('Error loading houses_of_sports:', housesError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Houses of Sports.' },
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
    const { data: sportsData, error: sportsError } = await supabase
      .from('sports')
      .select('id, code, name_i18n')
      .in('id', sportIds);

    if (sportsError) {
      console.error('Error loading sports for houses:', sportsError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar desportos das Houses.' },
        { status: 500 }
      );
    }

    const sports = (sportsData ?? []) as SportRow[];
    const sportById = new Map<string, SportRow>();
    for (const s of sports) {
      sportById.set(s.id, s);
    }

    // 3) Heads
    const houseIds = houses.map((h) => h.id);
    const { data: headsData, error: headsError } = await supabase
      .from('house_heads')
      .select('house_id, admin_id')
      .in('house_id', houseIds);

    if (headsError) {
      console.error('Error loading house_heads:', headsError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Heads das Houses.' },
        { status: 500 }
      );
    }

    const heads = (headsData ?? []) as HouseHeadRow[];

    // 4) Admin assignments
    const adminIds = Array.from(new Set(heads.map((h) => h.admin_id)));
    const { data: adminAssignData, error: adminAssignError } = await supabase
      .from('admin_assignments')
      .select('id, user_id')
      .in('id', adminIds);

    if (adminAssignError) {
      console.error('Error loading admin_assignments:', adminAssignError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Admin Assignments.' },
        { status: 500 }
      );
    }

    const adminAssignments = (adminAssignData ?? []) as AdminAssignmentRow[];

    // 5) Moderadores
    const { data: moderatorsData, error: moderatorsError } = await supabase
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
      const { data: usersData, error: usersError } = await supabase
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

    // 7) Montar resultado final
    const result = houses.map((house) => {
      const sport = sportById.get(house.sport_id) || null;

      // Head
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
            full_name: u.full_name,
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
      const lifecycle_status = mapLifecycleStatus(house.status, hasHead);

      const houseName = resolveLocalized(
        house.name_i18n,
        locale,
        sport ? resolveLocalized(sport.name_i18n, locale, sport.code) : null
      );

      const heroTitle = resolveLocalized(
        house.hero_title_i18n,
        locale,
        `House of ${houseName} ${
          house.country_code ?? ''
        }`.trim()
      );

      const heroSubtitle = resolveLocalized(
        house.hero_subtitle_i18n,
        locale,
        'Uma comunidade Web3 para profissionais e entusiastas deste desporto.'
      );

      const description = resolveLocalized(
        house.description_i18n,
        locale,
        'Em breve poderás encontrar missões, eventos, ranking e recompensas ligadas a esta House.'
      );

      return {
        id: house.id,
        country_code: house.country_code,
        lifecycle_status,
        name: houseName,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        description,
        cover_image_url: house.cover_image_url ?? null,
        sport: sport
          ? {
              id: sport.id,
              code: sport.code,
              name: resolveLocalized(sport.name_i18n, locale, sport.code),
            }
          : null,
        head: headUser
          ? {
              user_id: headUser.id,
              username: headUser.username,
              full_name: headUser.full_name,
              role: headUser.role,
              avatar_url: headUser.avatar_url ?? null,
            }
          : null,
        moderators,
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
