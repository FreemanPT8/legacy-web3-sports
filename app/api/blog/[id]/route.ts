import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { hasCompletedContent } from '@/lib/xp';

interface RouteContext {
  params: { id: string };
}

// usamos o client admin se existir (service role), senão o normal
const db = supabaseAdmin ?? supabase;

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar o post + info básica (inclui autor)
    const { data: rawPost, error: postError } = await supabase
      .from('blog_posts')
      .select(
        `
        *,
        author_user:users!blog_posts_author_id_fkey (
          username
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (postError) {
      console.error('Error fetching blog post:', postError);
      return NextResponse.json(
        { success: false, error: 'Failed to load blog post' },
        { status: 500 },
      );
    }

    if (!rawPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    // 2) Estatísticas de leituras registadas (blog_reads)
    const { data: reads, error: readsError } = await db
      .from('blog_reads')
      .select('user_id, xp_earned')
      .eq('blog_post_id', id);

    if (readsError) {
      console.error('Error fetching blog reads:', readsError);
    }

    const allReads = reads || [];

    const registeredReaders = new Set(
      allReads.map((r: any) => r.user_id),
    ).size;

    const totalXpDistributed = allReads.reduce(
      (sum: number, r: any) => sum + (r.xp_earned || 0),
      0,
    );

    // 3) Estado "completed" para o utilizador atual,
    // usando a mesma função central do XP (usa client admin)
    const isCompleted = user
      ? await hasCompletedContent(user.id, id, 'blog')
      : false;

    const authorName =
      rawPost.author_user?.username ||
      rawPost.author ||
      'Admin';

    const post = {
      ...rawPost,
      author: authorName,
      registered_readers: registeredReaders,
      total_xp_distributed: totalXpDistributed,
    };

    return NextResponse.json({
      success: true,
      post,
      isCompleted,
    });
  } catch (error) {
    console.error('Error in GET /api/blog/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
