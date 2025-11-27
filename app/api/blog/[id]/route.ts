import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar post publicado
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', params.id)
      .eq('published', true)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    // 2) Incrementar views (total – registados + anónimos)
    const currentViews = post.views ?? 0;
    await supabase
      .from('blog_posts')
      .update({ views: currentViews + 1 })
      .eq('id', params.id);

    // 3) Nome do autor (a partir de users.author_id)
    let authorName = 'Admin';
    if (post.author_id) {
      const { data: authorData } = await supabase
        .from('users')
        .select('username')
        .eq('id', post.author_id)
        .maybeSingle();

      if (authorData?.username) {
        authorName = authorData.username;
      }
    }

    // 4) Estatísticas de leituras (blog_reads)
    let isCompleted = false;
    let totalXpGiven = 0;
    let totalConsumers = 0;

    const { data: reads, error: readsError } = await supabase
      .from('blog_reads')
      .select('user_id, xp_earned, blog_post_id')
      .eq('blog_post_id', params.id);

    if (!readsError && reads) {
      totalXpGiven = reads.reduce(
        (sum: number, r: any) => sum + (r.xp_earned || 0),
        0,
      );
      const uniqueUsers = new Set(reads.map((r: any) => r.user_id));
      totalConsumers = uniqueUsers.size;

      if (user) {
        isCompleted = reads.some((r: any) => r.user_id === user.id);
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        author: authorName,
        total_xp_given: totalXpGiven,
        total_consumers: totalConsumers,
      },
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
