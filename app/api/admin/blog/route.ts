import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

type AuthOk =
  | {
      ok: true;
      user: { userId: string; role?: string | null };
      role: UserRole;
    }
  | { ok: false; response: NextResponse };

async function ensureCanManageBlog(
  request: NextRequest,
): Promise<AuthOk> {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return { ok: false, response: authResult.response! };
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  const canManageBlog = await userHasPermission(
    currentUser.userId,
    role,
    'canManageBlog',
  );

  if (!canManageBlog) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to manage blog posts.',
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user: currentUser, role };
}

// GET → listar posts para o admin, com filtros
export async function GET(request: NextRequest) {
  const auth = await ensureCanManageBlog(request);
  if (!auth.ok) return auth.response;

  try {
    const client = supabaseAdmin || supabase;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'published' | 'draft' | null
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = client
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (status === 'published') {
      query = query.eq('published', true);
    } else if (status === 'draft') {
      query = query.eq('published', false);
    }

    if (search) {
      // pesquisa simples em título e conteúdo em inglês
      query = query.or(
        `title->en.ilike.%${search}%,content->en.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading admin blog posts:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const posts = data || [];

    // Enriquecer com autor, XP total e XP do criador
    const ids = posts.map((p) => p.id).filter(Boolean);
    let authorMap: Record<string, string> = {};
    let xpTotalMap: Record<string, number> = {};
    let xpCreatorMap: Record<string, number> = {};

    if (ids.length > 0) {
      // Autores
      const authorIds = Array.from(
        new Set(posts.map((p: any) => p.author_id).filter(Boolean)),
      ) as string[];
      if (authorIds.length > 0) {
        const { data: authors } = await client
          .from('users')
          .select('id, full_name, username')
          .in('id', authorIds);
        if (authors) {
          authorMap = authors.reduce((acc, a: any) => {
            acc[a.id] = a.full_name || a.username || '';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // XP total distribuído por post
      const { data: xpRows } = await client
        .from('blog_reads')
        .select('blog_post_id, xp_earned')
        .in('blog_post_id', ids);
      if (xpRows) {
        xpTotalMap = xpRows.reduce((acc: Record<string, number>, row: any) => {
          const key = row.blog_post_id;
          acc[key] = (acc[key] || 0) + (row.xp_earned ?? 0);
          return acc;
        }, {});
      }

      // XP para criador (quando author_id existe)
      const creatorRows = await Promise.all(
        posts
          .filter((p: any) => p.author_id)
          .map(async (p: any) => {
            const { data: tx } = await client
              .from('xp_transactions')
              .select('xp_earned')
              .eq('reference_type', 'blog_post')
              .eq('reference_id', p.id)
              .eq('user_id', p.author_id as string);
            const sum =
              (tx || []).reduce(
                (acc: number, row: any) => acc + (row?.xp_earned ?? 0),
                0,
              ) || 0;
            return { id: p.id, sum };
          }),
      );
      creatorRows.forEach((r) => {
        xpCreatorMap[r.id] = r.sum;
      });
    }

    const enriched = posts.map((p: any) => ({
      ...p,
      author_name: p.author || authorMap[p.author_id || ''] || null,
      xp_total_distributed: xpTotalMap[p.id] || 0,
      xp_creator_distributed: xpCreatorMap[p.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      posts: enriched,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/blog:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

// POST → criar novo post
export async function POST(request: NextRequest) {
  const auth = await ensureCanManageBlog(request);
  if (!auth.ok) return auth.response;

  const { user } = auth;

  try {
    const body = await request.json();

    const {
      title,
      excerpt,
      content,
      category,
      published,
      author,
    } = body || {};

    if (!title || typeof title !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid "title".',
        },
        { status: 400 },
      );
    }

    if (!content || typeof content !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid "content".',
        },
        { status: 400 },
      );
    }

    const insertPayload: Record<string, any> = {
      title,
      content,
    };

    if (excerpt && typeof excerpt === 'object') {
      insertPayload.excerpt = excerpt;
    }

    if (typeof category === 'string') {
      insertPayload.category = category;
    }

    insertPayload.published = !!published;

    if (typeof author === 'string') {
      insertPayload.author = author;
    }

    insertPayload.author_id = user.userId;

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating blog post:', error);
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
      post: data,
      message: 'Blog post created successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/blog:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
