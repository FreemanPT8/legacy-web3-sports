import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { loadHeadTerm } from '@/lib/head-terms';

async function fetchInviteByToken(token: string) {
  const { data, error } = await supabaseAdmin!
    .from('house_head_invites')
    .select(
      `
      id,
      house_id,
      email,
      status,
      expires_at,
      created_at,
      houses:houses_of_sports(
        house_key,
        name_i18n
      )
    `,
    )
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchInviteForUser(inviteId: string, userId: string, userEmail: string | null) {
  const { data, error } = await supabaseAdmin!
    .from('house_head_invites')
    .select(
      `
      id,
      house_id,
      target_user_id,
      email,
      status,
      expires_at,
      created_at,
      houses:houses_of_sports(
        house_key,
        name_i18n
      )
    `,
    )
    .eq('id', inviteId)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (data.target_user_id && data.target_user_id !== userId) {
    return null;
  }

  if (!data.target_user_id) {
    const normalizedUserEmail = userEmail?.trim().toLowerCase();
    const normalizedInviteEmail = data.email?.trim().toLowerCase();
    if (!normalizedInviteEmail || !normalizedUserEmail || normalizedInviteEmail !== normalizedUserEmail) {
      return null;
    }
  }

  return data;
}

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const inviteId = searchParams.get('inviteId');

  if (!token && !inviteId) {
    return NextResponse.json({ success: false, error: 'Missing invite identifier.' }, { status: 400 });
  }

  try {
    const latestTerm = await loadHeadTerm();

    if (token) {
      const invite = await fetchInviteByToken(token);
      if (!invite || invite.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Convite inválido ou expirado.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        invite: {
          id: invite.id,
          houseId: invite.house_id,
          houseKey: invite.houses?.house_key ?? 'LEGACY',
          houseName: invite.houses?.name_i18n?.pt ?? invite.houses?.name_i18n?.en ?? 'House',
          expiresAt: invite.expires_at,
        },
        term: {
          version: latestTerm.version,
          content: latestTerm.content,
        },
      });
    }

    const auth = await requireAuth(request);
    if (!auth.success) return auth.response!;

    const invite = await fetchInviteForUser(inviteId!, auth.user!.userId, auth.user!.email ?? null);
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Convite não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        houseId: invite.house_id,
        houseKey: invite.houses?.house_key ?? 'LEGACY',
        houseName: invite.houses?.name_i18n?.pt ?? invite.houses?.name_i18n?.en ?? 'House',
        expiresAt: invite.expires_at,
      },
      term: {
        version: latestTerm.version,
        content: latestTerm.content,
      },
    });
  } catch (error) {
    console.error('[head-invites/context] failed', error);
    return NextResponse.json({ success: false, error: 'Falha ao carregar termo.' }, { status: 500 });
  }
}
