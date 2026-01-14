import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { awardXP } from '@/lib/xp';
import { requireAuth } from '@/lib/middleware';

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

const PROFILE_SELECT = [
  'id',
  'username',
  'full_name',
  'email',
  'country',
  'primary_country_code',
  'sport_id',
  'primary_sport_id',
  'bio',
  'sports_role',
  'telegram',
  'dao1_did_nft',
  'wallet_address',
  'website',
  'youtube',
  'linkhub',
  'facebook',
  'instagram',
  'profile_visibility',
  'xp_total',
  'role',
  'avatar_url',
  'created_at',
].join(', ');

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
      .select(PROFILE_SELECT)
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
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response!;

    const body = await request.json();
    const { userId, updates, previousProfile } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    if (updates?.bio && (updates.bio.length < 8 || updates.bio.length > 888)) {
      return NextResponse.json(
        { success: false, error: 'Bio must be between 8 and 888 characters' },
        { status: 400 }
      );
    }

    const allowedFields = new Set([
      'username',
      'full_name',
      'email',
      'bio',
      'sports_role',
      'telegram',
      'dao1_did_nft',
      'wallet_address',
      'website',
      'youtube',
      'linkhub',
      'facebook',
      'instagram',
      'profile_visibility',
    ]);
    const updatesPayload = Object.entries(updates ?? {}).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (allowedFields.has(key) && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (typeof updatesPayload.username === 'string' && updatesPayload.username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must have at least 3 characters.' },
        { status: 400 }
      );
    }

    if (typeof updatesPayload.email === 'string' && !updatesPayload.email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Email format is invalid.' },
        { status: 400 }
      );
    }

    if (!Object.keys(updatesPayload).length) {
      return NextResponse.json(
        { success: false, error: 'No updates provided.' },
        { status: 400 }
      );
    }

    if (auth.user?.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client unavailable.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updatesPayload)
      .eq('id', userId)
      .select(PROFILE_SELECT);

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

    const updatedProfile = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      profile: updatedProfile ?? null,
      xpAwarded: totalXpAwarded
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
