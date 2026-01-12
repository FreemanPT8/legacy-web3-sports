import { NextRequest, NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/auth';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { syncUserHouseMembership } from '@/lib/user-houses';

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
      .select('id')
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
      .select('id, sport_id, primary_sport_id')
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

    if (existingUser.sport_id || existingUser.primary_sport_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Sport already assigned. Contact support if you need to change it.',
        },
        { status: 400 },
      );
    }

    const { error: updateError } = await db
      .from('users')
      .update({
        sport_id: sportId,
        primary_sport_id: sportId,
      })
      .eq('id', authUser.id);

    if (updateError) {
      console.error('[profile/sport] Failed to update user:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign sport' },
        { status: 500 },
      );
    }

    try {
      await syncUserHouseMembership(authUser.id, {
        assignedVia: 'PROFILE',
        logPrefix: 'profile:sport',
      });
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
