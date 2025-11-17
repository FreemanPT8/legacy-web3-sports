// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { JWTPayload, signToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // 1) Buscar o utilizador ao Supabase (username OU email)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(
        [
          'id',
          'username',
          'full_name',
          'email',
          'role',
          'xp_total',
          'country',
          'avatar_url',
          'streak_count',
          // APENAS a coluna correta
          'password_hash'
        ].join(', ')
      )
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (error) {
      console.error('Supabase error in /api/auth/login:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Supabase error: ${error.message ?? 'unknown'}`,
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

    // 2) Validar password hash
    const hash: string | null =
      (user as any).password_hash ?? null;

    if (!hash) {
      console.error('User record has no password_hash column.');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication misconfigured: missing password_hash.',
        },
        { status: 500 }
      );
    }

    const isValid = await bcrypt.compare(password, hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // 3) Criar JWT
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role ?? 'Member',
      xp_total: user.xp_total ?? 0,
    };

    const token = signToken(payload, '7d');

    // 4) User que o frontend espera
    const safeUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role ?? 'Member',
      xp_total: user.xp_total ?? 0,
      country: user.country,
      avatar_url: user.avatar_url,
      streak_count: user.streak_count ?? 0,
    };

    return NextResponse.json(
      {
        success: true,
        user: safeUser,
        token,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in /api/auth/login:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Server error',
      },
      { status: 500 }
    );
  }
}
