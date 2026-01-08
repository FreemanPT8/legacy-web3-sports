import { NextRequest, NextResponse } from 'next/server';

import { loadHouseProfile, normalizeLocale } from '@/lib/houses/profile';

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  const localeParam = request.nextUrl.searchParams.get('locale') ?? undefined;
  const locale = normalizeLocale(localeParam);

  try {
    const profile = await loadHouseProfile(params.houseKey, locale);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'House not found or profile unavailable.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('[api/houses/[houseKey]] Failed to load profile', error);
    return NextResponse.json({ success: false, error: 'Failed to load house profile.' }, { status: 500 });
  }
}

