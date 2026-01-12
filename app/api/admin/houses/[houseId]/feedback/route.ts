import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingColumn, isMissingTable } from '@/lib/postgres';

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

  const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '25');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.floor(limitParam), 1), 100) : 25;

  try {
    const { data, error } = await supabaseAdmin
      .from('house_feedback')
      .select(
        `
        id,
        source,
        category,
        sentiment,
        severity,
        status,
        summary,
        details,
        created_at,
        resolved_at,
        reporter:users!house_feedback_reporter_user_id_fkey(
          id,
          full_name,
          username,
          avatar_url
        )
      `,
      )
      .eq('house_id', houseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingTable(error)) {
        console.warn('[admin/houses/feedback] house_feedback table missing. Returning empty list.');
        return NextResponse.json({
          success: true,
          feedback: [],
          warning: formatMissingResourceError('house_feedback'),
        });
      }
      if (isMissingColumn(error)) {
        console.warn('[admin/houses/feedback] missing column in house_feedback. Returning empty list.');
        return NextResponse.json({ success: true, feedback: [] });
      }
      throw error;
    }

    const feedback =
      data?.map((row: any) => ({
        id: row.id as string,
        source: (row.source as string | null) ?? 'manual',
        category: (row.category as string | null) ?? null,
        sentiment: ((row.sentiment as string | null) ?? 'neutral').toLowerCase(),
        severity: ((row.severity as string | null) ?? 'low').toLowerCase(),
        status: ((row.status as string | null) ?? 'open').toLowerCase(),
        summary: (row.summary as string | null) ?? '',
        details: (row.details as string | null) ?? null,
        createdAt: row.created_at as string,
        resolvedAt: (row.resolved_at as string | null) ?? null,
        reporter: row.reporter
          ? {
              id: row.reporter.id as string,
              name: row.reporter.full_name ?? row.reporter.username ?? 'Utilizador',
              username: (row.reporter.username as string | null) ?? null,
              avatarUrl: (row.reporter.avatar_url as string | null) ?? null,
            }
          : null,
      })) ?? [];

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('[admin/houses/feedback] Failed to load feedback entries', error);
    return NextResponse.json(
      { success: false, error: 'Não foi possível carregar o feedback desta House.' },
      { status: 500 },
    );
  }
}

