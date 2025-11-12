import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from('forum_rooms')
      .select('*')
      .eq('id', params.roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const { data: topics, error: topicsError } = await supabase
      .from('forum_topics')
      .select(`
        *,
        author:users!forum_topics_author_id_fkey(id, username),
        posts:forum_posts(count)
      `)
      .eq('room_id', params.roomId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (topicsError) {
      return NextResponse.json(
        { success: false, error: topicsError.message },
        { status: 500 }
      );
    }

    const topicsWithDetails = await Promise.all(
      (topics || []).map(async (topic) => {
        const { data: lastPost } = await supabase
          .from('forum_posts')
          .select(`
            created_at,
            author:users!forum_posts_author_id_fkey(username)
          `)
          .eq('topic_id', topic.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: replyCount } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topic.id);

        return {
          ...topic,
          reply_count: replyCount || 0,
          last_post: lastPost || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      room: {
        ...room,
        topics: topicsWithDetails,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
