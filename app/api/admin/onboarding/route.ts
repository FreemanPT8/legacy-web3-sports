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

interface OnboardingSubmissionRow {
  id: string;
  created_at: string | null;
  full_name: string | null;
  email: string | null;
  country: string | null;
  sports_category: string | null;
  sports_category_code: string | null;
  sports_role: string | null;
  status: OnboardingStatus | null;
  sequence_number: number | null;
  assigned_to_user_id: string | null;
  phone: string | null;
  telegram: string | null;
  organization: string | null;
  web3_experience: string | null;
  interests: string[] | null;
  message: string | null;
}

interface AssignedUserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member';
}

interface OnboardingSubmissionDTO {
  id: string;
  sequence_number: number | null;
  email: string | null;
  full_name: string | null;
  country: string | null;
  sports_category: string | null;
  sports_category_code: string | null;
  sports_role: string | null;
  status: OnboardingStatus | null;
  created_at: string | null;
  assigned_to_user_id: string | null;
  assigned_to_username: string | null;
  assigned_to_full_name: string | null;
  phone: string | null;
  telegram: string | null;
  organization: string | null;
  web3_experience: string | null;
  interests: string[] | null;
  message: string | null;
}

interface GetResponseBody {
  success: boolean;
  submissions?: OnboardingSubmissionDTO[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}

// GET /api/admin/onboarding
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;

  try {
    const { searchParams } = new URL(request.url);

    // Aceitamos tanto os nomes "novos" como os "antigos" de query params
    const rawStatus = searchParams.get('status');
    const rawSport =
      searchParams.get('sport') || searchParams.get('sport_code');
    const rawAssigned =
      searchParams.get('assignedTo') || searchParams.get('assigned_to');
    const query = searchParams.get('q') || '';

    const statusFilter =
      rawStatus && rawStatus !== 'ALL' && rawStatus !== 'ALL_STATUS'
        ? (rawStatus as OnboardingStatus)
        : null;

    const sportFilter =
      rawSport && rawSport !== 'ALL' && rawSport !== 'ALL_SPORTS'
        ? rawSport
        : null;

    let assignedToFilter: 'ME' | 'UNASSIGNED' | null = null;
    if (rawAssigned) {
      const normalized = rawAssigned.toUpperCase();
      if (normalized === 'ME') assignedToFilter = 'ME';
      else if (normalized === 'UNASSIGNED') assignedToFilter = 'UNASSIGNED';
    }

    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '50');

