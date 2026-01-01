import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission } from '@/lib/server/permissions';
import { type UserRole } from '@/lib/permissions';

const db = supabaseAdmin ?? supabase;

async function ensureCanManageBlog(request: NextRequest) {
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

  return { ok: true };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } },
) {
  const auth = await ensureCanManageBlog(request);
  if (!auth.ok) return auth.response!;

  try {
    const postId = params.postId;
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Missing blog post id' },
        { status: 400 },
      );
    }

    const { data: post, error: postError } = await db
      .from('blog_posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get('limit') || '25', 10);
    const offsetParam = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(100, limitParam))
      : 25;
    const offset = Number.isFinite(offsetParam)
      ? Math.max(0, offsetParam)
      : 0;

    const { data, error, count } = await db
      .from('blog_reads')
      .select('id, user_id, xp_earned, completed_at', { count: 'exact' })
      .eq('blog_post_id', postId)
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error loading blog XP history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load XP history' },
        { status: 500 },
      );
    }

    const historyRows = data || [];
    const userIds = Array.from(
      new Set(historyRows.map((row: any) => row.user_id).filter(Boolean)),
    );
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await db
        .from('users')
        .select('id, full_name, username')
        .in('id', userIds);
      if (users) {
        userMap = users.reduce((acc: Record<string, string>, user: any) => {
          acc[user.id] = user.full_name || user.username || 'Utilizador';
          return acc;
        }, {});
      }
    }

    const entries = historyRows.map((row: any) => ({
      id: row.id,
      xp: Number(row.xp_earned) || 0,
      completedAt: row.completed_at,
      user: {
        id: row.user_id,
        name: userMap[row.user_id] || 'Utilizador',
      },
    }));

    const total = count ?? entries.length;
    const hasMore =
      typeof count === 'number'
        ? offset + entries.length < count
        : entries.length === limit;

    return NextResponse.json({
      success: true,
      total,
      hasMore,
      entries,
    });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/admin/blog/[postId]/xp-history:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
