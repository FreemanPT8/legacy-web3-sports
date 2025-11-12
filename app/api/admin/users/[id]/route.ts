import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role, xp_total, created_at, country, bio, sports_role, telegram, dao1_did_nft, wallet_address, website, youtube, linkhub, facebook, instagram, profile_unlocked, email_verified, last_login, streak_count, avatar_url')
      .eq('id', params.id)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;

  try {
    const body = await request.json();
    const { role, xp_total, email_verified, profile_unlocked } = body;

    if (role && !['Super Admin', 'Admin', 'Member'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    if (role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can create other Super Admins' },
        { status: 403 }
      );
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', params.id)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can modify other Super Admins' },
        { status: 403 }
      );
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (xp_total !== undefined) updates.xp_total = xp_total;
    if (email_verified !== undefined) updates.email_verified = email_verified;
    if (profile_unlocked !== undefined) updates.profile_unlocked = profile_unlocked;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select('id, username, email, full_name, role, xp_total, created_at, country')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    await supabase
      .from('xp_transactions')
      .insert({
        user_id: currentUser.id,
        action: `Updated user ${targetUser.id} - Changed: ${Object.keys(updates).join(', ')}`,
        xp_earned: 0,
        reference_type: 'admin_action'
      });

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
