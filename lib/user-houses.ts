import { supabaseAdmin } from './supabase';
import { getCountryCodeFromName, getCountryName } from './countries';
import { queueSportPendingEntry } from './sport-pool';

export type HouseMembershipRole = 'HEAD' | 'MODERATOR' | 'MEMBER';
export type HouseAssignmentSource =
  | 'signup-auto'
  | 'pool-auto'
  | 'admin-manual'
  | 'ONBOARDING'
  | 'PROFILE'
  | 'ADMIN_SYNC'
  | 'SCRIPT'
  | 'MANUAL';

interface UserRow {
  primary_country_code: string | null;
  primary_sport_id: string | null;
  country?: string | null;
  sport_id?: string | null;
}

interface HouseRow {
  id: string;
}

export interface SyncUserHouseMembershipResult {
  success: boolean;
  updated?: boolean;
  houseId?: string | null;
  reason?: string;
  poolEntryId?: string | null;
  error?: string;
}

export interface SyncUserHouseMembershipOptions {
  assignedVia?: HouseAssignmentSource;
  logPrefix?: string;
  actorId?: string | null;
}

export interface SyncHouseMembersResult {
  success: boolean;
  attempted: number;
  assigned: number;
  reason?: string;
}

type SupabaseClient = typeof supabaseAdmin;

let adminClient: SupabaseClient = supabaseAdmin;

export function __setUserHousesSupabaseAdmin(client?: SupabaseClient | null) {
  adminClient = client ?? supabaseAdmin;
}

type BackgroundSyncFn = (
  houseId: string,
  sportId?: string | null,
  countryCode?: string | null,
  options?: { logPrefix?: string },
) => Promise<SyncHouseMembersResult>;

let backgroundSyncHandler: BackgroundSyncFn | null = null;

export function __setSyncHouseMembersForTests(handler?: BackgroundSyncFn | null) {
  backgroundSyncHandler = handler ?? null;
}

function getBackgroundSyncHandler(): BackgroundSyncFn {
  return backgroundSyncHandler ?? syncHouseMembersBySportCountry;
}

const DEFAULT_SOURCE: HouseAssignmentSource = 'signup-auto';
const RPC_FUNCTION = 'sync_user_house_membership_db';
const RPC_UNDEFINED_FUNCTION = '42883';

async function syncMembershipViaRpc(
  userId: string,
  sportId: string | null,
  countryCode: string | null,
): Promise<SyncUserHouseMembershipResult | null> {
  if (!adminClient) return null;
  if (!sportId && !countryCode) return null;

  try {
    const { data, error } = await adminClient.rpc(RPC_FUNCTION, {
      p_user_id: userId,
      p_sport_id: sportId,
      p_country_code: countryCode,
    });
    if (error) {
      if (error.code === RPC_UNDEFINED_FUNCTION) {
        return null;
      }
      console.error('[user-houses] RPC sync_user_house_membership_db failed', error);
      return null;
    }
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as Record<string, any>;
    return {
      success: Boolean(payload.success),
      updated: payload.updated ?? undefined,
      houseId: (payload.house_id ?? payload.houseId ?? null) as string | null,
      reason: payload.reason ?? undefined,
      error: payload.error ?? undefined,
    };
  } catch (error) {
    console.error('[user-houses] Unexpected membership RPC error', error);
    return null;
  }
}

/**
 * Synchronizes user_houses rows (membership_role = 'MEMBER') with the sport/country stored on the user record.
 * - Adds or updates MEMBER links for every applicable sport.
 * - Queues pool entries when no matching House exists.
 */
