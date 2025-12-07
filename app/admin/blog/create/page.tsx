'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BuilderProvider } from '@/contexts/BuilderContext';
import { BlogBuilderWorkspace } from '@/components/builder/BlogBuilderWorkspace';
import type { BlogBuilderState } from '@/types/builder';
import {
  createEmptyBlogState,
  buildBlogRequestPayload,
} from '@/lib/blog-builder';

type PermissionsResponse = {
  success: boolean;
  permissions?: {
    canManageBlog?: boolean;
  };
  error?: string;
};

type BlogCreateResponse = {
  success: boolean;
  post?: { id: string };
  error?: string;
};

export default function CreateBlogPostPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialState, setInitialState] =
    useState<BlogBuilderState | null>(null);

  const entityType: 'blog' = 'blog';
  const draftEntityId = 'new-blog-legacy-builder';

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
    if (!permissionsLoaded || !canManageBlog || initialState || !user) {
      return;
    }

    const hydrateState = async () => {
      let nextState = createEmptyBlogState();
      try {
        const headers = buildAuthHeaders();
        const res = await fetch(
          `/api/builder/draft?entityType=${entityType}&entityId=${draftEntityId}`,
          { headers },
        );
        const data = await res.json();
        if (
          res.ok &&
          data.success &&
          data.draft?.state?.entityType === entityType
        ) {
          nextState = data.draft.state as BlogBuilderState;
          toast({
            title: 'Draft restored',
            description: 'Continuing from your last autosave.',
          });
        }
      } catch (error) {
        console.warn('Unable to load blog draft', error);
      } finally {
        setInitialState(nextState);
      }
    };

    hydrateState();
  }, [
    permissionsLoaded,
    canManageBlog,
    initialState,
    user,
    buildAuthHeaders,
    entityType,
    draftEntityId,
    toast,
  ]);

  const saveDraft = useCallback(
    async (state: BlogBuilderState) => {
      if (!canManageBlog) return;
      const headers = buildAuthHeaders();
      const res = await fetch('/api/builder/draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: draftEntityId,
          state,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save draft.');
      }
    },
    [buildAuthHeaders, canManageBlog, draftEntityId, entityType],
  );

  const clearDraft = useCallback(async () => {
    const headers = buildAuthHeaders();
    try {
      const res = await fetch('/api/builder/draft', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          entityType,
          entityId: draftEntityId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to clear draft.');
      }
    } catch (error) {
      console.warn('Unable to clear blog draft', error);
    }
  }, [buildAuthHeaders, draftEntityId, entityType]);

  const handleSave = useCallback(
    async (state: BlogBuilderState) => {
      if (!user || !canManageBlog) {
        toast({
          title: 'Not allowed',
          description: 'You do not have permission to create blog posts.',
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
        const headers = buildAuthHeaders();
        const res = await fetch('/api/admin/blog/create', {
          method: 'POST',
          headers,
          body: JSON.stringify(buildBlogRequestPayload(state)),
        });
        const data: BlogCreateResponse = await res.json();
        if (!res.ok || !data.success || !data.post) {
          toast({
            title: 'Error creating post',
            description: data.error || 'Failed to create blog post.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        await clearDraft();
        toast({
          title: 'Blog post created',
          description: 'Keep refining in the builder or publish when ready.',
        });

        router.push(`/admin/blog/${data.post.id}`);
      } catch (error) {
        console.error('Failed to create blog post:', error);
        toast({
          title: 'Network error',
          description: 'Could not create post. Please try again.',
          variant: 'destructive',
        });
        setSaving(false);
      }
    },
    [user, canManageBlog, buildAuthHeaders, router, toast, clearDraft],
  );

  const handleAutosave = useCallback(
    async (state: BlogBuilderState) => {
      if (!user || !canManageBlog || saving) return;

      const hasAnyTitle = Object.values(state.title).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );
      if (!hasAnyTitle) return;

      await saveDraft(state);
    },
    [user, canManageBlog, saving, saveDraft],
  );

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
              You don&apos;t have permission to manage blog posts. Please contact a
              Super Admin if you think this is a mistake.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!initialState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Preparing builder...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BuilderProvider initialState={initialState}>
      <BlogBuilderWorkspace
        saving={saving}
        onSubmit={handleSave}
        onAutosave={handleAutosave}
        metadata={{
          authorName: user?.username || user?.email || null,
        }}
      />
    </BuilderProvider>
  );
}
