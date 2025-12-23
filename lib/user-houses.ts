import { supabaseAdmin } from './supabase';

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
}

const DEFAULT_SOURCE: HouseAssignmentSource = 'PROFILE';

/**
 * Synchronizes user_houses rows (membership_role = 'MEMBER') with the primary sport/country stored on the user record.
 * - Removes previous MEMBER links that no longer match the current country/sport.
 * - Adds or updates the MEMBER link for the matching House, if it exists.
 */
export async function syncUserHouseMembership(
  userId: string,
  options: SyncUserHouseMembershipOptions = {},
): Promise<SyncUserHouseMembershipResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client is not configured.',
    };
  }

  try {
    const assignedVia = options.assignedVia ?? DEFAULT_SOURCE;
    const logPrefix = options.logPrefix ? `[${options.logPrefix}] ` : '';

    const { data: userRowRaw, error: userError } = await supabaseAdmin
      .from('users')
      .select('primary_country_code, primary_sport_id')
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

    const countryCode = userRow.primary_country_code
      ? userRow.primary_country_code.toUpperCase()
      : null;
    const sportId = userRow.primary_sport_id;

    const buildDeleteQuery = () =>
      supabaseAdmin
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

    const { data: membershipRows, error: membershipError } = await supabaseAdmin
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

    const { data: houseRowRaw, error: houseError } = await supabaseAdmin
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

    if (!houseRow) {
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
      houseRow.id,
    );
    if (deleteOthersError) {
      console.error(`${logPrefix}Failed to remove non-matching memberships:`, deleteOthersError);
      return {
        success: false,
        error: 'Failed to remove non-matching memberships.',
      };
    }

    const { error: upsertError } = await supabaseAdmin
      .from('user_houses')
      .upsert(
        [
          {
            user_id: userId,
            house_id: houseRow.id,
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
      updated: existingHouseId !== houseRow.id,
      houseId: houseRow.id,
    };
  } catch (err) {
    console.error('Unexpected error in syncUserHouseMembership:', err);
    return {
      success: false,
      error: 'Unexpected error syncing membership.',
    };
  }
}
