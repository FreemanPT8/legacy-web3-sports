import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import {
  GlossaryError,
  deleteGlossaryTerm,
  getGlossaryTermById,
  updateGlossaryTerm,
} from '@/lib/server/glossary';
import type { GlossaryTermPayload } from '@/types/glossary';

function handleGlossaryError(error: unknown) {
  if (error instanceof GlossaryError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error('Glossary admin API error:', error);
  return NextResponse.json(
    { success: false, error: 'Erro interno no glossario.' },
    { status: 500 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  try {
    const term = await getGlossaryTermById(params.id, { includeDrafts: true });
    return NextResponse.json({ success: true, term });
  } catch (error) {
    return handleGlossaryError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const term = await updateGlossaryTerm(params.id, payload, auth.user!.userId);
    return NextResponse.json({ success: true, term });
  } catch (error) {
    return handleGlossaryError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  try {
    await deleteGlossaryTerm(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleGlossaryError(error);
  }
}
