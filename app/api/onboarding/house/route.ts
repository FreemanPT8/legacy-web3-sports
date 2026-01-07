import { NextRequest, NextResponse } from 'next/server';

import { fetchHouseOnboardingData } from '@/data/onboarding-demo';
import type { HouseOnboardingSequence, OnboardingPopup } from '@/types/onboarding';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware';
import { isAdminRole } from '@/lib/roles';

const houseOverrides = new Map<string, HouseOnboardingSequence>();
const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'house_onboarding_sequences';

const getHouseKey = (value: string | null) => (value || 'LEGACY').toUpperCase();
const DEFAULT_ANALYTICS: HouseOnboardingSequence['analytics'] = {
  ctr: 0,
  completionRate: 0,
  manualApprovals: 0,
  blockedAttempts: 0,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseKey = getHouseKey(searchParams.get('house'));

  try {
    const stored = houseOverrides.get(houseKey);
    if (stored) {
      return NextResponse.json({ success: true, sequence: stored });
    }

    const structured = await fetchStructuredSequence(houseKey);
    if (structured) {
      houseOverrides.set(houseKey, structured);
      return NextResponse.json({ success: true, sequence: structured });
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return auth.response!;
    }
    const user = auth.user!;
    const body = (await request.json()) as { sequence?: HouseOnboardingSequence };
    if (!body.sequence) {
      return NextResponse.json({ success: false, error: 'Missing sequence payload' }, { status: 400 });
    }
    const houseKey = getHouseKey(body.sequence.house);
    const authorized = await canEditHouseSequence(user.userId, user.role, houseKey);
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Sem autorização para editar esta House.' }, { status: 403 });
    }
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

async function canEditHouseSequence(userId: string, role: string | null, houseKey: string) {
  if (!db) return true;
  if (isAdminRole(role)) return true;
  try {
    const { data: sport, error: sportError } = await db
      .from('sports')
      .select('id, code')
      .ilike('code', houseKey)
      .maybeSingle();
    if (sportError || !sport?.id) {
      return false;
    }
    const { data: house, error: houseError } = await db
      .from('houses_of_sports')
      .select('id')
      .eq('sport_id', sport.id)
      .maybeSingle();
    if (houseError || !house?.id) {
      return false;
    }
    const { data: headRow, error: headError } = await db
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', house.id)
      .maybeSingle();
    if (headError || !headRow?.admin_id) {
      return false;
    }
    const { data: assignment, error: assignmentError } = await db
      .from('admin_assignments')
      .select('user_id')
      .eq('id', headRow.admin_id)
      .maybeSingle();
    if (assignmentError || !assignment?.user_id) {
      return false;
    }
    return assignment.user_id === userId;
  } catch (error) {
    console.error('[onboarding.house] Failed to verify head permissions', error);
    return false;
  }
}

async function fetchStructuredSequence(houseKey: string) {
  if (!db) return null;
  try {
    const { data: houseRow, error: houseError } = await db
      .from('houses_of_sports')
      .select('house_key, name_i18n, sport:sports!houses_of_sports_sport_id_fkey(name), id')
      .eq('house_key', houseKey)
      .maybeSingle();
    if (houseError || !houseRow?.house_key) {
      return null;
    }

    let headName = `Head of ${houseKey}`;
    const { data: headRow } = await db.from('house_heads').select('admin_id').eq('house_id', houseRow.id).maybeSingle();
    if (headRow?.admin_id) {
      const { data: assignmentRow } = await db
        .from('admin_assignments')
        .select('user_id')
        .eq('id', headRow.admin_id)
        .maybeSingle();
      if (assignmentRow?.user_id) {
        const { data: userRow } = await db
          .from('users')
          .select('full_name')
          .eq('id', assignmentRow.user_id)
          .maybeSingle();
        headName = userRow?.full_name || assignmentRow.user_id || headName;
      }
    }

    const { data: popupRows, error: popupError } = await db
      .from('onboarding_popups')
      .select(
        'id, house_key, language, title, body, highlights, badge_label, primary_cta, secondary_cta, status, updated_at',
      )
      .eq('house_key', houseKey)
      .eq('status', 'published')
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: false });

    if (popupError) {
      console.error('[onboarding.house] Failed to load live popups', popupError);
      return null;
    }
    if (!popupRows || popupRows.length === 0) {
      return null;
    }

    const popupIds = popupRows.map((row) => row.id);
    const triggerMap = new Map<string, Awaited<ReturnType<typeof mapTrigger>>>();
    if (popupIds.length) {
      const { data: triggerRows, error: triggerError } = await db
        .from('onboarding_triggers')
        .select('*')
        .in('popup_id', popupIds);
      if (triggerError) {
        console.error('[onboarding.house] Failed to load trigger rows', triggerError);
      } else {
        triggerRows?.forEach((row) => {
          triggerMap.set(row.popup_id, mapTrigger(row));
        });
      }
    }

    const popups: OnboardingPopup[] = popupRows.map((row) => {
      const trigger = triggerMap.get(row.id);
      return {
        id: row.id,
        house: row.house_key,
        title: row.title,
        body: row.body,
        highlights: row.highlights ?? [],
        badgeLabel: row.badge_label ?? undefined,
        primaryCta: row.primary_cta ?? undefined,
        secondaryCta: row.secondary_cta ?? undefined,
        status: row.status,
        language: row.language,
        xpGate: trigger?.label,
        trigger: trigger?.trigger,
      };
    });

    const persistedAnalytics = await fetchPersistedSequence(houseKey);
    const analytics = persistedAnalytics?.analytics ?? DEFAULT_ANALYTICS;
    const sportName = houseRow.sport?.name ?? houseKey;

    return {
      house: houseKey,
      sport: sportName,
      head: headName,
      popups,
      analytics,
    };
  } catch (error) {
    console.error('[onboarding.house] Failed to build structured sequence', error);
    return null;
  }
}

function mapTrigger(row: any) {
  if (!row) return undefined;
  if (row.trigger_type === 'xp') {
    const value = typeof row.xp_min === 'number' ? row.xp_min : 0;
    return {
      label: `XP ${value}`,
      trigger: { type: 'xp' as const, value, label: `XP ${value}` },
    };
  }
  if (row.trigger_type === 'content') {
    const contentId = row.content_id || '';
    if (!contentId) {
      return undefined;
    }
    const contentType = (row.content_type || 'lesson') as 'lesson' | 'course' | 'blog';
    return {
      label: row.metadata?.label ?? `${contentType}:${contentId}`,
      trigger: {
        type: 'content' as const,
        contentType,
        contentId,
        contentTitle: row.metadata?.title ?? row.metadata?.label ?? undefined,
        label: row.metadata?.label ?? `${contentType}:${contentId}`,
      },
    };
  }
  return undefined;
}
