import { NextResponse } from 'next/server';

import { fetchHouseOnboardingData } from '@/data/onboarding-demo';
import type { HouseOnboardingSequence } from '@/types/onboarding';

const houseOverrides = new Map<string, HouseOnboardingSequence>();

const getHouseKey = (value: string | null) => (value || 'LEGACY').toUpperCase();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseKey = getHouseKey(searchParams.get('house'));

  try {
    const stored = houseOverrides.get(houseKey);
    if (stored) {
      return NextResponse.json({ success: true, sequence: stored });
    }
    const sequence = await fetchHouseOnboardingData(houseKey);
    return NextResponse.json({ success: true, sequence });
  } catch (error) {
    console.error('[onboarding.house] Failed to fetch mock data', error);
    return NextResponse.json({ success: false, error: 'Failed to load onboarding data.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sequence?: HouseOnboardingSequence };
    if (!body.sequence) {
      return NextResponse.json({ success: false, error: 'Missing sequence payload' }, { status: 400 });
    }
    const houseKey = getHouseKey(body.sequence.house);
    houseOverrides.set(houseKey, {
      ...body.sequence,
      house: houseKey,
      popups: Array.isArray(body.sequence.popups) ? body.sequence.popups : [],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding.house] Failed to store sequence', error);
    return NextResponse.json({ success: false, error: 'Failed to store onboarding data.' }, { status: 500 });
  }
}
