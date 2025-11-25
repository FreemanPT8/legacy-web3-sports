'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  BlockEditor,
  type BlocksByLanguage,
  type LangCode,
  serializeBlocksByLanguage,
} from '@/components/admin/content/BlockEditor';

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageBlog?: boolean;
    [key: string]: any;
  };
};

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang;
  excerpt: MultiLang;
  content: MultiLang;
  category?: string | null;
  reading_time?: number | null;
  xp_reward?: number | null;
  xp_threshold?: number | null;
  published?: boolean | null;
  registered_only?: boolean | null;
  author_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

const LANGUAGES: { code: LangCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
];

const CATEGORIES = [
  'Blockchain',
  'Web3',
  'NFTs',
  'DeFi',
  'Sports',
  'Education',
  'Technology',
  'Community',
];

function generateBlockId(prefix: string = 'blk') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const postId = params.postId as string;

  const [loadingPost, setLoadingPost] = useState(true);
  const [saving, setSaving] = useState(false);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');
  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);

  // Proteção básica de role geral
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

  // Verificar permissões finas (canManageBlog)
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
            ...(token ? { Authorization: `Bearer ${token}` } : {},
            ),
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

  // Carregar post
  useEffect(() => {
    const fetchPost = async () => {
      if (!user) return;
      setLoadingPost(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/admin/blog/${postId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.post) {
          toast({
            title: 'Error loading post',
            description: data.error || 'Failed to load blog post.',
            variant: 'destructive',
          });
          setPost(null);
          setLoadingPost(false);
          return;
        }

        const p: BlogPost = data.post;

        // Garantir objetos multi-língua mínimos
        const safeTitle: MultiLang = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
          ...(p.title || {}),
        };

        const safeExcerpt: MultiLang = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
          ...(p.excerpt || {}),
        };

        const safeContent: MultiLang = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
          ...(p.content || {}),
        };

        setPost({
          ...p,
          title: safeTitle,
          excerpt: safeExcerpt,
          content: safeContent,
        });

        // Inicializar blocos a partir do HTML existente (um bloco HTML por língua)
        const initialBlocks: BlocksByLanguage = {};
        LANGUAGES.forEach(({ code }) => {
          const html = safeContent[code] || '';
          if (html && html.trim()) {
            initialBlocks[code] = [
              {
                id: generateBlockId('html'),
                type: 'html',
                data: { html },
              },
            ];
          } else {
            initialBlocks[code] = [];
          }
        });
        setBlocksByLanguage(initialBlocks);
      } catch (err) {
        console.error('Error loading blog post for editing:', err);
        toast({
          title: 'Network error',
          description: 'Could not load blog post. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingPost(false);
      }
    };

    if (user && canManageBlog) {
      fetchPost();
    }
  }, [user, canManageBlog, getToken, postId, toast]);

  const handleBlocksChange = (value: BlocksByLanguage) => {
    setBlocksByLanguage(value);
  };

  const handleSave = async () => {
    if (!user || !canManageBlog || !post) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to update this blog post.',
        variant: 'destructive',
      });
      return;
    }

    // Pelo menos um título em qualquer língua
    const hasAnyTitle = Object.values(post.title || {}).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
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
      // Serializar blocos → HTML por língua
      const content = serializeBlocksByLanguage(blocksByLanguage);

      const token = getToken();
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: post.title,
          excerpt: post.excerpt,
          content,
          category: post.category || 'General',
          reading_time: post.reading_time ?? 5,
          xp_reward: post.xp_reward ?? 15,
          xp_threshold: post.xp_threshold ?? 0,
          published: post.published ?? false,
          registered_only: post.registered_only ?? false,
          author_id: post.author_id || user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving post',
          description: data.error || 'Failed to update blog post.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: 'Post updated',
        description: 'The blog post was updated successfully.',
      });

      // Atualizar estado local com o que vier da API
      if (data.post) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                ...data.post,
              }
            : data.post,
        );
      }
    } catch (err) {
      console.error('Error saving blog post:', err);
      toast({
        title: 'Network error',
        description: 'Could not save blog post. Please try again.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  if (loading || !user || !permissionsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canManageBlog) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="h-10 w-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No permission</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have permission to edit blog posts. Please contact
              a Super Admin if you think this is a mistake.
            </p>
            <Link href="/admin/blog">
              <Button variant="outline">Back to blog</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadingPost || !post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Loading blog post...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Link href="/admin/blog">
                  <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Blog
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold mb-1">
                  Edit Blog Post
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Post ID: <span className="font-mono text-xs">{post.id}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* LEFT: Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Selector de língua para título/excerpt */}
                    <div className="flex gap-2 flex-wrap">
                      {LANGUAGES.map((lang) => (
                        <Badge
                          key={lang.code}
                          variant={
                            currentLanguage === lang.code
                              ? 'default'
                              : 'outline'
                          }
                          className="cursor-pointer"
                          onClick={() => setCurrentLanguage(lang.code)}
                        >
                          {lang.name}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <Label>Title ({currentLangLabel})</Label>
                      <Input
                        value={post.title[currentLanguage] || ''}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            title: {
                              ...post.title,
                              [currentLanguage]: e.target.value,
                            },
                          })
                        }
                        placeholder="Enter post title"
                        className="text-lg"
                      />
                    </div>

                    <div>
                      <Label>Excerpt ({currentLangLabel})</Label>
                      <Textarea
                        value={post.excerpt[currentLanguage] || ''}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            excerpt: {
                              ...post.excerpt,
                              [currentLanguage]: e.target.value,
                            },
                          })
                        }
                        placeholder="Brief summary of the post"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Body (all languages via blocks)</Label>
                      <BlockEditor
                        value={blocksByLanguage}
                        onChange={handleBlocksChange}
                        initialLanguage={currentLanguage}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={post.category || 'Blockchain'}
                        onValueChange={(value) =>
                          setPost({ ...post, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Reading Time (minutes)</Label>
                      <Input
                        type="number"
                        value={post.reading_time ?? 5}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            reading_time: parseInt(e.target.value) || 0,
                          })
                        }
                        min={1}
                        max={60}
                      />
                    </div>

                    <div>
                      <Label>XP Reward</Label>
                      <Input
                        type="number"
                        value={post.xp_reward ?? 15}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            xp_reward: parseInt(e.target.value) || 0,
                          })
                        }
                        min={5}
                        max={100}
                      />
                    </div>

                    <div>
                      <Label>XP Required to Unlock</Label>
                      <Input
                        type="number"
                        value={post.xp_threshold ?? 0}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            xp_threshold: parseInt(e.target.value) || 0,
                          })
                        }
                        min={0}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Label>Published</Label>
                      <Switch
                        checked={!!post.published}
                        onCheckedChange={(checked) =>
                          setPost({ ...post, published: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Registered users only</Label>
                      <Switch
                        checked={!!post.registered_only}
                        onCheckedChange={(checked) =>
                          setPost({ ...post, registered_only: checked })
                        }
                      />
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t mt-2 space-y-1">
                      <p>
                        Created:{' '}
                        {post.created_at
                          ? new Date(post.created_at).toLocaleString()
                          : '-'}
                      </p>
                      <p>
                        Last updated:{' '}
                        {post.updated_at
                          ? new Date(post.updated_at).toLocaleString()
                          : '-'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Editing Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-700">
                    <p>• Keep titles clear and engaging</p>
                    <p>• Use headings and dividers to structure content</p>
                    <p>• Add images and videos to make it dynamic</p>
                    <p>• Use XP to reward longer or more complex posts</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
