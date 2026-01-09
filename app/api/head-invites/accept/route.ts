import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logHouseHistory } from '@/lib/houses/history';
import { loadHeadTerm } from '@/lib/head-terms';

type AcceptPayload = {
  token?: string;
  inviteId?: string;
  acceptTerms?: boolean;
  termVersion?: string;
};

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return request.ip ?? null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as AcceptPayload;
    if (!body.token && !body.inviteId) {
      return NextResponse.json({ success: false, error: 'Token ou convite em falta.' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Este convite já foi utilizado ou cancelado.' }, { status: 409 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin
        .from('house_head_invites')
        .update({ status: 'expired', cancelled_at: new Date().toISOString() })
        .eq('id', invite.id);
      return NextResponse.json({ success: false, error: 'Convite expirado.' }, { status: 410 });
    }

    const targetEmail = normalizeEmail(invite.email);
    if (targetEmail) {
      const userEmail = normalizeEmail(auth.user!.email);
      if (!userEmail || userEmail !== targetEmail) {
        return NextResponse.json({ success: false, error: 'Convite destinado a outro utilizador.' }, { status: 403 });
      }
    }

    if (!body.acceptTerms) {
      return NextResponse.json({ success: false, error: 'É necessário aceitar o termo de responsabilidade.' }, { status: 400 });
    }

    const latestTerm = await loadHeadTerm();
    if (body.termVersion && body.termVersion !== latestTerm.version) {
      return NextResponse.json(
        { success: false, error: 'Termo atualizado. Recarrega e revê a versão mais recente.' },
        { status: 409 },
      );
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

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;

    await supabaseAdmin.from('house_heads').delete().eq('house_id', invite.house_id);

    await supabaseAdmin.from('house_heads').insert({
      house_id: invite.house_id,
      admin_id: assignment.id,
    });

    await supabaseAdmin.from('house_head_terms').upsert(
      {
        user_id: auth.user!.userId,
        house_id: invite.house_id,
        version: latestTerm.version,
        ip_address: ipAddress,
        user_agent: userAgent,
        payload: {
          snapshot: latestTerm.content,
          acceptedAt: new Date().toISOString(),
        },
      },
      { onConflict: 'user_id,house_id' },
    );

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

    try {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: auth.user!.userId,
          type: 'head_promo',
          title: 'FreemanPT — bem-vindo à liderança',
          message:
            'Obrigado por assumires uma House of Sports. Leva o Legacy ao próximo nível com responsabilidade.',
          link: '/admin/houses',
          data: { houseId: invite.house_id },
        })
        .select();
    } catch (notificationError) {
      console.error('[head-invite/accept] notification insert failed', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[head-invite/accept] failed', error);
    return NextResponse.json({ success: false, error: error?.message || 'Falha ao aceitar convite.' }, { status: 500 });
  }
}
