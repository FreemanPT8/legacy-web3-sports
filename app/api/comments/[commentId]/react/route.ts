import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { reactToComment } from '@/lib/server/comments';
import type { CommentEmojiType } from '@/types/comments';

interface RouteContext {
  params: { commentId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return auth.response!;
  }

  const { commentId } = context.params;
  if (!commentId) {
    return NextResponse.json(
      { success: false, error: 'Missing comment id.' },
      { status: 400 },
    );
  }

  try {
    const payload = await request.json();
    const emoji = payload?.emoji as CommentEmojiType | undefined;
    const action = payload?.action === 'remove' ? 'remove' : 'add';

    if (!emoji || !['positive', 'fire', 'negative'].includes(emoji)) {
      return NextResponse.json(
        { success: false, error: 'Invalid emoji type.' },
        { status: 400 },
      );
    }

    const result = await reactToComment({
      userId: auth.user!.userId,
      commentId,
      emoji,
      action,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, quotas: result.quotas },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      comment: result.comment,
      quotas: result.quotas,
    });
  } catch (error) {
    console.error('POST /api/comments/[commentId]/react error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to react to comment.' },
      { status: 500 },
    );
  }
}