export async function syncUserHouseMembership(
  userId: string,
  options: SyncUserHouseMembershipOptions = {},
): Promise<SyncUserHouseMembershipResult> {
  if (!adminClient) {
    return {
      success: false,
      error: 'Supabase admin client is not configured.',
    };
  }

  try {
    const assignedVia = options.assignedVia ?? DEFAULT_SOURCE;
    const logPrefix = options.logPrefix ? `[${options.logPrefix}] ` : '';

    const { data: userRowRaw, error: userError } = await adminClient
      .from('users')
      .select('primary_country_code, primary_sport_id, country, sport_id')
      .eq('id', userId)
      .maybeSingle();

    const userRow = (userRowRaw ?? null) as UserRow | null;

    if (userError) {
      console.error(`${logPrefix}Failed to load user for syncUserHouseMembership:`, userError);
      return {
        success: false,
        error: 'Failed to load user profile.',
      };
    }

    if (!userRow) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    let countryCode = userRow.primary_country_code
      ? userRow.primary_country_code.toUpperCase()
      : null;
    if (!countryCode && userRow.country) {
      countryCode =
        getCountryCodeFromName(userRow.country) ??
        userRow.country.trim().slice(0, 2).toUpperCase();
    }
    const sportIds = [userRow.sport_id ?? null, userRow.primary_sport_id ?? null]
      .filter((sportId): sportId is string => Boolean(sportId))
      .filter((sportId, index, list) => list.indexOf(sportId) === index);

    if (!countryCode || sportIds.length === 0) {
      return {
        success: true,
        updated: false,
        houseId: null,
        reason: 'missing_country_or_sport',
      };
    }

    const actorId = options.actorId ?? userId;
    const targetHouseIds: string[] = [];
    let existingHouseId: string | null = null;

    if (sportIds.length === 1) {
      const rpcResult = await syncMembershipViaRpc(userId, sportIds[0], countryCode);
      if (rpcResult) {
        return rpcResult;
      }
    }

    const { data: membershipRows, error: membershipError } = await adminClient
      .from('user_houses')
      .select('house_id')
      .eq('user_id', userId)
      .eq('membership_role', 'MEMBER');

    if (membershipError) {
      console.error(`${logPrefix}Failed to inspect existing memberships:`, membershipError);
      return {
        success: false,
        error: 'Failed to inspect existing memberships.',
      };
    }

    if (membershipRows && membershipRows.length > 0) {
      existingHouseId = membershipRows[0]?.house_id ?? null;
    }

    const { data: houseRows, error: houseError } = await adminClient
      .from('houses_of_sports')
      .select('id, sport_id')
      .eq('country_code', countryCode)
      .in('sport_id', sportIds);

    if (houseError) {
      console.error(`${logPrefix}Failed to load matching houses for user:`, houseError);
      return {
        success: false,
        error: 'Failed to load matching house.',
      };
    }

    const houseBySport = new Map<string, string>();
    houseRows?.forEach((row: { id: string; sport_id: string }) => {
      if (row?.id && row?.sport_id) {
        houseBySport.set(row.sport_id, row.id);
      }
    });

    const poolEntries: string[] = [];
    for (const sportId of sportIds) {
      const houseId = houseBySport.get(sportId);
      if (houseId) {
        targetHouseIds.push(houseId);
      } else {
        const queueResult = await queueSportPendingEntry({
          userId,
          sportId,
          countryCode,
          metadata: {
            assignedVia,
            logPrefix: options.logPrefix ?? null,
          },
          client: adminClient,
        });
        if (queueResult.entryId) {
          poolEntries.push(queueResult.entryId);
        }
      }
    }

    if (!targetHouseIds.length) {
      return {
        success: true,
        updated: false,
        houseId: existingHouseId,
        reason: 'no_house_found',
        poolEntryId: poolEntries[0] ?? null,
      };
    }

    const { error: upsertError } = await adminClient
      .from('user_houses')
      .upsert(
        targetHouseIds.map((houseId) => ({
          user_id: userId,
          house_id: houseId,
          membership_role: 'MEMBER' as HouseMembershipRole,
          assigned_via: assignedVia,
        })),
        { onConflict: 'user_id,house_id,membership_role' },
      );

    if (upsertError) {
      console.error(`${logPrefix}Failed to upsert user_houses rows:`, upsertError);
      return {
        success: false,
        error: 'Failed to upsert membership rows.',
      };
    }

    const existingHouseIds = new Set(
      (membershipRows ?? []).map((row: { house_id?: string | null }) => row?.house_id).filter(Boolean),
    );
    const isUpdated = targetHouseIds.some((houseId) => !existingHouseIds.has(houseId));

    return {
      success: true,
      updated: isUpdated,
      houseId: targetHouseIds[0] ?? null,
      poolEntryId: poolEntries[0] ?? null,
    };
  } catch (err) {
    console.error('Unexpected error in syncUserHouseMembership:', err);
    return {
      success: false,
      error: 'Unexpected error syncing membership.',
    };
  }
}

