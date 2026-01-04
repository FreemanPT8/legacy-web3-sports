import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import {
  createComment,
  listComments,
} from '@/lib/server/comments';
import type { CommentContentType } from '@/types/comments';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return auth.response!;
  }

  const userId = auth.user!.userId;
  const url = new URL(request.url);

  const contentTypeParam = url.searchParams.get('contentType');
  const contentId = url.searchParams.get('contentId');
  const cursor = url.searchParams.get('cursor');
  const houseId = url.searchParams.get('houseId');
  const limitParam = url.searchParams.get('limit');
  const rawLimit = limitParam ? Number(limitParam) : NaN;
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 100))
    : 25;

  if (!contentId || !contentTypeParam) {
    return NextResponse.json(
      { success: false, error: 'Missing content parameters.' },
      { status: 400 },
    );
  }

  const contentType = contentTypeParam as CommentContentType;
  if (!['lesson', 'blog_post', 'house'].includes(contentType)) {
    return NextResponse.json(
      { success: false, error: 'Invalid content type.' },
      { status: 400 },
    );
  }

  const result = await listComments({
    userId,
    contentId,
    contentType,
    houseId,
    limit,
    cursor,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    comments: result.comments ?? [],
    quotas: result.quotas,
    nextCursor: result.nextCursor,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) {
    return auth.response!;
  }

  const userId = auth.user!.userId;

  try {
    const payload = await request.json();
    const { contentType, contentId, body, houseId } = payload ?? {};

    if (!contentType || !contentId || typeof body !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 },
      );
    }

    if (!['lesson', 'blog_post', 'house'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type.' },
        { status: 400 },
      );
    }

    const result = await createComment({
      userId,
      contentId,
      contentType,
      body,
      houseId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, quotas: result.quotas },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        comment: result.comment,
        quotas: result.quotas,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment.' },
      { status: 500 },
    );
  }
}
