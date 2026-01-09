import { supabaseAdmin } from '@/lib/supabase';

/**
 * Returns the list of house IDs where the given user acts as Head.
 */
export async function getHouseHeadHouseIds(userId?: string | null): Promise<string[]> {
  if (!userId || !supabaseAdmin) return [];

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('admin_assignments')
    .select('id')
    .eq('user_id', userId);
  if (assignmentsError) throw assignmentsError;

  const adminIds = (assignments ?? []).map((row: { id: string }) => row.id);
  if (!adminIds.length) return [];

  const { data: headRows, error: headError } = await supabaseAdmin
    .from('house_heads')
    .select('house_id')
    .in('admin_id', adminIds);
  if (headError && headError.code !== 'PGRST116') throw headError;

  return (headRows ?? []).map((row: { house_id: string }) => row.house_id);
}
