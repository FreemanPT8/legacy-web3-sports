import { supabaseAdmin } from '@/lib/supabase';

export type SportPoolType = 'no_sport' | 'sport_pending' | 'suggestion';

type SportPoolEntryPayload = {
  userId: string;
  sportId?: string | null;
  countryCode?: string | null;
  suggestedSportName?: string | null;
  suggestedCountryCode?: string | null;
  metadata?: Record<string, unknown>;
  note?: string | null;
};

function normalizeCountry(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2).toUpperCase();
}

export async function markUserRequiresAssignment(
  userId: string,
  note?: string | null,
  client: typeof supabaseAdmin | null = supabaseAdmin,
): Promise<boolean> {
  const admin = client ?? supabaseAdmin;
  if (!admin) return false;
  try {
    const { error } = await admin
      .from('users')
      .update({
        requires_sport_assignment: true,
        sport_assignment_notes: note ?? null,
      })
      .eq('id', userId);
    if (error) {
      console.error('[sport-pool] Failed to flag user assignment requirement', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[sport-pool] Unexpected error flagging assignment requirement', error);
    return false;
  }
}

export async function queueSportPendingEntry(
  payload: SportPoolEntryPayload & { actorId?: string | null; client?: typeof supabaseAdmin | null },
): Promise<{ entryId: string | null; created: boolean }> {
  const admin = payload.client ?? supabaseAdmin;
  if (!admin) return { entryId: null, created: false };

  const note =
    payload.note ??
      'Sem House ativa para este desporto e paÇðs. Entrada na pool de governaÇõÇœ aguardando criaÇõÇœo manual.';
  await markUserRequiresAssignment(payload.userId, note, admin);

  try {
    const normalizedCountry = normalizeCountry(payload.countryCode);
    const { data: existing, error: existingError } = await admin
      .from('sport_pool_entries')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('pool_type', 'sport_pending')
      .eq('status', 'pending')
      .eq('sport_id', payload.sportId ?? null)
      .eq('country_code', normalizedCountry)
      .maybeSingle();

    if (existingError) {
      console.error('[sport-pool] Failed to inspect existing pending entries', existingError);
    }

    if (existing?.id) {
      const { error: updateError } = await admin
        .from('sport_pool_entries')
        .update({
          sport_id: payload.sportId ?? null,
          country_code: normalizedCountry,
          notes: note,
          metadata: payload.metadata ?? {},
        })
        .eq('id', existing.id);
      if (updateError) {
        console.error('[sport-pool] Failed to update existing pool entry', updateError);
      }
      return { entryId: existing.id, created: false };
    }

    const insertPayload = {
      user_id: payload.userId,
      pool_type: 'sport_pending' as SportPoolType,
      status: 'pending',
      sport_id: payload.sportId ?? null,
      country_code: normalizedCountry,
      suggested_sport_name: payload.suggestedSportName ?? null,
      suggested_country_code: normalizeCountry(payload.suggestedCountryCode),
      metadata: payload.metadata ?? {},
      notes: note,
    };

    const { data: inserted, error: insertError } = await admin
      .from('sport_pool_entries')
      .insert(insertPayload)
      .select('id')
      .single();
    if (insertError) {
      console.error('[sport-pool] Failed to create sport pool entry', insertError);
      return { entryId: null, created: false };
    }

    return { entryId: (inserted?.id as string | null) ?? null, created: true };
  } catch (error) {
    console.error('[sport-pool] Unexpected error while queuing entry', error);
    return { entryId: null, created: false };
  }
}
