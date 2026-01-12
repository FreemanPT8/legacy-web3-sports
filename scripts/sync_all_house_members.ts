import { supabaseAdmin } from '../lib/supabase';
import { syncHouseMembersBySportCountry } from '../lib/user-houses';

type HouseRow = {
  id: string;
  sport_id: string | null;
  country_code: string | null;
  house_key: string | null;
};

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured. Cannot sync memberships.');
  }

  console.log('--- Syncing members for all existing Houses ---');

  const { data: housesData, error: housesError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, sport_id, country_code, house_key')
    .order('created_at', { ascending: true });

  if (housesError) {
    throw housesError;
  }

  const houses = (housesData ?? []) as HouseRow[];
  let processed = 0;
  let assignedTotal = 0;

  for (const house of houses) {
    processed += 1;
    const logPrefix = `script:sync:${house.house_key ?? house.id}`;
    if (!house.sport_id || !house.country_code) {
      console.log(`[skip] ${logPrefix} missing sport/country context.`);
      continue;
    }

    try {
      const result = await syncHouseMembersBySportCountry(
        house.id,
        house.sport_id,
        house.country_code,
        { logPrefix },
      );
      assignedTotal += result.assigned;
      console.log(
        `[done] ${logPrefix} - attempted ${result.attempted} users, assigned ${result.assigned}, reason: ${result.reason ?? 'ok'
        }`,
      );
    } catch (error) {
      console.error(`[error] ${logPrefix} failed`, error);
    }
  }

  console.log(
    `--- Completed sync for ${processed} houses. Total new memberships assigned: ${assignedTotal}. ---`,
  );
}

main().catch((error) => {
  console.error('[fatal] Failed to sync all houses', error);
  process.exitCode = 1;
});
