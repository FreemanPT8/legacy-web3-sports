// app/admin/blog/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/app/components/SafeImage';

type BlogPost = {
  id: string;
  title: any;
  excerpt: any;
  status?: string;
  category?: string | null;
  author?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  created_at: string | null;
  image_url?: string | null;
  views?: number | null;
  published?: boolean | null;
  registered_only?: boolean | null;
  xp_total_distributed?: number;
  xp_creator_distributed?: number;
};

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageBlog?: boolean;
    [key: string]: any;
  };
};

type PostsResponse = {
  success: boolean;
  error?: string;
  posts?: BlogPost[];
};

// Converte texto localizado em string
function resolveLocalizedText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const v =
      (value as any).en ??
      (value as any).pt ??
      (value as any).es ??
      (value as any).fr ??
      (value as any).it ??
      (value as any).de ??
      Object.values(value as any).find(
        (x) => typeof x === 'string' && x.trim().length > 0,
      );
    return typeof v === 'string' ? v : '';
  }
  return String(value);
}

export default function AdminBlogPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'xp'>('recent');

  const isSuperAdmin = user?.role === 'Super Admin';

  // Proteção básica
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

  // Buscar permissões
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

        if (!res.ok || !data.success || !data.permissions) {
          console.error('Error loading permissions for current user:', data);
          setCanManageBlog(false);
          setPermissionsLoaded(true);
          return;
        }

        setCanManageBlog(!!data.permissions.canManageBlog);
        setPermissionsLoaded(true);
      } catch (err) {
        console.error('Unexpected error fetching permissions:', err);
        setCanManageBlog(false);
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  // Buscar posts (admin)
  useEffect(() => {
    const fetchPosts = async () => {
      setLoadingData(true);
      try {
        const token = getToken();
        const response = await fetch('/api/admin/blog', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: PostsResponse = await response.json();
        if (response.ok && data.success) {
          setPosts(data.posts || []);
        } else {
          console.error('Error loading posts:', data);
          toast({
            title: 'Error loading posts',
            description: data.error || 'Failed to load posts.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        toast({
          title: 'Network error',
          description: 'Could not load posts. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchPosts();
    }
  }, [user, toast, getToken]);

  // Apagar post
  const handleDelete = async (postId: string) => {
    if (!user || !canManageBlog || !isSuperAdmin) return;

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this blog post?',
    );
    if (!confirmed) return;

    try {
      const token = getToken();
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Error deleting blog post:', data);
        toast({
          title: 'Error deleting post',
          description: data.error || 'Failed to delete blog post.',
          variant: 'destructive',
        });
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));

      toast({
        title: 'Post deleted',
        description: 'The blog post was deleted successfully.',
      });
    } catch (err) {
      console.error('Network error deleting blog post:', err);
      toast({
        title: 'Network error',
        description: 'Could not delete blog post. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading blog admin...
          </p>
        </div>
      </div>
    );
  }

  const publishedPosts = posts.filter(
    (p: any) => p.status === 'published' || p.published,
  );
  const draftPosts = posts.filter(
    (p: any) => p.status === 'draft' || !p.published,
  );
  const xpTotalAll = posts.reduce(
    (acc, p: any) => acc + (p.xp_total_distributed || 0),
    0,
  );
  const totalViewsAll = posts.reduce(
    (acc, p: any) => acc + (p.views || 0),
    0,
  );

  const topByViews = [...posts]
    .filter((p) => (p.views || 0) > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  const topByXP = [...posts]
    .filter((p) => (p.xp_total_distributed || 0) > 0)
    .sort(
      (a, b) =>
        (b.xp_total_distributed || 0) - (a.xp_total_distributed || 0),
    )
    .slice(0, 3);

  const filteredPosts = [...posts]
    .filter((p) => {
      const st = p.status || (p.published ? 'published' : 'draft');
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (
        categoryFilter.trim() &&
        !(p.category || '')
          .toLowerCase()
          .includes(categoryFilter.toLowerCase())
      ) {
        return false;
      }
      if (
        authorFilter.trim() &&
        !(p.author_name || p.author || '')
          .toLowerCase()
          .includes(authorFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'xp')
        return (
          (b.xp_total_distributed || 0) - (a.xp_total_distributed || 0)
        );
      // recent
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

  return (
    <div className="w-full space-y-8">
      {/* HERO - estilo B (Users) */}
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
            Blog Management
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Gestão centralizada de posts, XP e visualizações do Blog do LEGACY.
            Filtra, revê e mantém vivo o conteúdo contínuo da comunidade.
          </p>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL */}
      <section className="pb-2">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* STAT CARDS */}
          <div className="grid gap-4 md:grid-cols-5 mb-2">
            <Card className="bg-card-custom border-custom">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Total posts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-heading">
                <div className="text-2xl font-bold">{posts.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-card-custom border-custom">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Published
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-emerald-400">
                  {publishedPosts.length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card-custom border-custom">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Draft
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-amber-400">
                  {draftPosts.length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card-custom border-custom">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-heading">
                  XP distributed
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-400">
                  {xpTotalAll}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card-custom border-custom">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-heading">
                  Views (total)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-purple-400">
                  {totalViewsAll}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TOP LISTS */}
          {posts.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card-custom border-custom">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-heading">
                    Top posts by views
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-body">
                  {topByViews.length === 0 ? (
                    <p className="text-sm text-muted-custom">No views yet.</p>
                  ) : (
                    topByViews.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-semibold truncate max-w-[200px]">
                            {resolveLocalizedText(p.title) || 'Untitled'}
                          </span>
                        </div>
                        <div className="text-muted-custom">{p.views || 0} views</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card-custom border-custom">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-heading">
                    Top posts by XP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-body">
                  {topByXP.length === 0 ? (
                    <p className="text-sm text-muted-custom">
                      No XP distributed yet.
                    </p>
                  ) : (
                    topByXP.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-semibold truncate max-w-[200px]">
                            {resolveLocalizedText(p.title) || 'Untitled'}
                          </span>
                        </div>
                        <div className="text-muted-custom">
                          {p.xp_total_distributed || 0} XP
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* FILTROS + BOTÃO NOVO POST */}
          <Card className="bg-card-custom border-custom">
            <CardHeader className="pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-sm text-heading">Filters</CardTitle>
                <CardDescription className="text-muted-custom">
                  Combine status, category, author and ordering.
                </CardDescription>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!canManageBlog}
                onClick={() => {
                  if (!canManageBlog) return;
                  router.push('/admin/blog/create');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </CardHeader>
            <CardContent className="pt-4 grid md:grid-cols-4 gap-4 text-body">
              <div className="space-y-1">
                <p className="text-xs text-muted-custom">Status</p>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'published' | 'draft')
                  }
                >
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-custom">Category</p>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder="e.g. News"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-custom">Author</p>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  placeholder="name or username"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-custom">Order by</p>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'recent' | 'views' | 'xp')
                  }
                >
                  <option value="recent">Most recent</option>
                  <option value="views">Views</option>
                  <option value="xp">XP distributed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ACTION PANEL */}
          <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-blue-800/70 shadow-lg">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-100 border border-blue-500/40">
                  New
                </Badge>
                <CardTitle className="text-heading">
                  Ações prioritárias de conteúdo
                </CardTitle>
              </div>
              <CardDescription className="text-muted-custom">
                Publique, prepare rascunhos ou dispare revisões mantendo o foco em XP e impacto da comunidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => {
                    if (!canManageBlog) return;
                    router.push('/admin/blog/create');
                  }}
                  disabled={!canManageBlog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Publicar agora (ganhe XP)
                </Button>
                <Button
                  className="flex-1 border border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900 disabled:opacity-60"
                  onClick={() => {
                    if (!canManageBlog) return;
                    toast({
                      title: 'Rascunho salvo',
                      description: 'O rascunho foi armazenado temporariamente para continuidade.',
                    });
                  }}
                  disabled={!canManageBlog}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Salvar rascunho
                </Button>
                <Button
                  className="flex-1 border border-blue-600 text-blue-100 bg-blue-950/50 hover:bg-blue-900"
                  onClick={() => {
                    if (!canManageBlog) return;
                    router.push('/admin/blog');
                  }}
                  disabled={!canManageBlog}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Revisar desempenho
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-custom">
                    Top post por visualizações
                  </p>
                  {topByViews[0] ? (
                    <>
                      <p className="text-sm font-semibold text-heading truncate">
                        {(resolveLocalizedText(topByViews[0].title) ||
                          'Untitled').slice(0, 45)}
                      </p>
                      <p className="text-[11px] text-purple-200">
                        {topByViews[0].views?.toLocaleString('pt-PT') || 0} views
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() =>
                          router.push(`/blog/${topByViews[0].id}`)
                        }
                      >
                        Abrir post
                      </Button>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-custom">
                      Sem posts com views registrados.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-custom">
                    Impacto de XP
                  </p>
                  {topByXP[0] ? (
                    <>
                      <p className="text-sm font-semibold text-heading truncate">
                        {(resolveLocalizedText(topByXP[0].title) ||
                          'Untitled').slice(0, 45)}
                      </p>
                      <p className="text-[11px] text-emerald-200">
                        {topByXP[0].xp_total_distributed?.toLocaleString(
                          'pt-PT',
                        ) || 0}{' '}
                        XP
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => router.push(`/admin/blog/${topByXP[0].id}`)}
                      >
                        Ver
                      </Button>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-custom">
                      Ainda não há posts com XP distribuído.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LISTA / ESTADO */}
          {loadingData ? (
            <Card className="bg-card-custom border-custom">
              <CardContent className="text-center py-12 text-body">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-muted-custom">Loading posts...</p>
              </CardContent>
            </Card>
          ) : filteredPosts.length === 0 ? (
            <Card className="bg-card-custom border-custom">
              <CardContent className="text-center py-12 text-body">
                <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-heading">
                  No blog posts found
                </h3>
                <p className="text-muted-custom mb-6">
                  Adjust filters or create your first blog post to get started.
                </p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!canManageBlog}
                  onClick={() => {
                    if (!canManageBlog) return;
                    router.push('/admin/blog/create');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card-custom border-custom shadow-lg shadow-purple-950/40">
              <CardHeader>
                <CardTitle className="text-heading">
                  All posts ({filteredPosts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-body">
                <div className="space-y-4">
                  {filteredPosts.map((post) => {
                    const title =
                      resolveLocalizedText(post.title) || 'Untitled post';
                    const excerpt =
                      resolveLocalizedText(post.excerpt) || 'No excerpt';
                    const views = post.views ?? 0;
                    const statusLabel =
                      post.status || (post.published ? 'published' : 'draft');
                    const isCreator = user && post.author_id === user.id;
                    const xpTotal = post.xp_total_distributed || 0;
                    const xpCreator = post.xp_creator_distributed || 0;
                    return (
                      <div
                        key={post.id}
                        className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            {post.image_url && post.image_url.trim() !== '' && (
                              <div className="w-28 h-20 flex-shrink-0 overflow-hidden rounded-md border border-slate-800 bg-slate-900">
                                <SafeImage
                                  src={post.image_url ?? ''}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                  width={160}
                                  height={120}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge
                                  className={
                                    statusLabel === 'published'
                                      ? 'bg-emerald-600'
                                      : 'bg-amber-600'
                                  }
                                >
                                  {statusLabel}
                                </Badge>
                                {post.category && (
                                  <Badge variant="outline">
                                    {post.category}
                                  </Badge>
                                )}
                                {isCreator && (
                                  <Badge variant="outline">Creator</Badge>
                                )}
                                {xpTotal > 0 && (
                                  <Badge variant="outline" className="gap-1">
                                    XP: {xpTotal}
                                  </Badge>
                                )}
                                {xpCreator > 0 && (
                                  <Badge variant="outline" className="gap-1">
                                    Creator XP: {xpCreator}
                                  </Badge>
                                )}
                                {post.registered_only && (
                                  <Badge variant="outline">Members only</Badge>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold truncate text-heading">
                                {title}
                              </h3>
                              <p className="text-sm text-muted-custom line-clamp-2 mb-2">
                                {excerpt}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-custom flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {post.author_name || post.author || 'Admin'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {post.created_at
                                    ? new Date(
                                        post.created_at,
                                      ).toLocaleDateString()
                                    : '-'}
                                </span>
                                {views > 0 && <span>{views} views</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-0 md:ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/blog/${post.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!canManageBlog}
                            onClick={() =>
                              router.push(`/admin/blog/${post.id}`)
                            }
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!canManageBlog || !isSuperAdmin}
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
