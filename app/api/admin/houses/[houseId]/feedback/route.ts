import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingTable } from '@/lib/postgres';

const SELECT_COLUMNS =
  'id, house_id, source, category, sentiment, severity, status, summary, details, created_at, resolved_at, reported_by, reporter:reported_by ( id, full_name, username, avatar_url )';

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

  const search = request.nextUrl.searchParams;
  const limit = Number(search.get('limit')) || 25;
  const statusFilter = search.get('status');
  const sentimentFilter = search.get('sentiment');

  try {
    let query = supabaseAdmin
      .from('house_feedback')
      .select(SELECT_COLUMNS)
      .eq('house_id', houseId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (sentimentFilter) {
      query = query.eq('sentiment', sentimentFilter);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json(
          {
            success: true,
            warning: formatMissingResourceError('house_feedback'),
            feedback: [],
          },
          { status: 200 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      feedback:
        data?.map((entry: any) => ({
          id: entry.id,
          source: entry.source,
          category: entry.category,
          sentiment: entry.sentiment,
          severity: entry.severity,
          status: entry.status,
          summary: entry.summary,
          details: entry.details,
          createdAt: entry.created_at,
          resolvedAt: entry.resolved_at,
          reporter: entry.reporter
            ? {
                id: entry.reporter.id,
                name: entry.reporter.full_name,
                username: entry.reporter.username,
                avatarUrl: entry.reporter.avatar_url,
              }
            : null,
        })) ?? [],
    });
  } catch (error) {
    console.error('[admin/houses/feedback] failed to load feedback list', error);
    return NextResponse.json({ success: false, error: 'Failed to load feedback entries.' }, { status: 500 });
  }
}
