import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, signToken, verifyTokenIgnoringExpiration } from '@/lib/jwt';
import { ensureUserRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader);

    if (!token) {
      const cookieNames = [
        'auth_token',
        'token',
        'access_token',
        'sb-access-token',
        'sb_refresh_token',
        'sb-refresh-token',
      ];
      for (const name of cookieNames) {
        const value = request.cookies.get(name)?.value;
        if (value) {
          token = value;
          break;
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    const payload = verifyTokenIgnoringExpiration(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role, xp_total, country, avatar_url, streak_count, is_banned')
      .eq('id', payload.userId)
      .maybeSingle();

    if (error || !user || user.is_banned) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    const canonicalRole = ensureUserRole(user.role);
    const newToken = signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: canonicalRole,
      xp_total: user.xp_total ?? 0,
    });

    const safeUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: canonicalRole,
      xp_total: user.xp_total ?? 0,
      country: user.country,
      avatar_url: user.avatar_url,
      streak_count: user.streak_count ?? 0,
    };

    const response = NextResponse.json(
      { success: true, user: safeUser, token: newToken },
      { status: 200 },
    );

    response.cookies.set('sb-access-token', newToken, COOKIE_OPTIONS);
    response.cookies.set('sb-refresh-token', newToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: any) {
    console.error('Unexpected error in /api/auth/refresh:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 },
    );
  }
}
