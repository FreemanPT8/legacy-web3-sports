import { supabaseAdmin } from '../lib/supabase';

const BATCH_SIZE = 200;

type PoolEntryRow = {
  id: string;
  metadata: Record<string, unknown> | null;
};

async function main() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  const { data, error } = await supabaseAdmin
    .from('sport_pool_entries')
    .select('id, metadata');

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PoolEntryRow[];
  const toUpdate = rows
    .filter((row) => {
      const metadata = row.metadata ?? {};
      return !metadata.source;
    })
    .map((row) => {
      const metadata = row.metadata ?? {};
      return {
        id: row.id,
        metadata: { ...metadata, source: 'unknown' },
      };
    });

  if (toUpdate.length === 0) {
    console.log('[info] No pool entries missing source metadata.');
    return;
  }

  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    const { error: updateError } = await supabaseAdmin
      .from('sport_pool_entries')
      .upsert(batch, { onConflict: 'id' });
    if (updateError) {
      throw updateError;
    }
    updated += batch.length;
  }

  console.log(`[done] Updated ${updated} pool entries with source metadata.`);
}

main().catch((err) => {
  console.error('[fatal] tag_pool_entry_sources failed', err);
  process.exit(1);
});
