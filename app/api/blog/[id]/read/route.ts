import { NextRequest, NextResponse } from 'next/server';
import { awardXP, hasCompletedContent, markContentComplete } from '@/lib/xp';
import { supabase, supabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: { id: string };
}

// Usamos o client admin sempre que existir (produção)
const db = supabaseAdmin ?? supabase;

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  try {
    const body = await request.json();
    const { userId, xpEarned } = body || {};

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 },
      );
    }

    // 1) Obter autor do artigo
    const { data: post, error: postError } = await db
      .from('blog_posts')
      .select('id, author_id, xp_reward')
      .eq('id', id)
      .maybeSingle();

    if (postError) {
      console.error('Error fetching blog post in /read:', postError);
      return NextResponse.json(
        { success: false, error: 'Failed to load blog post' },
        { status: 500 },
      );
    }

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    const authorId = (post.author_id as string | null) || null;
    const basePostXP =
      typeof post.xp_reward === 'number' && Number.isFinite(post.xp_reward)
        ? post.xp_reward
        : 0;

    // 2) Já completou este artigo?
    const alreadyCompleted = await hasCompletedContent(
      userId,
      id,
      'blog',
    );

    if (alreadyCompleted) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'Already read',
      });
    }

    // 3) Definir XP efectivo para o leitor
    //    – criador não ganha XP por ler o próprio artigo
    const requestedXp =
      typeof xpEarned === 'number' && Number.isFinite(xpEarned)
        ? xpEarned
        : basePostXP;
    const safeReaderXP = Math.max(0, Math.min(requestedXp, basePostXP));
    const effectiveXpForReader =
      authorId && authorId === userId ? 0 : safeReaderXP;

    // 4) Registar leitura em blog_reads
    const markResult = await markContentComplete(
      userId,
      id,
      'blog',
      effectiveXpForReader,
    );

    if (!markResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            markResult.error || 'Failed to register blog read',
        },
        { status: 500 },
      );
    }

    // 5) Atribuir XP ao leitor (pode ser 0 se for o autor)
    let readerNewTotal: number | undefined;

    if (effectiveXpForReader > 0) {
      const awardResult = await awardXP(
        userId,
        'Blog article read',
        effectiveXpForReader,
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

      readerNewTotal = awardResult.newTotal;
    }

    // 6) Bónus de criador (19% do XP do leitor)
    //    – só se existir autor e não for o próprio leitor
    if (authorId && authorId !== userId && effectiveXpForReader > 0) {
      const creatorBonus = Math.floor(effectiveXpForReader * 0.19);

      if (creatorBonus > 0) {
        const creatorResult = await awardXP(
          authorId,
          'Creator reward: blog article read',
          creatorBonus,
          id,
          'blog_creator',
        );

        if (!creatorResult.success) {
          console.error(
            'Failed to award creator bonus XP:',
            creatorResult.error,
          );
          // Não falhamos a resposta ao utilizador por causa disto
        }
      }
    }

    return NextResponse.json({
      success: true,
      newTotal: readerNewTotal, // pode vir undefined se for o autor
      alreadyCompleted: false,
    });
  } catch (error) {
    console.error('Error in POST /api/blog/[id]/read:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
