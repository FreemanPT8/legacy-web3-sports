import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function POST(
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

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const { data: topic } = await supabase
      .from('forum_topics')
      .select('locked, room_id')
      .eq('id', params.topicId)
      .single();

    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (topic.locked) {
      return NextResponse.json(
        { success: false, error: 'Topic is locked' },
        { status: 403 }
      );
    }

    const { data: room } = await supabase
      .from('forum_rooms')
      .select('xp_required_post')
      .eq('id', topic.room_id)
      .single();

    if (!room || user.xp_total < room.xp_required_post) {
      return NextResponse.json(
        { success: false, error: 'Insufficient XP' },
        { status: 403 }
      );
    }

    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        topic_id: params.topicId,
        author_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (postError) {
      return NextResponse.json(
        { success: false, error: postError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post,
      message: 'Reply posted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
