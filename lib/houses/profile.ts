import { supabaseAdmin } from '@/lib/supabase';
import { isMissingColumn, isMissingTable } from '@/lib/postgres';

export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return 'en';
  const lower = raw.toLowerCase();
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('it')) return 'it';
  return 'en';
}

export type HouseProfilePayload = {
  locale: SupportedLocale;
  house: {
    houseKey: string;
    name: string;
    countryCode: string | null;
    sportCode: string;
    status: string;
    governanceStatus: string;
    badge: 'validated' | 'preview';
    isExemplar: boolean;
    positioning: { title: string; subtitle: string };
    mission: { title: string; body: string | string[] };
    limits: string[];
    head: {
      name: string;
      username: string | null;
      photoUrl: string | null;
      country: string | null;
      background: string[];
      relationToLegacy: string | null;
      manifesto: string[];
    } | null;
    audience: { for: string[]; notFor: string[] };
    supportModel: {
      description: string[];
      contactMode: string;
      expectationNotes: string[];
    };
    cta: { label: string; helper: string; checkbox: string };
    metrics: {
      memberCount: number;
      registeredMembers: number;
      xpTotal: number;
      xpBreakdown: {
        head: number;
        moderators: number;
        members: number;
      };
      roleCounts: {
        head: number;
        moderators: number;
        members: number;
      };
      termAcceptances: number;
      onboarding: {
        published: number;
        ready: number;
        draft: number;
        lastUpdate: string | null;
      };
    };
    culture: string[];
    recommendedContent: {
      id: string;
      title: string;
      triggerLabel: string;
      body: string;
    }[];
    events: {
      id: string;
      title: string;
      description: string;
      startAt: string;
      endAt: string | null;
      location: string | null;
      visibility: 'public' | 'members';
      linkUrl: string | null;
    }[];
    roster: {
      head: HouseMemberSummary | null;
      moderators: HouseMemberSummary[];
      members: HouseMemberSummary[];
    };
  };
};

function getLocalizedValue<T>(value: Record<string, T> | null | undefined, locale: SupportedLocale): T | null {
  if (!value) return null;
  return value[locale] ?? value.en ?? value.pt ?? value.es ?? null;
}

function getAudience(value: unknown, locale: SupportedLocale) {
  const localized =
    (getLocalizedValue<Record<string, any>>(value as Record<string, any>, locale) ??
      (value as Record<string, any>) ??
      {}) as Record<string, any>;
  const listFor = Array.isArray(localized.for) ? (localized.for as string[]) : [];
  const listNotFor = Array.isArray(localized.not_for) ? (localized.not_for as string[]) : [];
  return {
    for: listFor,
    notFor: listNotFor,
  };
}

type HouseMemberSummary = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  xpTotal: number;
};

