'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
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

import { Save, Lock, Award, Eye, Loader2 } from 'lucide-react';
import { SafeImage } from '@/app/components/SafeImage';

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

const RECENT_IMAGES_KEY = 'legacy_recent_images';

type BlogPost = {
  id: string;
  title: MultiLang;
  excerpt: MultiLang;
  content: MultiLang;
  image_url?: string | null;
  category?: string | null;
  reading_time?: number | null;
  xp_reward?: number | null;
  xp_threshold?: number | null;
  published?: boolean | null;
  registered_only?: boolean | null;
  author_id?: string | null;
  author_name?: string | null;
  created_at?: string;
  updated_at?: string;
  xp_total_distributed?: number;
  xp_creator_distributed?: number;
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
  const postId = params.postId as string;

  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');
  const [metrics, setMetrics] = useState<{
    xpTotal: number;
    xpCreator: number;
  }>({ xpTotal: 0, xpCreator: 0 });
  const titleLength = (post?.title?.[currentLanguage] || '').trim().length;
  const excerptLength = (post?.excerpt?.[currentLanguage] || '').trim().length;

  // Cache de imagens recentes (localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(RECENT_IMAGES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentImages(parsed.filter((u) => typeof u === 'string'));
      }
    } catch (err) {
      console.warn('Could not load recent images cache', err);
    }
  }, []);
  const isValidUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const persistRecentImages = (list: string[]) => {
    setRecentImages(list);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(list));
      } catch (err) {
        console.warn('Could not persist recent images cache', err);
      }
    }
  };

  const addRecentImage = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || !isValidUrl(trimmed)) return;
    const next = [trimmed, ...recentImages.filter((i) => i !== trimmed)].slice(
      0,
      5,
    );
    persistRecentImages(next);
  };

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop',
  );
  const hasImage = !!post?.image_url && post.image_url.trim().length > 0;
  const imageUrlError =
    hasImage && !isValidUrl(post?.image_url || '')
      ? 'Insere um URL valido (http/https).'
      : '';

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

  // Proteção básica
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  // Carregar permissões canManageBlog
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

  // Carregar post a editar
  useEffect(() => {
    const fetchPost = async () => {
      if (!user || !isAdmin) return;

      setLoadingData(true);
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
          setBlocksByLanguage({});
          setLoadingData(false);
          return;
        }

        const p = data.post as any;

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

        const normalized: BlogPost = {
          id: p.id,
          title: safeTitle,
          excerpt: safeExcerpt,
          content: safeContent,
          category: p.category || 'Blockchain',
          reading_time: p.reading_time ?? 5,
          xp_reward: p.xp_reward ?? 15,
          xp_threshold: p.xp_threshold ?? 0,
          published: p.published ?? false,
          registered_only: p.registered_only ?? false,
          image_url: p.image_url ?? '',
          author_id: p.author_id ?? null,
          author_name: p.author_name ?? null,
          created_at: p.created_at,
          updated_at: p.updated_at,
          xp_total_distributed: p.xp_total_distributed ?? 0,
          xp_creator_distributed: p.xp_creator_distributed ?? 0,
        };

        setPost(normalized);
        setMetrics({
          xpTotal: normalized.xp_total_distributed || 0,
          xpCreator: normalized.xp_creator_distributed || 0,
        });

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
        setLoadingData(false);
      }
    };

    if (user && isAdmin && permissionsLoaded) {
      fetchPost();
    }
  }, [user, isAdmin, permissionsLoaded, getToken, postId, toast]);

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  const handleFieldChange = (
    field:
      | 'category'
      | 'reading_time'
      | 'xp_reward'
      | 'xp_threshold'
      | 'published'
      | 'registered_only'
      | 'image_url',
    value: any,
  ) => {
    if (!post) return;
    setPost({
      ...post,
      [field]: value,
    });
  };

  const handleMLFieldChange = (
    field: 'title' | 'excerpt',
    lang: LangCode,
    value: string,
  ) => {
    if (!post) return;
    setPost({
      ...post,
      [field]: {
        ...(post as any)[field],
        [lang]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!user || !isAdmin || !canManageBlog || !post) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to edit blog posts.',
        variant: 'destructive',
      });
      return;
    }

    const hasAnyTitle = LANGUAGES.some((l) => {
      const v = post.title[l.code];
      return typeof v === 'string' && v.trim().length > 0;
    });

    if (!hasAnyTitle) {
      toast({
        title: 'Missing title',
        description: 'Please provide a title in at least one language.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const content = serializeBlocksByLanguage(blocksByLanguage);

      const token = getToken();
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
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
          published: post.published,
          registered_only: post.registered_only,
          image_url: post.image_url?.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving blog post',
          description: data.error || 'Failed to save blog post.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: 'Post updated',
        description: 'The blog post was updated successfully.',
      });

      router.push('/admin/blog');
    } catch (err) {
      console.error('Failed to save blog post:', err);
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
    !isAdmin ||
    !permissionsLoaded ||
    loadingData
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading post...
          </p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-300">
          Blog post not found.
        </p>
      </div>
    );
  }

  const currentTitle = (post.title?.[currentLanguage] || '').trim();
  const currentExcerpt = (post.excerpt?.[currentLanguage] || '').trim();
  const titleLength = currentTitle.length;
  const excerptLength = currentExcerpt.length;

  const canEdit = canManageBlog;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={post.published ? 'default' : 'outline'}
                  className={post.published ? 'bg-green-600' : ''}
                >
                  {post.published ? 'Published' : 'Draft'}
                </Badge>
                {post.author_name && (
                  <Badge variant="outline">Author: {post.author_name}</Badge>
                )}
                {metrics.xpTotal > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Award className="h-4 w-4 text-blue-600" />
                    XP: {metrics.xpTotal}
                  </Badge>
                )}
                {metrics.xpCreator > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Award className="h-4 w-4 text-emerald-600" />
                    Creator XP: {metrics.xpCreator}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">Edit Blog Post</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Update content, XP, and publishing options. Metrics are shown above.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/blog/${post.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View public
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !canEdit}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>

          {!canEdit && (
            <Card className="mb-2 border-amber-300 bg-amber-50">
              <CardContent className="py-3 text-sm text-amber-800 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                You can view this post but do not have permission to edit it.
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                        onClick={() =>
                          setCurrentLanguage(lang.code as LangCode)
                        }
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Title ({currentLangLabel})</Label>
                      <span className="text-[11px] text-gray-400">
                        {titleLength}/60 recomendado
                      </span>
                    </div>
                    <Input
                      value={post.title[currentLanguage] || ''}
                      onChange={(e) =>
                        handleMLFieldChange(
                          'title',
                          currentLanguage,
                          e.target.value,
                        )
                      }
                      placeholder="Enter post title"
                      className="text-lg"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Excerpt ({currentLangLabel})</Label>
                      <span className="text-[11px] text-gray-400">
                        {excerptLength}/160 recomendado
                      </span>
                    </div>
                    <Textarea
                      value={post.excerpt[currentLanguage] || ''}
                      onChange={(e) =>
                        handleMLFieldChange(
                          'excerpt',
                          currentLanguage,
                          e.target.value,
                        )
                      }
                      placeholder="Brief summary of the post"
                      rows={3}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>Body ({currentLangLabel})</Label>
                    <BlockEditor
                      value={blocksByLanguage}
                      onChange={setBlocksByLanguage}
                      initialLanguage={currentLanguage}
                      className="mt-2"
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
                      value={post.category || 'Blockchain'}
                      onValueChange={(value) =>
                        handleFieldChange('category', value)
                      }
                      disabled={!canEdit}
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
                      value={post.image_url ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFieldChange('image_url', value);
                        addRecentImage(value);
                      }}
                      placeholder="https://example.com/cover.jpg"
                      disabled={!canEdit}
                      className={imageUrlError ? 'border-red-400' : undefined}
                    />
                    {imageUrlError && (
                      <p className="text-[11px] text-red-600 mt-1">
                        {imageUrlError}
                      </p>
                    )}
                    <div className="mt-2 text-[11px] text-gray-500 space-y-1">
                      <p className="font-semibold text-gray-700">
                        Dicas rápidas de SEO
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Título com 50–60 caracteres e 1–2 keywords.</li>
                        <li>Resumo/meta com 150–160 caracteres.</li>
                        <li>Thumbnail com alt descritivo (usa o título como base).</li>
                      </ul>
                    </div>
                    {hasImage && !imageUrlError && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Preview</p>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                previewMode === 'desktop' ? 'default' : 'outline'
                              }
                              onClick={() => setPreviewMode('desktop')}
                            >
                              Desktop
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                previewMode === 'mobile' ? 'default' : 'outline'
                              }
                              onClick={() => setPreviewMode('mobile')}
                            >
                              Mobile
                            </Button>
                          </div>
                        </div>
                        <div
                          className={`rounded-lg border bg-white p-2 ${
                            previewMode === 'mobile' ? 'max-w-xs mx-auto' : ''
                          }`}
                        >
                          <SafeImage
                            src={post.image_url ?? ''}
                            alt="Post thumbnail preview"
                            className="w-full h-40 object-cover rounded-md"
                            width={400}
                            height={160}
                          />
                        </div>
                      </div>
                    )}

                    {recentImages.length > 0 && (
                      <div className="mt-3 space-y-1 text-[11px] text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>Imagens recentes</span>
                          <button
                            type="button"
                            className="text-red-500 hover:underline"
                            onClick={() => persistRecentImages([])}
                            disabled={!canEdit}
                          >
                            Limpar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentImages.map((url) => (
                            <button
                              key={url}
                              type="button"
                              className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] hover:border-blue-400 disabled:opacity-50"
                              onClick={() => handleFieldChange('image_url', url)}
                              disabled={!canEdit}
                            >
                              {url.length > 28 ? `${url.slice(0, 28)}…` : url}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Reading Time (minutes)</Label>
                    <Input
                      type="number"
                      value={post.reading_time ?? 5}
                      onChange={(e) =>
                        handleFieldChange(
                          'reading_time',
                          parseInt(e.target.value) || 0,
                        )
                      }
                      min={1}
                      max={60}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>XP Reward</Label>
                    <Input
                      type="number"
                      value={post.xp_reward ?? 15}
                      onChange={(e) =>
                        handleFieldChange(
                          'xp_reward',
                          parseInt(e.target.value) || 0,
                        )
                      }
                      min={5}
                      max={50}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>XP Required to Unlock</Label>
                    <Input
                      type="number"
                      value={post.xp_threshold ?? 0}
                      onChange={(e) =>
                        handleFieldChange(
                          'xp_threshold',
                          parseInt(e.target.value) || 0,
                        )
                      }
                      min={0}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Label>Published</Label>
                    <Switch
                      checked={!!post.published}
                      onCheckedChange={(checked) =>
                        handleFieldChange('published', checked)
                      }
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Registered users only</Label>
                    <Switch
                      checked={!!post.registered_only}
                      onCheckedChange={(checked) =>
                        handleFieldChange('registered_only', checked)
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">SEO helper (não bloqueia)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded border p-2 bg-white">
                      <div className="font-semibold">Título</div>
                      <div>{titleLength} caracteres (ideal 60-70)</div>
                    </div>
                    <div className="rounded border p-2 bg-white">
                      <div className="font-semibold">Resumo</div>
                      <div>{excerptLength} caracteres (ideal 150-160)</div>
                    </div>
                    <div className="rounded border p-2 bg-white col-span-2">
                      <div className="font-semibold">Imagem</div>
                      <div>Usa 1200x630 webp &lt; 500KB + alt descritivo.</div>
                    </div>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Escolhe 1 palavra-chave e coloca no título e no resumo.</li>
                    <li>Adiciona 1 link interno para um curso ou post relacionado.</li>
                    <li>Define categoria e thumbnail com URL válido.</li>
                    <li>Para conteúdo PT, mantém o título claro e sem jargão.</li>
                  </ul>
                  <p className="text-xs text-gray-500">
                    Estes são lembretes rápidos; não impedem a publicação.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




