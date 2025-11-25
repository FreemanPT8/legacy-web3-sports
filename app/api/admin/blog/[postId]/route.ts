import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
  // Garante que temos supabaseAdmin configurado
  if (!supabaseAdmin) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. supabaseAdmin is null.',
    );
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            'Supabase admin client not configured on server (missing service role key).',
        },
        { status: 500 },
      ),
    };
  }

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

// GET (admin) → obter um post (inclui drafts)
export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } },
) {
  const auth = await ensureCanManageBlog(request);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', params.postId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Post not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      post: data,
    });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/admin/blog/[postId]:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

// PUT → atualizar post
export async function PUT(
  request: NextRequest,
  { params }: { params: { postId: string } },
) {
  const auth = await ensureCanManageBlog(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const {
      title,
      excerpt,
      content,
      category,
      published,
      reading_time,
      xp_reward,
      xp_threshold,
      registered_only,
    } = body || {};

    const updatePayload: Record<string, any> = {};

    if (title && typeof title === 'object') {
      updatePayload.title = title;
    }
    if (excerpt && typeof excerpt === 'object') {
      updatePayload.excerpt = excerpt;
    }
    if (content && typeof content === 'object') {
      updatePayload.content = content;
    }
    if (typeof category === 'string') {
      updatePayload.category = category;
    }
    if (typeof published === 'boolean') {
      updatePayload.published = published;
      updatePayload.published_at = published ? new Date().toISOString() : null;
    }
    if (typeof reading_time === 'number') {
      updatePayload.reading_time = reading_time;
    }
    if (typeof xp_reward === 'number') {
      updatePayload.xp_reward = xp_reward;
    }
    if (typeof xp_threshold === 'number') {
      updatePayload.xp_threshold = xp_threshold;
    }
    if (typeof registered_only === 'boolean') {
      updatePayload.registered_only = registered_only;
    }

    updatePayload.updated_at = new Date().toISOString();

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No updatable fields provided. (title, excerpt, content, category, published, reading_time, xp_reward, xp_threshold, registered_only)',
        },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', params.postId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Error updating blog post:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update blog post.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      post: updated,
      message: 'Blog post updated successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in PUT /api/admin/blog/[postId]:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

// DELETE → apagar post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } },
) {
  const auth = await ensureCanManageBlog(request);
  if (!auth.ok) return auth.response;

  try {
    const { error: deleteError } = await supabaseAdmin
      .from('blog_posts')
      .delete()
      .eq('id', params.postId);

    if (deleteError) {
      console.error('Error deleting blog post:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete blog post.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post deleted successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/admin/blog/[postId]:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
