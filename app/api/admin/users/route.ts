import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  // 1) Verificar se o utilizador é admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    // Se não estiver autenticado / não for admin, devolve logo a resposta
    return authResult.response!;
  }

  try {
    // 2) Buscar todos os utilizadores via service role
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(
        [
          'id',
          'username',
          'email',
          'full_name',
          'role',
          'xp_total',
          'created_at',
          'country',
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
          'profile_unlocked',
          'email_verified',
          'last_login',
          'streak_count',
          'avatar_url',
        ].join(', ')
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error in /api/admin/users:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Supabase error: ${
            (error as any)?.message ?? 'unknown'
          }`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users ?? [],
    });
  } catch (err: any) {
    console.error('Unexpected error in /api/admin/users:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? 'Internal server error',
      },
      { status: 500 }
    );
  }
}
