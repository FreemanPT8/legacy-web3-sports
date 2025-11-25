'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Eye, Lock } from 'lucide-react';
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

type PostFormState = {
  title: MultiLang;
  excerpt: MultiLang;
  category: string;
  reading_time: number;
  xp_reward: number;
  xp_threshold: number;
  published: boolean;
  registered_only: boolean;
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

export default function CreateBlogPostPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<PostFormState>({
    title: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    excerpt: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    category: 'Blockchain',
    reading_time: 5,
    xp_reward: 15,
    xp_threshold: 0,
    published: false,
    registered_only: false,
  });

  // Língua para título & excerpt (o BlockEditor gere as línguas dos blocos internamente)
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');

  // Blocos de conteúdo por língua (para o BlockEditor)
  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);

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

  const handleSave = async (publish: boolean = false) => {
    if (!user || !canManageBlog) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to manage blog posts.',
        variant: 'destructive',
      });
      return;
    }

    // Validar título em pelo menos uma língua
    const hasAnyTitle = Object.values(post.title).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

    if (!hasAnyTitle) {
      toast({
        title: 'Missing title',
        description:
          'Please add a post title in at least one language before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Construir HTML por língua a partir dos blocos
      const content = serializeBlocksByLanguage(blocksByLanguage);

      const token = getToken();
      const response = await fetch('/api/admin/blog/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: post.title,
          excerpt: post.excerpt,
          content,
          category: post.category,
          reading_time: post.reading_time,
          xp_reward: post.xp_reward,
          xp_threshold: post.xp_threshold,
          published: publish || post.published,
          registered_only: post.registered_only,
          author_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast({
          title: 'Error saving blog post',
          description: data.error || 'Failed to save blog post.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      router.push('/admin/blog');
    } catch (error) {
      console.error('Failed to save blog post:', error);
      toast({
        title: 'Network error',
        description: 'Could not save blog post. Please try again.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading...
          </p>
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
              You don&apos;t have permission to create or edit blog posts.
              Please contact a Super Admin if you think this is a mistake.
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
                <h1 className="text-3xl font-bold">Create New Blog Post</h1>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  variant="outline"
                  className="disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {saving ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Tabs para título & excerpt */}
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
                        value={
                          post.title[currentLanguage as keyof typeof post.title]
                        }
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
                        value={
                          post.excerpt[
                            currentLanguage as keyof typeof post.excerpt
                          ]
                        }
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
                      <Label>Body (blocks, all languages)</Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Use the block editor below to build the article body.
                        Inside the editor you can switch between languages for
                        the content blocks.
                      </p>
                      <BlockEditor
                        value={blocksByLanguage}
                        onChange={setBlocksByLanguage}
                        initialLanguage={currentLanguage}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={post.category}
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
                        value={post.reading_time}
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
                        value={post.xp_reward}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            xp_reward: parseInt(e.target.value) || 0,
                          })
                        }
                        min={5}
                        max={50}
                      />
                    </div>

                    <div>
                      <Label>XP Required to Unlock</Label>
                      <Input
                        type="number"
                        value={post.xp_threshold}
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
                        checked={post.published}
                        onCheckedChange={(checked) =>
                          setPost({ ...post, published: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Registered users only</Label>
                      <Switch
                        checked={post.registered_only}
                        onCheckedChange={(checked) =>
                          setPost({ ...post, registered_only: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Publishing Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-700">
                    <p>• Write engaging titles that capture attention</p>
                    <p>• Use clear and concise language</p>
                    <p>• Break long content into headings and sections</p>
                    <p>• Add images and video links to make it dynamic</p>
                    <p>• Add appropriate XP rewards based on content length</p>
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
