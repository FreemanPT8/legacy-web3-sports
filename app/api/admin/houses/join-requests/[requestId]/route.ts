import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { getHouseHeadHouseIds } from '@/lib/server/house-heads';

export async function DELETE(request: NextRequest, { params }: { params: { requestId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  const actor = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });
  }

  const requestId = params.requestId;
  if (!requestId) {
    return NextResponse.json({ success: false, error: 'Missing requestId.' }, { status: 400 });
  }

  try {
    const { data: requestRow, error: fetchError } = await supabaseAdmin
      .from('house_join_requests')
      .select('id, house_id, status')
      .eq('id', requestId)
      .maybeSingle();
    if (fetchError) {
      if (fetchError.code === '42P01') {
        return NextResponse.json(
          { success: false, error: 'Tabela house_join_requests inexistente. Corre as migrações no Supabase.' },
          { status: 500 },
        );
      }
      throw fetchError;
    }
    if (!requestRow) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 });
    }
    if (requestRow.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Pedido já foi processado.' }, { status: 409 });
    }

    const isSuperAdmin = actor.role === 'Super Admin';
    let actorCanCancel = isSuperAdmin;
    if (!actorCanCancel && actor.role === 'Admin') {
      const headHouseIds = await getHouseHeadHouseIds(actor.userId);
      actorCanCancel = headHouseIds.includes(requestRow.house_id);
    }
    if (!actorCanCancel) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para cancelar este pedido.' },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('house_join_requests')
      .update({
        status: 'cancelled',
        resolved_at: new Date().toISOString(),
        resolved_by: actor.userId ?? null,
      })
      .eq('id', requestId)
      .eq('status', 'pending');
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/join-requests] cancel failed', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao cancelar pedido. Tenta novamente.' },
      { status: 500 },
    );
  }
}
