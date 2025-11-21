import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

interface AssigneeUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member';
}

interface AssigneesResponse {
  success: boolean;
  users?: AssigneeUser[];
  error?: string;
}

// GET /api/admin/onboarding/assignees
// Devolve todos os utilizadores com role "Super Admin" ou "Admin"
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role')
      .in('role', ['Super Admin', 'Admin'])
      .order('role', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Supabase error loading assignees:', error);
      return NextResponse.json<AssigneesResponse>(
        {
          success: false,
          error: error.message || 'Failed to load assignees list',
        },
        { status: 500 }
      );
    }

    const users = (data || []) as AssigneeUser[];

    return NextResponse.json<AssigneesResponse>({
      success: true,
      users,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/onboarding/assignees:', err);
    return NextResponse.json<AssigneesResponse>(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
