import { NextRequest, NextResponse } from 'next/server';
import { hasCompletedContent, markContentComplete, awardXP } from '@/lib/xp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, xpEarned } = body;
    const postId = params.id;

    if (!userId || !postId || !xpEarned) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const alreadyRead = await hasCompletedContent(userId, postId, 'blog');

    if (alreadyRead) {
      return NextResponse.json(
        { success: false, error: 'Article already read' },
        { status: 400 }
      );
    }

    const markResult = await markContentComplete(userId, postId, 'blog', xpEarned);

    if (!markResult.success) {
      return NextResponse.json(markResult, { status: 500 });
    }

    const xpResult = await awardXP(
      userId,
      'Read blog article',
      xpEarned,
      postId,
      'blog'
    );

    if (!xpResult.success) {
      return NextResponse.json(xpResult, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xpEarned,
      newTotal: xpResult.newTotal
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
