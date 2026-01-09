import { supabaseAdmin } from '@/lib/supabase';

type HistoryPayload = Record<string, unknown>;

type LogParams = {
  houseId: string;
  action: string;
  payload?: HistoryPayload;
  actorId?: string | null;
};

export async function logHouseHistory({ houseId, action, payload = {}, actorId = null }: LogParams) {
  if (!supabaseAdmin) return;
  if (!houseId || !action) return;
  try {
    await supabaseAdmin.from('house_history').insert({
      house_id: houseId,
      action,
      payload,
      created_by: actorId,
    });
  } catch (error) {
    console.error('[house_history] failed to log action', action, error);
  }
}
