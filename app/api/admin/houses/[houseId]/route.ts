import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type HouseHeadUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
};

type RouteParams = {
  params: {
    houseId: string;
  };
};

// GET /api/admin/houses/[houseId]/head
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { houseId } = params;

  try {
    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('house_id, admin_id')
      .eq('house_id', houseId)
      .maybeSingle();

    if (headError) {
      console.error('Supabase error loading house_head:', headError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Head da House.' },
        { status: 500 }
      );
    }

    if (!headRow) {
      return NextResponse.json(
        { success: true, head: null },
        { status: 200 }
      );
    }

    const { data: adminAssign, error: adminError } = await supabaseAdmin
      .from('admin_assignments')
      .select('id, user_id')
      .eq('id', (headRow as any).admin_id)
      .maybeSingle();

    if (adminError) {
      console.error(
        'Supabase error loading admin_assignment for head:',
        adminError
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao carregar Admin Assignment do Head.',
        },
        { status: 500 }
      );
    }

    if (!adminAssign) {
      return NextResponse.json(
        { success: true, head: null },
        { status: 200 }
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role, avatar_url')
      .eq('id', (adminAssign as any).user_id)
      .maybeSingle();

    if (userError) {
      console.error('Supabase error loading head user:', userError);
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar utilizador Head.' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: true, head: null },
        { status: 200 }
      );
    }

    const headUser: HouseHeadUser = {
      id: user.id as string,
      username: (user.username as string) ?? null,
      full_name: (user.full_name as string) ?? null,
      email: (user.email as string) ?? null,
      role: (user.role as string) ?? null,
      avatar_url: (user.avatar_url as string) ?? null,
    };

    return NextResponse.json(
      {
        success: true,
        head: headUser,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'Unexpected error in GET /api/admin/houses/[houseId]/head:',
      err
    );
    return NextResponse.json(
      { success: false, error: 'Erro inesperado ao carregar Head da House.' },
      { status: 500 }
    );
  }
}

// POST /api/admin/houses/[houseId]/head
// body: { userId: string }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'Only Super Admin can define Head of House.' },
      { status: 403 }
    );
  }

  const { houseId } = params;

  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // 1) Validar house
    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error('Supabase error checking house in Head POST:', houseError);
      return NextResponse.json(
        { success: false, error: 'Erro ao validar House.' },
        { status: 500 }
      );
    }

    if (!house) {
      return NextResponse.json(
        { success: false, error: 'House not found' },
        { status: 404 }
      );
    }

    // 2) Validar user e role (só Admin ou Super Admin podem ser Head)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Supabase error checking user in Head POST:', userError);
      return NextResponse.json(
        { success: false, error: 'Erro ao validar utilizador.' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'Admin' && user.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Head of House must be a user with role Admin or Super Admin.',
        },
        { status: 400 }
      );
    }

    // 3) Obter (ou criar) admin_assignment para este user
    const { data: existingAdminAssign, error: existingAdminError } =
      await supabaseAdmin
        .from('admin_assignments')
        .select('id, user_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    if (existingAdminError) {
      console.error(
        'Supabase error loading admin_assignment in Head POST:',
        existingAdminError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar Admin Assignment.' },
        { status: 500 }
      );
    }

    let adminAssignmentId: string;

    if (existingAdminAssign) {
      adminAssignmentId = existingAdminAssign.id as string;
    } else {
      const { data: newAdminAssign, error: newAdminError } = await supabaseAdmin
        .from('admin_assignments')
        .insert({
          user_id: userId,
          houses: null,
          countries: null,
        })
        .select('id, user_id')
        .single();

      if (newAdminError || !newAdminAssign) {
        console.error(
          'Supabase error creating admin_assignment in Head POST:',
          newAdminError
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao criar Admin Assignment para o Head.',
          },
          { status: 500 }
        );
      }

      adminAssignmentId = newAdminAssign.id as string;
    }

    // 4) Upsert em house_heads (apenas 1 head por house)
    const { error: upsertError } = await supabaseAdmin
      .from('house_heads')
      .upsert(
        {
          house_id: houseId,
          admin_id: adminAssignmentId,
        },
        { onConflict: 'house_id' }
      );

    if (upsertError) {
      console.error(
        'Supabase error upserting house_head in Head POST:',
        upsertError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao definir Head da House.' },
        { status: 500 }
      );
    }

    const headUser: HouseHeadUser = {
      id: user.id as string,
      username: (user.username as string) ?? null,
      full_name: (user.full_name as string) ?? null,
      email: (user.email as string) ?? null,
      role: (user.role as string) ?? null,
      avatar_url: (user.avatar_url as string) ?? null,
    };

    return NextResponse.json(
      {
        success: true,
        head: headUser,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'Unexpected error in POST /api/admin/houses/[houseId]/head:',
      err
    );
    return NextResponse.json(
      { success: false, error: 'Erro inesperado ao definir Head da House.' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/houses/[houseId]/head
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'Only Super Admin can remove Head of House.' },
      { status: 403 }
    );
  }

  const { houseId } = params;

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('house_heads')
      .delete()
      .eq('house_id', houseId);

    if (deleteError) {
      console.error(
        'Supabase error deleting house_head in Head DELETE:',
        deleteError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao remover Head da House.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, head: null },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'Unexpected error in DELETE /api/admin/houses/[houseId]/head:',
      err
    );
    return NextResponse.json(
      { success: false, error: 'Erro inesperado ao remover Head da House.' },
      { status: 500 }
    );
  }
}
