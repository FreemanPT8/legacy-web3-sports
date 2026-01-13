import { supabaseAdmin } from '@/lib/supabase';

export type PoolType = 'no_sport' | 'sport_pending' | 'suggestion';

type PoolNotificationPayload = {
  entryId?: string | null;
  poolType: PoolType;
  userEmail: string;
  fullName?: string;
  country?: string;
  countryCode?: string | null;
  sportId?: string | null;
  sportName?: string | null;
  suggestedSportName?: string | null;
  suggestedCountryCode?: string | null;
};

async function fetchSuperAdminIds(): Promise<string[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin.from('users').select('id').eq('role', 'Super Admin');
    if (error) throw error;
    return (data ?? []).map((row: { id: string }) => row.id);
  } catch (error) {
    console.error('[sport-pool] Failed to load Super Admins for notifications:', error);
    return [];
  }
}

async function fetchHeadUserIdsForSport(sportId: string): Promise<string[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data: houses, error: housesError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('sport_id', sportId);
    if (housesError) throw housesError;
    const houseIds = (houses ?? []).map((row: { id: string }) => row.id);
    if (!houseIds.length) return [];

    const { data: heads, error: headsError } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .in('house_id', houseIds);
    if (headsError) throw headsError;
    const adminIds = (heads ?? []).map((row: { admin_id: string }) => row.admin_id);
    if (!adminIds.length) return [];

    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('admin_assignments')
      .select('user_id')
      .in('id', adminIds);
    if (assignmentError) throw assignmentError;
    return (assignments ?? [])
      .map((row: { user_id: string | null }) => row.user_id)
      .filter((value: string | null): value is string => Boolean(value));
  } catch (error) {
    console.error('[sport-pool] Failed to resolve Head users for notifications:', error);
    return [];
  }
}

async function resolveSportInfo(sportId: string): Promise<{ name: string; code: string | null } | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('sports')
      .select('code, name_i18n')
      .eq('id', sportId)
      .maybeSingle();
    if (error || !data) return null;
    const name_i18n = (data.name_i18n as Record<string, string> | null) ?? null;
    const fallback = (data.code as string | null) ?? 'Sport';
    const localizedName =
      name_i18n?.pt ||
      name_i18n?.en ||
      name_i18n?.es ||
      name_i18n?.fr ||
      name_i18n?.de ||
      name_i18n?.it ||
      fallback;
    return { name: localizedName, code: (data.code as string | null) ?? null };
  } catch (error) {
    console.error('[sport-pool] Failed to resolve sport name for notifications:', error);
    return null;
  }
}

export async function notifySportPoolEntry(payload: PoolNotificationPayload) {
  if (!supabaseAdmin) return;
  try {
    if (payload.entryId) {
      const { data: entryRow, error: entryError } = await supabaseAdmin
        .from('sport_pool_entries')
        .select('metadata, status')
        .eq('id', payload.entryId)
        .maybeSingle();
      if (entryError) {
        console.error('[sport-pool] Failed to load pool entry metadata', entryError);
      } else {
        const metadata = (entryRow?.metadata as Record<string, unknown> | null) ?? null;
        const status = (entryRow as { status?: string | null } | null)?.status ?? null;
        if (status && status !== 'pending') {
          return;
        }
        if (metadata?.notified_at) {
          return;
        }
      }
    }

    const recipientIds = new Set<string>();
    const superAdmins = await fetchSuperAdminIds();
    superAdmins.forEach((id) => recipientIds.add(id));

    if (payload.sportId) {
      const heads = await fetchHeadUserIdsForSport(payload.sportId);
      heads.forEach((id) => recipientIds.add(id));
    }

    if (!recipientIds.size) return;

    let sportInfo = payload.sportName
      ? { name: payload.sportName, code: null }
      : payload.sportId
      ? await resolveSportInfo(payload.sportId)
      : null;
    if (!sportInfo && payload.sportName) {
      sportInfo = { name: payload.sportName, code: null };
    }

    const baseName = payload.fullName?.trim() || payload.userEmail;
    const poolLabel =
      payload.poolType === 'suggestion'
        ? 'SugestÇœo de desporto'
        : payload.poolType === 'sport_pending'
        ? 'Desporto sem House'
        : 'Sem desporto definido';
    const titleParts = [poolLabel, sportInfo?.name ? `¶ú ${sportInfo.name}` : null, payload.countryCode ? `¶ú ${payload.countryCode}` : null]
      .filter(Boolean)
      .join(' ');

    let message: string;
    if (payload.poolType === 'suggestion') {
      message = `${baseName} sugeriu o desporto "${payload.suggestedSportName ?? 'Novo desporto'}"${
        payload.suggestedCountryCode ? ` para ${payload.suggestedCountryCode}` : ''
      }. Conta aguardando criaÇõÇœo de desporto/House.`;
    } else if (payload.poolType === 'sport_pending') {
      const sportLabel = sportInfo?.name ?? 'Desporto';
      message = `${baseName} (${payload.userEmail}) escolheu ${sportLabel}${
        payload.country ? ` para ${payload.country}` : ''
      }, mas nÇœo existe House disponÇðvel.`;
    } else {
      message = `${baseName} (${payload.userEmail}) entrou sem desporto definido e aguarda atribuiÇõÇœo manual.`;
    }

    const rows = Array.from(recipientIds).map((userId) => ({
      user_id: userId,
      type: 'system',
      title: titleParts || poolLabel,
      message,
      link: '/admin/houses/pools',
      data: {
        poolType: payload.poolType,
        entryId: payload.entryId ?? null,
        sportId: payload.sportId ?? null,
        sportName: sportInfo?.name ?? payload.sportName ?? null,
        country: payload.country ?? null,
        countryCode: payload.countryCode ?? null,
        suggestedSportName: payload.suggestedSportName ?? null,
        userEmail: payload.userEmail,
      },
    }));
    await supabaseAdmin.from('notifications').insert(rows);

    if (payload.entryId) {
      const { data: entryRow, error: entryError } = await supabaseAdmin
        .from('sport_pool_entries')
        .select('metadata, status')
        .eq('id', payload.entryId)
        .maybeSingle();
      if (entryError) {
        console.error('[sport-pool] Failed to reload pool entry metadata', entryError);
      } else {
        const metadata = (entryRow?.metadata as Record<string, unknown> | null) ?? {};
        const status = (entryRow as { status?: string | null } | null)?.status ?? null;
        if (status && status !== 'pending') {
          return;
        }
        const nextMetadata = { ...metadata, notified_at: new Date().toISOString() };
        const { error: updateError } = await supabaseAdmin
          .from('sport_pool_entries')
          .update({ metadata: nextMetadata })
          .eq('id', payload.entryId);
        if (updateError) {
          console.error('[sport-pool] Failed to update pool entry metadata', updateError);
        }
      }
    }
  } catch (error) {
    console.error('[sport-pool] Failed to create sport pool notifications:', error);
  }
}
