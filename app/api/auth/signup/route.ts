import { NextRequest, NextResponse } from 'next/server';

import { signUp, type SportSelectionMethod } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';
import { syncUserHouseMembership } from '@/lib/user-houses';
import { getCountryCodeFromName } from '@/lib/countries';
import { markUserRequiresAssignment, queueSportPendingEntry } from '@/lib/sport-pool';
import { notifySportPoolEntry } from '@/lib/sport-pool-notifications';

type PoolType = 'no_sport' | 'sport_pending' | 'suggestion';

function normalizeCountryCode(value?: string | null): string | null {
  if (!value) return null;
  return (
    getCountryCodeFromName(value) ??
    value.trim().slice(0, 2).toUpperCase()
  );
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
          assignedVia: 'signup-auto',
          logPrefix: 'signup',
          actorId: userId,
        });
        if (!syncResult.success || !syncResult.houseId) {
          const defaultNote =
            'Sem House ativa para este desporto e pa??s. Na fila para abertura.';
          const note =
            syncResult.reason && syncResult.reason !== 'no_house_found'
              ? syncResult.reason
              : defaultNote;
          let entryId = syncResult.poolEntryId ?? null;

          if (syncResult.reason === 'no_house_found') {
            if (!entryId) {
              const queueResult = await queueSportPendingEntry({
                userId,
                sportId: sport_id,
                countryCode: normalizedCountryCode,
                metadata: { source: 'signup' },
                note: defaultNote,
              });
              entryId = queueResult.entryId;
            }
          } else {
            await markUserRequiresAssignment(userId, note);
            entryId = await upsertSportPoolEntry({
              user_id: userId,
              pool_type: 'sport_pending',
              sport_id,
              country_code: normalizedCountryCode,
              notes: note,
            });
          }

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
