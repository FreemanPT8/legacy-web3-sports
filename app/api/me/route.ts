import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { ensureUserRole } from '@/lib/roles';
import type { User } from '@/lib/auth';

type RawUserRow = {
  id: string;
  username: string;
  full_name?: string | null;
  email: string;
  role: string | null;
  xp_total?: number | null;
  avatar_url?: string | null;
  streak_count?: number | null;
  country?: string | null;
  is_banned?: boolean | null;
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return auth.response!;
  }

  const tokenUser = auth.user!;

  const client = supabaseAdmin ?? supabase;

  const { data, error } = await client
    .from('users')
    .select(
      [
        'id',
        'username',
        'full_name',
        'email',
        'role',
        'xp_total',
        'avatar_url',
        'streak_count',
        'country',
        'is_banned',
      ].join(', '),
    )
    .eq('id', tokenUser.userId)
    .maybeSingle<RawUserRow>();

  if (error || !data) {
    console.error('Failed to load user in GET /api/me:', error);
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 },
    );
  }

  const canonicalRole = ensureUserRole(data.role);
  const safeUser: User = {
    id: data.id,
    username: data.username,
    email: data.email,
    role: canonicalRole,
    xp_total: data.xp_total ?? 0,
    avatar_url: data.avatar_url ?? undefined,
    streak_count: data.streak_count ?? 0,
    full_name: data.full_name ?? undefined,
    country: data.country ?? undefined,
    created_at: undefined,
    is_banned: data.is_banned ?? false,
  };

  return NextResponse.json(
    {
      success: true,
      user: safeUser,
    },
    { status: 200 },
  );
}
