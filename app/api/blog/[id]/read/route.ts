import { NextRequest, NextResponse } from 'next/server';
import {
  awardXP,
  hasCompletedContent,
  markContentComplete,
} from '@/lib/xp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { userId, xpEarned } = body;

    if (!userId || !xpEarned) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or xpEarned' },
        { status: 400 },
      );
    }

    const blogId = params.id;

    // 1) Ver se já foi lido antes (não duplicar XP)
    const already = await hasCompletedContent(userId, blogId, 'blog');
    if (already) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blog already read',
        },
        { status: 409 },
      );
    }

    // 2) Registar leitura em blog_reads
    const completeResult = await markContentComplete(
      userId,
      blogId,
      'blog',
      xpEarned,
    );

    if (!completeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: completeResult.error || 'Failed to register blog read',
        },
        { status: 500 },
      );
    }

    // 3) Atribuir XP (xp_transactions + users.xp_total)
    const xpResult = await awardXP(
      userId,
      'Read blog article',
      xpEarned,
      blogId,
      'blog_post',
    );

    if (!xpResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: xpResult.error || 'Failed to award XP for blog read',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      newTotal: xpResult.newTotal,
    });
  } catch (error) {
    console.error('Error in POST /api/blog/[id]/read:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