export async function syncHouseMembersBySportCountry(
  houseId: string,
  sportId?: string | null,
  countryCode?: string | null,
  options: { logPrefix?: string; assignedVia?: HouseAssignmentSource } = {},
): Promise<SyncHouseMembersResult> {
  if (!adminClient) {
    return { success: false, attempted: 0, assigned: 0, reason: 'Supabase admin client unavailable.' };
  }
  if (!sportId || !countryCode) {
    return { success: false, attempted: 0, assigned: 0, reason: 'Missing sport or country context.' };
  }

  const logPrefix = options.logPrefix ? `[${options.logPrefix}] ` : '';
  const assignedVia = options.assignedVia ?? 'pool-auto';
  try {
    const upperCountry = countryCode.toUpperCase();
    const candidateIds = new Set<string>();

    const { data: primaryMatches, error: primaryError } = await adminClient
      .from('users')
      .select('id')
      .eq('sport_id', sportId)
      .eq('primary_country_code', upperCountry);

    if (primaryError) {
      console.error(`${logPrefix}Failed to load users for membership sync (primary fields):`, primaryError);
    } else {
      primaryMatches?.forEach((row: { id: string | null }) => {
        if (row?.id) candidateIds.add(row.id);
      });
    }

    const { data: secondaryMatches, error: secondaryError } = await adminClient
      .from('users')
      .select('id')
      .eq('primary_sport_id', sportId)
      .eq('primary_country_code', upperCountry);

    if (secondaryError) {
      console.error(`${logPrefix}Failed to load users for membership sync (secondary fields):`, secondaryError);
    } else {
      secondaryMatches?.forEach((row: { id: string | null }) => {
        if (row?.id) candidateIds.add(row.id);
      });
    }

    const legacyCountryName = getCountryName(upperCountry);
    if (legacyCountryName) {
      const { data: legacyMatches, error: legacyError } = await adminClient
        .from('users')
        .select('id')
        .eq('sport_id', sportId)
        .eq('country', legacyCountryName);

      if (legacyError) {
        console.error(`${logPrefix}Failed legacy user lookup for membership sync:`, legacyError);
      } else {
        legacyMatches?.forEach((row: { id: string | null }) => {
          if (row?.id) candidateIds.add(row.id);
        });
      }
    }

    if (!candidateIds.size) {
      return { success: true, attempted: 0, assigned: 0, reason: 'No matching users found.' };
    }

    const candidateList = Array.from(candidateIds);
    let assigned = 0;
    for (const userId of candidateList) {
      const result = await syncUserHouseMembership(userId, {
        assignedVia,
        logPrefix: `${logPrefix}house:${houseId}`,
      });
      if (result.success && result.houseId) {
        assigned += 1;
      } else if (!result.success) {
        console.error(`${logPrefix}Failed to sync membership for user ${userId}:`, result.error ?? result.reason);
      }
    }

    return { success: true, attempted: candidateList.length, assigned };
  } catch (error) {
    console.error(`${logPrefix}Unexpected error syncing members for house ${houseId}:`, error);
    return { success: false, attempted: 0, assigned: 0, reason: 'Unexpected error syncing memberships.' };
  }
}
