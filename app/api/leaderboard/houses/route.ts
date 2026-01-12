import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

type HouseTotalsRow = {
  house_id: string;
  total_xp: number | null;
  member_count: number | null;
  member_only_count: number | null;
  head_count: number | null;
  head_xp: number | null;
  moderator_count: number | null;
  moderator_xp: number | null;
  member_xp: number | null;
};

type HouseRoleRow = {
  house_id: string;
};

type HouseMemberCountRow = {
  house_id: string;
  count: number | null;
};

const PUBLIC_STATUS = {
  ACTIVE: 'ACTIVE',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  IN_DEVELOPMENT: 'IN_DEVELOPMENT',
} as const;

type PublicHouseStatus = (typeof PUBLIC_STATUS)[keyof typeof PUBLIC_STATUS];

interface HouseLeaderboardEntry {
  houseId: string;
  name: string;
  sportCode: string | null;
  sportName: string | null;
  countryCode: string | null;
  status: PublicHouseStatus;
  totalXp: number;
  memberCount: number;
  headCount: number;
  moderatorCount: number;
  createdAt: string | null;
  xpBreakdown: {
    head: number;
    moderators: number;
    members: number;
  };
  participantBreakdown: {
    total: number;
    head: number;
    moderators: number;
    members: number;
  };
}

const resolveName = (
  localized: Record<string, string> | null,
  fallback?: string | null,
): string => {
  if (localized) {
    if (localized['en']) return localized['en'];
    const firstLang = Object.keys(localized)[0];
    if (firstLang) return localized[firstLang];
  }
  return fallback ?? 'Unnamed House';
};

