import { NextRequest, NextResponse } from 'next/server';
import { awardXP, hasCompletedContent, markContentComplete } from '@/lib/xp';
import { supabase, supabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: { id: string };
}

// usamos o client admin se existir (bypass RLS em produção)
const db = supabaseAdmin ?? supabase;

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = context.params;

  try {
    const body = await request.json();
    const { userId, xpEarned } = body || {};

    if (!userId || typeof xpEarned !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing userId or xpEarned' },
        { status: 400 },
      );
    }

    // 0) Buscar o post para saber quem é o autor
    let isAuthor = false;
    let authorId: string | null = null;

    try {
      const { data: postRow, error: postError } = await db
        .from('blog_posts')
        .select('id, author_id')
        .eq('id', id)
        .maybeSingle();

      if (!postError && postRow) {
        authorId = postRow.author_id ?? null;
        if (authorId && authorId === userId) {
          isAuthor = true;
        }
      } else if (postError) {
        console.error('Error fetching blog post for creator bonus:', postError);
      }
    } catch (e) {
      console.error('Fatal error loading blog post author:', e);
    }

    // 1) Ver se o conteúdo já está completo para este user
    const alreadyCompleted = await hasCompletedContent(
      userId,
      id,
      'blog',
    );

    if (alreadyCompleted) {
      // Conteúdo já marcado como completo — não repetimos nada
      return NextResponse.json({
        success: false,
        alreadyCompleted: true,
        error: 'Already read',
      });
    }

    // 2) Registar leitura em blog_reads
    //    - se for o autor, marcamos como completo mas com xp_earned = 0
    const xpToStore = isAuthor ? 0 : xpEarned;

    const markResult = await markContentComplete(
      userId,
      id,
      'blog',
      xpToStore,
    );

    if (!markResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            markResult.error ||
            'Failed to register blog read',
        },
        { status: 500 },
      );
    }

    // 3) Se for o autor → não ganha XP, apenas fica marcado como completo
    if (isAuthor) {
      return NextResponse.json({
        success: true,
        newTotal: undefined,
        isAuthor: true,
      });
    }

    // 4) Atribuir XP ao utilizador leitor
    const awardResult = await awardXP(
      userId,
      'Blog article read',
      xpEarned,
      id,
      'blog',
    );

    if (!awardResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            awardResult.error ||
            'Failed to award XP for blog read',
        },
        { status: 500 },
      );
    }

    // 5) Bónus para o criador de conteúdo (19% do XP ganho pelo leitor)
    //    Apenas se existir authorId e não for o próprio leitor
    try {
      if (authorId && authorId !== userId) {
        const creatorBonus = Math.floor(xpEarned * 0.19);
        if (creatorBonus > 0) {
          const creatorResult = await awardXP(
            authorId,
            'Creator bonus: blog article read',
            creatorBonus,
            id,
            'blog_creator',
          );

          if (!creatorResult.success) {
            console.error(
              'Failed to award creator bonus for blog post:',
              creatorResult.error,
            );
          }
        }
      }
    } catch (e) {
      console.error('Fatal error awarding creator bonus (blog):', e);
    }

    return NextResponse.json({
      success: true,
      newTotal: awardResult.newTotal,
      isAuthor: false,
    });
  } catch (error) {
    console.error('Error in POST /api/blog/[id]/read:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
