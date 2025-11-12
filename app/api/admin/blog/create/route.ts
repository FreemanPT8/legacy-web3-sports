import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = await request.json();
    const { title, excerpt, content, category, xp_reward, published, image_url } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    const { data: newPost, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        excerpt: excerpt || {},
        content,
        category,
        xp_reward: xp_reward || 15,
        published: published || false,
        author_id: authResult.user!.userId,
        image_url: image_url || null,
        views: 0,
        likes: 0,
        registered_only: false,
        published_at: published ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating blog post:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create blog post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: newPost,
      message: 'Blog post created successfully',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
