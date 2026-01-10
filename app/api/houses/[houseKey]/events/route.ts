import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingTable } from '@/lib/postgres';
import { normalizeLocale } from '@/lib/houses/profile';

function localizeCopy(value: Record<string, string> | null | undefined, locale: string) {
  if (!value) return null;
  return (
    value[locale] ??
    value.en ??
    value.pt ??
    value.es ??
    value.fr ??
    value.de ??
    value.it ??
    null
  );
}

async function resolveHouseId(houseKey: string) {
  const { data, error } = await supabaseAdmin!
    .from('houses_of_sports')
    .select('id')
    .eq('house_key', houseKey)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      return { response: NextResponse.json({ success: false, error: formatMissingResourceError('houses_of_sports') }, { status: 500 }) };
    }
    throw error;
  }

  if (!data?.id) {
    return { response: NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 }) };
  }

  return { houseId: data.id as string };
}

async function hasHouseAccess(houseId: string, userId: string, role: string | null) {
  if (role === 'Super Admin' || role === 'Admin') return true;

  const { data: membership, error: membershipError } = await supabaseAdmin!
    .from('user_houses')
    .select('id')
    .eq('house_id', houseId)
    .eq('user_id', userId)
    .is('removed_at', null)
    .maybeSingle();
  if (membershipError && !isMissingTable(membershipError)) throw membershipError;
  if (membership) return true;

  const { data: permissionRow, error: permissionError } = await supabaseAdmin!
    .from('house_permissions')
    .select('permission')
    .eq('house_id', houseId)
    .eq('user_id', userId)
    .maybeSingle();
  if (permissionError && !isMissingTable(permissionError)) throw permissionError;
  return Boolean(permissionRow);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { houseKey: string } },
): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.success) {
    if (auth.response) return auth.response;
    return NextResponse.json({ success: false, error: 'Autenticação obrigatória.' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseKey = (params.houseKey || '').toUpperCase();
  if (!houseKey) {
    return NextResponse.json({ success: false, error: 'Missing house key.' }, { status: 400 });
  }

  try {
    const houseResult = await resolveHouseId(houseKey);
    if ('response' in houseResult) {
      return houseResult.response;
    }
    const { houseId } = houseResult;

    const canAccess = await hasHouseAccess(houseId, auth.user!.userId, auth.user!.role ?? null);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Acesso restrito aos membros confirmados.' },
        { status: 403 },
      );
    }

    const localeParam = request.nextUrl.searchParams.get('locale');
    const locale = normalizeLocale(localeParam || auth.user?.language || 'pt');

    const { data: eventRows, error: eventError } = await supabaseAdmin
      .from('house_events')
      .select('id, title_i18n, description_i18n, start_at, end_at, location, visibility, link_url')
      .eq('house_id', houseId)
      .order('start_at', { ascending: true })
      .limit(20);

    if (eventError) {
      if (isMissingTable(eventError)) {
        return NextResponse.json(
          { success: true, events: [], warning: formatMissingResourceError('house_events') },
          { status: 200 },
        );
      }
      throw eventError;
    }

    const events =
      eventRows?.map((event: any) => ({
        id: event.id,
        title: localizeCopy(event.title_i18n, locale) ?? event.title_i18n?.en ?? 'Evento',
        description: localizeCopy(event.description_i18n, locale) ?? event.description_i18n?.en ?? '',
        startAt: event.start_at,
        endAt: event.end_at ?? null,
        location: event.location ?? null,
        visibility: (event.visibility ?? 'members') as 'public' | 'members',
        linkUrl: event.link_url ?? null,
      })) ?? [];

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('[houses/events] failed to load events', error);
    return NextResponse.json({ success: false, error: 'Failed to load events.' }, { status: 500 });
  }
}
