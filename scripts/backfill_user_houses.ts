import { supabaseAdmin } from '../lib/supabase';
import { ensureHouseForSportCountry } from '../lib/houses/creation';

type HouseRow = {
  id: string;
  sport_id: string;
  country_code: string | null;
};

type HouseHeadRow = {
  house_id: string;
  admin_id: string;
};

type AdminAssignmentRow = {
  id: string;
  user_id: string;
};

type HouseModeratorRow = {
  house_id: string;
  user_id: string;
};

type UserProfileRow = {
  id: string;
  primary_country_code: string | null;
  primary_sport_id: string | null;
};

type UserHouseInsert = {
  user_id: string;
  house_id: string;
  membership_role: 'HEAD' | 'MODERATOR' | 'MEMBER';
  assigned_via: 'ADMIN_SYNC' | 'SCRIPT';
};

const BATCH_SIZE = 500;

async function chunkedUpsert(rows: UserHouseInsert[], label: string) {
  if (rows.length === 0) {
    console.log(`[skip] No ${label} rows to upsert.`);
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const slice = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('user_houses')
      .upsert(slice, { onConflict: 'user_id,house_id,membership_role' });

    if (error) {
      console.error(`[error] Failed to upsert ${label} batch (offset ${i}):`, error);
      throw error;
    }
  }

  console.log(`[done] Upserted ${rows.length} ${label} rows.`);
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  console.log('--- Backfill user_houses ---');

  const { data: housesData, error: housesError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, sport_id, country_code');

  if (housesError) {
    throw housesError;
  }

  const houses = (housesData ?? []) as HouseRow[];
  const houseByKey = new Map<string, HouseRow>();

  houses.forEach((house) => {
    const key = `${house.sport_id}:${(house.country_code || '').toUpperCase()}`;
    houseByKey.set(key, house);
  });

  console.log(`[info] Loaded ${houses.length} houses.`);

  const { data: headRows, error: headError } = await supabaseAdmin
    .from('house_heads')
    .select('house_id, admin_id');

  if (headError) {
    throw headError;
  }

  const heads = (headRows ?? []) as HouseHeadRow[];
  const adminIds = Array.from(new Set(heads.map((head) => head.admin_id)));

  const { data: assignmentsData, error: assignmentsError } =
    adminIds.length > 0
      ? await supabaseAdmin
          .from('admin_assignments')
          .select('id, user_id')
          .in('id', adminIds)
      : { data: [], error: null };

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignments = (assignmentsData ?? []) as AdminAssignmentRow[];
  const adminToUser = new Map<string, string>();
  assignments.forEach((assignment) => {
    if (assignment.user_id) {
      adminToUser.set(assignment.id, assignment.user_id);
    }
  });

  const headRowsToInsert: UserHouseInsert[] = heads
    .map((head) => {
      const userId = adminToUser.get(head.admin_id);
      if (!userId) return null;
      return {
        user_id: userId,
        house_id: head.house_id,
        membership_role: 'HEAD',
        assigned_via: 'ADMIN_SYNC',
      } as UserHouseInsert;
    })
    .filter(Boolean) as UserHouseInsert[];

  await chunkedUpsert(headRowsToInsert, 'HEAD');

  const { data: moderatorsData, error: moderatorsError } = await supabaseAdmin
    .from('house_moderators')
    .select('house_id, user_id');

  if (moderatorsError) {
    throw moderatorsError;
  }

  const moderators = (moderatorsData ?? []) as HouseModeratorRow[];

  const moderatorRowsToInsert: UserHouseInsert[] = moderators
    .filter((row) => !!row.user_id)
    .map((row) => ({
      user_id: row.user_id,
      house_id: row.house_id,
      membership_role: 'MODERATOR',
      assigned_via: 'ADMIN_SYNC',
    }));

  await chunkedUpsert(moderatorRowsToInsert, 'MODERATOR');

  const { data: memberCandidatesData, error: memberCandidatesError } =
    await supabaseAdmin
      .from('users')
      .select('id, primary_country_code, primary_sport_id')
      .not('primary_country_code', 'is', null)
      .not('primary_sport_id', 'is', null);

  if (memberCandidatesError) {
    throw memberCandidatesError;
  }

  const memberCandidates = (memberCandidatesData ?? []) as UserProfileRow[];
  const memberRows: UserHouseInsert[] = [];
  let skippedMembers = 0;

  for (const user of memberCandidates) {
    const countryCode = user.primary_country_code?.toUpperCase();
    const sportId = user.primary_sport_id;

    if (!countryCode || !sportId) {
      skippedMembers += 1;
      continue;
    }

    const key = `${sportId}:${countryCode}`;
    let house = houseByKey.get(key);

    if (!house) {
      try {
        const ensureResult = await ensureHouseForSportCountry({
          sportId,
          countryCode,
          actorId: null,
        });
        house = {
          id: ensureResult.houseId,
          sport_id: sportId,
          country_code: ensureResult.countryCode,
        };
        houseByKey.set(`${sportId}:${ensureResult.countryCode}`, house);
        if (ensureResult.countryCode !== countryCode) {
          houseByKey.set(`${sportId}:${countryCode}`, house);
        }
      } catch (error) {
        console.error(`[backfill] Failed to ensure house for ${key}:`, error);
        skippedMembers += 1;
        continue;
      }
    }

    memberRows.push({
      user_id: user.id,
      house_id: house.id,
      membership_role: 'MEMBER',
      assigned_via: 'SCRIPT',
    });
  }

  await chunkedUpsert(memberRows, 'MEMBER');

  console.log(`[info] Skipped ${skippedMembers} member rows without a valid house.`);
  console.log('--- Backfill completed ---');
}

main()
  .then(() => {
    console.log('All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
