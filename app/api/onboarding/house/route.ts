import { NextResponse } from 'next/server';

import { fetchHouseOnboardingData } from '@/data/onboarding-demo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const house = searchParams.get('house') ?? 'LEGACY';

  try {
    const sequence = await fetchHouseOnboardingData(house);
    return NextResponse.json({ success: true, sequence });
  } catch (error) {
    console.error('[onboarding.house] Failed to fetch mock data', error);
    return NextResponse.json({ success: false, error: 'Failed to load onboarding data.' }, { status: 500 });
  }
}
