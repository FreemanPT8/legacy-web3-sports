import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { getHouseHeadHouseIds } from '@/lib/server/house-heads';
import { formatMissingResourceError, isMissingColumn, isMissingTable } from '@/lib/postgres';
import { logHouseHistory } from '@/lib/houses/history';

type InviteRow = {
  id: string;
  email: string | null;
  token: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  target_user_id: string | null;
};

type InviteInsertPayload = {
  house_id: string;
  email: string;
  token: string;
  status: string;
  target_user_id?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  payload?: Record<string, unknown>;
};

const OPTIONAL_INSERT_FIELDS: (keyof InviteInsertPayload)[] = ['target_user_id', 'created_by', 'payload', 'expires_at'];

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function missingTableResponse(table: string) {
  return NextResponse.json({ success: false, error: formatMissingResourceError(table) }, { status: 500 });
}

async function insertInviteWithFallback(basePayload: InviteInsertPayload) {
  if (!supabaseAdmin) return { error: new Error('Supabase admin client unavailable.') };

  const omitPermutations: (keyof InviteInsertPayload)[][] = [[]];
  OPTIONAL_INSERT_FIELDS.forEach((field) => {
    omitPermutations.push([...omitPermutations[omitPermutations.length - 1], field]);
  });

  for (const omitList of omitPermutations) {
    const attemptPayload: InviteInsertPayload = { ...basePayload };
    omitList.forEach((field) => {
      delete attemptPayload[field];
    });

    const { error } = await supabaseAdmin.from('house_head_invites').insert(attemptPayload);
    if (!error) return { success: true };

    if (isMissingTable(error)) {
      return { tableMissing: true };
    }

    if (!isMissingColumn(error)) {
      return { error };
    }
  }

  return { error: new Error('house_head_invites schema missing required columns.') };
}

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    let { data, error } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, email, token, status, expires_at, created_at, target_user_id')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTable(error)) return missingTableResponse('house_head_invites');
      if (isMissingColumn(error)) {
        console.warn('[head-invites] legacy schema detected when listing invites.');
        const fallback = await supabaseAdmin
          .from('house_head_invites')
          .select('id, email, token, status, expires_at, created_at')
          .eq('house_id', houseId)
          .order('created_at', { ascending: false });
        if (fallback.error) {
          if (isMissingTable(fallback.error)) return missingTableResponse('house_head_invites');
          throw fallback.error;
        }
        data = (fallback.data ?? []).map((row: InviteRow) => ({ ...row, target_user_id: null }));
      } else {
        throw error;
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin || 'legacy.local'}`;
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
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as CreatePayload;
    const targetUserId = body.targetUserId?.trim();
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Falta escolher a conta Admin.' }, { status: 400 });
    }

    const isSuperAdmin = actor?.role === 'Super Admin';
    let actorCanInvite = isSuperAdmin;
    if (!actorCanInvite && actor?.role === 'Admin') {
      const headHouseIds = await getHouseHeadHouseIds(actor.userId);
      actorCanInvite = headHouseIds.includes(houseId);
    }
    if (!actorCanInvite) {
      return NextResponse.json(
        { success: false, error: 'Apenas o Super Admin ou o Head desta House podem enviar convites.' },
        { status: 403 },
      );
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

    let existingInvite: InviteRow | null = null;
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, status')
      .eq('house_id', houseId)
      .eq('target_user_id', targetUserId)
      .maybeSingle();
    if (existingError) {
      if (isMissingTable(existingError)) return missingTableResponse('house_head_invites');
      if (isMissingColumn(existingError)) {
        const fallback = await supabaseAdmin
          .from('house_head_invites')
          .select('id, status')
          .eq('house_id', houseId)
          .eq('email', normalizedEmail)
          .maybeSingle();
        if (fallback.error) {
          if (isMissingTable(fallback.error)) return missingTableResponse('house_head_invites');
          if (fallback.error.code !== 'PGRST116') throw fallback.error;
        } else {
          existingInvite = (fallback.data as InviteRow | null) ?? null;
        }
      } else if (existingError.code !== 'PGRST116') {
        throw existingError;
      }
    } else {
      existingInvite = (existingData as InviteRow | null) ?? null;
    }

    if (existingInvite && existingInvite.status === 'pending') {
      return NextResponse.json({ success: false, error: 'Já existe um convite pendente para este utilizador.' }, { status: 409 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const days = Math.max(1, Math.min(30, body.expiresInDays ?? 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const baseInvitePayload: InviteInsertPayload = {
      house_id: houseId,
      email: normalizedEmail,
      token,
      target_user_id: targetUserId,
      expires_at: expiresAt.toISOString(),
      created_by: actor?.userId ?? null,
      payload: {},
      status: 'pending',
    };

    const insertResult = await insertInviteWithFallback(baseInvitePayload);
    if (insertResult.tableMissing) return missingTableResponse('house_head_invites');
    if (insertResult.error) throw insertResult.error;

    await logHouseHistory({
      houseId,
      action: 'head.invite_created',
      actorId: actor?.userId ?? null,
      payload: {
        email: normalizedEmail,
        targetUserId,
        expiresAt: expiresAt.toISOString(),
      },
    });

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
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create invite.', details: error?.details },
      { status: 500 },
    );
  }
}

type DeletePayload = {
  inviteId?: string;
};

export async function DELETE(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as DeletePayload;
    if (!body.inviteId) {
      return NextResponse.json({ success: false, error: 'inviteId em falta.' }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('house_head_invites')
      .select('*')
      .eq('id', body.inviteId)
      .eq('house_id', houseId)
      .maybeSingle();
    if (inviteError) {
      if (isMissingTable(inviteError)) return missingTableResponse('house_head_invites');
      throw inviteError;
    }
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Convite nÇœo encontrado.' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Este convite jÇ­ foi utilizado, expirado ou cancelado.' },
        { status: 409 },
      );
    }

    const isSuperAdmin = auth.user?.role === 'Super Admin';
    let actorCanCancel = isSuperAdmin;
    if (!actorCanCancel && auth.user?.role === 'Admin') {
      const headHouseIds = await getHouseHeadHouseIds(auth.user.userId);
      actorCanCancel = headHouseIds.includes(houseId);
    }
    if (!actorCanCancel) {
      return NextResponse.json({ success: false, error: 'Sem permissÇõÇœo para cancelar este convite.' }, { status: 403 });
    }

    const { error: cancelError } = await supabaseAdmin
      .from('house_head_invites')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', body.inviteId);
    if (cancelError) throw cancelError;

    await logHouseHistory({
      houseId,
      action: 'head.invite_cancelled',
      actorId: auth.user?.userId ?? null,
      payload: {
        inviteId: body.inviteId,
        email: invite.email,
        targetUserId: invite.target_user_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[head-invites] delete failed', error);
    return NextResponse.json({ success: false, error: error?.message || 'Falha ao cancelar convite.' }, { status: 500 });
  }
}
