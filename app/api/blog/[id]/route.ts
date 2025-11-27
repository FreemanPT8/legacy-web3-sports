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
    const postId = params.id;

    // 1) Buscar post publicado
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .eq('published', true)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 },
      );
    }

    // 2) Incrementar views (não bloqueia resposta se falhar)
    void supabase
      .from('blog_posts')
      .update({ views: (post.views || 0) + 1 })
      .eq('id', postId);

    // 3) Ver se este user já completou (blog_reads)
    let isCompleted = false;

    if (user) {
      const { data: readRow, error: readError } = await supabase
        .from('blog_reads')
        .select('id')
        .eq('user_id', user.id)
        .eq('blog_post_id', postId)
        .maybeSingle();

      if (!readError && readRow) {
        isCompleted = true;
      }
    }

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
