import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMissingResourceError, isMissingTable } from '@/lib/postgres';

function safeUnique<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const set = new Set<string>();
  rows.forEach((row) => {
    const value = key(row);
    if (value) set.add(value);
  });
  return set;
}

type MetricsPayload = {
  members: number;
  completionRate: number;
  completionUsers: number;
  totalCompletions: number;
  retention: { d30: number; d60: number; d90: number };
  feedback: { total: number; negative: number; neutral: number; positive: number; unresolved: number };
  updatedAt: string;
};

const ZERO_METRICS: MetricsPayload = {
  members: 0,
  completionRate: 0,
  completionUsers: 0,
  totalCompletions: 0,
  retention: { d30: 0, d60: 0, d90: 0 },
  feedback: { total: 0, negative: 0, neutral: 0, positive: 0, unresolved: 0 },
  updatedAt: new Date(0).toISOString(),
};

function buildMetrics(partial?: Partial<MetricsPayload>): MetricsPayload {
  return {
    ...ZERO_METRICS,
    ...partial,
    retention: {
      ...ZERO_METRICS.retention,
      ...(partial?.retention ?? {}),
    },
    feedback: {
      ...ZERO_METRICS.feedback,
      ...(partial?.feedback ?? {}),
    },
    updatedAt: partial?.updatedAt ?? new Date().toISOString(),
  };
}

function respondWithMetrics(overrides?: Partial<MetricsPayload>, warning?: string) {
  const metrics = buildMetrics(overrides);
  if (warning) {
    return NextResponse.json({ success: true, metrics, warning });
  }
  return NextResponse.json({ success: true, metrics });
}

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
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from('user_houses')
      .select('user_id')
      .eq('house_id', houseId)
      .is('removed_at', null);
    if (membersError) {
      if (isMissingTable(membersError)) {
        console.warn('[admin/houses/metrics] user_houses missing; returning empty metrics.');
        return respondWithMetrics(undefined, formatMissingResourceError('user_houses'));
      }
      throw membersError;
    }

    const memberIds =
      membersData
        ?.map((row: { user_id: string | null }) => row.user_id)
        .filter((id: string | null): id is string => Boolean(id)) ?? [];
    const memberCount = memberIds.length;

    let completionRate = 0;
    let completionUsers = 0;
    let totalCompletions = 0;
    let retention30 = 0;
    let retention60 = 0;
    let retention90 = 0;

    if (memberCount > 0) {
      const { data: completionRows, error: completionError } = await supabaseAdmin
        .from('course_completions')
        .select('user_id')
        .in('user_id', memberIds);
      if (completionError) {
        if (isMissingTable(completionError)) {
          console.warn('[admin/houses/metrics] course_completions missing; completion stats default to zero.');
        } else {
          throw completionError;
        }
      } else {
        totalCompletions = completionRows?.length ?? 0;
        completionUsers = safeUnique(completionRows ?? [], (row: any) => row.user_id).size;
        completionRate = completionUsers / memberCount;
      }

      const cutoff90 = new Date();
      cutoff90.setDate(cutoff90.getDate() - 90);
      const { data: xpRows, error: xpError } = await supabaseAdmin
        .from('xp_transactions')
        .select('user_id, created_at')
        .in('user_id', memberIds)
        .gte('created_at', cutoff90.toISOString());
      if (xpError) {
        if (isMissingTable(xpError)) {
          console.warn('[admin/houses/metrics] xp_transactions missing; retention stats default to zero.');
        } else {
          throw xpError;
        }
      }

      const lastActivity = new Map<string, number>();
      xpRows?.forEach((row: { user_id: string | null; created_at: string | null }) => {
        const id = row.user_id;
        const createdAt = row.created_at ? new Date(row.created_at).getTime() : null;
        if (!id || !createdAt) return;
        const previous = lastActivity.get(id) ?? 0;
        if (createdAt > previous) {
          lastActivity.set(id, createdAt);
        }
      });

      const now = Date.now();
      memberIds.forEach((id: string) => {
        const last = lastActivity.get(id);
        if (!last) return;
        const diffDays = (now - last) / (1000 * 60 * 60 * 24);
        if (diffDays <= 90) retention90 += 1;
        if (diffDays <= 60) retention60 += 1;
        if (diffDays <= 30) retention30 += 1;
      });
    }

    const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
      .from('house_feedback')
      .select('sentiment, status')
      .eq('house_id', houseId);
    if (feedbackError) {
      if (isMissingTable(feedbackError)) {
        console.warn('[admin/houses/metrics] house_feedback missing; feedback stats default to zero.');
      } else {
        throw feedbackError;
      }
    }
    const feedbackTotals = {
      total: feedbackRows?.length ?? 0,
      negative: 0,
      neutral: 0,
      positive: 0,
      unresolved: 0,
    };
    feedbackRows?.forEach((row: { sentiment: string | null; status: string | null }) => {
      const sentiment = (row.sentiment || 'neutral').toLowerCase();
      if (sentiment === 'negative') feedbackTotals.negative += 1;
      else if (sentiment === 'positive') feedbackTotals.positive += 1;
      else feedbackTotals.neutral += 1;
      if ((row.status || 'open').toLowerCase() !== 'closed') feedbackTotals.unresolved += 1;
    });

    return respondWithMetrics({
      members: memberCount,
      completionRate,
      completionUsers,
      totalCompletions,
      retention: {
        d30: memberCount ? retention30 / memberCount : 0,
        d60: memberCount ? retention60 / memberCount : 0,
        d90: memberCount ? retention90 / memberCount : 0,
      },
      feedback: feedbackTotals,
    });
  } catch (err) {
    console.error('[admin/houses/metrics] Failed to load metrics', err);
    return NextResponse.json({ success: false, error: 'Failed to load metrics.' }, { status: 500 });
  }
}
