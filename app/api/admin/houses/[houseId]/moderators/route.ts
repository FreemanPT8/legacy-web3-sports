import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type RouteParams = {
  params: {
    houseId: string;
  };
};

type ModeratorPermissions = {
  canManageMissions?: boolean;
  canManageContent?: boolean;
  canManageMembers?: boolean;
};

type ModeratorUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  permissions: ModeratorPermissions | null;
};

type HouseModeratorRow = {
  house_id: string;
  user_id: string;
  permissions: Record<string, any> | null;
};

// helper: verifica se o utilizador é Head desta House
async function isHeadOfHouse(houseId: string, userId: string): Promise<boolean> {
  try {
    const { data: headRow, error: headError } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', houseId)
      .maybeSingle();

    if (headError || !headRow) return false;

    const { data: adminAssign, error: adminError } = await supabaseAdmin
      .from('admin_assignments')
      .select('user_id')
      .eq('id', (headRow as any).admin_id)
      .maybeSingle();

    if (adminError || !adminAssign) return false;

    return (adminAssign as any).user_id === userId;
  } catch (e) {
    console.error('Error checking isHeadOfHouse:', e);
    return false;
  }
}

function normalizePermissions(
  raw: Record<string, any> | null | undefined
): ModeratorPermissions | null {
  if (!raw) return null;
  return {
    canManageMissions: !!raw.canManageMissions,
    canManageContent: !!raw.canManageContent,
    canManageMembers: !!raw.canManageMembers,
  };
}

