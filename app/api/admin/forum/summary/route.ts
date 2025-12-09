import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const [
      topicsCountResult,
      postsCountResult,
      roomsCountResult,
      topTopicsResult,
      recentPostsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('forum_topics')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('forum_posts')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('forum_rooms')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('forum_topics')
        .select('id, title, views, room:forum_rooms(name)')
        .order('views', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('forum_posts')
        .select(`
          id,
          content,
          created_at,
          topic:forum_topics(id, title),
          author:users!forum_posts_author_id_fkey(id, username)
        `)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const topicsCount =
      topicsCountResult.count ?? topicsCountResult.data?.length ?? 0;
    const postsCount =
      postsCountResult.count ?? postsCountResult.data?.length ?? 0;
    const roomsCount =
      roomsCountResult.count ?? roomsCountResult.data?.length ?? 0;

    return NextResponse.json({
      success: true,
      summary: {
        topicCount,
        postCount: postsCount,
        roomCount: roomsCount,
        topTopics: topTopicsResult.data || [],
        recentPosts: recentPostsResult.data || [],
      },
    });
  } catch (error: any) {
    console.error('Error building forum summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forum metrics' },
      { status: 500 },
    );
  }
}
