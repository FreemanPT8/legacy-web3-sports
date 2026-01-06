// app/api/admin/houses/head/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

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

    // Casa escolhida (para resolver a chave de termo)
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id, sport_id')
      .eq('id', houseId)
      .maybeSingle();

    if (houseError) {
      console.error('Error loading house before assigning head:', houseError);
      return NextResponse.json<PostResponse>(
        { success: false, error: 'Failed to load House of Sports.' },
        { status: 500 },
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

    let sportCode: string | null = null;
    const houseRecord = houseRow as { sport_id: string | null } | null;
    if (houseRecord?.sport_id) {
      try {
        const { data: sportRow, error: sportError } = await supabaseAdmin
          .from('sports')
          .select('code')
          .eq('id', houseRecord.sport_id)
          .maybeSingle();
        if (sportError) {
          console.error('Failed to load sport while resolving term key:', sportError);
        } else {
          sportCode = (sportRow?.code as string | null) ?? null;
        }
      } catch (sportErr) {
        console.error('Unexpected error loading sport for term key:', sportErr);
      }
    }

    const resolvedHouseKey = (() => {
      if (sportCode) return sportCode.toUpperCase();
      if (houseRecord?.sport_id) return houseRecord.sport_id.toUpperCase();
      return houseId.toUpperCase();
    })();

    try {
      await supabaseAdmin
        .from('house_term_acceptances')
        .delete()
        .eq('user_id', headUserId)
        .eq('house_key', resolvedHouseKey);
    } catch (termError) {
      console.error('Failed to reset term acceptance for new head:', termError);
    }

    return NextResponse.json<PostResponse>({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/houses/head:', err);
    return NextResponse.json<PostResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
