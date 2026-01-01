import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import {
  GlossaryError,
  deleteGlossaryLink,
} from '@/lib/server/glossary';

function handleGlossaryError(error: unknown) {
  if (error instanceof GlossaryError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error('Glossary links admin API error:', error);
  return NextResponse.json(
    { success: false, error: 'Erro interno no glossario.' },
    { status: 500 },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  try {
    await deleteGlossaryLink(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleGlossaryError(error);
  }
}
