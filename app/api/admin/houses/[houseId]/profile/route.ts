import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { loadHouseProfile } from '@/lib/houses/profile';

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  try {
    const { data: houseRow, error } = await supabaseAdmin
      .from('houses_of_sports')
      .select('house_key')
      .eq('id', houseId)
      .maybeSingle();
    if (error) throw error;
    if (!houseRow?.house_key) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }
    const profile = await loadHouseProfile(houseRow.house_key, 'pt');
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Unable to load house profile.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error('[admin/houses/profile] Failed to load profile', err);
    return NextResponse.json({ success: false, error: 'Failed to load profile.' }, { status: 500 });
  }
}

