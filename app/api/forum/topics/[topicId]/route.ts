import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
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

    const { data: topic, error: topicError } = await supabase
      .from('forum_topics')
      .select(`
        *,
        author:users!forum_topics_author_id_fkey(id, username, xp_total),
        room:forum_rooms(name, xp_required_post)
      `)
      .eq('id', params.topicId)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { success: false, error: 'Topic not found' },
        { status: 404 }
      );
    }

    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:users!forum_posts_author_id_fkey(id, username, xp_total)
      `)
      .eq('topic_id', params.topicId)
      .order('created_at', { ascending: true });

    if (postsError) {
      return NextResponse.json(
        { success: false, error: postsError.message },
        { status: 500 }
      );
    }

    await supabase
      .from('forum_topics')
      .update({ view_count: (topic.view_count || 0) + 1 })
      .eq('id', params.topicId);

    return NextResponse.json({
      success: true,
      topic: {
        ...topic,
        posts: posts || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
