// app/api/admin/houses/head/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { logHouseHistory } from '@/lib/houses/history';

interface AdminAssignmentRow {
  id: string;
  user_id: string;
}

interface PostBody {
  houseId: string;
  headUserId: string | null; // null => remover Head
}

interface PostResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;

  // Só Super Admin pode mexer nos Heads
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json<PostResponse>(
      { success: false, error: 'Only Super Admin can manage Heads of House' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as PostBody;

    if (!body || !body.houseId) {
      return NextResponse.json<PostResponse>(
        { success: false, error: 'Missing houseId' },
        { status: 400 }
      );
    }

    const { houseId, headUserId } = body;
    const { data: previousHead, error: previousHeadError } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', houseId)
      .maybeSingle();
    if (previousHeadError) {
      console.error('Error loading current head:', previousHeadError);
      return NextResponse.json<PostResponse>(
        { success: false, error: 'Failed to load current Head of House' },
        { status: 500 }
      );
    }

    // 1) Se headUserId === null -> remover Head atual
    if (!headUserId) {
      const { error: deleteError } = await supabaseAdmin
        .from('house_heads')
        .delete()
        .eq('house_id', houseId);

      if (deleteError) {
        console.error('Error removing house_head:', deleteError);
        return NextResponse.json<PostResponse>(
          { success: false, error: 'Failed to remove Head of House' },
          { status: 500 }
        );
      }

      await logHouseHistory({
        houseId,
        action: 'head.removed',
        actorId: currentUser.userId,
        payload: { previousAdminId: previousHead?.admin_id ?? null },
      });

      return NextResponse.json<PostResponse>({ success: true });
    }

    // 2) Validar que o user escolhido é Admin / Super Admin (tem admin_assignment)
    const { data: adminAssignRow, error: adminAssignError } =
      await supabaseAdmin
        .from('admin_assignments')
        .select('id, user_id')
        .eq('user_id', headUserId)
        .maybeSingle();

    if (adminAssignError) {
      console.error(
        'Error loading admin_assignments for user:',
        adminAssignError
      );
      return NextResponse.json<PostResponse>(
        {
          success: false,
          error: 'Failed to verify admin assignment for selected user',
        },
        { status: 500 }
      );
    }

    if (!adminAssignRow) {
      return NextResponse.json<PostResponse>(
        {
          success: false,
          error:
            'Selected user does not have an admin assignment. Only Admins / Super Admins can be Heads of House.',
        },
        { status: 400 }
      );
    }

    const adminId = (adminAssignRow as AdminAssignmentRow).id;

    // 3) Limpar Head anterior desta House
    const { error: deleteOldError } = await supabaseAdmin
      .from('house_heads')
      .delete()
      .eq('house_id', houseId);

    if (deleteOldError) {
      console.error('Error clearing previous house_heads:', deleteOldError);
      return NextResponse.json<PostResponse>(
        { success: false, error: 'Failed to clear existing Head of House' },
        { status: 500 }
      );
    }

    // 4) Inserir novo Head
    const { error: insertError } = await supabaseAdmin
      .from('house_heads')
      .insert({
        house_id: houseId,
        admin_id: adminId,
      });

    if (insertError) {
      console.error('Error inserting new house_head:', insertError);
      return NextResponse.json<PostResponse>(
        { success: false, error: 'Failed to set new Head of House' },
        { status: 500 }
      );
    }

    try {
      await supabaseAdmin
        .from('house_head_terms')
        .delete()
        .eq('user_id', headUserId)
        .eq('house_id', houseId);
    } catch (termError) {
      console.error('Failed to reset term acceptance for new head:', termError);
    }

    await logHouseHistory({
      houseId,
      action: 'head.assigned',
      actorId: currentUser.userId,
      payload: {
        newUserId: headUserId,
        adminAssignmentId: adminId,
        previousAdminId: previousHead?.admin_id ?? null,
      },
    });

    return NextResponse.json<PostResponse>({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/houses/head:', err);
    return NextResponse.json<PostResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
