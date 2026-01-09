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

function isMissingColumn(error?: { code?: string }) {
  return error?.code === '42703';
}

function isMissingTable(error?: { code?: string }) {
  return error?.code === '42P01';
}

async function actorIsHouseHead(userId: string | undefined, houseId: string): Promise<boolean> {
  if (!userId || !supabaseAdmin) return false;

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('admin_assignments')
    .select('id')
    .eq('user_id', userId);

  if (assignmentsError) throw assignmentsError;

  const adminIds = (assignments ?? []).map((row: { id: string }) => row.id);
  if (!adminIds.length) return false;

  const { data: headRow, error: headError } = await supabaseAdmin
    .from('house_heads')
    .select('id')
    .eq('house_id', houseId)
    .in('admin_id', adminIds)
    .maybeSingle();

  if (headError && headError.code !== 'PGRST116') throw headError;

  return Boolean(headRow);
}

function missingTableResponse(tableName: string) {
  return NextResponse.json(
    {
      success: false,
      error: `Tabela ${tableName} inexistente. Corre as migrações pendentes no Supabase.`,
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    let { data, error } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, email, token, status, expires_at, created_at, target_user_id')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingColumn(error)) {
        console.warn('[head-invites] target_user_id column missing, falling back to legacy schema');
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
      } else if (isMissingTable(error)) {
        return missingTableResponse('house_head_invites');
      } else {
        throw error;
      }
    }

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
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });

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
      actorCanInvite = await actorIsHouseHead(actor.userId, houseId);
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
      return NextResponse.json({ success: false, error: 'Utilizador nuo encontrado.' }, { status: 404 });
    }

    if (targetUser.role !== 'Super Admin' && targetUser.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas Admin ou Super Admin podem ser convidados.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(body.email) ?? normalizeEmail(targetUser.email);
    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: 'A conta selecionada nuo tem email volido.' }, { status: 400 });
    }

    let existingInvite: InviteRow | null = null;
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, status')
      .eq('house_id', houseId)
      .eq('target_user_id', targetUserId)
      .maybeSingle();

    if (existingError) {
      if (existingError.code === 'PGRST116') {
        // no rows
      } else if (isMissingColumn(existingError)) {
        console.warn('[head-invites] target_user_id missing while checking duplicates, falling back to email');
        const fallback = await supabaseAdmin
          .from('house_head_invites')
          .select('id, status')
          .eq('house_id', houseId)
          .eq('email', normalizedEmail)
          .maybeSingle();
        if (fallback.error && fallback.error.code !== 'PGRST116') {
          if (isMissingTable(fallback.error)) return missingTableResponse('house_head_invites');
          throw fallback.error;
        }
        existingInvite = (fallback.data as InviteRow | null) ?? null;
      } else if (isMissingTable(existingError)) {
        return missingTableResponse('house_head_invites');
      } else {
        throw existingError;
      }
    } else {
      existingInvite = (existingData as InviteRow | null) ?? null;
    }

    if (existingInvite && existingInvite.status === 'pending') {
      return NextResponse.json({ success: false, error: 'Jo existe um convite pendente para este utilizador.' }, { status: 409 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const days = Math.max(1, Math.min(30, body.expiresInDays ?? 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const baseInvitePayload: Record<string, unknown> = {
      house_id: houseId,
      email: normalizedEmail,
      token,
      target_user_id: targetUserId,
      expires_at: expiresAt.toISOString(),
      created_by: actor?.userId ?? null,
      payload: {},
      status: 'pending',
    };

    let insertError = (await supabaseAdmin.from('house_head_invites').insert(baseInvitePayload)).error;
    if (insertError) {
      if (isMissingColumn(insertError)) {
        console.warn('[head-invites] missing target_user_id column, retrying without it');
        const fallbackPayload = { ...baseInvitePayload };
        delete fallbackPayload.target_user_id;
        insertError = (await supabaseAdmin.from('house_head_invites').insert(fallbackPayload)).error;
      }
      if (insertError) {
        if (isMissingTable(insertError)) return missingTableResponse('house_head_invites');
        throw insertError;
      }
    }

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