export async function loadHouseProfile(houseKeyRaw: string, locale?: string): Promise<HouseProfilePayload | null> {
  if (!supabaseAdmin) return null;

  const houseKey = houseKeyRaw.toUpperCase();
  const normalizedLocale = normalizeLocale(locale);

  const { data: house, error: houseError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('*')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (houseError) {
    if (isMissingTable(houseError) || isMissingColumn(houseError)) {
      console.warn('[houses/profile] houses_of_sports schema missing. Unable to render profile.');
      return null;
    }
    return null;
  }
  if (!house) return null;

  let sport: any = null;
  const { data: sportRow, error: sportError } = await supabaseAdmin
    .from('sports')
    .select('code, name_i18n')
    .eq('id', house.sport_id)
    .maybeSingle();
  if (sportError) {
    if (isMissingTable(sportError)) {
      console.warn('[houses/profile] sports table missing. Continuing without sport metadata.');
    } else {
      throw sportError;
    }
  } else {
    sport = sportRow;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('house_profiles')
    .select('*')
    .eq('house_id', house.id)
    .maybeSingle();
  if (profileError) {
    if (isMissingTable(profileError)) {
      console.warn('[houses/profile] house_profiles table missing. Using defaults.');
    } else {
      throw profileError;
    }
  }

  const { data: headRow, error: headError } = await supabaseAdmin
    .from('house_heads')
    .select('admin_id')
    .eq('house_id', house.id)
    .maybeSingle();
  if (headError) {
    if (isMissingTable(headError)) {
      console.warn('[houses/profile] house_heads table missing. House will show without Head.');
    } else {
      throw headError;
    }
  }

  let headUser: any = null;
  if (headRow?.admin_id) {
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('admin_assignments')
      .select('user_id')
      .eq('id', headRow.admin_id)
      .maybeSingle();
    if (assignmentError) {
      if (isMissingTable(assignmentError)) {
        console.warn('[houses/profile] admin_assignments table missing. Cannot resolve Head user.');
      } else {
        throw assignmentError;
      }
    }
    if (assignment?.user_id) {
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, avatar_url, country, bio, xp_total')
        .eq('id', assignment.user_id)
        .maybeSingle();
      if (userError) {
        console.warn('[houses/profile] Failed to load Head user profile', userError);
      } else {
        headUser = user;
      }
    }
  }

  let termCount = 0;
  const { count: termCountResult, error: termError } = await supabaseAdmin
    .from('house_term_acceptances')
    .select('*', { head: true, count: 'exact' })
    .eq('house_key', houseKey);
  if (termError) {
    if (isMissingTable(termError)) {
      console.warn('[houses/profile] house_term_acceptances table missing. Term metrics default to zero.');
    } else {
      throw termError;
    }
  } else {
    termCount = termCountResult ?? 0;
  }

  const { data: xpRow, error: xpError } = await supabaseAdmin
    .from('house_xp_totals')
    .select(
      'total_xp, member_count, member_only_count, head_count, head_xp, moderator_count, moderator_xp, member_xp',
    )
    .eq('house_id', house.id)
    .maybeSingle();
  if (xpError) {
    if (isMissingTable(xpError)) {
      console.warn('[houses/profile] house_xp_totals missing. Falling back to user_houses counts.');
    } else {
      throw xpError;
    }
  }

  let membershipRows: { user_id: string | null }[] = [];
  const { data: membershipData, error: membershipError } = await supabaseAdmin
    .from('user_houses')
    .select('user_id')
    .eq('house_id', house.id)
    .is('removed_at', null);
  if (membershipError) {
    if (isMissingTable(membershipError)) {
      console.warn('[houses/profile] user_houses missing. Member metrics default to zero.');
    } else {
      throw membershipError;
    }
  } else {
    membershipRows = membershipData ?? [];
  }

  const memberUserIds = Array.from(
    new Set(
      membershipRows
        .map((row: { user_id: string | null }) => row.user_id)
        .filter((id: string | null): id is string => Boolean(id)),
    ),
  );

  let moderatorUserIds: string[] = [];
  try {
    const { data: moderatorRows, error: moderatorError } = await supabaseAdmin
      .from('house_moderators')
      .select('user_id')
      .eq('house_id', house.id);
    if (moderatorError) {
      if (isMissingTable(moderatorError)) {
        console.warn('[houses/profile] house_moderators table missing. Moderator stats default to zero.');
      } else {
        throw moderatorError;
      }
    } else {
      moderatorUserIds =
        moderatorRows
          ?.map((row: { user_id: string | null }) => row.user_id)
          .filter((id: string | null): id is string => Boolean(id)) ?? [];
    }
  } catch (error) {
    console.error('[houses/profile] Failed to load moderator assignments for XP fallback', error);
  }

  const headUserId = headUser?.id ?? null;
  if (headUserId) {
    moderatorUserIds = moderatorUserIds.filter((id) => id !== headUserId);
  }
  moderatorUserIds = Array.from(new Set(moderatorUserIds));
  const moderatorIdSet = new Set(moderatorUserIds);
  const filteredMemberIds = memberUserIds.filter((id) => id !== headUserId && !moderatorIdSet.has(id));

  let fallbackMembersOnlyCount = filteredMemberIds.length;
  let fallbackMemberXp = 0;
  let fallbackHeadXp = 0;
  let fallbackModeratorXp = 0;
  let fallbackHeadCount = headUserId ? 1 : 0;
  let fallbackModeratorCount = moderatorUserIds.length;

  const aggregates = {
    totalXp: typeof xpRow?.total_xp === 'number' ? (xpRow.total_xp as number) : null,
    participantCount: typeof xpRow?.member_count === 'number' ? (xpRow.member_count as number) : null,
    registeredMembers:
      typeof xpRow?.member_only_count === 'number' ? (xpRow.member_only_count as number) : null,
    headCount: typeof xpRow?.head_count === 'number' ? (xpRow.head_count as number) : null,
    moderatorCount:
      typeof xpRow?.moderator_count === 'number' ? (xpRow.moderator_count as number) : null,
    headXp: typeof xpRow?.head_xp === 'number' ? (xpRow.head_xp as number) : null,
    moderatorXp: typeof xpRow?.moderator_xp === 'number' ? (xpRow.moderator_xp as number) : null,
    memberXp: typeof xpRow?.member_xp === 'number' ? (xpRow.member_xp as number) : null,
  };

  const needsFallback =
    aggregates.totalXp === null ||
    aggregates.participantCount === null ||
    aggregates.registeredMembers === null ||
    aggregates.headCount === null ||
    aggregates.moderatorCount === null ||
    aggregates.headXp === null ||
    aggregates.moderatorXp === null ||
    aggregates.memberXp === null;

  if (needsFallback) {
    if (headUserId) {
      fallbackHeadCount = 1;
      if (typeof headUser?.xp_total === 'number') {
        fallbackHeadXp = headUser.xp_total as number;
      } else {
        const { data: headXpRow, error: headXpError } = await supabaseAdmin
          .from('users')
          .select('xp_total')
          .eq('id', headUserId)
          .maybeSingle();
        if (headXpError) {
          console.error('[houses/profile] Failed to load Head XP total', headXpError);
        }
        fallbackHeadXp = (headXpRow?.xp_total as number | null) ?? 0;
      }
    }

    fallbackMembersOnlyCount = filteredMemberIds.length;

    const sumXpTotals = async (userIds: string[], context: string) => {
      if (userIds.length === 0) return 0;
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, xp_total')
        .in('id', userIds);
      if (error) {
        console.error(`[houses/profile] Failed to load XP totals for ${context}`, error);
        return 0;
      }
      return (
        data?.reduce((sum: number, row: { xp_total: number | null }) => sum + (row.xp_total ?? 0), 0) ??
        0
      );
    };

    fallbackMemberXp = await sumXpTotals(filteredMemberIds, 'members');
    fallbackModeratorXp = await sumXpTotals(moderatorUserIds, 'moderators');

    const fallbackParticipants =
      fallbackMembersOnlyCount + fallbackHeadCount + fallbackModeratorCount;
    const fallbackTotalXp = fallbackMemberXp + fallbackHeadXp + fallbackModeratorXp;

    aggregates.totalXp = aggregates.totalXp ?? fallbackTotalXp;
    aggregates.participantCount = aggregates.participantCount ?? fallbackParticipants;
    aggregates.registeredMembers = aggregates.registeredMembers ?? fallbackMembersOnlyCount;
    aggregates.headCount = aggregates.headCount ?? fallbackHeadCount;
    aggregates.moderatorCount = aggregates.moderatorCount ?? fallbackModeratorCount;
    aggregates.headXp = aggregates.headXp ?? fallbackHeadXp;
    aggregates.moderatorXp = aggregates.moderatorXp ?? fallbackModeratorXp;
    aggregates.memberXp = aggregates.memberXp ?? fallbackMemberXp;
  }

  const xpBreakdown = {
    head: aggregates.headXp ?? 0,
    moderators: aggregates.moderatorXp ?? 0,
    members: aggregates.memberXp ?? 0,
  };

  const roleCounts = {
    head: aggregates.headCount ?? fallbackHeadCount,
    moderators: aggregates.moderatorCount ?? fallbackModeratorCount,
    members: aggregates.registeredMembers ?? fallbackMembersOnlyCount,
  };

  const computedMemberCount =
    aggregates.participantCount ?? roleCounts.head + roleCounts.moderators + roleCounts.members;
  const computedXpTotal =
    aggregates.totalXp ?? xpBreakdown.head + xpBreakdown.moderators + xpBreakdown.members;

  const toRosterEntry = (user: {
    id: string;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    xp_total?: number | null;
  }): HouseMemberSummary => ({
    id: user.id,
    name: user.full_name || user.username || 'Membro oficial',
    username: user.username ?? null,
    avatarUrl: user.avatar_url ?? null,
    xpTotal: typeof user.xp_total === 'number' ? (user.xp_total as number) : 0,
  });

  const loadRosterUsers = async (ids: string[], label: string) => {
    if (!ids.length) return [];
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, avatar_url, xp_total')
      .in('id', ids);
    if (error) {
      console.error(`[houses/profile] Failed to load roster users (${label})`, error);
      return [];
    }
    return (
      data
        ?.map((user: any) => toRosterEntry(user))
        .sort(
          (a: HouseMemberSummary, b: HouseMemberSummary) =>
            b.xpTotal - a.xpTotal || a.name.localeCompare(b.name),
        ) ?? []
    );
  };

  const ROSTER_MEMBER_LIMIT = 48;
  const ROSTER_MODERATOR_LIMIT = 24;
  const rosterHead = headUser ? toRosterEntry(headUser) : null;
  const rosterModerators = await loadRosterUsers(moderatorUserIds.slice(0, ROSTER_MODERATOR_LIMIT), 'moderators');
  const rosterMembers = await loadRosterUsers(filteredMemberIds.slice(0, ROSTER_MEMBER_LIMIT), 'members');

  const { data: onboardingStatus, error: onboardingStatusError } = await supabaseAdmin
    .from('house_onboarding_status')
    .select('*')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (onboardingStatusError) {
    if (isMissingTable(onboardingStatusError)) {
      console.warn('[houses/profile] house_onboarding_status missing. Onboarding stats default to zero.');
    } else {
      throw onboardingStatusError;
    }
  }

  const { data: sequenceRow, error: sequenceError } = await supabaseAdmin
    .from('house_onboarding_sequences')
    .select('sequence')
    .eq('house_key', houseKey)
    .maybeSingle();
  if (sequenceError) {
    if (isMissingTable(sequenceError)) {
      console.warn('[houses/profile] house_onboarding_sequences missing. Recommended content empty.');
    } else {
      throw sequenceError;
    }
  }

  const recommendedContent =
    (sequenceRow?.sequence?.popups as any[] | undefined)?.slice(0, 4).map((popup) => ({
      id: popup.id || popup.title || Math.random().toString(),
      title: popup.localized?.[normalizedLocale]?.title || popup.title || 'Conteúdo recomendado',
      triggerLabel: popup.trigger?.label || popup.xpGate || 'Sequência oficial',
      body:
        popup.localized?.[normalizedLocale]?.body ||
        popup.body ||
        'Conteúdo recomendado pela House para acelerar o onboarding.',
    })) ?? [];

  const { data: eventRows, error: eventError } = await supabaseAdmin
    .from('house_events')
    .select('id, title_i18n, description_i18n, start_at, end_at, location, visibility, link_url')
    .eq('house_id', house.id)
    .order('start_at', { ascending: true })
    .limit(8);
  if (eventError) {
    if (isMissingTable(eventError)) {
      console.warn('[houses/profile] house_events table missing. Events list empty.');
    } else {
      throw eventError;
    }
  }

  const events =
    eventRows?.map((event: any) => ({
      id: event.id,
      title:
        getLocalizedValue<Record<string, string>>(event.title_i18n, normalizedLocale)?.toString() ??
        event.title_i18n?.en ??
        'Evento',
      description:
        getLocalizedValue<Record<string, string>>(event.description_i18n, normalizedLocale)?.toString() ??
        event.description_i18n?.en ??
        '',
      startAt: event.start_at,
      endAt: event.end_at ?? null,
      location: event.location ?? null,
      visibility: (event.visibility ?? 'members') as 'public' | 'members',
      linkUrl: event.link_url ?? null,
    })) ?? [];

  const identityTitle =
    getLocalizedValue<Record<string, string>>(house.hero_title_i18n, normalizedLocale)?.toString() ??
    (house.name_i18n?.[normalizedLocale] ?? house.name_i18n?.en ?? 'House');
  const identitySubtitle =
    getLocalizedValue<Record<string, string>>(house.hero_subtitle_i18n, normalizedLocale)?.toString() || '';
  const mission = getLocalizedValue<{ title: string; body: string | string[] }>(
    profile?.mission_i18n as Record<string, { title: string; body: string | string[] }>,
    normalizedLocale,
  );
  const limits =
    getLocalizedValue<Record<string, string[]>>(profile?.limits_i18n, normalizedLocale)?.list ??
    (Array.isArray(profile?.limits_i18n) ? (profile?.limits_i18n as string[]) : []);
  const manifesto =
    getLocalizedValue<Record<string, string[]>>(profile?.head_manifesto_i18n, normalizedLocale)?.list ??
    (Array.isArray(profile?.head_manifesto_i18n) ? (profile?.head_manifesto_i18n as string[]) : []);
  const supportModel =
    (getLocalizedValue<Record<string, any>>(profile?.support_model_i18n, normalizedLocale) ?? {}) as Record<
      string,
      any
    >;
  const cta = (getLocalizedValue<Record<string, any>>(profile?.cta_i18n, normalizedLocale) ?? {}) as Record<
    string,
    any
  >;
  const culture =
    getLocalizedValue<Record<string, string[]>>(profile?.culture_i18n, normalizedLocale)?.list ??
    (Array.isArray(profile?.culture_i18n) ? (profile?.culture_i18n as string[]) : []);

  const payload: HouseProfilePayload = {
    locale: normalizedLocale,
    house: {
      houseKey,
      name: house.name_i18n?.[normalizedLocale] ?? house.name_i18n?.en ?? identityTitle,
      countryCode: house.country_code,
      sportCode: sport?.code ?? '',
      status: ['active', 'under_construction', 'development'].includes(
        (house.status ?? '').toLowerCase(),
      )
        ? (house.status ?? '').toLowerCase()
        : 'development',
      governanceStatus: house.governance_status ?? 'active',
      badge: house.is_public ? 'validated' : 'preview',
      isExemplar: Boolean(house.is_exemplar),
      positioning: {
        title: identityTitle,
        subtitle: identitySubtitle,
      },
      mission: mission ?? {
        title: profile?.tagline_i18n?.[normalizedLocale] ?? profile?.tagline_i18n?.en ?? '',
        body: profile?.description_i18n?.[normalizedLocale] ?? profile?.description_i18n?.en ?? [],
      },
      limits,
      head: headUser
        ? {
            name: headUser.full_name || 'Head of House',
            username: headUser.username,
            photoUrl: headUser.avatar_url,
            country: headUser.country,
            background: profile?.description ? [profile.description] : [],
            relationToLegacy: null,
            manifesto,
          }
        : null,
      audience: getAudience(profile?.audience_fit, normalizedLocale),
      supportModel: {
        description: Array.isArray(supportModel?.description) ? supportModel.description : [],
        contactMode: house.support_mode ?? supportModel?.contactMode ?? 'async',
        expectationNotes: Array.isArray(supportModel?.notes) ? supportModel.notes : [],
      },
      cta: {
        label: cta?.label ?? 'Quero avançar com responsabilidade',
        helper: cta?.helper ?? 'Não há resposta imediata garantida.',
        checkbox: cta?.checkbox ?? 'Confirmo que aceito o termo de responsabilidade.',
      },
      metrics: {
        memberCount: computedMemberCount,
        registeredMembers: roleCounts.members,
        xpTotal: computedXpTotal,
        xpBreakdown,
        roleCounts,
        termAcceptances: termCount ?? 0,
        onboarding: {
          published: onboardingStatus?.published_popups ?? 0,
          ready: onboardingStatus?.ready_popups ?? 0,
          draft: onboardingStatus?.draft_popups ?? 0,
          lastUpdate: onboardingStatus?.last_popup_update ?? null,
        },
      },
      culture,
      recommendedContent,
      events,
      roster: {
        head: rosterHead,
        moderators: rosterModerators,
        members: rosterMembers,
      },
    },
  };

  return payload;
}
