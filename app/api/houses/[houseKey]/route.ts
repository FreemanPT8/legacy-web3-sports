import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return 'en';
  const lower = raw.toLowerCase();
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('it')) return 'it';
  return 'en';
}

function getLocalizedValue<T>(value: Record<string, T> | null | undefined, locale: string): T | null {
  if (!value) return null;
  return value[locale] ?? value.en ?? value.pt ?? value.es ?? null;
}

function getAudience(value: any, locale: string) {
  const localized = getLocalizedValue<Record<string, any>>(value, locale) ?? value ?? {};
  const fallbackFor = Array.isArray(localized.for) ? localized.for : [];
  const fallbackNotFor = Array.isArray(localized.not_for) ? localized.not_for : [];
  return {
    for: fallbackFor,
    notFor: fallbackNotFor,
  };
}

export async function GET(request: NextRequest, { params }: { params: { houseKey: string } }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Admin client not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get('locale'));
  const houseKey = params.houseKey?.toUpperCase();

  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const { data: house, error: houseError } = await supabaseAdmin
      .from('houses_of_sports')
      .select('*')
      .eq('house_key', houseKey)
      .maybeSingle();

    if (houseError || !house) {
      return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
    }

    const [{ data: sport }] = await Promise.all([
      supabaseAdmin.from('sports').select('code, name_i18n').eq('id', house.sport_id).maybeSingle(),
    ]);

    const { data: profile } = await supabaseAdmin
      .from('house_profiles')
      .select('*')
      .eq('house_id', house.id)
      .maybeSingle();

    const { data: headRow } = await supabaseAdmin
      .from('house_heads')
      .select('admin_id')
      .eq('house_id', house.id)
      .maybeSingle();

    let headUser: any = null;
    if (headRow?.admin_id) {
      const { data: assignment } = await supabaseAdmin
        .from('admin_assignments')
        .select('user_id')
        .eq('id', headRow.admin_id)
        .maybeSingle();
      if (assignment?.user_id) {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, username, full_name, avatar_url, country, bio')
          .eq('id', assignment.user_id)
          .maybeSingle();
        headUser = user;
      }
    }

    const { count: termCount } = await supabaseAdmin
      .from('house_term_acceptances')
      .select('*', { head: true, count: 'exact' })
      .eq('house_key', houseKey);

    const { data: xpRow } = await supabaseAdmin
      .from('house_xp_totals')
      .select('total_xp, member_count')
      .eq('house_id', house.id)
      .maybeSingle();

    const { count: memberCountFallback } = await supabaseAdmin
      .from('user_houses')
      .select('*', { head: true, count: 'exact' })
      .eq('house_id', house.id);

    const { data: onboardingStatus } = await supabaseAdmin
      .from('house_onboarding_status')
      .select('*')
      .eq('house_key', houseKey)
      .maybeSingle();

    const identityTitle =
      getLocalizedValue<Record<string, string>>(house.hero_title_i18n, locale)?.toString() ??
      (house.name_i18n?.[locale] ?? house.name_i18n?.en ?? 'House');
    const identitySubtitle =
      getLocalizedValue<Record<string, string>>(house.hero_subtitle_i18n, locale)?.toString() || '';
    const mission = getLocalizedValue<Record<string, any>>(profile?.mission_i18n, locale);
    const limits = getLocalizedValue<Record<string, string[]>>(profile?.limits_i18n, locale) ?? [];
    const manifesto = getLocalizedValue<Record<string, string[]>>(profile?.head_manifesto_i18n, locale) ?? [];
    const supportModel = getLocalizedValue<Record<string, any>>(profile?.support_model_i18n, locale) ?? {};
    const cta = getLocalizedValue<Record<string, any>>(profile?.cta_i18n, locale) ?? {};
    const culture = getLocalizedValue<Record<string, string[]>>(profile?.culture_i18n, locale) ?? [];

    const response = {
      success: true,
      locale,
      house: {
        houseKey,
        name: house.name_i18n?.[locale] ?? house.name_i18n?.en ?? identityTitle,
        countryCode: house.country_code,
        sportCode: sport?.code ?? '',
        status: (house.status || 'in_development').toLowerCase(),
        governanceStatus: house.governance_status ?? 'active',
        badge: house.is_public ? 'validated' : 'preview',
        positioning: {
          title: identityTitle,
          subtitle: identitySubtitle,
        },
        mission: mission ?? {
          title: profile?.tagline_i18n?.[locale] ?? profile?.tagline_i18n?.en ?? '',
          body: profile?.description_i18n?.[locale] ?? profile?.description_i18n?.en ?? [],
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
        audience: getAudience(profile?.audience_fit, locale),
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
          memberCount: xpRow?.member_count ?? memberCountFallback ?? 0,
          xpTotal: xpRow?.total_xp ?? 0,
          termAcceptances: termCount ?? 0,
          onboarding: {
            published: onboardingStatus?.published_popups ?? 0,
            ready: onboardingStatus?.ready_popups ?? 0,
            draft: onboardingStatus?.draft_popups ?? 0,
            lastUpdate: onboardingStatus?.last_popup_update ?? null,
          },
        },
        culture,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[houses] failed to load profile', error);
    return NextResponse.json({ success: false, error: 'Failed to load house profile.' }, { status: 500 });
  }
}
