import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { awardXP } from '@/lib/xp';

const db = supabaseAdmin ?? supabase;
const GLOSSARY_XP = 2;

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response!;

  const termId = context.params.id;
  const userId = auth.user!.userId;

  try {
    const { data: term, error: termError } = await db
      .from('glossary_terms')
      .select('id, status')
      .eq('id', termId)
      .maybeSingle();

    if (termError) {
      console.error('Failed to load glossary term for progress:', termError);
      return NextResponse.json(
        { success: false, error: 'Falha ao carregar termo.' },
        { status: 500 },
      );
    }

    if (!term || term.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Termo indisponível para XP.' },
        { status: 404 },
      );
    }

    const { data: existing, error: completionError } = await db
      .from('glossary_term_reads')
      .select('term_id, completed_at')
      .eq('term_id', termId)
      .eq('user_id', userId)
      .maybeSingle();

    if (completionError && (completionError as any).code !== 'PGRST116') {
      console.error('Failed to check glossary completion:', completionError);
      return NextResponse.json(
        { success: false, error: 'Erro ao validar progresso.' },
        { status: 500 },
      );
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        completion: {
          termId: existing.term_id as string,
          completedAt: existing.completed_at as string,
        },
      });
    }

    const { data: inserted, error: insertError } = await db
      .from('glossary_term_reads')
      .insert({
        term_id: termId,
        user_id: userId,
        xp_earned: GLOSSARY_XP,
      })
      .select('term_id, completed_at')
      .single();

    if (insertError) {
      console.error('Failed to insert glossary completion:', insertError);
      return NextResponse.json(
        { success: false, error: 'Não foi possível registar o progresso.' },
        { status: 500 },
      );
    }

    const xpResult = await awardXP(
      userId,
      'Glossary term read',
      GLOSSARY_XP,
      termId,
      'glossary_term',
    );

    if (!xpResult.success) {
      console.error('Failed to award XP for glossary term:', xpResult.error);
      return NextResponse.json(
        {
          success: false,
          error: xpResult.error || 'Não foi possível atribuir XP.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      xpAwarded: GLOSSARY_XP,
      newTotal: xpResult.newTotal,
      completion: {
        termId: inserted.term_id as string,
        completedAt: inserted.completed_at as string,
      },
    });
  } catch (error) {
    console.error('Error registering glossary progress:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao registar progresso de leitura.' },
      { status: 500 },
    );
  }
}
