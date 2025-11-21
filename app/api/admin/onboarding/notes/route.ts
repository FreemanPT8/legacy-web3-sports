import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

interface NoteRow {
  id: string;
  submission_id: string;
  author_user_id: string | null;
  note: string;
  created_at: string;
}

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

interface NoteDTO {
  id: string;
  submission_id: string;
  author_user_id: string | null;
  note: string;
  created_at: string;
  author_full_name: string | null;
  author_username: string | null;
  author_email: string | null;
}

interface NotesGetResponse {
  success: boolean;
  notes?: NoteDTO[];
  error?: string;
}

interface NotesPostResponse {
  success: boolean;
  note?: NoteDTO;
  error?: string;
}

// GET /api/admin/onboarding/notes?submissionId=...
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json<NotesGetResponse>(
        { success: false, error: 'Missing submissionId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('onboarding_notes')
      .select('id, submission_id, author_user_id, note, created_at')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading onboarding_notes:', error);
      return NextResponse.json<NotesGetResponse>(
        { success: false, error: 'Failed to load notes' },
        { status: 500 }
      );
    }

    const rows = (data || []) as NoteRow[];

    const authorIds = Array.from(
      new Set(
        rows
          .map((r) => r.author_user_id)
          .filter((id): id is string => !!id)
      )
    );

    let usersById: Record<string, UserRow> = {};
    if (authorIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, email')
        .in('id', authorIds);

      if (usersError) {
        console.error('Error loading note authors:', usersError);
      } else {
        for (const u of (users || []) as UserRow[]) {
          usersById[u.id] = u;
        }
      }
    }

    const notes: NoteDTO[] = rows.map((r) => {
      const author = r.author_user_id ? usersById[r.author_user_id] : null;
      return {
        id: r.id,
        submission_id: r.submission_id,
        author_user_id: r.author_user_id,
        note: r.note,
        created_at: r.created_at,
        author_full_name: author?.full_name ?? null,
        author_username: author?.username ?? null,
        author_email: author?.email ?? null,
      };
    });

    return NextResponse.json<NotesGetResponse>({ success: true, notes });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/onboarding/notes:', err);
    return NextResponse.json<NotesGetResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/onboarding/notes
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;

  try {
    const body = await request.json();
    const submissionId = body?.submissionId as string | undefined;
    const noteText = body?.note as string | undefined;

    if (!submissionId || !noteText || !noteText.trim()) {
      return NextResponse.json<NotesPostResponse>(
        { success: false, error: 'submissionId and note are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('onboarding_notes')
      .insert({
        submission_id: submissionId,
        author_user_id: currentUser.userId,
        note: noteText.trim(),
      })
      .select('id, submission_id, author_user_id, note, created_at')
      .maybeSingle();

    if (error) {
      console.error('Error inserting onboarding_note:', error);
      return NextResponse.json<NotesPostResponse>(
        { success: false, error: 'Failed to save note' },
        { status: 500 }
      );
    }

    const row = data as NoteRow | null;
    if (!row) {
      return NextResponse.json<NotesPostResponse>(
        { success: false, error: 'Failed to save note' },
        { status: 500 }
      );
    }

    const note: NoteDTO = {
      id: row.id,
      submission_id: row.submission_id,
      author_user_id: row.author_user_id,
      note: row.note,
      created_at: row.created_at,
      author_full_name: currentUser.fullName ?? null,
      author_username: currentUser.username ?? null,
      author_email: currentUser.email ?? null,
    };

    return NextResponse.json<NotesPostResponse>({ success: true, note });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/onboarding/notes:', err);
    return NextResponse.json<NotesPostResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
