import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/auth';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { syncUserHouseMembership } from '@/lib/user-houses';
import { getCountryCodeFromName } from '@/lib/countries';
import { notifySportPoolEntry } from '@/lib/sport-pool-notifications';

const db = supabaseAdmin ?? supabase;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const authUser = await verifyAuth(authHeader);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { sportId } = body ?? {};

    if (!sportId || typeof sportId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Sport ID is required' },
        { status: 400 },
      );
    }

    const { data: sport, error: sportError } = await db
      .from('sports')
      .select('id, code, name_i18n')
      .eq('id', sportId)
      .maybeSingle();

    if (sportError) {
      console.error('[profile/sport] Failed to verify sport:', sportError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify sport' },
        { status: 500 },
      );
    }

    if (!sport) {
      return NextResponse.json(
        { success: false, error: 'Invalid sport selection' },
        { status: 400 },
      );
    }

    const { data: existingUser, error: fetchError } = await db
      .from('users')
      .select('id, sport_id, primary_sport_id, primary_country_code, country, email, full_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[profile/sport] Failed to load user:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to load profile' },
        { status: 500 },
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const currentPrimary = existingUser.sport_id ?? null;
    const currentSecondary = existingUser.primary_sport_id ?? null;

    if (sportId === currentPrimary || sportId === currentSecondary) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const updatePayload: Record<string, string> = {};
    if (!currentPrimary) {
      updatePayload.sport_id = sportId;
    } else if (!currentSecondary) {
      updatePayload.primary_sport_id = sportId;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Secondary sport already assigned. Contact support to change it.',
        },
        { status: 400 },
      );
    }

    const { error: updateError } = await db
      .from('users')
      .update(updatePayload)
      .eq('id', authUser.id);

    if (updateError) {
      console.error('[profile/sport] Failed to update user:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign sport' },
        { status: 500 },
      );
    }

    try {
      const syncResult = await syncUserHouseMembership(authUser.id, {
        assignedVia: 'PROFILE',
        logPrefix: 'profile:sport',
        actorId: authUser.id,
      });
      if (syncResult.reason === 'no_house_found' && syncResult.poolEntryId) {
        try {
          const { data: entryRow } = await db
            .from('sport_pool_entries')
            .select('metadata')
            .eq('id', syncResult.poolEntryId)
            .maybeSingle();
          const metadata = (entryRow?.metadata as Record<string, unknown> | null) ?? {};
          await db
            .from('sport_pool_entries')
            .update({ metadata: { ...metadata, source: 'profile' } })
            .eq('id', syncResult.poolEntryId);
        } catch (metadataError) {
          console.error('[profile/sport] Failed to tag pool entry metadata', metadataError);
        }
        const countryCode =
          existingUser.primary_country_code ??
          (existingUser.country ? getCountryCodeFromName(existingUser.country) : null) ??
          (existingUser.country ? existingUser.country.trim().slice(0, 2).toUpperCase() : null);
        const name_i18n = (sport?.name_i18n as Record<string, string> | null) ?? null;
        const sportName =
          name_i18n?.pt ||
          name_i18n?.en ||
          name_i18n?.es ||
          name_i18n?.fr ||
          name_i18n?.de ||
          name_i18n?.it ||
          (sport?.code as string | null) ||
          undefined;
        await notifySportPoolEntry({
          entryId: syncResult.poolEntryId,
          poolType: 'sport_pending',
          userEmail: authUser.email ?? existingUser.email ?? 'unknown',
          fullName: existingUser.full_name ?? authUser.username ?? undefined,
          country: existingUser.country ?? undefined,
          countryCode,
          sportId,
          sportName,
        });
      }
    } catch (error) {
      console.error('[profile/sport] Failed to sync house membership after sport update', error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[profile/sport] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
