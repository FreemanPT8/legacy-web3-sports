// app/admin/blog/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Lock,
  Flame,
  BarChart3,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/app/components/SafeImage';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function BlogManagementPage() {
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

        const data = await response.json();
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-muted-custom">A carregar posts…</p>
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

  const filteredPosts = useMemo(
    () =>
      posts
        .filter((p) => {
          const st = p.status || (p.published ? 'published' : 'draft');
          if (statusFilter !== 'all' && st !== statusFilter) return false;
          if (
            categoryFilter.trim() &&
            !(p.category || '')
              .toLowerCase()
              .includes(categoryFilter.toLowerCase())
          )
            return false;
          if (
            authorFilter.trim() &&
            !(p.author_name || p.author || '')
              .toLowerCase()
              .includes(authorFilter.toLowerCase())
          )
            return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
          if (sortBy === 'xp')
            return (
              (b.xp_total_distributed || 0) -
              (a.xp_total_distributed || 0)
            );
          // recent
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return db - da;
        }),
    [posts, statusFilter, categoryFilter, authorFilter, sortBy],
  );

  const formatNumber = (n: number | undefined | null) =>
    typeof n === 'number' ? n.toLocaleString('pt-PT') : '0';

  return (
    <div className="space-y-8">
      {/* HERO / HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-6 md:px-7 md:py-7">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 border border-white/10">
              LEGACY Admin — Blog
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Blog Management
            </h1>
            <p className="text-sm md:text-[15px] text-blue-100/90">
              Gestão centralizada dos artigos do Legacy: estado, XP distribuído,
              visualizações, autor e contexto. A base de conhecimento que
              acompanha o crescimento da comunidade.
            </p>
            {!canManageBlog && (
              <p className="mt-1 text-xs text-amber-300 flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Podes ver os posts, mas não tens permissão para os criar ou
                editar.
              </p>
            )}
          </div>

          <div className="flex-shrink-0">
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
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid gap-4 md:grid-cols-5">
        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-custom">
              Total Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">
              {posts.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-custom">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">
              {publishedPosts.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-custom">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              {draftPosts.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-custom flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              XP Distributed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-400">
              {formatNumber(xpTotalAll)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-custom flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
              Views (total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-purple-300">
              {formatNumber(totalViewsAll)}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* TOP LISTS */}
      {posts.length > 0 && (
        <section className="grid md:grid-cols-2 gap-4">
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                Top Posts by Views
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-body">
              {topByViews.length === 0 ? (
                <p className="text-sm text-muted-custom">Ainda sem views.</p>
              ) : (
                topByViews.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-custom bg-slate-950/60 rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <span className="font-semibold truncate max-w-[200px]">
                        {resolveLocalizedText(p.title) || 'Untitled'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-custom">
                      {formatNumber(p.views || 0)} views
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading">
                Top Posts by XP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-body">
              {topByXP.length === 0 ? (
                <p className="text-sm text-muted-custom">
                  Ainda não foi distribuído XP por posts.
                </p>
              ) : (
                topByXP.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-custom bg-slate-950/60 rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <span className="font-semibold truncate max-w-[200px]">
                        {resolveLocalizedText(p.title) || 'Untitled'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-custom">
                      {formatNumber(p.xp_total_distributed || 0)} XP
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* FILTROS */}
      <section>
        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-heading">
              Filtros & Ordenação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 grid md:grid-cols-4 gap-4 text-body">
            <div className="space-y-1">
              <p className="text-xs text-muted-custom">Status</p>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as 'all' | 'published' | 'draft')
                }
              >
                <SelectTrigger className="w-full bg-slate-950/60 border-custom">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-custom">Category</p>
              <Input
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="e.g. News"
                className="bg-slate-950/60 border-custom"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-custom">Author</p>
              <Input
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                placeholder="name or username"
                className="bg-slate-950/60 border-custom"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-custom">Order by</p>
              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy(v as 'recent' | 'views' | 'xp')
                }
              >
                <SelectTrigger className="w-full bg-slate-950/60 border-custom">
                  <SelectValue placeholder="Most recent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="views">Views</SelectItem>
                  <SelectItem value="xp">XP distributed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* LISTA DE POSTS */}
      <section>
        {loadingData ? (
          <Card className="bg-card-custom border-custom">
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-sm text-muted-custom">
                Loading posts...
              </p>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card className="bg-card-custom border-custom">
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-heading">
                No blog posts yet
              </h3>
              <p className="text-sm text-muted-custom mb-6">
                Cria o primeiro artigo para começar a construir o arquivo do
                Legacy.
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
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading">
                All Posts ({filteredPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      className="p-4 rounded-lg border-custom bg-slate-950/70 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          {post.image_url &&
                            post.image_url.trim() !== '' && (
                              <div className="w-28 h-20 flex-shrink-0 overflow-hidden rounded-md border-custom bg-slate-900">
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
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
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
                                <Badge
                                  variant="outline"
                                  className="border-blue-500 text-blue-400"
                                >
                                  Creator
                                </Badge>
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
                                <Badge
                                  variant="outline"
                                  className="border-purple-500 text-purple-300"
                                >
                                  Members only
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold truncate text-heading">
                              {title}
                            </h3>
                            <p className="text-sm text-body line-clamp-2 mb-2">
                              {excerpt}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-muted-custom flex-wrap">
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
                              {views > 0 && (
                                <span>{formatNumber(views)} views</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 md:ml-4">
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
      </section>
    </div>
  );
}
