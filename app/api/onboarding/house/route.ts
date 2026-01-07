import { NextRequest, NextResponse } from 'next/server';

import { fetchHouseOnboardingData } from '@/data/onboarding-demo';
import type {
  HouseOnboardingSequence,
  OnboardingPopup,
  OnboardingPopupLanguage,
  OnboardingPopupLocalizedCopy,
  OnboardingPopupLocalizedFields,
} from '@/types/onboarding';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware';
import { isAdminRole } from '@/lib/roles';

const houseOverrides = new Map<string, HouseOnboardingSequence>();
const db = supabaseAdmin ?? supabase;
const TABLE_NAME = 'house_onboarding_sequences';
const POPUP_LANGUAGES: OnboardingPopupLanguage[] = ['pt', 'es', 'en'];
const DEFAULT_POPUP_LANGUAGE: OnboardingPopupLanguage = 'pt';

type PopupRow = {
  id: string;
  house_key: string;
  language: string | null;
  title: string;
  body: string;
  highlights?: string[] | null;
  badge_label?: string | null;
  primary_cta?: Record<string, unknown> | null;
  secondary_cta?: Record<string, unknown> | null;
  status: string;
  updated_at?: string | null;
  copy_i18n?: Record<string, unknown> | null;
  priority?: number | null;
};

type TriggerRow = {
  popup_id: string;
  trigger_type: string;
  xp_min?: number | null;
  content_type?: string | null;
  content_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

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
  const timestamp = new Date().toISOString();
  const payload = {
    house_key: houseKey,
    sequence,
    updated_at: timestamp,
  };
  const { error } = await db.from(TABLE_NAME).upsert(payload, { onConflict: 'house_key' });
  if (error) {
    console.error('[onboarding.house] Failed to persist sequence to Supabase', error);
    throw new Error(error.message || 'Failed to persist sequence');
  }
  await persistLivePopups(houseKey, sequence, timestamp);
}

