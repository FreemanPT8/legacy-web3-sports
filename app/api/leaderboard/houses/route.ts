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

const normalizeNumeric = (
  value: number | string | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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

    const chunkedTotals = [];
    for (const chunk of chunkArray(houseIds, 100)) {
      const { data, error } = await supabaseAdmin
        .from('house_xp_totals')
        .select(
          'house_id, total_xp, member_count, member_only_count, head_count, head_xp, moderator_count, moderator_xp, member_xp',
        )
        .in('house_id', chunk);

      if (error) {
        console.error('Error loading house_xp_totals chunk:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to load XP totals.' },
          { status: 500 },
        );
      }
      chunkedTotals.push(...((data ?? []) as HouseTotalsRow[]));
    }

    const chunkedSports: SportRow[] = [];
    if (sportIds.length > 0) {
      for (const chunk of chunkArray(sportIds, 100)) {
        const { data, error } = await supabaseAdmin
          .from('sports')
          .select('id, code, name_i18n')
          .in('id', chunk);

        if (error) {
          console.error('Error loading sports for houses:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to load sports metadata.' },
            { status: 500 },
          );
        }

        chunkedSports.push(...((data ?? []) as SportRow[]));
      }
    }

    const totalsMap = new Map<string, HouseTotalsRow>();
    (chunkedTotals ?? []).forEach((row: HouseTotalsRow) => {
      totalsMap.set(row.house_id, {
        house_id: row.house_id,
        total_xp: normalizeNumeric(row.total_xp),
        member_count: normalizeNumeric(row.member_count),
        member_only_count: normalizeNumeric(row.member_only_count),
        head_count: normalizeNumeric(row.head_count),
        head_xp: normalizeNumeric(row.head_xp),
        moderator_count: normalizeNumeric(row.moderator_count),
        moderator_xp: normalizeNumeric(row.moderator_xp),
        member_xp: normalizeNumeric(row.member_xp),
      });
    });

    const sportsMap = new Map<string, SportRow>();
    (chunkedSports ?? []).forEach((sport: SportRow) => {
      sportsMap.set(sport.id, sport);
    });

    const leaderboard = houses
      .map<HouseLeaderboardEntry>((house) => {
        const totals = totalsMap.get(house.id);
        const sport = sportsMap.get(house.sport_id) || null;
        const headCount = totals?.head_count ?? 0;
        const moderatorCount = totals?.moderator_count ?? 0;
        const membersOnly = totals?.member_only_count ?? 0;
        const participantCount = headCount + moderatorCount + membersOnly;
        const xpBreakdown = {
          head: totals?.head_xp ?? 0,
          moderators: totals?.moderator_xp ?? 0,
          members: totals?.member_xp ?? 0,
        };
        const totalXp =
          typeof totals?.total_xp === 'number'
            ? totals.total_xp
            : xpBreakdown.head + xpBreakdown.moderators + xpBreakdown.members;
        const memberCount = participantCount;
        const participantBreakdown = {
          total: memberCount,
          head: headCount,
          moderators: moderatorCount,
          members: membersOnly,
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
