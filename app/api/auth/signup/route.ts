import { NextRequest, NextResponse } from 'next/server';

import { signUp, type SportSelectionMethod } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';
import { syncUserHouseMembership } from '@/lib/user-houses';
import { getCountryCodeFromName } from '@/lib/countries';

type PoolType = 'no_sport' | 'sport_pending' | 'suggestion';

function normalizeCountryCode(value?: string | null): string | null {
  if (!value) return null;
  return (
    getCountryCodeFromName(value) ??
    value.trim().slice(0, 2).toUpperCase()
  );
}

async function markUserRequiresAssignment(userId: string, note?: string | null) {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      requires_sport_assignment: true,
      sport_assignment_notes: note ?? null,
    })
    .eq('id', userId);
  if (error) {
    console.error('[signup] Failed to update requires_sport_assignment:', error);
  }
}

async function upsertSportPoolEntry(payload: {
  user_id: string;
  pool_type: PoolType;
  sport_id?: string | null;
  country_code?: string | null;
  suggested_sport_name?: string | null;
  suggested_country_code?: string | null;
  metadata?: Record<string, unknown>;
  notes?: string | null;
}): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const entry = {
    user_id: payload.user_id,
    pool_type: payload.pool_type,
    sport_id: payload.sport_id ?? null,
    country_code: payload.country_code ?? null,
    suggested_sport_name: payload.suggested_sport_name ?? null,
    suggested_country_code: payload.suggested_country_code ?? null,
    metadata: payload.metadata ?? {},
    notes: payload.notes ?? null,
  };
  const { data, error } = await supabaseAdmin
    .from('sport_pool_entries')
    .insert(entry)
    .select('id')
    .single();
  if (error) {
    console.error('[signup] Failed to insert sport_pool_entry:', error);
    return null;
  }
  return (data?.id as string | null) ?? null;
}

async function fetchSuperAdminIds(): Promise<string[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin.from('users').select('id').eq('role', 'Super Admin');
    if (error) throw error;
    return (data ?? []).map((row: { id: string }) => row.id);
  } catch (error) {
    console.error('[signup] Failed to load Super Admins for notifications:', error);
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
    console.error('[signup] Failed to resolve Head users for sport notifications:', error);
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
    console.error('[signup] Failed to resolve sport name for notifications:', error);
    return null;
  }
}

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

