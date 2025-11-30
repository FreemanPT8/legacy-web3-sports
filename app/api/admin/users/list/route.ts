// app/api/admin/users/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    if (
      !user ||
      (user.role !== 'Super Admin' && user.role !== 'Admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    // Lista básica para dropdown
    const { data: users, error } = await db
      .from('users')
      .select('id, username, full_name, email, xp_total')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching users list:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar lista de utilizadores',
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        users: users || [],
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in GET /api/admin/users/list:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
      },
      { status: 500 },
    );
  }
}
