import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = (params.houseKey || '').toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const { data: houseRow, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('id')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError) throw houseError;
    if (!houseRow?.id) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const { data: membershipRows, error: membershipError } = await supabaseAdmin
      .from('user_houses')
      .select('role')
      .eq('user_id', user.userId)
      .eq('house_id', houseRow.id)
      .is('removed_at', null);
    if (membershipError) throw membershipError;

    const roles = (membershipRows ?? []).map((row) => row.role).filter(Boolean) as string[];
    const isMember = roles.length > 0;

    return NextResponse.json({ success: true, isMember, roles });
  } catch (error) {
    console.error('[houses/membership] failed to load membership', error);
    return NextResponse.json({ success: false, error: 'Failed to load membership.' }, { status: 500 });
  }
}

