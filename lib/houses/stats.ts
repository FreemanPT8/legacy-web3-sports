import { supabaseAdmin } from '@/lib/supabase';

const CHUNK_SIZE = 200;

const chunkArray = <T>(items: T[], size: number = CHUNK_SIZE): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const normalizeNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export type AggregatedHouseStats = {
  member_count: number;
  member_only_count: number;
  head_count: number;
  moderator_count: number;
  total_xp: number;
  head_xp: number;
  moderator_xp: number;
  member_xp: number;
};

type HeadRow = {
  house_id: string;
  admin_id: string;
};

type AdminAssignmentRow = {
  id: string;
  user_id: string | null;
};

type ModeratorRow = {
  house_id: string;
  user_id: string;
};

type MemberRow = {
  house_id: string;
  user_id: string;
};

type UserXpRow = {
  id: string;
  xp_total: number | string | null;
};

const ensureStats = (
  map: Map<string, AggregatedHouseStats>,
  houseId: string,
): AggregatedHouseStats => {
  let stats = map.get(houseId);
  if (!stats) {
    stats = {
      member_count: 0,
      member_only_count: 0,
      head_count: 0,
      moderator_count: 0,
      total_xp: 0,
      head_xp: 0,
      moderator_xp: 0,
      member_xp: 0,
    };
    map.set(houseId, stats);
  }
  return stats;
};

const ensureIdSet = (map: Map<string, Set<string>>, houseId: string): Set<string> => {
  let idSet = map.get(houseId);
  if (!idSet) {
    idSet = new Set<string>();
    map.set(houseId, idSet);
  }
  return idSet;
};

export async function loadAggregatedHouseStats(
  houseIds: string[],
): Promise<Map<string, AggregatedHouseStats>> {
  const statsMap = new Map<string, AggregatedHouseStats>();
  if (!houseIds.length) {
    return statsMap;
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  houseIds.forEach((id) => ensureStats(statsMap, id));

  const headRows: HeadRow[] = [];
  for (const chunk of chunkArray(houseIds)) {
    const { data, error } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .in('house_id', chunk);
    if (error) {
      console.error('[house-stats] Failed to load house_heads chunk', error);
      throw new Error('Failed to load house_heads entries.');
    }
    headRows.push(...((data ?? []) as HeadRow[]));
  }

  const adminIds = Array.from(new Set(headRows.map((row) => row.admin_id).filter(Boolean)));
  const adminAssignments = new Map<string, string>();
  if (adminIds.length > 0) {
    for (const chunk of chunkArray(adminIds)) {
      const { data, error } = await supabaseAdmin
        .from('admin_assignments')
        .select('id, user_id')
        .in('id', chunk);
      if (error) {
        console.error('[house-stats] Failed to load admin_assignments chunk', error);
        throw new Error('Failed to load admin assignments for heads.');
      }
      for (const assignment of ((data ?? []) as AdminAssignmentRow[])) {
        if (assignment?.id && assignment?.user_id) {
          adminAssignments.set(assignment.id, assignment.user_id);
        }
      }
    }
  }

  const normalizedHeadRows = headRows
    .map((row) => ({
      house_id: row.house_id,
      user_id: adminAssignments.get(row.admin_id) ?? null,
    }))
    .filter((row): row is { house_id: string; user_id: string } => Boolean(row.user_id));

  const moderatorRows: ModeratorRow[] = [];
  for (const chunk of chunkArray(houseIds)) {
    const { data, error } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id')
      .in('house_id', chunk);
    if (error) {
      console.error('[house-stats] Failed to load house_moderators chunk', error);
      throw new Error('Failed to load house_moderators entries.');
    }
    moderatorRows.push(...((data ?? []) as ModeratorRow[]));
  }

  const memberRows: MemberRow[] = [];
  for (const chunk of chunkArray(houseIds)) {
    const { data, error } = await supabaseAdmin
      .from('user_houses')
      .select('house_id, user_id')
      .eq('membership_role', 'MEMBER')
      .is('removed_at', null)
      .in('house_id', chunk);
    if (error) {
      console.error('[house-stats] Failed to load user_houses chunk', error);
      throw new Error('Failed to load user_houses entries.');
    }
    memberRows.push(...((data ?? []) as MemberRow[]));
  }

  const allUserIds = new Set<string>();
  normalizedHeadRows.forEach((row) => allUserIds.add(row.user_id));
  moderatorRows.forEach((row) => allUserIds.add(row.user_id));
  memberRows.forEach((row) => allUserIds.add(row.user_id));

  const userXp = new Map<string, number>();
  if (allUserIds.size > 0) {
    const userIdList = Array.from(allUserIds);
    for (const chunk of chunkArray(userIdList)) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, xp_total')
        .in('id', chunk);
      if (error) {
        console.error('[house-stats] Failed to load users XP chunk', error);
        throw new Error('Failed to load user XP totals.');
      }
      for (const row of ((data ?? []) as UserXpRow[])) {
        userXp.set(row.id, normalizeNumber(row.xp_total ?? 0));
      }
    }
  }

  const headIdsByHouse = new Map<string, Set<string>>();
  const moderatorIdsByHouse = new Map<string, Set<string>>();

  normalizedHeadRows.forEach((row) => {
    const stats = statsMap.get(row.house_id);
    if (!stats) return;
    const xp = userXp.get(row.user_id) ?? 0;
    stats.head_count += 1;
    stats.head_xp += xp;
    ensureIdSet(headIdsByHouse, row.house_id).add(row.user_id);
  });

  moderatorRows.forEach((row) => {
    const stats = statsMap.get(row.house_id);
    if (!stats) return;
    const headSet = headIdsByHouse.get(row.house_id);
    if (headSet?.has(row.user_id)) return;
    const xp = userXp.get(row.user_id) ?? 0;
    stats.moderator_count += 1;
    stats.moderator_xp += xp;
    ensureIdSet(moderatorIdsByHouse, row.house_id).add(row.user_id);
  });

  memberRows.forEach((row) => {
    const stats = statsMap.get(row.house_id);
    if (!stats) return;
    if (headIdsByHouse.get(row.house_id)?.has(row.user_id)) return;
    if (moderatorIdsByHouse.get(row.house_id)?.has(row.user_id)) return;
    const xp = userXp.get(row.user_id) ?? 0;
    stats.member_only_count += 1;
    stats.member_xp += xp;
  });

  statsMap.forEach((stats) => {
    stats.member_count = stats.head_count + stats.moderator_count + stats.member_only_count;
    stats.total_xp = stats.head_xp + stats.moderator_xp + stats.member_xp;
  });

  return statsMap;
}