    // Buscar todas as submissões (MVP: filtramos em memória)
    const { data, error } = await supabaseAdmin
      .from('onboarding_submissions')
      .select(
        `
        id,
        created_at,
        full_name,
        email,
        country,
        sports_category,
        sports_category_code,
        sports_role,
        status,
        sequence_number,
        assigned_to_user_id,
        phone,
        telegram,
        organization,
        web3_experience,
        interests,
        message
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error loading onboarding submissions:', error);
      return NextResponse.json<GetResponseBody>(
        {
          success: false,
          error: error.message || 'Failed to load onboarding submissions',
        },
        { status: 500 }
      );
    }

    const rows = (data || []) as OnboardingSubmissionRow[];

    // Filtros em memória
    const filteredRows = rows.filter((row: OnboardingSubmissionRow) => {
      const rowStatus: OnboardingStatus =
        (row.status as OnboardingStatus) || 'PENDING_RESPONSE';

      // Filtro por estado
      if (statusFilter) {
        if (rowStatus !== statusFilter) return false;
      }

      // Filtro por desporto (usa código e nome)
      if (sportFilter) {
        const code = (row.sports_category_code || '').toLowerCase();
        const name = (row.sports_category || '').toLowerCase();
        const term = sportFilter.toLowerCase();

        if (!code.includes(term) && !name.includes(term)) {
          return false;
        }
      }

      // Filtro por responsável
      if (assignedToFilter) {
        if (assignedToFilter === 'ME') {
          if (row.assigned_to_user_id !== currentUser.userId) return false;
        } else if (assignedToFilter === 'UNASSIGNED') {
          if (row.assigned_to_user_id !== null) return false;
        }
      }

      // Pesquisa livre (nome, email, país, desporto, sequence_number)
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const seq = row.sequence_number ? String(row.sequence_number) : '';

        const haystack = [
          row.full_name || '',
          row.email || '',
          row.country || '',
          row.sports_category || '',
          row.sports_category_code || '',
          seq,
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });

    const total = filteredRows.length;

    // Paginação simples em memória
    const safePage = page > 0 ? page : 1;
    const safePageSize =
      pageSize > 0 && pageSize <= 200 ? pageSize : 50;
    const startIndex = (safePage - 1) * safePageSize;
    const endIndex = startIndex + safePageSize;

    const paginatedRows = filteredRows.slice(startIndex, endIndex);

    // Buscar info dos utilizadores atribuídos (assigned_to_user_id)
    const assignedIds = Array.from(
      new Set(
        paginatedRows
          .map((r) => r.assigned_to_user_id)
          .filter((id): id is string => !!id)
      )
    );

    let assignedUsersById: Record<string, AssignedUserRow> = {};

    if (assignedIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, email, role')
        .in('id', assignedIds);

      if (usersError) {
        console.error('Supabase error loading assigned users:', usersError);
        // Não falhamos o endpoint – só ficamos sem info detalhada de assigned_to
      } else {
        const users = (usersData || []) as AssignedUserRow[];
        assignedUsersById = users.reduce<
          Record<string, AssignedUserRow>
        >((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }
    }

    const submissions: OnboardingSubmissionDTO[] = paginatedRows.map(
      (row: OnboardingSubmissionRow) => {
        const assigned =
          row.assigned_to_user_id &&
          assignedUsersById[row.assigned_to_user_id]
            ? assignedUsersById[row.assigned_to_user_id]
            : null;

        return {
          id: row.id,
          sequence_number: row.sequence_number ?? null,
          email: row.email ?? null,
          full_name: row.full_name ?? null,
          country: row.country ?? null,
          sports_category: row.sports_category ?? null,
          sports_category_code: row.sports_category_code ?? null,
          sports_role: row.sports_role ?? null,
          status: (row.status as OnboardingStatus) ?? null,
          created_at: row.created_at ?? null,
          assigned_to_user_id: row.assigned_to_user_id,
          assigned_to_username: assigned?.username ?? null,
          assigned_to_full_name: assigned?.full_name ?? null,
          phone: row.phone ?? null,
          telegram: row.telegram ?? null,
          organization: row.organization ?? null,
          web3_experience: row.web3_experience ?? null,
          interests: row.interests ?? null,
          message: row.message ?? null,
        };
      }
    );

    return NextResponse.json<GetResponseBody>({
      success: true,
      submissions,
      total,
      page: safePage,
      pageSize: safePageSize,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/onboarding:', err);
    return NextResponse.json<GetResponseBody>(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

interface PatchBodyBase {
  submissionId: string;
}

interface PatchStatusBody extends PatchBodyBase {
  status: OnboardingStatus;
}

interface PatchAssignToMeBody extends PatchBodyBase {
  assignToMe: true;
}

interface PatchAssignToUserBody extends PatchBodyBase {
  assignToUserId: string | null;
}

type PatchBody =
  | PatchStatusBody
  | PatchAssignToMeBody
  | PatchAssignToUserBody;

interface PatchResponseBody {
  success: boolean;
  error?: string;
}

// PATCH /api/admin/onboarding
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const currentRole = currentUser.role as 'Super Admin' | 'Admin';

  try {
    const body = (await request.json()) as PatchBody;

    if (!body || !body.submissionId) {
      return NextResponse.json<PatchResponseBody>(
        { success: false, error: 'Missing submissionId' },
        { status: 400 }
      );
    }

    // 1) Atualizar estado
    if ('status' in body && body.status) {
      const newStatus = body.status;

      const allowedStatuses: OnboardingStatus[] = [
        'PENDING_RESPONSE',
        'RESPONDED_WAITING',
        'FIRST_CONTACT_SCHEDULED',
        'FIRST_CONTACT_DONE',
        'ONBOARDING_LEGACY',
        'ONBOARDING_DAO1',
        'ONBOARDING_TELEGRAM',
      ];

      if (!allowedStatuses.includes(newStatus)) {
        return NextResponse.json<PatchResponseBody>(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }

      // Buscar estado atual (e responsável) para validação + histórico
      const { data: existingRow, error: existingError } = await supabaseAdmin
        .from('onboarding_submissions')
        .select('status, assigned_to_user_id')
        .eq('id', body.submissionId)
        .maybeSingle();

      if (existingError) {
        console.error(
          'Error loading submission before status update:',
          existingError
        );
        return NextResponse.json<PatchResponseBody>(
          {
            success: false,
            error: 'Failed to load submission for status update',
          },
          { status: 500 }
        );
      }

      if (!existingRow) {
        return NextResponse.json<PatchResponseBody>(
          { success: false, error: 'Submission not found' },
          { status: 404 }
        );
      }

      const oldStatus = existingRow.status as OnboardingStatus | null;

      // Regra de permissões:
      // - Super Admin pode sempre alterar
      // - Admin só pode alterar se for o responsável da submissão
      if (currentRole === 'Admin') {
        if (existingRow.assigned_to_user_id !== currentUser.userId) {
          return NextResponse.json<PatchResponseBody>(
            {
              success: false,
              error:
                'Only the responsible admin can update the status for this submission',
            },
            { status: 403 }
          );
        }
      }

      const { error } = await supabaseAdmin
        .from('onboarding_submissions')
        .update({
          status: newStatus,
        })
        .eq('id', body.submissionId);

      if (error) {
        console.error('Supabase error updating onboarding status:', error);
        return NextResponse.json<PatchResponseBody>(
          {
            success: false,
            error: error.message || 'Failed to update status',
          },
          { status: 500 }
        );
      }

      // Registar histórico (não bloqueia o fluxo se falhar)
      const { error: historyError } = await supabaseAdmin
        .from('onboarding_status_history')
        .insert({
          submission_id: body.submissionId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by_user_id: currentUser.userId,
        });

      if (historyError) {
        console.error(
          'Error inserting onboarding_status_history:',
          historyError
        );
        // não mandamos erro ao cliente para não bloquear o fluxo
      }

      return NextResponse.json<PatchResponseBody>({ success: true });
    }

    // 2) Atribuir a mim (assignToMe) – Admin ou Super Admin
    if ('assignToMe' in body && body.assignToMe === true) {
      const { error } = await supabaseAdmin
        .from('onboarding_submissions')
        .update({
          assigned_to_user_id: currentUser.userId,
        })
        .eq('id', body.submissionId);

      if (error) {
        console.error(
          'Supabase error assigning onboarding to current user:',
          error
        );
        return NextResponse.json<PatchResponseBody>(
          {
            success: false,
            error: error.message || 'Failed to assign submission',
          },
          { status: 500 }
        );
      }

      return NextResponse.json<PatchResponseBody>({ success: true });
    }

    // 3) Atribuir a um utilizador específico – APENAS Super Admin
    if ('assignToUserId' in body) {
      if (currentRole !== 'Super Admin') {
        return NextResponse.json<PatchResponseBody>(
          {
            success: false,
            error: 'Only Super Admins can assign a submission to another user',
          },
          { status: 403 }
        );
      }

      const targetUserId = body.assignToUserId;

      const { error } = await supabaseAdmin
        .from('onboarding_submissions')
        .update({
          assigned_to_user_id: targetUserId || null,
        })
        .eq('id', body.submissionId);

      if (error) {
        console.error(
          'Supabase error assigning onboarding to specific user:',
          error
        );
        return NextResponse.json<PatchResponseBody>(
          {
            success: false,
            error: error.message || 'Failed to assign submission',
          },
          { status: 500 }
        );
      }

      return NextResponse.json<PatchResponseBody>({ success: true });
    }

    return NextResponse.json<PatchResponseBody>(
      { success: false, error: 'No valid action in request body' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/admin/onboarding:', err);
    return NextResponse.json<PatchResponseBody>(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
