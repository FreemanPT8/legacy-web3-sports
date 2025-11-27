import { NextRequest, NextResponse } from 'next/server';
import { awardXP, hasCompletedContent, markContentComplete } from '@/lib/xp';

interface RouteContext {
  params: { id: string };
}

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
        { status: 400 }
      );
    }

    // 1) Ver se já está completo para este user
    const alreadyCompleted = await hasCompletedContent(
      userId,
      id,
      'blog'
    );

    if (alreadyCompleted) {
      return NextResponse.json({
        success: false,
        alreadyCompleted: true,
        error: 'Already read',
      });
    }

    // 2) Registar leitura em blog_reads
    const markResult = await markContentComplete(
      userId,
      id,
      'blog',
      xpEarned
    );

    if (!markResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            markResult.error ||
            'Failed to register blog read',
        },
        { status: 500 }
      );
    }

    // 3) Atribuir XP ao utilizador
    const awardResult = await awardXP(
      userId,
      'Blog article read',
      xpEarned,
      id,
      'blog'
    );

    if (!awardResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            awardResult.error ||
            'Failed to award XP for blog read',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newTotal: awardResult.newTotal,
    });
  } catch (error) {
    console.error('Error in POST /api/blog/[id]/read:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
