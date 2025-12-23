import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { type UserRole } from '@/lib/permissions';
import { userHasPermission } from '@/lib/server/permissions';

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
  image_url?: string | null;
  overview?: string;
  key_takeaways?: string[];
  target_audience?: string[];
  duration_minutes?: number;
  bonuses?: string[];
  special_requirements?: string[];
  attachments?: any[];
  seo?: any;
  google_integrations?: any;
  schedule?: {
    publishAt?: string | null;
    expireAt?: string | null;
  };
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
      image_url,
      overview,
      key_takeaways,
      target_audience,
      duration_minutes,
      bonuses,
      special_requirements,
      attachments,
      seo,
      google_integrations,
      schedule,
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
    const publish_at =
      schedule && typeof schedule.publishAt === 'string'
        ? schedule.publishAt
        : null;
    const expire_at =
      schedule && typeof schedule.expireAt === 'string'
        ? schedule.expireAt
        : null;
    const published_at =
      published && typeof published === 'boolean'
        ? publish_at ?? now
        : null;

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
        published_at,
        image_url: image_url ?? null,
        author_id: author_id || currentUser.userId,
        overview: overview ?? '',
        key_takeaways: key_takeaways ?? [],
        target_audience: target_audience ?? [],
        duration_minutes: duration_minutes ?? 0,
        bonuses: bonuses ?? [],
        special_requirements: special_requirements ?? [],
        attachments: attachments ?? [],
        seo: seo ?? null,
        google_integrations: google_integrations ?? null,
        publish_at,
        expire_at,
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
