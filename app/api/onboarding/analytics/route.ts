import { NextResponse } from 'next/server';

import { supabaseAdmin, supabase } from '@/lib/supabase';
import type { HouseOnboardingSequence } from '@/types/onboarding';

const db = supabaseAdmin ?? supabase;
const LOG_TABLE = 'onboarding_popup_logs';
const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_ANALYTICS: HouseOnboardingSequence['analytics'] = {
  ctr: 0,
  completionRate: 0,
  manualApprovals: 0,
  blockedAttempts: 0,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const houseKey = (searchParams.get('house') || 'LEGACY').toUpperCase();
    const rawDays = Number(searchParams.get('days'));
    const lookbackDays = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : DEFAULT_LOOKBACK_DAYS;

    if (!db) {
      return NextResponse.json({ success: true, analytics: DEFAULT_ANALYTICS, totals: null, house: houseKey });
    }

    const sinceISO = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db
      .from(LOG_TABLE)
      .select('action')
      .eq('house_key', houseKey)
      .gte('created_at', sinceISO);

    if (error) {
      console.error('[onboarding.analytics] query failed', error);
      throw error;
    }

    type ActionRow = { action: string | null };
    const stats = { delivered: 0, primary: 0, secondary: 0, dismiss: 0 };
    ((data as ActionRow[]) ?? []).forEach((row) => {
      const action = row.action ?? '';
      if (action === 'delivered') stats.delivered += 1;
      else if (action === 'primary') stats.primary += 1;
      else if (action === 'secondary') stats.secondary += 1;
      else if (action === 'dismiss') stats.dismiss += 1;
    });

    const deliveredDenominator = Math.max(stats.delivered, 1);
    const totalClicks = stats.primary + stats.secondary;
    const analytics: HouseOnboardingSequence['analytics'] = {
      ctr: totalClicks / deliveredDenominator,
      completionRate: stats.primary / deliveredDenominator,
      manualApprovals: stats.secondary,
      blockedAttempts: stats.dismiss,
    };

    return NextResponse.json({
      success: true,
      analytics,
      totals: stats,
      house: houseKey,
      since: sinceISO,
      lookbackDays,
    });
  } catch (error) {
    console.error('[onboarding.analytics] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to compute onboarding analytics.' }, { status: 500 });
  }
}
