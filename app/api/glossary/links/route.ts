import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import {
  GlossaryError,
  listGlossaryLinks,
  recordGlossaryLink,
} from '@/lib/server/glossary';
import type {
  GlossaryContentType,
  GlossaryLanguage,
} from '@/types/glossary';

function handleGlossaryError(error: unknown) {
  if (error instanceof GlossaryError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error('Glossary links API error:', error);
  return NextResponse.json(
    { success: false, error: 'Erro interno no glossario.' },
    { status: 500 },
  );
}

function parseContentType(value?: string | null): GlossaryContentType | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (
    normalized === 'lesson' ||
    normalized === 'blog_post' ||
    normalized === 'academy_page'
  ) {
    return normalized as GlossaryContentType;
  }
  return undefined;
}

function parseLanguage(value?: string | null): GlossaryLanguage | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'pt' || normalized === 'es' || normalized === 'en') {
    return normalized as GlossaryLanguage;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  const searchParams = new URL(request.url).searchParams;
  const contentId = searchParams.get('contentId');

  if (!contentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'contentId obrigatorio na query string.',
      },
      { status: 400 },
    );
  }

  const contentType = parseContentType(searchParams.get('contentType'));

  try {
    const links = await listGlossaryLinks({
      contentId,
      contentType,
    });
    return NextResponse.json({ success: true, links });
  } catch (error) {
    return handleGlossaryError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalido.' },
      { status: 400 },
    );
  }

  const contentType = parseContentType(body?.contentType);
  const language = parseLanguage(body?.language);

  if (!contentType) {
    return NextResponse.json(
      { success: false, error: 'contentType invalido.' },
      { status: 400 },
    );
  }

  if (!language) {
    return NextResponse.json(
      { success: false, error: 'language invalido.' },
      { status: 400 },
    );
  }

  try {
    const link = await recordGlossaryLink({
      termId: body?.termId,
      slug: body?.slug,
      contentType,
      contentId: body?.contentId,
      displayText: body?.displayText,
      language,
      userId: auth.user!.userId,
    });
    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (error) {
    return handleGlossaryError(error);
  }
}
