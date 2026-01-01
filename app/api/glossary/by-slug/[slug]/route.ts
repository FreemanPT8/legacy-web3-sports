import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { ensureUserRole, isAdminRole } from '@/lib/roles';
import {
  GlossaryError,
  getGlossaryTermBySlug,
} from '@/lib/server/glossary';

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
    return NextResponse.json({ success: true, term });
  } catch (error) {
    return handleGlossaryError(error);
  }
}
