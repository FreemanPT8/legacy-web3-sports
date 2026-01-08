import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const authResult = await requireAuth(request);
  if (!authResult.success) return authResult.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const houseKey = params.houseKey?.toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  const { data: house, error: houseError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (houseError || !house) {
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('user_houses')
    .select('role')
    .eq('house_id', house.id)
    .eq('user_id', authResult.user!.userId)
    .is('removed_at', null);
  if (membershipError) {
    console.error('[house membership] failed to load roles', membershipError);
    return NextResponse.json({ success: false, error: 'Failed to verify membership.' }, { status: 500 });
  }

  const roles = membership?.map((row: { role: string }) => row.role) ?? [];
  const isMember = roles.length > 0;

  return NextResponse.json({
    success: true,
    isMember,
    roles,
  });
}
