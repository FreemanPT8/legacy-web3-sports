import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingTable } from '@/lib/postgres';
import { getHouseHeadHouseIds } from '@/lib/server/house-heads';
import type { JWTPayload } from '@/lib/jwt';

const MAX_EVENTS_PER_HOUSE = 20;

type EventRow = {
  id: string;
  title_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  visibility: string | null;
  link_url: string | null;
};

type EventPayload = {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string | null;
  location?: string | null;
  linkUrl?: string | null;
  visibility?: 'public' | 'members';
};

function missingTableResponse(table: string) {
  return NextResponse.json(
    { success: false, error: formatMissingResourceError(table) },
    { status: 500 },
  );
}

function normalizeVisibility(value?: string | null): 'members' | 'public' {
  if (value === 'public') return 'public';
  return 'members';
}

function mapEvent(row: EventRow) {
  const localizedTitle = row.title_i18n?.pt ?? row.title_i18n?.en ?? row.title_i18n?.es ?? 'Evento';
  const localizedDescription = row.description_i18n?.pt ?? row.description_i18n?.en ?? row.description_i18n?.es ?? '';
  return {
    id: row.id,
    title: localizedTitle,
    description: localizedDescription,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    visibility: normalizeVisibility(row.visibility),
    linkUrl: row.link_url,
  };
}

async function ensureHouseScope(houseId: string, actor: JWTPayload | undefined) {
  if (!actor) {
    return {
      allowed: false,
      response: NextResponse.json({ success: false, error: 'AutenticaÃ‡ÃµÃ‡Å“o obrigatÃ‡Ã°ria.' }, { status: 401 }),
    };
  }
  if (actor.role === 'Super Admin') return { allowed: true };
  try {
    const headHouseIds = await getHouseHeadHouseIds(actor.userId);
    if (headHouseIds.includes(houseId)) return { allowed: true };
  } catch (error) {
    console.error('[admin/houses/events] failed to resolve head scope', error);
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Falha ao confirmar permissÃ‡Ã°o para esta House.' },
        { status: 500 },
      ),
    };
  }
  return {
    allowed: false,
    response: NextResponse.json({ success: false, error: 'Sem permissÃ‡Ã°o para gerir eventos desta House.' }, { status: 403 }),
  };
}

async function ensureHouseExists(houseId: string) {
  const { data, error } = await supabaseAdmin!
    .from('houses_of_sports')
    .select('id')
    .eq('id', houseId)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return { response: missingTableResponse('houses_of_sports') };
    throw error;
  }
  if (!data) {
    return { response: NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 }) };
  }
  return {};
}

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return (
      auth.response ?? NextResponse.json({ success: False, error: 'Autenticacao obrigatoria.' }, { status: 401 })
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  const scopeResult = await ensureHouseScope(houseId, auth.user);
  if (!scopeResult.allowed) return scopeResult.response ?? NextResponse.json({ success: false, error: 'Not authorized to manage this House.' }, { status: 403 });

  const existence = await ensureHouseExists(houseId);
  if ('response' in existence) return existence.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('house_events')
      .select('id, title_i18n, description_i18n, start_at, end_at, location, visibility, link_url')
      .eq('house_id', houseId)
      .order('start_at', { ascending: true });
    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          { success: true, events: [], warning: formatMissingResourceError('house_events') },
          { status: 200 },
        );
      }
      throw error;
    }
    return NextResponse.json({
      success: true,
      events: (data as EventRow[]).map((row) => mapEvent(row)),
    });
  } catch (error) {
    console.error('[admin/houses/events] load events failed', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao carregar eventos desta House.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return (
      auth.response ?? NextResponse.json({ success: False, error: 'Autenticacao obrigatoria.' }, { status: 401 })
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client indisponÃ­vel.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  const scopeResult = await ensureHouseScope(houseId, auth.user);
  if (!scopeResult.allowed) return scopeResult.response ?? NextResponse.json({ success: false, error: 'Not authorized to manage this House.' }, { status: 403 });

  const houseExistence = await ensureHouseExists(houseId);
  if ('response' in houseExistence) return houseExistence.response;

  const body = (await request.json().catch(() => ({}))) as EventPayload;
  const title = (body.title || '').trim();
  if (!title) {
    return NextResponse.json({ success: false, error: 'O tÃ­tulo do evento Ã© obrigatÃ³rio.' }, { status: 400 });
  }

  if (!body.startAt) {
    return NextResponse.json({ success: false, error: 'Define a data de inÃ­cio do evento.' }, { status: 400 });
  }

  const startDate = new Date(body.startAt);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ success: false, error: 'Data de inÃ­cio invÃ¡lida.' }, { status: 400 });
  }

  let endDate: Date | null = null;
  if (body.endAt) {
    endDate = new Date(body.endAt);
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Data de fim invÃ¡lida.' }, { status: 400 });
    }
  }

  const { count, error: countError } = await supabaseAdmin
    .from('house_events')
    .select('*', { head: true, count: 'exact' })
    .eq('house_id', houseId);
  if (countError) {
    if (isMissingTable(countError)) return missingTableResponse('house_events');
    throw countError;
  }
  if ((count ?? 0) >= MAX_EVENTS_PER_HOUSE) {
    return NextResponse.json(
      {
        success: false,
        error: `Limite de ${MAX_EVENTS_PER_HOUSE} eventos atingido. Remove um evento antigo antes de criar novos.`,
      },
      { status: 409 },
    );
  }

  const visibility = normalizeVisibility(body.visibility);
  const insertPayload = {
    house_id: houseId,
    title_i18n: { pt: title, en: title },
    description_i18n: body.description ? { pt: body.description, en: body.description } : {},
    start_at: startDate.toISOString(),
    end_at: endDate ? endDate.toISOString() : null,
    location: body.location?.trim() || null,
    visibility,
    link_url: body.linkUrl?.trim() || null,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('house_events')
      .insert(insertPayload)
      .select('id, title_i18n, description_i18n, start_at, end_at, location, visibility, link_url')
      .single();
    if (error) {
      if (isMissingTable(error)) return missingTableResponse('house_events');
      throw error;
    }

    return NextResponse.json({
      success: true,
      event: mapEvent(data as EventRow),
    });
  } catch (error) {
    console.error('[admin/houses/events] failed to create event', error);
    return NextResponse.json(
      { success: false, error: 'NÃ£o foi possÃ­vel criar o evento. Tenta novamente.' },
      { status: 500 },
    );
  }
}



