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
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';

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

  // Guard básico de acesso
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

  // Permissões para gerir blog
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

  // Restaurar draft do builder
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

  // Loader alinhado com estilo B (/admin/users)
  if (loading || !permissionsLoaded) {
    return (
      <div className="w-full">
        <p className="text-sm text-blue-100/90">
          A carregar editor do blog…
        </p>
      </div>
    );
  }

  if (!canManageBlog) {
    return (
      <div className="w-full space-y-8">
        <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl">
            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
              LEGACY Admin — Blog
            </span>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Create Blog Post
            </h1>
            <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
              Não tens permissões para criar ou gerir artigos do blog. Fala com
              um Super Admin se achas que isto não faz sentido.
            </p>
          </div>
        </section>

        <section className="pb-2">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-card-custom border-custom">
              <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                <Lock className="h-10 w-10 text-amber-500" />
                <p className="text-sm text-muted-custom">
                  You don&apos;t have permission to manage blog posts.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  if (!initialState) {
    return (
      <div className="w-full">
        <p className="text-sm text-blue-100/90">
          A preparar o Legacy Builder do blog…
        </p>
      </div>
    );
  }

  // Layout B aplicado: HERO + CARD com o Builder dentro
  return (
    <div className="w-full space-y-8">
      {/* HERO */}
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin — Blog
          </span>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Create Blog Post
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Cria um novo artigo para o Legacy Blog: título, estrutura, XP,
            visibilidade e preview — tudo integrado no Legacy Builder.
          </p>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="pb-2">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="bg-card-custom border-custom shadow-lg shadow-purple-950/40">
            <CardHeader>
              <CardTitle className="text-heading">
                New article
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Define o idioma principal, prepara o conteúdo base, ajusta o XP
                e escolhe a visibilidade antes de publicar.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-body">
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
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
