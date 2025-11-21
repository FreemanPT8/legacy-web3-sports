// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type UserRole = 'Super Admin' | 'Admin' | 'Member';

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

interface ListResponse {
  success: boolean;
  users?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    country: string | null;
    xp_total: number;
    created_at: string | null;
  }[];
  error?: string;
}

interface PatchResponse {
  success: boolean;
  error?: string;
}

// Apenas roles válidos
const VALID_ROLES: UserRole[] = ['Super Admin', 'Admin', 'Member'];

// GET /api/admin/users
// Lista todos os utilizadores (apenas para Admin / Super Admin, e o UI vai limitar a Super Admin)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(
        'id, username, full_name, email, role, country, xp_total, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error in GET /api/admin/users:', error);
      return NextResponse.json<ListResponse>(
        { success: false, error: 'Error loading users.' },
        { status: 500 }
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

    const users = filtered.map((u) => ({
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
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/users:', err);
    return NextResponse.json<ListResponse>(
      { success: false, error: 'Unexpected error loading users.' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users
// body: { userId: string; role: 'Super Admin' | 'Admin' | 'Member' }
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const body = await request.json().catch(() => ({} as any));
    const { userId, role } = body as {
      userId?: string;
      role?: UserRole;
    };

    if (!userId || !role) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'userId and role are required.' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Invalid role value.' },
        { status: 400 }
      );
    }

    // Garantir que não ficamos sem nenhum Super Admin
    // 1) Obter o utilizador atual
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (currentUserError) {
      console.error(
        'Supabase error loading current user in PATCH /api/admin/users:',
        currentUserError
      );
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Error loading current user.' },
        { status: 500 }
      );
    }

    if (!currentUser) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'User not found.' },
        { status: 404 }
      );
    }

    const currentRole = currentUser.role as UserRole | null;

    // Se estamos a tirar o papel de Super Admin
    if (currentRole === 'Super Admin' && role !== 'Super Admin') {
      // Ver quantos Super Admin existem
      const { data: superAdmins, error: superAdminsError } =
        await supabaseAdmin.from('users').select('id').eq('role', 'Super Admin');

      if (superAdminsError) {
        console.error(
          'Supabase error counting Super Admins in PATCH /api/admin/users:',
          superAdminsError
        );
        return NextResponse.json<PatchResponse>(
          { success: false, error: 'Error checking Super Admins.' },
          { status: 500 }
        );
      }

      const count = (superAdmins || []).length;

      if (count <= 1) {
        return NextResponse.json<PatchResponse>(
          {
            success: false,
            error:
              'Cannot change role: this is the last Super Admin in the system.',
          },
          { status: 400 }
        );
      }
    }

    // Atualizar role
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (updateError) {
      console.error(
        'Supabase error updating role in PATCH /api/admin/users:',
        updateError
      );
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Error updating user role.' },
        { status: 500 }
      );
    }

    return NextResponse.json<PatchResponse>({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/admin/users:', err);
    return NextResponse.json<PatchResponse>(
      { success: false, error: 'Unexpected error updating user role.' },
      { status: 500 }
    );
  }
}