async function loadHouseStatsFromView(
  houseIds: string[],
): Promise<Map<string, AggregatedHouseStats>> {
  const statsMap = new Map<string, AggregatedHouseStats>();
  if (!houseIds.length) {
    return statsMap;
  }
  if (!supabaseAdmin) {
    return statsMap;
  }

  houseIds.forEach((id) => ensureStats(statsMap, id));

  for (const chunk of chunkArray(houseIds)) {
    const { data, error } = await supabaseAdmin
      .from('house_xp_totals')
      .select(
        'house_id, member_count, member_only_count, head_count, moderator_count, total_xp, head_xp, moderator_xp, member_xp',
      )
      .in('house_id', chunk);
    if (error) {
      console.error('[house-stats] Failed to load house_xp_totals chunk', error);
      continue;
    }
    for (const row of (data ?? []) as {
      house_id: string;
      member_count: number | null;
      member_only_count: number | null;
      head_count: number | null;
      moderator_count: number | null;
      total_xp: number | null;
      head_xp: number | null;
      moderator_xp: number | null;
      member_xp: number | null;
    }[]) {
      const headCount = normalizeNumber(row.head_count);
      const moderatorCount = normalizeNumber(row.moderator_count);
      const memberOnly = normalizeNumber(row.member_only_count);
      const headXp = normalizeNumber(row.head_xp);
      const moderatorXp = normalizeNumber(row.moderator_xp);
      const memberXp = normalizeNumber(row.member_xp);
      const derivedMemberCount = headCount + moderatorCount + memberOnly;
      const totalXp =
        normalizeNumber(row.total_xp) || headXp + moderatorXp + memberXp;
      statsMap.set(row.house_id, {
        member_count: normalizeNumber(row.member_count) || derivedMemberCount,
        member_only_count: memberOnly,
        head_count: headCount,
        moderator_count: moderatorCount,
        total_xp: totalXp,
        head_xp: headXp,
        moderator_xp: moderatorXp,
        member_xp: memberXp,
      });
    }
  }

  return statsMap;
}

export async function loadHouseStatsWithFallback(
  houseIds: string[],
): Promise<Map<string, AggregatedHouseStats>> {
  try {
    return await loadHouseStatsFromView(houseIds);
  } catch (error) {
    console.error('[house-stats] Failed to load house_xp_totals view; falling back to aggregate computation.', error);
    try {
      return await loadAggregatedHouseStats(houseIds);
    } catch (fallbackError) {
      console.error('[house-stats] Fallback aggregate computation failed.', fallbackError);
      const emptyMap = new Map<string, AggregatedHouseStats>();
      houseIds.forEach((id) => ensureStats(emptyMap, id));
      return emptyMap;
    }
  }
}

export type HouseParticipantBreakdown = {
  total: number;
  head: number;
  moderators: number;
  members: number;
};

export type HouseXpSummary = {
  xpBreakdown: {
    head: number;
    moderators: number;
    members: number;
  };
  totalXp: number;
};

export function deriveHouseParticipantCounts(
  stats?: AggregatedHouseStats | null,
): HouseParticipantBreakdown {
  const head = stats?.head_count ?? 0;
  const moderators = stats?.moderator_count ?? 0;
  const memberOnly = stats?.member_only_count ?? Math.max((stats?.member_count ?? 0) - head - moderators, 0);
  const total = stats?.member_count ?? head + moderators + memberOnly;
  return {
    total,
    head,
    moderators,
    members: memberOnly,
  };
}

export function deriveHouseXpSummary(stats?: AggregatedHouseStats | null): HouseXpSummary {
  const xpBreakdown = {
    head: stats?.head_xp ?? 0,
    moderators: stats?.moderator_xp ?? 0,
    members: stats?.member_xp ?? 0,
  };
  const totalXp =
    typeof stats?.total_xp === 'number'
      ? stats.total_xp
      : xpBreakdown.head + xpBreakdown.moderators + xpBreakdown.members;
  return {
    xpBreakdown,
    totalXp,
  };
}
