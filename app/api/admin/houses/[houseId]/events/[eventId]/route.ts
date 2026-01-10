import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingTable } from '@/lib/postgres';
import { getHouseHeadHouseIds } from '@/lib/server/house-heads';
import type { JWTPayload } from '@/lib/jwt';

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

function normalizeVisibility(value?: string | null): 'public' | 'members' {
  return value === 'public' ? 'public' : 'members';
}

async function ensureHouseScope(houseId: string, actor: JWTPayload | undefined) {
  if (!actor) {
    return {
      allowed: false,
      response: NextResponse.json({ success: false, error: 'AutenticaÃ§Ã£o obrigatÃ³ria.' }, { status: 401 }),
    };
  }
  if (actor.role === 'Super Admin') return { allowed: true };
  try {
    const headHouseIds = await getHouseHeadHouseIds(actor.userId);
    if (headHouseIds.includes(houseId)) return { allowed: true };
  } catch (error) {
    console.error('[admin/houses/events] scope resolution failed', error);
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'Falha ao confirmar permissÃµes para esta House.' },
        { status: 500 },
      ),
    };
  }
  return {
    allowed: false,
    response: NextResponse.json({ success: false, error: 'Sem permissÃ£o para gerir eventos desta House.' }, { status: 403 }),
  };
}

async function loadEvent(eventId: string, houseId: string) {
  const { data, error } = await supabaseAdmin!
    .from('house_events')
    .select('*')
    .eq('id', eventId)
    .eq('house_id', houseId)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return { response: missingTableResponse('house_events') };
    throw error;
  }
  if (!data) {
    return { response: NextResponse.json({ success: false, error: 'Evento nÃ£o encontrado.' }, { status: 404 }) };
  }
  return { event: data };
}

export async function PATCH(request: NextRequest, { params }: { params: { houseId: string; eventId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return (
      auth.response ?? NextResponse.json({ success: false, error: 'Autenticacao obrigatoria.' }, { status: 401 })
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client indisponÃ­vel.' }, { status: 500 });
  }

  const { houseId, eventId } = params;
  if (!houseId || !eventId) {
    return NextResponse.json({ success: false, error: 'Evento ou House invÃ¡lidos.' }, { status: 400 });
  }

  const scopeResult = await ensureHouseScope(houseId, auth.user);
  if (!scopeResult.allowed) return scopeResult.response ?? NextResponse.json({ success: false, error: 'Not authorized to manage this House.' }, { status: 403 });

  const existingResult = await loadEvent(eventId, houseId);
  if ('response' in existingResult) return existingResult.response ?? NextResponse.json({ success: false, error: 'Resource not found.' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as EventPayload;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'O tÃ­tulo Ã© obrigatÃ³rio.' }, { status: 400 });
    }
    updates.title_i18n = { pt: title, en: title };
  }
  if (body.description !== undefined) {
    const description = (body.description || '').trim();
    updates.description_i18n = description ? { pt: description, en: description } : {};
  }
  if (body.location !== undefined) {
    updates.location = body.location?.trim() || null;
  }
  if (body.linkUrl !== undefined) {
    updates.link_url = body.linkUrl?.trim() || null;
  }
  if (body.visibility !== undefined) {
    updates.visibility = normalizeVisibility(body.visibility);
  }
  if (body.startAt !== undefined) {
    const startDate = new Date(body.startAt);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Data de inÃ­cio invÃ¡lida.' }, { status: 400 });
    }
    updates.start_at = startDate.toISOString();
  }
  if (body.endAt !== undefined) {
    if (!body.endAt) {
      updates.end_at = null;
    } else {
      const endDate = new Date(body.endAt);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json({ success: false, error: 'Data de fim invÃ¡lida.' }, { status: 400 });
      }
      updates.end_at = endDate.toISOString();
    }
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ success: false, error: 'Nenhuma alteraÃ§Ã£o fornecida.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('house_events')
      .update(updates)
      .eq('id', eventId)
      .eq('house_id', houseId);
    if (error) {
      if (isMissingTable(error)) return missingTableResponse('house_events');
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/houses/events] update failed', error);
    return NextResponse.json(
      { success: false, error: 'NÃ£o foi possÃ­vel atualizar o evento.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { houseId: string; eventId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return (
      auth.response ?? NextResponse.json({ success: false, error: 'Autenticacao obrigatoria.' }, { status: 401 })
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client indisponÃ­vel.' }, { status: 500 });
  }

  const { houseId, eventId } = params;
  if (!houseId || !eventId) {
    return NextResponse.json({ success: false, error: 'Evento ou House invÃ¡lidos.' }, { status: 400 });
  }

  const scopeResult = await ensureHouseScope(houseId, auth.user);
  if (!scopeResult.allowed) return scopeResult.response ?? NextResponse.json({ success: false, error: 'Not authorized to manage this House.' }, { status: 403 });

  const existingResult = await loadEvent(eventId, houseId);
  if ('response' in existingResult) return existingResult.response ?? NextResponse.json({ success: false, error: 'Resource not found.' }, { status: 404 });

  try {
    const { error } = await supabaseAdmin
      .from('house_events')
      .delete()
      .eq('id', eventId)
      .eq('house_id', houseId);
    if (error) {
      if (isMissingTable(error)) return missingTableResponse('house_events');
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/houses/events] delete failed', error);
    return NextResponse.json(
      { success: false, error: 'NÃ£o foi possÃ­vel remover o evento.' },
      { status: 500 },
    );
  }
}




