import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

interface RouteParams {
  params: { id: string };
}

// Atualizar ROLE de um user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const userId = params.id;

  try {
    const body = await request.json();
    const { role } = body as { role?: string };

    if (!role || !['Super Admin', 'Admin', 'Member'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // impedir que alguém remova o próprio Super Admin
    if (currentUser.userId === userId && role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: "You can't remove your own Super Admin role.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .maybeSingle();

    if (error) {
      console.error('Supabase error updating role:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update role',
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: data });
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE user (apenas Super Admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const userId = params.id;

  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'Only Super Admins can delete users.' },
      { status: 403 }
    );
  }

  if (currentUser.userId === userId) {
    return NextResponse.json(
      {
        success: false,
        error: "You can't delete your own account from the admin panel.",
      },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);

    if (error) {
      console.error('Supabase error deleting user:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete user',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
