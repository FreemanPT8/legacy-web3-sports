import { supabaseAdmin } from './supabase';
import { getCountryCodeFromName, getCountryName } from './countries';
import { ensureHouseForSportCountry, EnsureHouseError } from './houses/creation';
import { logHouseHistory } from './houses/history';

export type HouseMembershipRole = 'HEAD' | 'MODERATOR' | 'MEMBER';
export type HouseAssignmentSource =
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
  error?: string;
}

export interface SyncUserHouseMembershipOptions {
  assignedVia?: HouseAssignmentSource;
  logPrefix?: string;
  actorId?: string | null;
  autoCreateHouse?: boolean;
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

let ensureHouseHandler = ensureHouseForSportCountry;

export function __setEnsureHouseForTests(handler?: typeof ensureHouseForSportCountry) {
  ensureHouseHandler = handler ?? ensureHouseForSportCountry;
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

const DEFAULT_SOURCE: HouseAssignmentSource = 'PROFILE';
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
 * Synchronizes user_houses rows (membership_role = 'MEMBER') with the primary sport/country stored on the user record.
 * - Removes previous MEMBER links that no longer match the current country/sport.
 * - Adds or updates the MEMBER link for the matching House, if it exists.
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
    const sportId = userRow.primary_sport_id ?? userRow.sport_id ?? null;

    const buildDeleteQuery = () =>
      adminClient
        .from('user_houses')
        .delete()
        .eq('user_id', userId)
        .eq('membership_role', 'MEMBER');

    // If we have a potential target house we only delete rows that do not match it.
    let existingHouseId: string | null = null;

    if (!countryCode || !sportId) {
      const { error: cleanupError } = await buildDeleteQuery();
      if (cleanupError) {
        console.error(`${logPrefix}Failed to remove stale user_houses entries:`, cleanupError);
        return {
          success: false,
          error: 'Failed to clean up previous memberships.',
        };
      }

      return {
        success: true,
        updated: true,
        houseId: null,
        reason: 'User is missing primary sport or country; membership removed.',
      };
    }

    const actorId = options.actorId ?? userId;
    const allowAutoCreation = options.autoCreateHouse !== false;
    let ensuredHouseId: string | null = null;

    if (allowAutoCreation) {
      try {
        const ensureResult = await ensureHouseHandler({
          sportId,
          countryCode,
          actorId,
        });
        ensuredHouseId = ensureResult.houseId;

        if (ensureResult.created) {
          await logHouseHistory({
            houseId: ensureResult.houseId,
            actorId,
            action: 'house.auto_created',
            payload: {
              sport_id: sportId,
              country_code: ensureResult.countryCode,
              source: assignedVia,
            },
          });

          const backgroundLog = options.logPrefix
            ? `${options.logPrefix}:auto-house`
            : 'auto-house';
          const backgroundSync = getBackgroundSyncHandler();
          backgroundSync(
            ensureResult.houseId,
            sportId,
            ensureResult.countryCode,
            { logPrefix: backgroundLog },
          ).catch((error) => {
            console.error(
              `${logPrefix}Failed to sync auto-created house members:`,
              error,
            );
          });
        }
      } catch (error: any) {
        if (error instanceof EnsureHouseError) {
          if (error.code === 'sport_not_found') {
            return {
              success: false,
              error: 'Sport not found while ensuring target house.',
            };
          }
          if (error.code === 'invalid_input') {
            return {
              success: false,
              error: 'Invalid data while ensuring target house.',
            };
          }
        }

        console.error(`${logPrefix}Failed to ensure matching house for user:`, error);
        return {
          success: false,
          error: 'Failed to ensure matching house.',
        };
      }
    }

    const rpcResult = await syncMembershipViaRpc(userId, sportId, countryCode);
    if (rpcResult) {
      return rpcResult;
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

    let targetHouseId = ensuredHouseId;

    if (!targetHouseId) {
      const { data: houseRowRaw, error: houseError } = await adminClient
        .from('houses_of_sports')
        .select('id')
        .eq('sport_id', sportId)
        .eq('country_code', countryCode)
        .limit(1)
        .maybeSingle();

      const houseRow = (houseRowRaw ?? null) as HouseRow | null;

      if (houseError) {
        console.error(`${logPrefix}Failed to load matching house for user:`, houseError);
        return {
          success: false,
          error: 'Failed to load matching house.',
        };
      }

      if (houseRow) {
        targetHouseId = houseRow.id;
      }
    }

    if (!targetHouseId) {
      const { error: cleanupError } = await buildDeleteQuery();
      if (cleanupError) {
        console.error(`${logPrefix}Failed to clean up memberships for unmatched house:`, cleanupError);
        return {
          success: false,
          error: 'Failed to clean up previous memberships.',
        };
      }

      return {
        success: true,
        updated: true,
        houseId: null,
        reason: 'No matching house found for the current sport/country.',
      };
    }

    const { error: deleteOthersError } = await buildDeleteQuery().neq(
      'house_id',
      targetHouseId,
    );
    if (deleteOthersError) {
      console.error(`${logPrefix}Failed to remove non-matching memberships:`, deleteOthersError);
      return {
        success: false,
        error: 'Failed to remove non-matching memberships.',
      };
    }

    const { error: upsertError } = await adminClient
      .from('user_houses')
      .upsert(
        [
          {
            user_id: userId,
            house_id: targetHouseId,
            membership_role: 'MEMBER' as HouseMembershipRole,
            assigned_via: assignedVia,
          },
        ],
        { onConflict: 'user_id,house_id,membership_role' },
      );

    if (upsertError) {
      console.error(`${logPrefix}Failed to upsert user_houses row:`, upsertError);
      return {
        success: false,
        error: 'Failed to upsert membership row.',
      };
    }

    return {
      success: true,
      updated: existingHouseId !== targetHouseId,
      houseId: targetHouseId,
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
  options: { logPrefix?: string } = {},
): Promise<SyncHouseMembersResult> {
  if (!adminClient) {
    return { success: false, attempted: 0, assigned: 0, reason: 'Supabase admin client unavailable.' };
  }
  if (!sportId || !countryCode) {
    return { success: false, attempted: 0, assigned: 0, reason: 'Missing sport or country context.' };
  }

  const logPrefix = options.logPrefix ? `[${options.logPrefix}] ` : '';
  try {
    const upperCountry = countryCode.toUpperCase();
    const candidateIds = new Set<string>();

    const { data: primaryMatches, error: primaryError } = await adminClient
      .from('users')
      .select('id')
      .eq('primary_sport_id', sportId)
      .eq('primary_country_code', upperCountry);

    if (primaryError) {
      console.error(`${logPrefix}Failed to load users for membership sync (primary fields):`, primaryError);
    } else {
      primaryMatches?.forEach((row: { id: string | null }) => {
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
        assignedVia: 'ADMIN_SYNC',
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
