import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logHouseHistory } from '@/lib/houses/history';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });

  try {
    const { token } = (await request.json().catch(() => ({}))) as { token?: string };
    if (!token) return NextResponse.json({ success: false, error: 'Token em falta.' }, { status: 400 });

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('house_head_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Convite inválido ou inexistente.' }, { status: 404 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Este convite já foi utilizado ou cancelado.' }, { status: 409 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin
        .from('house_head_invites')
        .update({ status: 'expired', cancelled_at: new Date().toISOString() })
        .eq('id', invite.id);
      return NextResponse.json({ success: false, error: 'Convite expirado.' }, { status: 410 });
    }

    const { data: assignment } = await supabaseAdmin
      .from('admin_assignments')
      .select('id')
      .eq('user_id', auth.user!.userId)
      .maybeSingle();
    if (!assignment) {
      return NextResponse.json({
        success: false,
        error: 'Apenas contas com permissão de Admin/Super Admin podem aceitar este convite.',
      });
    }

    await supabaseAdmin.from('house_heads').delete().eq('house_id', invite.house_id);

    await supabaseAdmin.from('house_heads').insert({
      house_id: invite.house_id,
      admin_id: assignment.id,
    });

    const nowISO = new Date().toISOString();
    await supabaseAdmin
      .from('house_head_invites')
      .update({ status: 'accepted', accepted_at: nowISO, accepted_by: auth.user!.userId })
      .eq('id', invite.id);

    await logHouseHistory({
      houseId: invite.house_id,
      action: 'head.invite_accepted',
      actorId: auth.user!.userId,
      payload: {
        inviteId: invite.id,
        email: invite.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[head-invite/accept] failed', error);
    return NextResponse.json({ success: false, error: error?.message || 'Falha ao aceitar convite.' }, { status: 500 });
  }
}
