import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  url: string;
  title: string | null;
  alt: string | null;
  tags: string[] | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Admin client not configured.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);
  const search = (searchParams.get('search') || '').trim();
  const tag = (searchParams.get('tag') || '').trim();
  const cursor = searchParams.get('cursor') || null; // created_at__id cursor
  const [cursorCreatedAt, cursorId] = cursor ? cursor.split('__') : [null, null];

  try {
    let query = supabaseAdmin
      .from('media_files')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (cursorCreatedAt && cursorId) {
      query = query.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`,
      );
    } else if (cursorCreatedAt) {
      query = query.lt('created_at', cursorCreatedAt);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing media:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to list media files.' },
        { status: 500 },
      );
    }

    const nextCursor =
      data && data.length === limit
        ? `${data[data.length - 1]?.created_at}__${data[data.length - 1]?.id}`
        : null;

    return NextResponse.json({
      success: true,
      files: data || [],
      nextCursor,
    });
  } catch (error) {
    console.error('Unexpected error in media list:', error);
    return NextResponse.json(
      { success: false, error: 'Server error while listing media.' },
      { status: 500 },
    );
  }
}