const normalizeStatus = (
  dbStatus: string | null,
  hasHead: boolean,
): PublicHouseStatus => {
  const normalized = (dbStatus || '').toLowerCase();
  if (normalized === 'active') return PUBLIC_STATUS.ACTIVE;
  if (hasHead || normalized === 'under_construction') {
    return PUBLIC_STATUS.UNDER_CONSTRUCTION;
  }
  return PUBLIC_STATUS.IN_DEVELOPMENT;
};

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Supabase admin client is not configured.' },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') ?? '100');
    const safeLimit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 100;

    const { data: housesData, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id, country_code, status, name_i18n, created_at');

    if (housesError) {
      console.error('Error loading houses_of_sports:', housesError);
      return NextResponse.json(
        { success: false, error: 'Failed to load houses.' },
        { status: 500 },
      );
    }

    const houses = (housesData ?? []) as HouseRow[];

    if (houses.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        leaderboard: [],
        summary: {
          totalHouses: 0,
          activeHouses: 0,
          totalMembers: 0,
          totalXp: 0,
          totalCountries: 0,
          topCountry: null,
        },
      });
    }

    const houseIds = houses.map((house) => house.id);
    const sportIds = Array.from(new Set(houses.map((house) => house.sport_id)));

    const totalsPromise = supabaseAdmin
      .from('house_xp_totals')
      .select(
        'house_id, total_xp, member_count, member_only_count, head_count, head_xp, moderator_count, moderator_xp, member_xp',
      )
      .in('house_id', houseIds);

    const memberCountsPromise = supabaseAdmin
      .from('user_houses')
      .select('house_id, count:user_id', { head: false })
      .eq('membership_role', 'MEMBER')
      .is('removed_at', null)
      .in('house_id', houseIds);

    const sportsPromise =
      sportIds.length > 0
        ? supabaseAdmin.from('sports').select('id, code, name_i18n').in('id', sportIds)
        : Promise.resolve({ data: [] as SportRow[], error: null });

    const [
      { data: totalsData, error: totalsError },
      { data: sportsData, error: sportsError },
      { data: memberCountsData, error: memberCountsError },
    ] = await Promise.all([totalsPromise, sportsPromise, memberCountsPromise]);

    if (totalsError) {
      console.error('Error loading house_xp_totals:', totalsError);
      return NextResponse.json(
        { success: false, error: 'Failed to load XP totals.' },
        { status: 500 },
      );
    }

    if (sportsError) {
      console.error('Error loading sports for houses:', sportsError);
      return NextResponse.json(
        { success: false, error: 'Failed to load sports metadata.' },
        { status: 500 },
      );
    }

    if (memberCountsError) {
      console.warn('Error loading user_houses counts. Falling back to XP data only.', memberCountsError);
    }

    const { data: headRows, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id')
      .in('house_id', houseIds);

    if (headError) {
      console.error('Error loading house_heads:', headError);
      return NextResponse.json(
        { success: false, error: 'Failed to load house head counts.' },
        { status: 500 },
      );
    }

    const { data: moderatorRows, error: moderatorError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id')
      .in('house_id', houseIds);

    if (moderatorError) {
      console.error('Error loading house_moderators:', moderatorError);
      return NextResponse.json(
        { success: false, error: 'Failed to load house moderator counts.' },
        { status: 500 },
      );
    }

    const totalsMap = new Map<string, HouseTotalsRow>();
    (totalsData ?? []).forEach((row: HouseTotalsRow) => {
      totalsMap.set(row.house_id, row);
    });

    const sportsMap = new Map<string, SportRow>();
    (sportsData ?? []).forEach((sport: SportRow) => {
      sportsMap.set(sport.id, sport);
    });

    const memberCountsMap = new Map<string, number>();
    (memberCountsData ?? []).forEach((row: HouseMemberCountRow) => {
      memberCountsMap.set(row.house_id, Number(row.count) || 0);
    });

    const headCountMap = new Map<string, number>();
    (headRows ?? []).forEach((row: HouseRoleRow) => {
      const current = headCountMap.get(row.house_id) ?? 0;
      headCountMap.set(row.house_id, current + 1);
    });

    const moderatorCountMap = new Map<string, number>();
    (moderatorRows ?? []).forEach((row: HouseRoleRow) => {
      const current = moderatorCountMap.get(row.house_id) ?? 0;
      moderatorCountMap.set(row.house_id, current + 1);
    });

    const leaderboard = houses
      .map<HouseLeaderboardEntry>((house) => {
        const totals = totalsMap.get(house.id);
        const sport = sportsMap.get(house.sport_id) || null;
        const viewHeadCount = typeof totals?.head_count === 'number' ? totals.head_count : null;
        const viewModeratorCount =
          typeof totals?.moderator_count === 'number' ? totals.moderator_count : null;
        const headCount = viewHeadCount ?? headCountMap.get(house.id) ?? 0;
        const moderatorCount = viewModeratorCount ?? moderatorCountMap.get(house.id) ?? 0;
        const membersOnly =
          typeof totals?.member_only_count === 'number'
            ? totals.member_only_count
            : memberCountsMap.get(house.id) ?? 0;
        const fallbackParticipants = headCount + moderatorCount + (membersOnly ?? 0);
        const participantCount =
          typeof totals?.member_count === 'number'
            ? Math.max(totals.member_count, fallbackParticipants)
            : fallbackParticipants;
        const xpBreakdown = {
          head: totals?.head_xp ?? 0,
          moderators: totals?.moderator_xp ?? 0,
          members: totals?.member_xp ?? 0,
        };
        const totalXp =
          totals?.total_xp ??
          xpBreakdown.head + xpBreakdown.moderators + xpBreakdown.members;
        const memberCount = participantCount;
        const participantBreakdown = {
          total: memberCount,
          head: headCount,
          moderators: moderatorCount,
          members: membersOnly ?? Math.max(memberCount - headCount - moderatorCount, 0),
        };
        const sportName = sport ? resolveName(sport.name_i18n, sport.code) : null;
        const houseName = resolveName(house.name_i18n, sportName);

        return {
          houseId: house.id,
          name: houseName,
          sportCode: sport?.code ?? null,
          sportName,
          countryCode: house.country_code,
          status: normalizeStatus(house.status, headCount > 0),
          totalXp,
          memberCount,
          headCount,
          moderatorCount,
          createdAt: house.created_at,
          xpBreakdown,
          participantBreakdown,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp || (b.memberCount - a.memberCount));

    const totalMembers = leaderboard.reduce((acc, house) => acc + house.memberCount, 0);
    const totalXpAll = leaderboard.reduce((acc, house) => acc + house.totalXp, 0);
    const activeHouses = leaderboard.filter((house) => house.status === PUBLIC_STATUS.ACTIVE).length;

    const countryTotals = new Map<
      string,
      {
        totalXp: number;
        houses: number;
      }
    >();

    leaderboard.forEach((entry) => {
      if (!entry.countryCode) return;
      const key = entry.countryCode.toUpperCase();
      const current = countryTotals.get(key) ?? { totalXp: 0, houses: 0 };
      current.totalXp += entry.totalXp;
      current.houses += 1;
      countryTotals.set(key, current);
    });

    const topCountryEntry = Array.from(countryTotals.entries()).sort(
      (a, b) => b[1].totalXp - a[1].totalXp,
    )[0];

    const summary = {
      totalHouses: leaderboard.length,
      activeHouses,
      totalMembers,
      totalXp: totalXpAll,
      totalCountries: countryTotals.size,
      topCountry: topCountryEntry
        ? {
            code: topCountryEntry[0],
            totalXp: topCountryEntry[1].totalXp,
            houses: topCountryEntry[1].houses,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      total: leaderboard.length,
      leaderboard: leaderboard.slice(0, safeLimit),
      summary,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/leaderboard/houses:', error);
    return NextResponse.json(
      { success: false, error: 'Unexpected error loading houses leaderboard.' },
      { status: 500 },
    );
  }
}
