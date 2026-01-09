import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logHouseHistory } from '@/lib/houses/history';

type DeclinePayload = {
  inviteId?: string;
  token?: string;
};

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as DeclinePayload;
    if (!body.inviteId && !body.token) {
      return NextResponse.json({ success: false, error: 'Convite em falta.' }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('house_head_invites')
      .select('*')
      .eq(body.inviteId ? 'id' : 'token', body.inviteId ?? body.token!)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Convite inválido ou inexistente.' }, { status: 404 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Este convite já não está disponível.' }, { status: 409 });
    }

    const targetEmail = normalizeEmail(invite.email);
    if (invite.target_user_id) {
      if (invite.target_user_id !== auth.user!.userId) {
        return NextResponse.json({ success: false, error: 'Convite destinado a outro utilizador.' }, { status: 403 });
      }
    } else if (targetEmail) {
      const userEmail = normalizeEmail(auth.user!.email);
      if (!userEmail || userEmail !== targetEmail) {
        return NextResponse.json({ success: false, error: 'Convite destinado a outro utilizador.' }, { status: 403 });
      }
    } else {
      await supabaseAdmin.from('house_head_invites').update({ target_user_id: auth.user!.userId }).eq('id', invite.id);
    }

    const nowISO = new Date().toISOString();
    await supabaseAdmin
      .from('house_head_invites')
      .update({ status: 'cancelled', cancelled_at: nowISO })
      .eq('id', invite.id);

    await logHouseHistory({
      houseId: invite.house_id,
      action: 'head.invite_declined',
      actorId: auth.user!.userId,
      payload: {
        inviteId: invite.id,
        email: invite.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[head-invite/decline] failed', error);
    return NextResponse.json({ success: false, error: 'Falha ao rejeitar convite.' }, { status: 500 });
  }
}
