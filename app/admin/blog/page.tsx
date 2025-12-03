'use client';

import { useEffect, useState } from 'react';
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
      <div className="py-8">
        <div className="text-center text-gray-600 dark:text-gray-300">
          Loading...
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

  const filteredPosts = posts
    .filter((p) => {
      const st = p.status || (p.published ? 'published' : 'draft');
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (
        categoryFilter.trim() &&
        !(p.category || '').toLowerCase().includes(categoryFilter.toLowerCase())
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
          (b.xp_total_distributed || 0) - (a.xp_total_distributed || 0)
        );
      // recent
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold">Blog Management</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Create and manage blog posts with real metrics (XP, views, author).
              </p>
              {!canManageBlog && (
                <p className="mt-1 text-sm text-amber-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  You can view posts, but you don&apos;t have permission to create or edit them.
                </p>
              )}
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
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{posts.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Published
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {publishedPosts.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Draft
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {draftPosts.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  XP Distributed (total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {xpTotalAll}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Views (total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {totalViewsAll}
                </div>
              </CardContent>
            </Card>
          </div>

          {posts.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Top Posts by Views
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topByViews.length === 0 ? (
                    <p className="text-sm text-gray-500">No views yet.</p>
                  ) : (
                    topByViews.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-semibold truncate max-w-[180px]">
                            {resolveLocalizedText(p.title) || 'Untitled'}
                          </span>
                        </div>
                        <div className="text-gray-600">{p.views || 0} views</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Top Posts by XP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topByXP.length === 0 ? (
                    <p className="text-sm text-gray-500">No XP distributed yet.</p>
                  ) : (
                    topByXP.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-semibold truncate max-w-[180px]">
                            {resolveLocalizedText(p.title) || 'Untitled'}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          {p.xp_total_distributed || 0} XP
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6 grid md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Status</p>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <p className="text-xs text-gray-500">Category</p>
                <input
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder="e.g. News"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Author</p>
                <input
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  placeholder="name or username"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Order by</p>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

          {loadingData ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  Loading posts...
                </p>
              </CardContent>
            </Card>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No blog posts yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first blog post to get started
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
            <Card>
              <CardHeader>
                <CardTitle>All Posts ({filteredPosts.length})</CardTitle>
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
                        className="p-4 rounded-lg border bg-white dark:bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            {post.image_url && post.image_url.trim() !== '' && (
                              <div className="w-28 h-20 flex-shrink-0 overflow-hidden rounded-md border bg-gray-50">
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
                                      ? 'bg-green-600'
                                      : 'bg-yellow-600'
                                  }
                                >
                                  {statusLabel}
                                </Badge>
                                {post.category && (
                                  <Badge variant="outline">{post.category}</Badge>
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
                              </div>
                              <h3 className="text-lg font-semibold truncate">
                                {title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                                {excerpt}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {post.author_name || post.author || 'Admin'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {post.created_at
                                    ? new Date(post.created_at).toLocaleDateString()
                                    : '-'}
                                </span>
                                {views > 0 && <span>{views} views</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
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
      </div>
    </div>
  );
}
