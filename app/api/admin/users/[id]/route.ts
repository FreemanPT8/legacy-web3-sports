import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(
        'id, username, email, full_name, role, xp_total, created_at, country, bio, sports_role, telegram, dao1_did_nft, wallet_address, website, youtube, linkhub, facebook, instagram, profile_unlocked, email_verified, last_login, streak_count, avatar_url'
      )
      .eq('id', params.id)
      .maybeSingle();

    if (error || !user) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
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

    // validação de role
    if (role && !['Super Admin', 'Admin', 'Member'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    if (role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Super Admins can create other Super Admins',
        },
        { status: 403 }
      );
    }

    // buscar utilizador alvo
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', params.id)
      .maybeSingle();

    if (targetError) {
      console.error('Error loading target user:', targetError);
      return NextResponse.json(
        { success: false, error: 'Failed to load target user' },
        { status: 500 }
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Super Admins can modify other Super Admins',
        },
        { status: 403 }
      );
    }

    // construir objeto de updates
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

    // aplicar update com supabaseAdmin (service role)
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select(
        'id, username, email, full_name, role, xp_total, created_at, country'
      )
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message || 'Failed to update user',
        },
        { status: 500 }
      );
    }

    // registar ação em xp_transactions (não bloqueia resposta se falhar)
    const { error: txError } = await supabaseAdmin.from('xp_transactions').insert({
      user_id: currentUser.id,
      action: `Updated user ${targetUser.id} - Changed: ${Object.keys(
        updates
      ).join(', ')}`,
      xp_earned: 0,
      reference_type: 'admin_action',
    });

    if (txError) {
      console.error('Error inserting xp_transaction:', txError);
      // não fazemos return de erro aqui para não estragar o update bem sucedido
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
