'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Eye, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  content: MultiLang | string;
  category?: string | null;
  author?: string | null;
  created_at?: string;
  views?: number;
  registered_only?: boolean | null;
};

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    const fetchPost = async () => {
      setPostLoading(true);
      try {
        const res = await fetch(`/api/blog/${id}`);
        const data = await res.json();

        if (!res.ok || !data.success || !data.post) {
          setNotFound(true);
          setPost(null);
        } else {
          setPost(data.post);
          setNotFound(false);
        }
      } catch (error) {
        console.error('Error loading public blog post:', error);
        setNotFound(true);
        setPost(null);
      } finally {
        setPostLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id]);

  const getTitle = (title: MultiLang | string) => {
    if (typeof title === 'string') return title;
    return title.en || title.pt || title.es || 'Untitled post';
  };

  const getContent = (content: MultiLang | string) => {
    if (typeof content === 'string') return content;
    return content.en || content.pt || content.es || '';
  };

  const getExcerpt = (excerpt: MultiLang | string) => {
    if (typeof excerpt === 'string') return excerpt;
    return excerpt.en || excerpt.pt || excerpt.es || '';
  };

  const loading = authLoading || postLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Loading post...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold mb-2">Post not found</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              The blog post you are looking for does not exist or is not
              published.
            </p>
            <button
              onClick={() => router.push('/blog')}
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to blog
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const htmlContent = getContent(post.content);
  const excerptText = getExcerpt(post.excerpt);
  const isLocked = !!post.registered_only && !user;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.push('/blog')}
              className="mb-4 inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to blog
            </button>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">
                    {post.category || 'General'}
                  </Badge>
                  {post.registered_only && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Lock className="h-3 w-3" />
                      Members only
                    </span>
                  )}
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  {getTitle(post.title)}
                </CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {post.author || 'Admin'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.created_at
                      ? new Date(post.created_at).toLocaleDateString()
                      : '-'}
                  </span>
                  {post.views && post.views > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Se o post está bloqueado e o user NÃO está logado → teaser + call-to-action */}
                {isLocked ? (
                  <>
                    {excerptText && (
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        {excerptText}
                      </p>
                    )}

                    <div className="border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <Lock className="h-4 w-4 mt-1 text-amber-600" />
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-200">
                            This article is exclusive to registered members.
                          </p>
                          <p className="text-xs text-amber-800/80 dark:text-amber-100/80 mt-1">
                            Create a free account or log in to unlock the full
                            content and start earning XP from this lesson.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => router.push('/signup')}
                        >
                          Create account
                        </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push('/login')}
                          >
                            Log in
                          </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  // Conteúdo completo (público ou user autenticado)
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
