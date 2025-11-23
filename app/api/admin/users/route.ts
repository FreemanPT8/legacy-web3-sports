// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import type { UserRole } from '@/lib/permissions';

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  country: string | null;
  xp_total: number | null;
  created_at: string | null;
}

interface ListUserDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  country: string | null;
  xp_total: number;
  created_at: string | null;
}

interface ListResponse {
  success: boolean;
  users?: ListUserDTO[];
  error?: string;
}

const VALID_ROLES: UserRole[] = ['Super Admin', 'Admin', 'Member'];

// GET /api/admin/users
// Lista todos os utilizadores (Admin / Super Admin)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(
        'id, username, full_name, email, role, country, xp_total, created_at',
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error in GET /api/admin/users:', error);
      return NextResponse.json<ListResponse>(
        { success: false, error: 'Error loading users.' },
        { status: 500 },
      );
    }

    const rows = (data || []) as UserRow[];

    let filtered = rows;
    if (search) {
      filtered = rows.filter((u) => {
        const name = (u.full_name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return (
          name.includes(search) ||
          username.includes(search) ||
          email.includes(search)
        );
      });
    }

    const users: ListUserDTO[] = filtered.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: (VALID_ROLES.includes(u.role as UserRole)
        ? (u.role as UserRole)
        : 'Member') as UserRole,
      country: u.country ?? null,
      xp_total: u.xp_total ?? 0,
      created_at: u.created_at,
    }));

    return NextResponse.json<ListResponse>(
      { success: true, users },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/users:', err);
    return NextResponse.json<ListResponse>(
      { success: false, error: 'Unexpected error loading users.' },
      { status: 500 },
    );
  }
}
