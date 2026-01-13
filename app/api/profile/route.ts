import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { awardXP } from '@/lib/xp';
import { getCountryCodeFromName } from '@/lib/countries';
import { syncUserHouseMembership } from '@/lib/user-houses';

const XP_REWARDS: Record<string, number> = {
  bio: 25,
  sports_role: 19,
  telegram: 19,
  dao1_did_nft: 33,
  wallet_address: 19,
  website: 0,
  youtube: 9,
  linkhub: 33,
  facebook: 9,
  instagram: 9
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updates, previousProfile } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    if (updates.bio && (updates.bio.length < 8 || updates.bio.length > 888)) {
      return NextResponse.json(
        { success: false, error: 'Bio must be between 8 and 888 characters' },
        { status: 400 }
      );
    }

    const updatesPayload = { ...(updates ?? {}) };
    if (updatesPayload.country && !updatesPayload.primary_country_code) {
      updatesPayload.primary_country_code =
        getCountryCodeFromName(updatesPayload.country) ??
        updatesPayload.country.trim().slice(0, 2).toUpperCase();
    }

    const { data, error } = await supabase
      .from('users')
      .update(updatesPayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    let totalXpAwarded = 0;

    for (const [field, xpReward] of Object.entries(XP_REWARDS)) {
      if (xpReward > 0) {
        const hadValue = previousProfile && previousProfile[field];
        const hasValue = updatesPayload[field];

        if (!hadValue && hasValue) {
          const xpResult = await awardXP(
            userId,
            `Added ${field} to profile`,
            xpReward,
            userId,
            'profile'
          );

          if (xpResult.success) {
            totalXpAwarded += xpReward;
          }
        }
      }
    }

    const membershipFields = ['country', 'primary_country_code', 'primary_sport_id', 'sport_id'];
    if (updatesPayload && membershipFields.some((field) => field in updatesPayload)) {
      try {
        await syncUserHouseMembership(userId, {
          assignedVia: 'signup-auto',
          logPrefix: 'profile:update',
          actorId: userId,
        });
      } catch (err) {
        console.error('[profile] Failed to sync house membership after profile update', err);
      }
    }

    return NextResponse.json({
      success: true,
      profile: data,
      xpAwarded: totalXpAwarded
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
