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
};

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'Admin client unavailable.' }, { status: 500 });

  const houseId = params.houseId;
  if (!houseId) return NextResponse.json({ success: false, error: 'Missing houseId' }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin
      .from('house_head_invites')
      .select('id, email, token, status, expires_at, created_at')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;
    const invites = (data as InviteRow[] | null)?.map((invite) => ({
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
    const token = crypto.randomBytes(24).toString('hex');
    const days = Math.max(1, Math.min(30, body.expiresInDays ?? 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error: insertError } = await supabaseAdmin.from('house_head_invites').insert({
      house_id: houseId,
      email: body.email || null,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: actor?.userId ?? null,
      payload: {},
    });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[head-invites] create failed', error);
    return NextResponse.json({ success: false, error: 'Failed to create invite.' }, { status: 500 });
  }
}
