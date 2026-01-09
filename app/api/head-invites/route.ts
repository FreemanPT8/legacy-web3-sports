import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const email = normalizeEmail(auth.user!.email);
  if (!email) {
    return NextResponse.json({ success: true, invites: [] });
  }

  try {
    const escapedEmail = email.replace(/[%_]/g, (match) => `\\${match}`);
    const { data, error } = await supabaseAdmin
      .from('house_head_invites')
      .select(
        `
        id,
        house_id,
        email,
        status,
        token,
        expires_at,
        created_at,
        houses:houses_of_sports(
          house_key,
          name_i18n,
          country_code
        )
      `,
      )
      .eq('status', 'pending')
      .ilike('email', escapedEmail)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const invites =
      data?.map((invite: {
        id: string;
        house_id: string;
        email: string | null;
        status: string | null;
        token: string | null;
        expires_at: string | null;
        created_at: string | null;
        houses: { house_key?: string | null; name_i18n?: Record<string, string> | null; country_code?: string | null } | null;
      }) => ({
        id: invite.id,
        houseId: invite.house_id,
        houseKey: invite.houses?.house_key ?? 'LEGACY',
        houseName: invite.houses?.name_i18n?.pt ?? invite.houses?.name_i18n?.en ?? invite.houses?.house_key ?? 'House',
        countryCode: invite.houses?.country_code ?? null,
        email: invite.email ?? '',
        status: invite.status,
        token: invite.token,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      })) ?? [];

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error('[head-invites] list for user failed', error);
    return NextResponse.json({ success: false, invites: [], error: 'Failed to load invites.' }, { status: 500 });
  }
}