async function notifySportPoolEntry(payload: PoolNotificationPayload) {
  if (!supabaseAdmin) return;
  try {
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
        ? 'Sugestão de desporto'
        : payload.poolType === 'sport_pending'
        ? 'Desporto sem House'
        : 'Sem desporto definido';
    const titleParts = [poolLabel, sportInfo?.name ? `· ${sportInfo.name}` : null, payload.countryCode ? `· ${payload.countryCode}` : null]
      .filter(Boolean)
      .join(' ');

    let message: string;
    if (payload.poolType === 'suggestion') {
      message = `${baseName} sugeriu o desporto "${payload.suggestedSportName ?? 'Novo desporto'}"${
        payload.suggestedCountryCode ? ` para ${payload.suggestedCountryCode}` : ''
      }. Conta aguardando criação de desporto/House.`;
    } else if (payload.poolType === 'sport_pending') {
      const sportLabel = sportInfo?.name ?? 'Desporto';
      message = `${baseName} (${payload.userEmail}) escolheu ${sportLabel}${
        payload.country ? ` para ${payload.country}` : ''
      }, mas não existe House disponível.`;
    } else {
      message = `${baseName} (${payload.userEmail}) entrou sem desporto definido e aguarda atribuição manual.`;
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
  } catch (error) {
    console.error('[signup] Failed to create sport pool notifications:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      username,
      full_name,
      email,
      password,
      country,
      sport_id,
      sport_selection_method,
      allow_random_assignment,
      suggested_sport_name,
      suggested_country_code,
    } = body;

    if (!username || !full_name || !email || !password || !country) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 },
      );
    }

    const normalizedMethod =
      (sport_selection_method as SportSelectionMethod) ?? 'chosen';
    const allowedMethods: SportSelectionMethod[] = [
      'chosen',
      'random_pool',
      'suggested_pool',
    ];
    const selectionMethod = allowedMethods.includes(normalizedMethod)
      ? normalizedMethod
      : 'chosen';
    const normalizedCountryCode = normalizeCountryCode(country);
    const normalizedSuggestedCountry =
      normalizeCountryCode(suggested_country_code ?? country) ?? null;
    const trimmedSuggestion =
      typeof suggested_sport_name === 'string'
        ? suggested_sport_name.trim()
        : '';

    if (
      selectionMethod === 'chosen' &&
      (!sport_id || typeof sport_id !== 'string')
    ) {
      return NextResponse.json(
        { success: false, error: 'sport_id is required for chosen sport.' },
        { status: 400 },
      );
    }

    if (selectionMethod === 'random_pool' && !allow_random_assignment) {
      return NextResponse.json(
        { success: false, error: 'Random assignment consent is required.' },
        { status: 400 },
      );
    }

    if (selectionMethod === 'suggested_pool' && !trimmedSuggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggested sport name is required.' },
        { status: 400 },
      );
    }

    const requiresAssignment = selectionMethod !== 'chosen';

    const result = await signUp({
      username,
      full_name,
      email,
      password,
      country,
      sport_id: selectionMethod === 'chosen' ? sport_id : null,
      sport_selection_method: selectionMethod,
      requires_sport_assignment: requiresAssignment,
      sport_assignment_notes: requiresAssignment
        ? selectionMethod === 'random_pool'
          ? 'Aguardando atribuição aleatória de desporto.'
          : selectionMethod === 'suggested_pool'
          ? 'Aguardando criação do desporto sugerido.'
          : null
        : null,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    if (result.user) {
      const userId = result.user.id;
      const userEmail = result.user.email;

      if (selectionMethod === 'chosen' && sport_id) {
        const syncResult = await syncUserHouseMembership(userId, {
          assignedVia: 'ONBOARDING',
          logPrefix: 'signup',
        });
        if (!syncResult.success || !syncResult.houseId) {
          const note =
            syncResult.reason ??
            'Sem House ativa para este desporto e país. Na fila para abertura.';
          await markUserRequiresAssignment(userId, note);
          const entryId = await upsertSportPoolEntry({
            user_id: userId,
            pool_type: 'sport_pending',
            sport_id,
            country_code: normalizedCountryCode,
            notes: note,
          });
          await notifySportPoolEntry({
            entryId,
            poolType: 'sport_pending',
            sportId: sport_id,
            countryCode: normalizedCountryCode,
            userEmail: userEmail ?? email,
            fullName: full_name,
            country,
          });
        }
      } else if (selectionMethod === 'random_pool') {
        const note =
          'Conta registada sem desporto preferido. Aguardando atribuição manual.';
        await markUserRequiresAssignment(userId, note);
        const entryId = await upsertSportPoolEntry({
          user_id: userId,
          pool_type: 'no_sport',
          country_code: normalizedCountryCode,
          notes: note,
          metadata: { allowRandomAssignment: Boolean(allow_random_assignment) },
        });
        await notifySportPoolEntry({
          entryId,
          poolType: 'no_sport',
          userEmail: userEmail ?? email,
          fullName: full_name,
          country,
          countryCode: normalizedCountryCode,
        });
      } else if (selectionMethod === 'suggested_pool') {
        const note = `Sugestão de novo desporto: ${trimmedSuggestion}`;
        await markUserRequiresAssignment(userId, note);
        const entryId = await upsertSportPoolEntry({
          user_id: userId,
          pool_type: 'suggestion',
          country_code: normalizedCountryCode,
          suggested_sport_name: trimmedSuggestion,
          suggested_country_code: normalizedSuggestedCountry,
          notes: note,
        });
        await notifySportPoolEntry({
          entryId,
          poolType: 'suggestion',
          userEmail: userEmail ?? email,
          fullName: full_name,
          country,
          countryCode: normalizedSuggestedCountry ?? normalizedCountryCode,
          suggestedSportName: trimmedSuggestion,
          suggestedCountryCode: normalizedSuggestedCountry,
        });
      }

      if (userEmail) {
        try {
          const payload: Record<string, unknown> = { user_id: userId, sport_id };
          const { error: linkError } = await supabaseAdmin
            .from('onboarding_submissions')
            .update(payload)
            .is('user_id', null)
            .eq('email', userEmail);

          if (linkError) {
            console.error('Failed to backfill onboarding_submissions.user_id:', linkError);
          }
        } catch (linkErr) {
          console.error('Unexpected error while linking onboarding submissions to user:', linkErr);
        }
      }

      try {
        const welcomeEmail = getWelcomeEmailTemplate(result.user.username, result.user.email);
        await sendEmail(welcomeEmail);
      } catch (err) {
        console.error('Failed to send welcome email:', err);
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Signup POST /api/auth/signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
