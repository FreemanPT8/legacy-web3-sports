import { supabaseAdmin } from '../lib/supabase';
import { ensureHouseForSportCountry } from '../lib/houses/creation';
import { syncUserHouseMembership } from '../lib/user-houses';

type SportPoolEntry = {
  id: string;
  user_id: string | null;
  sport_id: string | null;
  country_code: string | null;
  status: string;
  pool_type: string;
};

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  const { data: entries, error } = await supabaseAdmin
    .from('sport_pool_entries')
    .select('id, user_id, sport_id, country_code, status, pool_type')
    .eq('pool_type', 'sport_pending')
    .eq('status', 'pending');

  if (error) {
    throw error;
  }

  const pending = (entries ?? []) as SportPoolEntry[];
  console.log(`[info] Found ${pending.length} pending sport assignments.`);

  let assigned = 0;

  for (const entry of pending) {
    if (!entry.user_id || !entry.sport_id || !entry.country_code) {
      console.warn(`[skip] Entry ${entry.id} missing user, sport or country.`);
      continue;
    }

    try {
      const ensureResult = await ensureHouseForSportCountry({
        sportId: entry.sport_id,
        countryCode: entry.country_code,
        actorId: null,
      });

      const syncResult = await syncUserHouseMembership(entry.user_id, {
        assignedVia: 'ADMIN_SYNC',
        logPrefix: 'sport-pool-script',
        actorId: null,
      });

      if (!syncResult.success || !syncResult.houseId) {
        console.warn(
          `[skip] Failed to sync membership for entry ${entry.id}:`,
          syncResult.error ?? syncResult.reason ?? 'unknown',
        );
        continue;
      }

      const now = new Date().toISOString();
      await supabaseAdmin
        .from('sport_pool_entries')
        .update({
          status: 'assigned',
          house_id: ensureResult.houseId,
          sport_id: entry.sport_id,
          country_code: ensureResult.countryCode,
          assigned_at: now,
          updated_at: now,
          notes: 'Processado automaticamente pelo script de backlog.',
        })
        .eq('id', entry.id);

      await supabaseAdmin
        .from('users')
        .update({
          requires_sport_assignment: false,
          sport_assignment_notes: null,
        })
        .eq('id', entry.user_id);

      assigned += 1;
      console.log(
        `[done] Entry ${entry.id} linked to house ${ensureResult.houseId} for user ${entry.user_id}.`,
      );
    } catch (err) {
      console.error(`[error] Failed to process entry ${entry.id}:`, err);
    }
  }

  console.log(`[summary] Assigned ${assigned} of ${pending.length} pending entries.`);
}

main().catch((error) => {
  console.error('[fatal] sport pool processing failed', error);
  process.exit(1);
});
