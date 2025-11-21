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
};

type AdminHouse = {
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
};

// Mapa simples de código → nome de país
const COUNTRY_LABELS: Record<string, string> = {
  PT: 'Portugal',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  US: 'United States',
  BR: 'Brazil',
};

// Regra de status para o painel Admin (mesma lógica conceptual da API pública)
function resolveAdminStatus(
  dbStatus: string | null,
  hasHead: boolean
): HouseStatus {
  const raw = (dbStatus || '').toLowerCase();

  if (raw === 'active') {
    return 'active';
  }

  if (hasHead || raw === 'under_construction') {
    return 'under_construction';
  }

  return 'development';
}

// =========== GET /api/admin/houses ===========
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code, status, name_i18n, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error in /api/admin/houses (houses):', error);
      return NextResponse.json(
        { success: false, error: 'Supabase error loading houses' },
        { status: 500 }
      );
    }

    const houses = (data ?? []) as HouseRow[];
    if (houses.length === 0) {
      return NextResponse.json({ success: true, houses: [] }, { status: 200 });
    }

    const houseIds = houses.map((h) => h.id);

    // Heads
    const { data: headsData, error: headsError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .in('house_id', houseIds);

    if (headsError) {
      console.error('Supabase error in /api/admin/houses (heads):', headsError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Heads das Houses.' },
        { status: 500 }
      );
    }

    const heads = (headsData ?? []) as HouseHeadRow[];

    // Admin assignments
    const adminIds = Array.from(new Set(heads.map((h) => h.admin_id)));

    let adminAssignments: AdminAssignmentRow[] = [];
    if (adminIds.length > 0) {
      const { data: adminAssignData, error: adminAssignError } =
        await supabaseAdmin
          .from('admin_assignments')
          .select('id, user_id')
          .in('id', adminIds);

      if (adminAssignError) {
        console.error(
          'Supabase error in /api/admin/houses (admin_assignments):',
          adminAssignError
        );
        return NextResponse.json(
          { success: false, error: 'Erro ao carregar Admin Assignments.' },
          { status: 500 }
        );
      }

      adminAssignments = (adminAssignData ?? []) as AdminAssignmentRow[];
    }

    // Moderadores
    const { data: modsData, error: modsError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id')
      .in('house_id', houseIds);

    if (modsError) {
      console.error(
        'Supabase error in /api/admin/houses (moderators):',
        modsError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar moderadores das Houses.' },
        { status: 500 }
      );
    }

    const moderatorsRows = (modsData ?? []) as HouseModeratorRow[];

    // Users (heads + moderadores)
    const headUserIds = adminAssignments.map((a) => a.user_id);
    const moderatorUserIds = moderatorsRows.map((m) => m.user_id);
    const allUserIds = Array.from(new Set([...headUserIds, ...moderatorUserIds]));

    let users: UserRow[] = [];
    if (allUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, role, avatar_url')
        .in('id', allUserIds);

      if (usersError) {
        console.error('Supabase error in /api/admin/houses (users):', usersError);
        return NextResponse.json(
          { success: false, error: 'Erro ao carregar utilizadores.' },
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

    const result: AdminHouse[] = houses.map((row) => {
      const name_i18n = row.name_i18n || {};

      const title =
        (name_i18n.en as string | undefined) ||
        (name_i18n.pt as string | undefined) ||
        (name_i18n.es as string | undefined) ||
        (name_i18n.fr as string | undefined) ||
        (name_i18n.de as string | undefined) ||
        (name_i18n.it as string | undefined) ||
        'Unnamed House';

      // Head
      const headRow = headByHouse.get(row.id) || null;
      let headUser: UserRow | null = null;
      if (headRow) {
        const admin = adminAssignById.get(headRow.admin_id) || null;
        if (admin) {
          headUser = userById.get(admin.user_id) || null;
        }
      }

      const hasHead = !!headUser;

      // Moderators count
      const mods = moderatorsByHouse.get(row.id) || [];
      const moderators_count = mods.reduce((acc, mod) => {
        if (userById.has(mod.user_id)) return acc + 1;
        return acc;
      }, 0);

      const status = resolveAdminStatus(row.status, hasHead);

      return {
        id: row.id as string,
        sport_name: title as string,
        sport_code: (row.sport_id as string | null) ?? null,
        country_code: (row.country_code as string | null) ?? '',
        status,
        created_at: row.created_at as string,
        head: headUser
          ? {
              user_id: headUser.id,
              username: headUser.username ?? null,
              full_name: headUser.full_name ?? null,
              avatar_url: headUser.avatar_url ?? null,
            }
          : null,
        moderators_count,
      };
    });

    return NextResponse.json(
      { success: true, houses: result },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in /api/admin/houses (GET):', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading houses' },
      { status: 500 }
    );
  }
}

// =========== POST /api/admin/houses ===========
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { sportId, countryCode, status } = body as {
      sportId?: string;
      countryCode?: string;
      status?: HouseStatus;
    };

    if (!sportId || !countryCode || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'sportId, countryCode and status are required.',
        },
        { status: 400 }
      );
    }

    if (!['active', 'under_construction', 'development'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value.' },
        { status: 400 }
      );
    }

    const country = countryCode.toUpperCase();
    const countryLabel = COUNTRY_LABELS[country] ?? country;

    // Buscar info do desporto para gerar name_i18n
    const { data: sportRow, error: sportError } = await supabaseAdmin
      .from('sports')
      .select('id, code, name_i18n')
      .eq('id', sportId)
      .maybeSingle();

    if (sportError) {
      console.error('Error loading sport in POST /api/admin/houses:', sportError);
      return NextResponse.json(
        { success: false, error: 'Error loading sport for House creation.' },
        { status: 500 }
      );
    }

    if (!sportRow) {
      return NextResponse.json(
        { success: false, error: 'Sport not found.' },
        { status: 400 }
      );
    }

    const sportNameI18n = (sportRow as any).name_i18n || {};
    const baseSportName =
      sportNameI18n.en ||
      sportNameI18n.pt ||
      Object.values(sportNameI18n)[0] ||
      (sportRow as any).code ||
      'Sport';

    const houseNameEn = `House of ${baseSportName} ${countryLabel}`;
    const name_i18n = {
      en: houseNameEn,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('houses_of_sports')
      .insert({
        sport_id: sportId,
        country_code: country,
        status,
        name_i18n,
      })
      .select('id, sport_id, country_code, status, name_i18n, created_at')
      .single();

    if (insertError) {
      console.error(
        'Error inserting House in POST /api/admin/houses:',
        insertError
      );
      return NextResponse.json(
        { success: false, error: 'Error creating House of Sports.' },
        { status: 500 }
      );
    }

    const houseRow = inserted as HouseRow;

    const name =
      (houseRow.name_i18n?.en ??
        houseRow.name_i18n?.pt ??
        'Unnamed House') as string;

    const resultHouse: AdminHouse = {
      id: houseRow.id,
      sport_name: name,
      sport_code: houseRow.sport_id ?? null,
      country_code: houseRow.country_code ?? '',
      status:
        (houseRow.status as HouseStatus) === 'active' ||
        (houseRow.status as HouseStatus) === 'under_construction'
          ? (houseRow.status as HouseStatus)
          : 'development',
      created_at: houseRow.created_at ?? new Date().toISOString(),
      head: null,
      moderators_count: 0,
    };

    return NextResponse.json(
      { success: true, house: resultHouse },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in /api/admin/houses (POST):', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error creating House of Sports',
      },
      { status: 500 }
    );
  }
}
