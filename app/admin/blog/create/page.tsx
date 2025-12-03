'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

const LANGUAGES: { code: LangCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
  { code: 'de', name: 'German' },
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

type MultiLang = Record<string, string>;

export default function CreateBlogPostPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);

  const [post, setPost] = useState({
    title: {
      en: '',
      pt: '',
      es: '',
      fr: '',
      it: '',
      de: '',
    } as MultiLang,
    excerpt: {
      en: '',
      pt: '',
      es: '',
      fr: '',
      it: '',
      de: '',
    } as MultiLang,
    category: 'Blockchain',
    reading_time: 5,
    xp_reward: 15,
    xp_threshold: 0,
    published: false,
    registered_only: false,
    image_url: '',
  });

  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');
  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'preview'>(
    'basic',
  );

  // Protecao basica
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

  // Verificar permissoes finas (canManageBlog)
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

  const handleSave = async (publish: boolean) => {
    if (!user || !canManageBlog) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to manage blog posts.',
        variant: 'destructive',
      });
      return;
    }

    // Validar titulo em pelo menos uma lingua
    const hasAnyTitle = Object.values(post.title).some(
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
      // 1) Serializar blocos em HTML por lingua
      const contentByLang = serializeBlocksByLanguage(blocksByLanguage);

      const token = getToken();
      const res = await fetch('/api/admin/blog/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: post.title,
          excerpt: post.excerpt,
          content: contentByLang,
          category: post.category,
          reading_time: post.reading_time,
          xp_reward: post.xp_reward,
          xp_threshold: post.xp_threshold,
          registered_only: post.registered_only,
          published: publish,
          image_url: post.image_url?.trim() || null,
          author_id: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Error saving blog post:', data);
        toast({
          title: 'Error saving blog post',
          description: data.error || 'Failed to save blog post.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: publish ? 'Post published' : 'Draft saved',
        description: publish
          ? 'Your blog post is now live.'
          : 'Your draft has been saved.',
      });

      router.push('/admin/blog');
    } catch (error) {
      console.error('Failed to save blog post:', error);
      toast({
        title: 'Network error',
        description: 'Could not save blog post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canManageBlog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
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
      </div>
    );
  }

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin/blog">
                <Button variant="ghost" className="mb-2">
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

          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'basic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('basic')}
            >
              Basic content
            </Button>
            <Button
              variant={activeTab === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('advanced')}
            >
              Advanced
            </Button>
            <Button
              variant={activeTab === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-2 space-y-6">
              {activeTab === 'preview' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview ({currentLangLabel})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Title</p>
                      <p className="text-xl font-semibold">
                        {post.title[currentLanguage] || 'Untitled post'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Excerpt</p>
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        {post.excerpt[currentLanguage] || 'No excerpt yet.'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs text-gray-600">
                      <Badge variant="outline">{post.category}</Badge>
                      <Badge variant="outline">{post.reading_time} min</Badge>
                      <Badge variant="outline">{post.xp_reward} XP</Badge>
                      {post.registered_only && (
                        <Badge variant="outline">Registered only</Badge>
                      )}
                      <Badge variant={post.published ? 'default' : 'outline'}>
                        {post.published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Body preview is available after saving; use the Block
                      Editor to craft the full content.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {activeTab === 'basic' ? 'Content' : 'Advanced settings'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {activeTab === 'basic' ? (
                      <>
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
                              setPost((prev) => ({
                                ...prev,
                                title: {
                                  ...prev.title,
                                  [currentLanguage]: e.target.value,
                                },
                              }))
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
                              setPost((prev) => ({
                                ...prev,
                                excerpt: {
                                  ...prev.excerpt,
                                  [currentLanguage]: e.target.value,
                                },
                              }))
                            }
                            placeholder="Brief summary of the post"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Body (all languages)</Label>
                          <p className="text-xs text-gray-500 mb-2">
                            Use the block editor below to build the article
                            body. Inside the editor you can switch languages for
                            the content blocks.
                          </p>
                          <BlockEditor
                            value={blocksByLanguage}
                            onChange={setBlocksByLanguage}
                            initialLanguage={currentLanguage}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>XP Reward</Label>
                          <Input
                            type="number"
                            value={post.xp_reward}
                            onChange={(e) =>
                              setPost((prev) => ({
                                ...prev,
                                xp_reward: parseInt(e.target.value) || 0,
                              }))
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
                              setPost((prev) => ({
                                ...prev,
                                xp_threshold: parseInt(e.target.value) || 0,
                              }))
                            }
                            min={0}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t col-span-2">
                          <Label>Published</Label>
                          <Switch
                            checked={post.published}
                            onCheckedChange={(checked) =>
                              setPost((prev) => ({
                                ...prev,
                                published: checked,
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between col-span-2">
                          <Label>Registered users only</Label>
                          <Switch
                            checked={post.registered_only}
                            onCheckedChange={(checked) =>
                              setPost((prev) => ({
                                ...prev,
                                registered_only: checked,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* COLUNA DIREITA: SETTINGS */}
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
                        setPost((prev) => ({ ...prev, category: value }))
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
                    <Label>Thumbnail (image URL)</Label>
                    <Input
                      type="text"
                      value={post.image_url}
                      onChange={(e) =>
                        setPost((prev) => ({
                          ...prev,
                          image_url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/cover.jpg"
                    />
                    {post.image_url.trim() && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">
                          Preview
                        </p>
                        <div className="rounded-lg border bg-white p-2">
                          <img
                            src={post.image_url}
                            alt="Post thumbnail preview"
                            className="w-full h-40 object-cover rounded-md"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Reading Time (minutes)</Label>
                    <Input
                      type="number"
                      value={post.reading_time}
                      onChange={(e) =>
                        setPost((prev) => ({
                          ...prev,
                          reading_time: parseInt(e.target.value) || 0,
                        }))
                      }
                      min={1}
                      max={60}
                    />
                  </div>

                  {activeTab === 'advanced' && (
                    <>
                      <div>
                        <Label>XP Reward</Label>
                        <Input
                          type="number"
                          value={post.xp_reward}
                          onChange={(e) =>
                            setPost((prev) => ({
                              ...prev,
                              xp_reward: parseInt(e.target.value) || 0,
                            }))
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
                            setPost((prev) => ({
                              ...prev,
                              xp_threshold: parseInt(e.target.value) || 0,
                            }))
                          }
                          min={0}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Label>Published</Label>
                        <Switch
                          checked={post.published}
                          onCheckedChange={(checked) =>
                            setPost((prev) => ({
                              ...prev,
                              published: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Registered users only</Label>
                        <Switch
                          checked={post.registered_only}
                          onCheckedChange={(checked) =>
                            setPost((prev) => ({
                              ...prev,
                              registered_only: checked,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-sm">Publishing Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-700">
                  <p>- Write engaging titles that capture attention</p>
                  <p>- Use clear and concise language</p>
                  <p>- Break long content into headings and sections</p>
                  <p>- Add images and video links to make it dynamic</p>
                  <p>- Add appropriate XP rewards based on content length</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
