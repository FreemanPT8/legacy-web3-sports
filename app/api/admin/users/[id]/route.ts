import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

type RouteParams = {
  params: {
    id: string;
  };
};

const ALLOWED_ROLES = ['Super Admin', 'Admin', 'Member'] as const;
type RoleValue = (typeof ALLOWED_ROLES)[number];

// PUT /api/admin/users/[id]  -> atualizar role do user
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  // 1) Autenticar e garantir que é Admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const userId = params.id;

  try {
    const body = await request.json();
    const { role } = body as { role?: string };

    if (!role || !ALLOWED_ROLES.includes(role as RoleValue)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing role. Allowed: Super Admin, Admin, Member.',
        },
        { status: 400 }
      );
    }

    // 2) Apenas SUPER ADMIN pode alterar roles
    if (currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Super Admins can change roles.',
        },
        { status: 403 }
      );
    }

    // 3) Proteger para não te auto-remover como Super Admin
    if (currentUser.userId === userId && role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: "You can't remove your own Super Admin role.",
        },
        { status: 400 }
      );
    }

    // 4) Atualizar a tabela users via service role
    const { error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('Supabase error in PUT /api/admin/users/[id]:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Supabase error: ${(error as any)?.message ?? 'unknown'}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? 'Internal server error',
      },
      { status: 500 }
    );
  }
}
