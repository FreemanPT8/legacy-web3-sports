import { NextResponse } from 'next/server';

import { fetchHouseOnboardingData } from '@/data/onboarding-demo';
import type { HouseOnboardingSequence } from '@/types/onboarding';
import { supabaseAdmin, supabase } from '@/lib/supabase';

const houseOverrides = new Map<string, HouseOnboardingSequence>();
const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'house_onboarding_sequences';

const getHouseKey = (value: string | null) => (value || 'LEGACY').toUpperCase();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseKey = getHouseKey(searchParams.get('house'));

  try {
    const stored = houseOverrides.get(houseKey);
    if (stored) {
      return NextResponse.json({ success: true, sequence: stored });
    }

    const persistedSequence = await fetchPersistedSequence(houseKey);
    if (persistedSequence) {
      houseOverrides.set(houseKey, persistedSequence);
      return NextResponse.json({ success: true, sequence: persistedSequence });
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
    const normalized: HouseOnboardingSequence = {
      ...body.sequence,
      house: houseKey,
      popups: Array.isArray(body.sequence.popups) ? body.sequence.popups : [],
    };
    houseOverrides.set(houseKey, normalized);
    await persistSequence(houseKey, normalized);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding.house] Failed to store sequence', error);
    return NextResponse.json({ success: false, error: 'Failed to store onboarding data.' }, { status: 500 });
  }
}

async function fetchPersistedSequence(houseKey: string) {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from(TABLE_NAME)
      .select('sequence')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (error) {
      console.error('[onboarding.house] Failed to load persisted sequence', error);
      return null;
    }
    return (data?.sequence as HouseOnboardingSequence) ?? null;
  } catch (error) {
    console.error('[onboarding.house] Unexpected error loading persisted sequence', error);
    return null;
  }
}

async function persistSequence(houseKey: string, sequence: HouseOnboardingSequence) {
  if (!db) return;
  const payload = {
    house_key: houseKey,
    sequence,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from(TABLE_NAME).upsert(payload, { onConflict: 'house_key' });
  if (error) {
    console.error('[onboarding.house] Failed to persist sequence to Supabase', error);
    throw new Error(error.message || 'Failed to persist sequence');
  }
}
