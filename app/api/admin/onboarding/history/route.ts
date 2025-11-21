import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

type OnboardingStatus =
  | 'PENDING_RESPONSE'
  | 'RESPONDED_WAITING'
  | 'FIRST_CONTACT_SCHEDULED'
  | 'FIRST_CONTACT_DONE'
  | 'ONBOARDING_LEGACY'
  | 'ONBOARDING_DAO1'
  | 'ONBOARDING_TELEGRAM';

interface HistoryRow {
  id: string;
  submission_id: string;
  old_status: OnboardingStatus | null;
  new_status: OnboardingStatus;
  changed_by_user_id: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

interface HistoryDTO {
  id: string;
  submission_id: string;
  old_status: OnboardingStatus | null;
  new_status: OnboardingStatus;
  created_at: string;
  changed_by_user_id: string | null;
  changed_by_full_name: string | null;
  changed_by_username: string | null;
  changed_by_email: string | null;
}

interface HistoryGetResponse {
  success: boolean;
  items?: HistoryDTO[];
  error?: string;
}

// GET /api/admin/onboarding/history?submissionId=...
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json<HistoryGetResponse>(
        { success: false, error: 'Missing submissionId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('onboarding_status_history')
      .select(
        'id, submission_id, old_status, new_status, changed_by_user_id, created_at'
      )
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading onboarding_status_history:', error);
      return NextResponse.json<HistoryGetResponse>(
        { success: false, error: 'Failed to load history' },
        { status: 500 }
      );
    }

    const rows = (data || []) as HistoryRow[];

    const userIds = Array.from(
      new Set(
        rows
          .map((r) => r.changed_by_user_id)
          .filter((id): id is string => !!id)
      )
    );

    let usersById: Record<string, UserRow> = {};
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error loading history users:', usersError);
      } else {
        for (const u of (users || []) as UserRow[]) {
          usersById[u.id] = u;
        }
      }
    }

    const items: HistoryDTO[] = rows.map((r) => {
      const u = r.changed_by_user_id ? usersById[r.changed_by_user_id] : null;
      return {
        id: r.id,
        submission_id: r.submission_id,
        old_status: r.old_status,
        new_status: r.new_status,
        created_at: r.created_at,
        changed_by_user_id: r.changed_by_user_id,
        changed_by_full_name: u?.full_name ?? null,
        changed_by_username: u?.username ?? null,
        changed_by_email: u?.email ?? null,
      };
    });

    return NextResponse.json<HistoryGetResponse>({ success: true, items });
  } catch (err: any) {
    console.error(
      'Unexpected error in GET /api/admin/onboarding/history:',
      err
    );
    return NextResponse.json<HistoryGetResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
