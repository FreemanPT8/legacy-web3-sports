// app/api/admin/blog/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // Só quem tem canManageBlog pode criar posts
  const canManageBlog = await userHasPermission(
    currentUser.userId,
    role,
    'canManageBlog',
  );

  if (!canManageBlog) {
    return NextResponse.json(
      {
        success: false,
        error: 'You do not have permission to manage blog posts.',
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      excerpt,
      content,
      category,
      xp_reward,
      xp_required,
      published,
      image_url,
      registered_only,
      reading_time,
    } = body as {
      title?: Record<string, string>;
      excerpt?: Record<string, string>;
      content?: Record<string, string>;
      category?: string;
      xp_reward?: number;
      xp_required?: number;
      published?: boolean;
      image_url?: string | null;
      registered_only?: boolean;
      reading_time?: number;
    };

    if (!title || !content || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, content, and category are required.',
        },
        { status: 400 },
      );
    }

    const isPublished = !!published;
    const xpReward = xp_reward ?? 15;
    const xpThreshold = xp_required ?? 0;
    const registeredOnly = !!registered_only;

    const { data: newPost, error } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title,
        excerpt: excerpt || {},
        content,
        category,
        reading_time: reading_time ?? 5,
        xp_reward: xpReward,
        xp_threshold: xpThreshold, // <— coluna na tabela (precisas disto na DB)
        published: isPublished,
        author_id: currentUser.userId,
        image_url: image_url || null,
        views: 0,
        likes: 0,
        registered_only: registeredOnly,
        published_at: isPublished ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error || !newPost) {
      console.error('Error creating blog post:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create blog post.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      post: newPost,
      message: 'Blog post created successfully.',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/blog/create:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
