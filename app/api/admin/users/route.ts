import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            `Supabase GET error: ${error.message ?? 'unknown'} | ${JSON.stringify(error, null, 2)}`,
        },
        { status: 500 }
      );
    }

    if (!user) {
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
    console.error('Unexpected error fetching user:', error);
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

    // Validar role
    if (role && !['Super Admin', 'Admin', 'Member'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Só Super Admin cria outro Super Admin
    if (role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Super Admins can create other Super Admins',
        },
        { status: 403 }
      );
    }

    // Buscar utilizador alvo
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', params.id)
      .maybeSingle();

    if (targetError) {
      console.error('Error loading target user:', targetError);
      return NextResponse.json(
        {
          success: false,
          error:
            `Supabase targetUser error: ${targetError.message ?? 'unknown'} | ${JSON.stringify(
              targetError,
              null,
              2
            )}`,
        },
        { status: 500 }
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Só Super Admin mexe em outro Super Admin
    if (targetUser.role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Super Admins can modify other Super Admins',
        },
        { status: 403 }
      );
    }

    // Construir updates
    const updates: Record<string, any> = {};
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

    // UPDATE no Supabase com service role
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select(
        'id, username, email, full_name, role, xp_total, created_at, country'
      )
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            `Supabase UPDATE error: ${error.message ?? 'unknown'} | ${JSON.stringify(
              error,
              null,
              2
            )}`,
        },
        { status: 500 }
      );
    }

    // Log da ação de admin (se falhar, não estraga o PATCH)
    const { error: logError } = await supabaseAdmin.from('xp_transactions').insert({
      user_id: currentUser.userId,
      action: `Updated user ${targetUser.id} - Changed: ${Object.keys(updates).join(', ')}`,
      xp_earned: 0,
      reference_type: 'admin_action',
    });

    if (logError) {
      console.error('Error logging admin action:', logError);
      // Não estraga o resultado principal
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Unexpected error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
