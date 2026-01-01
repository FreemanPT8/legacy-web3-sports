import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { ensureUserRole, isAdminRole } from '@/lib/roles';
import {
  GlossaryError,
  getGlossaryTermBySlug,
} from '@/lib/server/glossary';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const db = supabaseAdmin ?? supabase;

function handleGlossaryError(error: unknown) {
  if (error instanceof GlossaryError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error('Glossary slug API error:', error);
  return NextResponse.json(
    { success: false, error: 'Erro interno no glossario.' },
    { status: 500 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;

  const { user } = auth;
  const role = ensureUserRole(user!.role);
  const searchParams = new URL(request.url).searchParams;
  const preview = searchParams.get('preview') === 'true';
  const includeDrafts = preview && isAdminRole(role);

  try {
    const term = await getGlossaryTermBySlug(params.slug, {
      includeDrafts,
    });
    let completion: { termId: string; completedAt: string } | null = null;
    const { data: completionRow, error } = await db
      .from('glossary_term_reads')
      .select('term_id, completed_at')
      .eq('term_id', term.id)
      .eq('user_id', user!.userId)
      .maybeSingle();

    if (error && (error as any).code !== 'PGRST116') {
      console.error('Failed to load glossary completion by slug:', error);
    }

    if (completionRow) {
      completion = {
        termId: completionRow.term_id as string,
        completedAt: completionRow.completed_at as string,
      };
    }

    return NextResponse.json({ success: true, term, completion });
  } catch (error) {
    return handleGlossaryError(error);
  }
}
