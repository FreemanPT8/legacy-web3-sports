import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type InviteRow = {
  id: string;
  email: string | null;
  token: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  target_user_id: string | null;
};

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, email, token, status, expires_at, created_at, target_user_id')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;
    const invites =
      (data as InviteRow[] | null)?.map((invite) => ({
        ...invite,
        inviteUrl: `${baseUrl}/head/invite?token=${invite.token}`,
      })) ?? [];
    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error('[head-invites] list failed', error);
    return NextResponse.json({ success: false, error: 'Failed to load invites.' }, { status: 500 });
  }
}

type CreatePayload = {
  email?: string | null;
  targetUserId?: string;
  expiresInDays?: number;
};

export async function POST(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  const actor = auth.user;
  if (actor?.role !== 'Super Admin') {
    return NextResponse.json({ success: false, error: 'Apenas Super Admin pode convidar Heads.' }, { status: 403 });
  }
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as CreatePayload;
    const targetUserId = body.targetUserId?.trim();
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Falta escolher a conta Admin.' }, { status: 400 });
    }

    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', targetUserId)
      .maybeSingle();
    if (userError) throw userError;
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    if (targetUser.role !== 'Super Admin' && targetUser.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas Admin ou Super Admin podem ser convidados.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(body.email) ?? normalizeEmail(targetUser.email);
    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: 'A conta selecionada não tem email válido.' }, { status: 400 });
    }

    const { data: existingInvite, error: existingError } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, status')
      .eq('house_id', houseId)
      .eq('target_user_id', targetUserId)
      .maybeSingle();
    if (existingError && existingError.code !== 'PGRST116') throw existingError;
    if (existingInvite && existingInvite.status === 'pending') {
      return NextResponse.json({ success: false, error: 'Já existe um convite pendente para este utilizador.' }, { status: 409 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const days = Math.max(1, Math.min(30, body.expiresInDays ?? 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error: insertError } = await supabaseAdmin.from('house_head_invites').insert({
      house_id: houseId,
      email: normalizedEmail,
      token,
      target_user_id: targetUserId,
      expires_at: expiresAt.toISOString(),
      created_by: actor?.userId ?? null,
      payload: {},
    });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      invite: {
        email: normalizedEmail,
        targetUserId,
      },
    });
  } catch (error: any) {
    console.error('[head-invites] create failed', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create invite.' }, { status: 500 });
  }
}
