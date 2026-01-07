import { NextRequest, NextResponse } from 'next/server';

import { fetchHouseOnboardingData } from '@/data/onboarding-demo';
import type { HouseOnboardingSequence, OnboardingPopup } from '@/types/onboarding';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { hasCompletedContent } from '@/lib/xp';

const db = supabaseAdmin ?? supabase;
const SEQUENCE_TABLE = 'house_onboarding_sequences';
const QUEUE_TABLE = 'onboarding_queue';
const LOG_TABLE = 'onboarding_popup_logs';
const USERS_TABLE = 'users';

const DAILY_LIMIT = 1;
const WEEKLY_LIMIT = 3;
const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = DAY_MS * 7;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.user!;
  const { searchParams } = new URL(request.url);
  const houseKey = getHouseKey(searchParams.get('house'));

  try {
    const sequence = await loadHouseSequence(houseKey);
    const publishedPopups = (sequence.popups ?? []).filter(
      (popup) => ((popup as OnboardingPopup & { status?: 'draft' | 'ready' | 'published' }).status ?? 'draft') === 'published',
    );
    if (!publishedPopups.length) {
      return NextResponse.json({ success: false, error: 'No onboarding sequence available.' }, { status: 404 });
    }

    if (!db) {
      return NextResponse.json(
        { success: true, queue: publishedPopups, signature: buildSignature(publishedPopups) },
        { status: 200 },
      );
    }

    const xpTotal = await fetchUserXpTotal(user.userId);
    const logStats = await fetchUserLogStats(user.userId);
    const completionCache = new Map<string, boolean>();

    const deliveredSet = new Set(logStats.logs.filter((log) => log.action === 'delivered').map((log) => log.popup_id));

    const eligiblePopups: OnboardingPopup[] = [];
    for (const popup of publishedPopups) {
      if (!popup || deliveredSet.has(popup.id)) continue;
      const satisfies = await evaluateTrigger(popup, xpTotal, user.userId, completionCache);
      if (satisfies) {
        eligiblePopups.push(popup);
      }
    }

    let cooldownReason: 'daily' | 'weekly' | null = null;
    if (logStats.dailyDelivered >= DAILY_LIMIT) {
      cooldownReason = 'daily';
    } else if (logStats.weeklyDelivered >= WEEKLY_LIMIT) {
      cooldownReason = 'weekly';
    }

    const signature = eligiblePopups.length ? buildSignature(eligiblePopups) : null;
    await persistQueue(user.userId, houseKey, cooldownReason ? [] : eligiblePopups, cooldownReason ? null : signature);

    return NextResponse.json({
      success: true,
      queue: cooldownReason ? [] : eligiblePopups,
      signature: cooldownReason ? null : signature,
      cooldownReason,
    });
  } catch (error) {
    console.error('[onboarding.engine] failed to build queue', error);
    return NextResponse.json({ success: false, error: 'Failed to build onboarding queue.' }, { status: 500 });
  }
}

function getHouseKey(value: string | null) {
  return (value || 'LEGACY').toUpperCase();
}

async function loadHouseSequence(houseKey: string): Promise<HouseOnboardingSequence> {
  if (!db) {
    return fetchHouseOnboardingData(houseKey);
  }
  const { data, error } = await db
    .from(SEQUENCE_TABLE)
    .select('sequence')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (error) {
    console.error('[onboarding.engine] failed to fetch persisted sequence', error);
    return fetchHouseOnboardingData(houseKey);
  }
  const stored = (data?.sequence as HouseOnboardingSequence | null) ?? null;
  if (stored) return stored;
  return fetchHouseOnboardingData(houseKey);
}

async function fetchUserXpTotal(userId: string): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db.from(USERS_TABLE).select('xp_total').eq('id', userId).maybeSingle();
  if (error || !data) {
    console.error('[onboarding.engine] failed to fetch xp_total', error);
    return 0;
  }
  return data.xp_total ?? 0;
}

type LogRow = {
  popup_id: string;
  action: 'delivered' | string;
  created_at: string;
};

async function fetchUserLogStats(userId: string) {
  if (!db) {
    return { logs: [] as LogRow[], dailyDelivered: 0, weeklyDelivered: 0 };
  }
  const weekCutoff = new Date(Date.now() - WEEK_MS).toISOString();
  const { data, error } = await db
    .from(LOG_TABLE)
    .select('popup_id, action, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekCutoff)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[onboarding.engine] failed to fetch logs', error);
    return { logs: [] as LogRow[], dailyDelivered: 0, weeklyDelivered: 0 };
  }
  const logs = (data as LogRow[]) ?? [];
  const now = Date.now();
  const dailyCutoff = now - DAY_MS;
  const weeklyCutoff = now - WEEK_MS;
  const dailyDelivered = logs.filter(
    (log) => log.action === 'delivered' && new Date(log.created_at).getTime() >= dailyCutoff,
  ).length;
  const weeklyDelivered = logs.filter(
    (log) => log.action === 'delivered' && new Date(log.created_at).getTime() >= weeklyCutoff,
  ).length;
  return { logs, dailyDelivered, weeklyDelivered };
}

async function evaluateTrigger(
  popup: OnboardingPopup,
  xpTotal: number,
  userId: string,
  cache: Map<string, boolean>,
): Promise<boolean> {
  if (!popup.trigger) return true;
  if (popup.trigger.type === 'xp') {
    const gate = typeof popup.trigger.value === 'number' ? popup.trigger.value : extractNumber(popup.xpGate) ?? 0;
    return xpTotal >= gate;
  }
  if (popup.trigger.type === 'content') {
    const contentId = (popup.trigger.contentId || '').trim();
    if (!contentId) return false;
    const contentType = popup.trigger.contentType || 'lesson';
    const cacheKey = `${contentType}:${contentId}`.toLowerCase();
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    let completed = false;
    if (contentType === 'course') {
      completed = await hasCompletedCourse(userId, contentId);
    } else if (contentType === 'blog') {
      completed = await hasCompletedContent(userId, contentId, 'blog');
    } else {
      completed = await hasCompletedContent(userId, contentId, 'lesson');
    }
    cache.set(cacheKey, completed);
    return completed;
  }
  return true;
}

async function hasCompletedCourse(userId: string, courseIdentifier: string): Promise<boolean> {
  if (!db) return false;
  const normalized = courseIdentifier.toLowerCase();
  const filters = [`course_id.eq.${courseIdentifier}`];
  if (normalized !== courseIdentifier) {
    filters.push(`course_id.eq.${normalized}`);
  }
  filters.push(`course_slug.eq.${normalized}`);
  const { data, error } = await db
    .from('course_completions')
    .select('course_id')
    .eq('user_id', userId)
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();
  if (error && (error as any).code !== 'PGRST116') {
    console.error('[onboarding.engine] failed to verify course completion', error);
  }
  return !!data;
}

async function persistQueue(
  userId: string,
  houseKey: string,
  payload: OnboardingPopup[],
  signature: string | null,
): Promise<void> {
  if (!db) return;
  await db
    .from(QUEUE_TABLE)
    .upsert(
      {
        user_id: userId,
        house_key: houseKey,
        queue_payload: payload,
        queue_signature: signature,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}

function buildSignature(popups: OnboardingPopup[]) {
  return popups.map((popup) => popup.id).join('|');
}

function extractNumber(value?: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  return match ? Number(match[0]) : null;
}
