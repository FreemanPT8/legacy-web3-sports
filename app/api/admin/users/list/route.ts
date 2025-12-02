// app/api/admin/users/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // Apenas Admins/Super Admin podem aceder
    if (
      !user ||
      (user.role !== 'Super Admin' && user.role !== 'Admin')
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const limit = 20; // segurança máxima

    let query = db
      .from('users')
      .select('id, username, xp_total')
      .order('username', { ascending: true })
      .limit(limit);

    if (search.length > 0) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users list:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar utilizadores' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, users: data || [] },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in GET /api/admin/users/list:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
