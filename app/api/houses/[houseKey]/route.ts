import { NextRequest, NextResponse } from 'next/server';

import { loadHouseProfile, normalizeLocale } from '@/lib/houses/profile';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get('locale'));
  const houseKey = params.houseKey?.toUpperCase();

  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const payload = await loadHouseProfile(houseKey, locale);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error('[houses] failed to load profile', error);
    return NextResponse.json({ success: false, error: 'Failed to load house profile.' }, { status: 500 });
  }
}