// GET /api/admin/houses/[houseId]/moderators
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { houseId } = params;

  try {
    const { data: modsRows, error: modsError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id, permissions')
      .eq('house_id', houseId);

    if (modsError) {
      console.error(
        'Supabase error in GET /api/admin/houses/[houseId]/moderators:',
        modsError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar moderadores da House.' },
        { status: 500 }
      );
    }

    const moderators = (modsRows ?? []) as HouseModeratorRow[];
    if (moderators.length === 0) {
      return NextResponse.json(
        { success: true, moderators: [] },
        { status: 200 }
      );
    }

    const userIds = Array.from(new Set(moderators.map((m) => m.user_id)));

    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role, avatar_url')
      .in('id', userIds);

    if (usersError) {
      console.error(
        'Supabase error in GET /api/admin/houses/[houseId]/moderators (users):',
        usersError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao carregar utilizadores.' },
        { status: 500 }
      );
    }

    const users = (usersData ?? []) as any[];
    const userById = new Map<string, any>();
    for (const u of users) {
      userById.set(u.id, u);
    }

    const result: ModeratorUser[] = moderators
      .map((m) => {
        const u = userById.get(m.user_id);
        if (!u) return null;
        return {
          id: u.id as string,
          username: (u.username as string) ?? null,
          full_name: (u.full_name as string) ?? null,
          email: (u.email as string) ?? null,
          role: (u.role as string) ?? null,
          avatar_url: (u.avatar_url as string) ?? null,
          permissions: normalizePermissions(m.permissions),
        } as ModeratorUser;
      })
      .filter((u): u is ModeratorUser => !!u);

    return NextResponse.json(
      {
        success: true,
        moderators: result,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'Unexpected error in GET /api/admin/houses/[houseId]/moderators:',
      err
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Erro inesperado ao carregar moderadores da House.',
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/houses/[houseId]/moderators
// body: { userId: string, permissions?: ModeratorPermissions }
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const { houseId } = params;

  try {
    const body = await request.json();
    const { userId, permissions } = body as {
      userId?: string;
      permissions?: ModeratorPermissions;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Apenas Super Admin ou Head desta House podem adicionar moderadores
    const isSuperAdmin = currentUser.role === 'Super Admin';
    const isHead = await isHeadOfHouse(houseId, currentUser.userId);

    if (!isSuperAdmin && !isHead) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only Super Admin or Head of this House can add moderators.',
        },
        { status: 403 }
      );
    }

    // 1) Validar house
    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error(
        'Supabase error validating house in POST /moderators:',
        houseError
      );
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

    // 2) Validar user (pode ser Member, Admin ou Super Admin)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error(
        'Supabase error validating user in POST /moderators:',
        userError
      );
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

    // 3) Ver se já é moderador
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('house_moderators')
      .select('house_id, user_id, permissions')
      .eq('house_id', houseId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      console.error(
        'Supabase error checking existing moderator in POST /moderators:',
        existingError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar moderador existente.' },
        { status: 500 }
      );
    }

    const normalizedPermissions =
      typeof permissions === 'object' && permissions
        ? permissions
        : null;

    if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from('house_moderators')
        .insert({
          house_id: houseId,
          user_id: userId,
          permissions: normalizedPermissions,
        });

      if (insertError) {
        console.error(
          'Supabase error inserting moderator in POST /moderators:',
          insertError
        );
        return NextResponse.json(
          { success: false, error: 'Erro ao adicionar moderador.' },
          { status: 500 }
        );
      }
    }
    // se já existia, não alteramos as permissões aqui; PATCH é o caminho oficial

    const moderator: ModeratorUser = {
      id: user.id as string,
      username: (user.username as string) ?? null,
      full_name: (user.full_name as string) ?? null,
      email: (user.email as string) ?? null,
      role: (user.role as string) ?? null,
      avatar_url: (user.avatar_url as string) ?? null,
      permissions: normalizePermissions(
        existing?.permissions ?? normalizedPermissions
      ),
    };

    return NextResponse.json(
      { success: true, moderator },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'Unexpected error in POST /api/admin/houses/[houseId]/moderators:',
      err
    );
    return NextResponse.json(
      { success: false, error: 'Erro inesperado ao adicionar moderador.' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/houses/[houseId]/moderators
// body: { userId: string, permissions: ModeratorPermissions }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const { houseId } = params;

  try {
    const body = await request.json();
    const { userId, permissions } = body as {
      userId?: string;
      permissions?: ModeratorPermissions;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const isSuperAdmin = currentUser.role === 'Super Admin';
    const isHead = await isHeadOfHouse(houseId, currentUser.userId);

    if (!isSuperAdmin && !isHead) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only Super Admin or Head of this House can change moderator permissions.',
        },
        { status: 403 }
      );
    }

    const normalizedPermissions =
      typeof permissions === 'object' && permissions
        ? permissions
        : null;

    const { error: updateError } = await supabaseAdmin
      .from('house_moderators')
      .update({
        permissions: normalizedPermissions,
      })
      .eq('house_id', houseId)
      .eq('user_id', userId);

    if (updateError) {
      console.error(
        'Supabase error updating moderator permissions in PATCH /moderators:',
        updateError
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao atualizar permissões do moderador.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        permissions: normalizedPermissions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'Unexpected error in PATCH /api/admin/houses/[houseId]/moderators:',
      err
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Erro inesperado ao atualizar permissões do moderador.',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/houses/[houseId]/moderators
// body: { userId: string }
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
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

    const isSuperAdmin = currentUser.role === 'Super Admin';
    const isHead = await isHeadOfHouse(houseId, currentUser.userId);

    if (!isSuperAdmin && !isHead) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only Super Admin or Head of this House can remove moderators.',
        },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('house_moderators')
      .delete()
      .eq('house_id', houseId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error(
        'Supabase error deleting moderator in DELETE /moderators:',
        deleteError
      );
      return NextResponse.json(
        { success: false, error: 'Erro ao remover moderador.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(
      'Unexpected error in DELETE /api/admin/houses/[houseId]/moderators:',
      err
    );
    return NextResponse.json(
      { success: false, error: 'Erro inesperado ao remover moderador.' },
      { status: 500 }
    );
  }
}
