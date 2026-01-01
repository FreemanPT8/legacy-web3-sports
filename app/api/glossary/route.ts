import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/middleware';
import { ensureUserRole, isAdminRole } from '@/lib/roles';
import {
  GlossaryError,
  createGlossaryTerm,
  listGlossaryTerms,
} from '@/lib/server/glossary';
import type {
  GlossaryLanguage,
  GlossaryStatus,
  GlossaryTermPayload,
} from '@/types/glossary';

function parseInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTags(params: URLSearchParams): string[] | undefined {
  const multiTags = params.getAll('tag').map((tag) => tag.trim()).filter(Boolean);
  if (multiTags.length > 0) {
    return multiTags;
  }

  const tagList = params.get('tags');
  if (!tagList) return undefined;

  const splitted = tagList
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return splitted.length > 0 ? splitted : undefined;
}

function parseLanguage(value: string | null): GlossaryLanguage | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'pt' || normalized === 'es' || normalized === 'en') {
    return normalized;
  }
  return undefined;
}

function parseStatus(value: string | null): GlossaryStatus | 'all' | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'all') return 'all';
  if (
    normalized === 'draft' ||
    normalized === 'review' ||
    normalized === 'published'
  ) {
    return normalized as GlossaryStatus;
  }
  return undefined;
}

function handleGlossaryError(error: unknown) {
  if (error instanceof GlossaryError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error('Glossary API error:', error);
  return NextResponse.json(
    { success: false, error: 'Erro interno ao processar o glossario.' },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;

  const { user } = auth;
  const role = ensureUserRole(user!.role);
  const canSeeDrafts = isAdminRole(role);

  try {
    const searchParams = new URL(request.url).searchParams;
    const page = parseInteger(searchParams.get('page'), 1);
    const pageSize = parseInteger(searchParams.get('pageSize'), 50);
    const statusParam = parseStatus(searchParams.get('status'));
    const language = parseLanguage(searchParams.get('language'));
    const filters = {
      search: searchParams.get('search') ?? undefined,
      letter: searchParams.get('letter') ?? undefined,
      language,
      page,
      pageSize,
      tags: parseTags(searchParams),
      status: canSeeDrafts ? statusParam : undefined,
    };

    const result = await listGlossaryTerms(filters, {
      includeDrafts: canSeeDrafts,
    });

    return NextResponse.json({
      success: true,
      terms: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.count,
        totalPages: Math.max(
          1,
          Math.ceil(result.count / result.pageSize),
        ),
      },
    });
  } catch (error) {
    return handleGlossaryError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  let payload: GlossaryTermPayload;

  try {
    payload = (await request.json()) as GlossaryTermPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON invalido.' },
      { status: 400 },
    );
  }

  try {
    const term = await createGlossaryTerm(payload, auth.user!.userId);
    return NextResponse.json(
      { success: true, term },
      { status: 201 },
    );
  } catch (error) {
    return handleGlossaryError(error);
  }
}
