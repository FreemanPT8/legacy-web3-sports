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

  // Guard de acesso básico
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

  // Permissões de gestão do blog
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

  // Carregar post + draft do builder
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

  // Loader alinhado com estilo B
  if (loading || !permissionsLoaded) {
    return (
      <div className="w-full">
        <p className="text-sm text-blue-100/90">
          A carregar editor do blog…
        </p>
      </div>
    );
  }

  // Sem permissão
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
              Edit Blog Post
            </h1>
            <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
              Não tens permissões para editar artigos do blog. Fala com um
              Super Admin se achas que isto não faz sentido.
            </p>
          </div>
        </section>

        <section className="pb-2">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-card-custom border-custom">
              <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                <Lock className="h-10 w-10 text-amber-500" />
                <p className="text-sm text-muted-custom">
                  You don&apos;t have permission to edit blog posts.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  // Ainda a carregar o post ou estado do builder
  if (loadingPost || !builderState) {
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
              Edit Blog Post
            </h1>
            <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
              A carregar o conteúdo do artigo e o estado do Legacy Builder…
            </p>
          </div>
        </section>

        <section className="pb-2">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-card-custom border-custom">
              <CardContent className="py-10 text-center text-sm text-muted-custom">
                Loading post…
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  // Layout B final: HERO + CARD com o Builder
  return (
    <div className="w-full space-y-8">
      {/* HERO */}
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg_WHITE/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin — Blog
          </span>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Edit Blog Post
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Edita o conteúdo, XP, visibilidade e estrutura do artigo usando o
            Legacy Builder — com autosave e preview sempre à mão.
          </p>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="pb-2">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="bg-card-custom border-custom shadow-lg shadow-purple-950/40">
            <CardHeader>
              <CardTitle className="text-heading">
                Edit article
              </CardTitle>
              <CardDescription className="text-muted-custom">
                Atualiza o título, o conteúdo multi-idioma, o XP distribuído,
                a visibilidade (público ou membros) e usa o preview antes de
                gravar as alterações.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-body">
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
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
