import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('house_notes')
      .select(
        'id, body, created_at, author:users!house_notes_author_id_fkey(id, full_name, username, avatar_url)',
      )
      .eq('house_id', houseId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const notes =
      data?.map((row: any) => ({
        id: row.id as string,
        body: row.body as string,
        createdAt: row.created_at as string,
        author: row.author
          ? {
              id: row.author.id as string,
              name: row.author.full_name ?? row.author.username ?? 'Admin',
              username: row.author.username as string | null,
              avatarUrl: (row.author.avatar_url as string | null) ?? null,
            }
          : null,
      })) ?? [];

    return NextResponse.json({ success: true, notes });
  } catch (err) {
    console.error('[admin/houses/notes] Failed to load notes', err);
    return NextResponse.json({ success: false, error: 'Failed to load notes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { houseId: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
  }

  const houseId = params.houseId;
  if (!houseId) {
    return NextResponse.json({ success: false, error: 'Missing house id.' }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const noteBody = typeof (payload as any)?.body === 'string' ? (payload as any).body.trim() : '';
  if (!noteBody) {
    return NextResponse.json(
      { success: false, error: 'Nota obrigatória. Escreve pelo menos uma frase.' },
      { status: 400 },
    );
  }
  if (noteBody.length > 1000) {
    return NextResponse.json(
      { success: false, error: 'Nota demasiado longa (máximo de 1000 caracteres).' },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('house_notes')
      .insert({
        house_id: houseId,
        author_id: auth.user!.userId,
        body: noteBody,
      })
      .select(
        'id, body, created_at, author:users!house_notes_author_id_fkey(id, full_name, username, avatar_url)',
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      note: {
        id: data.id as string,
        body: data.body as string,
        createdAt: data.created_at as string,
        author: data.author
          ? {
              id: data.author.id as string,
              name: data.author.full_name ?? data.author.username ?? 'Admin',
              username: data.author.username as string | null,
              avatarUrl: (data.author.avatar_url as string | null) ?? null,
            }
          : null,
      },
    });
  } catch (err) {
    console.error('[admin/houses/notes] Failed to add note', err);
    return NextResponse.json({ success: false, error: 'Não foi possível guardar a nota.' }, { status: 500 });
  }
}
