import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

type MultiLang = Record<string, string>;

interface BlogPayload {
  title: MultiLang;
  excerpt: MultiLang;
  content: MultiLang;
  category?: string;
  reading_time?: number;
  xp_reward?: number;
  xp_threshold?: number;
  published?: boolean;
  registered_only?: boolean;
  author_id?: string;
}

export async function POST(request: NextRequest) {
  // Garante que temos supabaseAdmin configurado
  if (!supabaseAdmin) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. supabaseAdmin is null.',
    );
    return NextResponse.json(
      {
        success: false,
        error:
          'Supabase admin client not configured on server (missing service role key).',
      },
      { status: 500 },
    );
  }

  // 1) Verificar se é admin (Super Admin ou Admin elegível)
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

    // 3) Validações
    if (!title || typeof title !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing title data.',
        },
        { status: 400 },
      );
    }

    const hasAnyTitle = Object.values(title).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

    if (!hasAnyTitle) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one localized title is required.',
        },
        { status: 400 },
      );
    }

    if (!content || typeof content !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Content per language is required.',
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // 4) Inserir post (USAR supabaseAdmin AQUI)
    const { data: newPost, error: insertError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title,
        excerpt: excerpt || {},
        content,
        category: category || 'General',
        reading_time: reading_time ?? 5,
        xp_reward: xp_reward ?? 15,
        xp_threshold: xp_threshold ?? 0,
        registered_only: registered_only ?? false,
        published: published ?? false,
        published_at: published ? now : null,
        author_id: author_id || currentUser.userId,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError || !newPost) {
      console.error('Error creating blog post:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError?.message
            ? insertError.message
            : 'Database error while creating blog post.',
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
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
