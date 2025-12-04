'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BuilderProvider } from '@/contexts/BuilderContext';
import type { BlogBuilderState } from '@/types/builder';
import {
  buildBlogRequestPayload,
  mapBlogToBuilderState,
} from '@/lib/blog-builder';
import { BlogBuilderWorkspace } from '@/components/builder/BlogBuilderWorkspace';

type PermissionsResponse = {
  success: boolean;
  permissions?: {
    canManageBlog?: boolean;
  };
  error?: string;
};

type BlogApiResponse = {
  success: boolean;
  post?: any;
  error?: string;
};

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, getToken } = useAuth();

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [saving, setSaving] = useState(false);

  const [builderState, setBuilderState] =
    useState<BlogBuilderState | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  const postId = params?.postId?.toString() || '';
  const entityType: 'blog' = 'blog';

  const buildAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getToken]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user) return;

    if (user.role === 'Super Admin') {
      setCanManageBlog(true);
      setPermissionsLoaded(true);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/admin/permissions', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data: PermissionsResponse = await res.json();
        if (!res.ok || !data.success) {
          setCanManageBlog(false);
        } else {
          setCanManageBlog(Boolean(data.permissions?.canManageBlog));
        }
      } catch (error) {
        console.error('Unexpected error fetching permissions:', error);
        setCanManageBlog(false);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  useEffect(() => {
    if (!user || !postId) return;
    const fetchPost = async () => {
      setLoadingPost(true);
      try {
        const headers = buildAuthHeaders();
        const res = await fetch(`/api/admin/blog/${postId}`, {
          headers,
        });
        const data: BlogApiResponse = await res.json();
        if (!res.ok || !data.success || !data.post) {
          toast({
            title: 'Error',
            description: data.error || 'Failed to load post.',
            variant: 'destructive',
          });
          router.push('/admin/blog');
          return;
        }
        let nextState = mapBlogToBuilderState(data.post);

        try {
          const draftRes = await fetch(
            `/api/builder/draft?entityType=${entityType}&entityId=${postId}`,
            { headers },
          );
          const draftData = await draftRes.json();
          if (
            draftRes.ok &&
            draftData.success &&
            draftData.draft?.state?.entityType === entityType
          ) {
            nextState = draftData.draft.state as BlogBuilderState;
            toast({
              title: 'Draft restored',
              description: 'Unsaved blog edits were recovered.',
            });
          }
        } catch (draftError) {
          console.warn('Unable to restore blog draft', draftError);
        }

        setBuilderState(nextState);
        setAuthorName(data.post.author_name || null);
      } catch (error) {
        console.error('Failed to fetch post for edit:', error);
        toast({
          title: 'Network error',
          description: 'Could not load post data. Please try again.',
          variant: 'destructive',
        });
        router.push('/admin/blog');
      } finally {
        setLoadingPost(false);
      }
    };

    fetchPost();
  }, [user, buildAuthHeaders, postId, router, toast, entityType]);

  const persistPost = useCallback(
    async (state: BlogBuilderState) => {
      if (!postId) {
        throw new Error('Missing post id.');
      }

      const headers = buildAuthHeaders();
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(buildBlogRequestPayload(state)),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save blog post.');
      }

      return data;
    },
    [postId, buildAuthHeaders],
  );

  const saveDraft = useCallback(
    async (state: BlogBuilderState) => {
      if (!postId) return;
      const headers = buildAuthHeaders();
      const res = await fetch('/api/builder/draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: postId,
          state,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save blog draft.');
      }
    },
    [buildAuthHeaders, entityType, postId],
  );

  const clearDraft = useCallback(async () => {
    if (!postId) return;
    try {
      const headers = buildAuthHeaders();
      const res = await fetch('/api/builder/draft', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: postId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to delete blog draft.');
      }
    } catch (error) {
      console.warn('Unable to clear blog draft', error);
    }
  }, [buildAuthHeaders, entityType, postId]);

  const handleSave = useCallback(
    async (state: BlogBuilderState) => {
      if (!user || !canManageBlog || !postId) {
        toast({
          title: 'Not allowed',
          description: 'You do not have permission to edit posts.',
          variant: 'destructive',
        });
        return;
      }

      const hasAnyTitle = Object.values(state.title).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );
      if (!hasAnyTitle) {
        toast({
          title: 'Missing title',
          description: 'Please add a title in at least one language.',
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);
      try {
        await persistPost(state);
        await clearDraft();
        toast({
          title: 'Post updated',
          description: 'The blog post was updated successfully.',
        });
        router.push('/admin/blog');
      } catch (error) {
        console.error('Failed to update post:', error);
        toast({
          title: 'Network error',
          description: 'Could not update post. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [user, canManageBlog, postId, persistPost, clearDraft, router, toast],
  );

  const handleAutosave = useCallback(
    async (state: BlogBuilderState) => {
      if (!user || !canManageBlog || !postId || saving) {
        return;
      }

      const hasAnyTitle = Object.values(state.title).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );

      if (!hasAnyTitle) {
        return;
      }

      await saveDraft(state);
    },
    [user, canManageBlog, postId, saving, saveDraft],
  );

  const handlePreview = useCallback((slug: string) => {
    if (!slug) return;
    window.open(`/blog/${slug}`, '_blank');
  }, []);

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canManageBlog) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <main className="flex-1 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-10 w-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No permission</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have permission to edit blog posts. Please contact a
              Super Admin if you think this is a mistake.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (loadingPost || !builderState) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Loading post...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <BuilderProvider initialState={builderState}>
      <BlogBuilderWorkspace
        saving={saving}
        onSubmit={handleSave}
        onPreview={handlePreview}
        onAutosave={handleAutosave}
        metadata={{
          authorName,
        }}
      />
    </BuilderProvider>
  );
}