async function persistLivePopups(houseKey: string, sequence: HouseOnboardingSequence, timestamp: string) {
  if (!db) return;
  const popupTable = 'onboarding_popups';
  const triggerTable = 'onboarding_triggers';

  try {
    const { data: existingPopups, error: existingError } = await db
      .from(popupTable)
      .select('id')
      .eq('house_key', houseKey);
    if (existingError) {
      throw existingError;
    }
    const existingIds = (existingPopups ?? []).map((row: { id: string }) => row.id).filter(Boolean);
    if (existingIds.length) {
      const { error: triggerCleanupError } = await db.from(triggerTable).delete().in('popup_id', existingIds);
      if (triggerCleanupError) {
        throw triggerCleanupError;
      }
    }
    const { error: popupCleanupError } = await db.from(popupTable).delete().eq('house_key', houseKey);
    if (popupCleanupError) {
      throw popupCleanupError;
    }
    if (!sequence.popups.length) {
      return;
    }

    const popupRows = sequence.popups.map((popup, index) => {
      const defaultCopy = resolveDefaultCopy(popup);
      return {
        id: popup.id,
        house_key: houseKey,
        language: popup.language ?? null,
        title: defaultCopy.title,
        body: defaultCopy.body,
        highlights: defaultCopy.highlights ?? [],
        badge_label: defaultCopy.badgeLabel ?? null,
        primary_cta: normalizeCta(popup.primaryCta, defaultCopy.primaryCtaLabel),
        secondary_cta: normalizeCta(popup.secondaryCta, defaultCopy.secondaryCtaLabel),
        status: popup.status ?? 'draft',
        priority: index,
        updated_at: timestamp,
        copy_i18n: buildLocalizedPayload(popup),
      };
    });

    const { error: insertPopupError } = await db.from(popupTable).insert(popupRows);
    if (insertPopupError) {
      throw insertPopupError;
    }

    const triggerRows = sequence.popups
      .map((popup) => {
        if (!popup.trigger) return null;
        if (popup.trigger.type === 'xp') {
          return {
            popup_id: popup.id,
            trigger_type: 'xp',
            xp_min: popup.trigger.value ?? 0,
            metadata: {
              label: popup.trigger.label ?? popup.xpGate ?? `XP ${popup.trigger.value ?? 0}`,
            },
          };
        }
        if (!popup.trigger.contentId) {
          return null;
        }
        return {
          popup_id: popup.id,
          trigger_type: 'content',
          content_type: popup.trigger.contentType,
          content_id: popup.trigger.contentId,
          metadata: {
            label: popup.trigger.label ?? popup.trigger.contentTitle ?? popup.trigger.contentId,
            title: popup.trigger.contentTitle ?? null,
          },
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (triggerRows.length) {
      const { error: insertTriggerError } = await db.from(triggerTable).insert(triggerRows);
      if (insertTriggerError) {
        throw insertTriggerError;
      }
    }
  } catch (error) {
    console.error('[onboarding.house] Failed to persist live popups/triggers', error);
    throw new Error('Failed to persist live popups');
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
      .order('updated_at', { ascending: false }) as { data: PopupRow[] | null; error: unknown };

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
        .in('popup_id', popupIds) as { data: TriggerRow[] | null; error: unknown };
      if (triggerError) {
        console.error('[onboarding.house] Failed to load trigger rows', triggerError);
      } else {
        triggerRows?.forEach((row: TriggerRow) => {
          triggerMap.set(row.popup_id, mapTrigger(row));
        });
      }
    }

    const popups: OnboardingPopup[] = popupRows.map((row: PopupRow) => {
      const trigger = triggerMap.get(row.id);
      const xpGateLabel = typeof trigger?.label === 'string' ? trigger.label : undefined;
      const localized = normalizeLocalizedCopy(row);
      const defaultLocalized = getLocalizedEntryFromRow(row, localized, DEFAULT_POPUP_LANGUAGE);
      const popupStatus: OnboardingPopup['status'] =
        row.status === 'published' || row.status === 'ready' || row.status === 'draft'
          ? row.status
          : 'draft';
      return {
        id: row.id,
        house: row.house_key,
        title: defaultLocalized.title,
        body: defaultLocalized.body,
        highlights: defaultLocalized.highlights ?? [],
        badgeLabel: defaultLocalized.badgeLabel ?? undefined,
        primaryCta: mergeCta((row.primary_cta as OnboardingPopup['primaryCta']) ?? undefined, defaultLocalized.primaryCtaLabel),
        secondaryCta: mergeCta((row.secondary_cta as OnboardingPopup['secondaryCta']) ?? undefined, defaultLocalized.secondaryCtaLabel),
        status: popupStatus,
        language: row.language,
        xpGate: xpGateLabel,
        trigger: trigger?.trigger,
        localized,
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

function mapTrigger(row: TriggerRow) {
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
    const label =
      typeof row.metadata?.label === 'string' ? row.metadata?.label : `${contentType}:${contentId}`;
    const title = typeof row.metadata?.title === 'string' ? row.metadata?.title : undefined;
    return {
      label,
      trigger: {
        type: 'content' as const,
        contentType,
        contentId,
        contentTitle: title ?? label,
        label,
      },
    };
  }
  return undefined;
}

function normalizeCta(
  cta: OnboardingPopup['primaryCta'] | undefined,
  labelOverride?: string,
): OnboardingPopup['primaryCta'] | undefined {
  if (!cta && !labelOverride) return undefined;
  return {
    label: labelOverride ?? cta?.label ?? '',
    href: cta?.href,
    onClick: undefined,
  };
}

function mergeCta(
  cta: OnboardingPopup['primaryCta'] | undefined,
  localizedLabel?: string,
): OnboardingPopup['primaryCta'] | undefined {
  if (!cta && !localizedLabel) return undefined;
  return {
    label: localizedLabel ?? cta?.label ?? '',
    href: cta?.href,
    onClick: cta?.onClick,
  };
}

function resolveDefaultCopy(popup: OnboardingPopup): OnboardingPopupLocalizedFields {
  const base =
    popup.localized?.[DEFAULT_POPUP_LANGUAGE] ??
    {
      title: popup.title,
      body: popup.body,
      highlights: popup.highlights ?? [],
      badgeLabel: popup.badgeLabel,
      primaryCtaLabel: popup.primaryCta?.label,
      secondaryCtaLabel: popup.secondaryCta?.label,
    };
  return {
    title: base.title ?? '',
    body: base.body ?? '',
    highlights: Array.isArray(base.highlights) ? base.highlights : [],
    badgeLabel: base.badgeLabel,
    primaryCtaLabel: base.primaryCtaLabel,
    secondaryCtaLabel: base.secondaryCtaLabel,
  };
}

function buildLocalizedPayload(popup: OnboardingPopup) {
  if (!popup.localized) return null;
  const payload: Record<string, unknown> = {};
  for (const lang of POPUP_LANGUAGES) {
    const entry = popup.localized[lang];
    if (!entry) continue;
    payload[lang] = {
      title: entry.title ?? '',
      body: entry.body ?? '',
      highlights: entry.highlights ?? [],
      badgeLabel: entry.badgeLabel ?? null,
      primaryCtaLabel: entry.primaryCtaLabel ?? null,
      secondaryCtaLabel: entry.secondaryCtaLabel ?? null,
    };
  }
  return payload;
}

function normalizeLocalizedCopy(row: PopupRow): OnboardingPopupLocalizedCopy | null {
  const raw = (row.copy_i18n as Record<string, any> | null) ?? null;
  const localized: OnboardingPopupLocalizedCopy = {};
  if (raw) {
    for (const [langKey, value] of Object.entries(raw)) {
      const normalizedLang = langKey.toLowerCase() as OnboardingPopupLanguage;
      if (!POPUP_LANGUAGES.includes(normalizedLang)) continue;
      localized[normalizedLang] = {
        title: typeof value?.title === 'string' ? value.title : '',
        body: typeof value?.body === 'string' ? value.body : '',
        highlights: Array.isArray(value?.highlights)
          ? value.highlights.filter((item: unknown) => typeof item === 'string')
          : [],
        badgeLabel: typeof value?.badgeLabel === 'string' ? value.badgeLabel : undefined,
        primaryCtaLabel: typeof value?.primaryCtaLabel === 'string' ? value.primaryCtaLabel : undefined,
        secondaryCtaLabel: typeof value?.secondaryCtaLabel === 'string' ? value.secondaryCtaLabel : undefined,
      };
    }
  }
  if (!localized[DEFAULT_POPUP_LANGUAGE]) {
    localized[DEFAULT_POPUP_LANGUAGE] = {
      title: row.title,
      body: row.body,
      highlights: row.highlights ?? [],
      badgeLabel: row.badge_label ?? undefined,
      primaryCtaLabel: (row.primary_cta as OnboardingPopup['primaryCta'])?.label,
      secondaryCtaLabel: (row.secondary_cta as OnboardingPopup['secondaryCta'])?.label,
    };
  }
  return Object.keys(localized).length ? localized : null;
}

function getLocalizedEntryFromRow(
  row: PopupRow,
  localized: OnboardingPopupLocalizedCopy | null,
  lang: OnboardingPopupLanguage,
): OnboardingPopupLocalizedFields {
  const entry = localized?.[lang] ?? localized?.[DEFAULT_POPUP_LANGUAGE];
  if (entry) {
    return {
      title: entry.title ?? '',
      body: entry.body ?? '',
      highlights: entry.highlights ?? [],
      badgeLabel: entry.badgeLabel ?? undefined,
      primaryCtaLabel: entry.primaryCtaLabel ?? undefined,
      secondaryCtaLabel: entry.secondaryCtaLabel ?? undefined,
    };
  }
  return {
    title: row.title,
    body: row.body,
    highlights: row.highlights ?? [],
    badgeLabel: row.badge_label ?? undefined,
    primaryCtaLabel: (row.primary_cta as OnboardingPopup['primaryCta'])?.label,
    secondaryCtaLabel: (row.secondary_cta as OnboardingPopup['secondaryCta'])?.label,
  };
}
