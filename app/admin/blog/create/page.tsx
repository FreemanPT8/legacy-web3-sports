// app/admin/blog/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Link from 'next/link';

export default function CreateBlogPostPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState({
    title: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    excerpt: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    content: { en: '', pt: '', es: '', fr: '', it: '', de: '' },
    category: 'Blockchain',
    reading_time: 5,
    xp_reward: 15,
    xp_required: 0,
    published: false,
    registered_only: false,
  });
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Português' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'de', name: 'Deutsch' },
  ];

  const categories = [
    'Blockchain',
    'Web3',
    'NFTs',
    'DeFi',
    'Sports',
    'Education',
    'Technology',
    'Community',
  ];

  const handleSave = async (publish: boolean = false) => {
    if (!user) return;

    setSaving(true);
    try {
      const token = getToken();

      const response = await fetch('/api/admin/blog/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...post,
          published: publish,
          author_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Failed to save blog post:', data);
        toast({
          title: 'Error saving post',
          description: data.error || 'Failed to create blog post.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: publish ? 'Post published' : 'Draft saved',
        description: 'The blog post has been saved successfully.',
      });
      router.push('/admin/blog');
    } catch (error) {
      console.error('Failed to save blog post:', error);
      toast({
        title: 'Network error',
        description: 'Could not save blog post. Please try again.',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

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
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {saving ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* LEFT: CONTENT */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-2 flex-wrap">
                      {languages.map((lang) => (
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
                      <Label>
                        Title (
                        {
                          languages.find(
                            (l) => l.code === currentLanguage,
                          )?.name
                        }
                        )
                      </Label>
                      <Input
                        value={
                          post.title[
                            currentLanguage as keyof typeof post.title
                          ]
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
                      <Label>
                        Excerpt (
                        {
                          languages.find(
                            (l) => l.code === currentLanguage,
                          )?.name
                        }
                        )
                      </Label>
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
                      <Label>
                        Content (
                        {
                          languages.find(
                            (l) => l.code === currentLanguage,
                          )?.name
                        }
                        )
                      </Label>
                      <Textarea
                        value={
                          post.content[
                            currentLanguage as keyof typeof post.content
                          ]
                        }
                        onChange={(e) =>
                          setPost({
                            ...post,
                            content: {
                              ...post.content,
                              [currentLanguage]: e.target.value,
                            },
                          })
                        }
                        placeholder="Write your post content here (HTML supported)"
                        rows={20}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can use HTML tags for formatting.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: SETTINGS */}
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
                          {categories.map((cat) => (
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
                            reading_time:
                              parseInt(e.target.value) || 0,
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
                            xp_reward:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        min={5}
                        max={50}
                      />
                    </div>

                    <div>
                      <Label>Minimum XP Required to Read</Label>
                      <Input
                        type="number"
                        value={post.xp_required}
                        onChange={(e) =>
                          setPost({
                            ...post,
                            xp_required:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        min={0}
                        max={100000}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Users need at least this amount of XP to access
                        the article (when logged in).
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Label>Only for registered users</Label>
                      <Switch
                        checked={post.registered_only}
                        onCheckedChange={(checked) =>
                          setPost({ ...post, registered_only: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Label>Published</Label>
                      <Switch
                        checked={post.published}
                        onCheckedChange={(checked) =>
                          setPost({ ...post, published: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Publishing Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-700">
                    <p>• Write engaging titles that capture attention</p>
                    <p>• Use clear and concise language</p>
                    <p>• Include examples when relevant</p>
                    <p>• Proofread before publishing</p>
                    <p>
                      • Set XP rewards and XP requirement according to
                      content depth
                    </p>
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
