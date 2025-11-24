import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

type LangCode = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

interface BlogPayload {
  title: Record<LangCode, string>;
  excerpt: Record<LangCode, string>;
  content: Record<LangCode, string>;
  category?: string;
  reading_time?: number;
  xp_reward?: number;
  xp_threshold?: number;
  published?: boolean;
  registered_only?: boolean;
  author_id?: string;
}

export async function POST(request: NextRequest) {
  // 1) Verificar se é Admin / Super Admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // 2) Verificar permissão fina canManageBlog
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
    const body = (await request.json()) as BlogPayload;

    const {
      title,
      excerpt,
      content,
      category,
      reading_time,
      xp_reward,
      xp_threshold,
      published,
      registered_only,
      author_id,
    } = body;

    // 3) Validações básicas
    if (!title || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title and content are required.',
        },
        { status: 400 },
      );
    }

    // Pelo menos título em inglês ou uma língua qualquer
    const hasAnyTitle = Object.values(title).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    if (!hasAnyTitle) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one language title is required.',
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // 4) Inserir no Supabase
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title,
        excerpt,
        content,
        category: category || 'General',
        reading_time: reading_time ?? 5,
        xp_reward: xp_reward ?? 15,
        xp_threshold: xp_threshold ?? 0,
        registered_only: registered_only ?? false,
        published: published ?? false,
        published_at: published ? now : null,
        author_id: author_id || currentUser.userId,
      })
      .select()
      .single();

    if (insertError || !newPost) {
      console.error('Error creating blog post:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create blog post.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      post: newPost,
      message: 'Blog post created successfully',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/blog/create:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
