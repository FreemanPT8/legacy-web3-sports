'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContentTracker } from '@/components/ContentTracker';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  User,
  Eye,
  Lock,
  CheckCircle,
  Clock,
  PenSquare,
  Award,
} from 'lucide-react';

type MultiLang = Record<string, string>;

interface BlogPost {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  content: MultiLang | string;
  category?: string | null;
  author?: string | null;
  author_id?: string | null;
  created_at?: string;
  views?: number | null;
  registered_readers?: number | null;
  total_xp_distributed?: number | null;
  registered_only?: boolean | null;
  xp_reward?: number | null;
  reading_time?: number | null;
}

interface BlogApiResponse {
  success: boolean;
  post: BlogPost;
  isCompleted: boolean;
  isAuthor: boolean;
}

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, getToken } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const id = String(params.id);

  // -------------------------------------------------------
  // FETCH BLOG POST
  // -------------------------------------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/blog/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: BlogApiResponse = await res.json();

        if (!res.ok || !data.success || !data.post) {
          setNotFound(true);
          setPost(null);
          setIsCompleted(false);
          setIsAuthor(false);
          return;
        }

        setPost(data.post);
        setIsCompleted(data.isCompleted);
        setIsAuthor(data.isAuthor);
      } catch (err) {
        console.error('Error fetching blog post:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, getToken]);

  // -------------------------------------------------------
  // MULTILANG HELPERS
  // -------------------------------------------------------
  const getLang = (v: MultiLang | string) => {
    if (typeof v === 'string') return v;
    return v.en || v.pt || v.es || '---';
  };

  // -------------------------------------------------------
  // LOADING SCREEN
  // -------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">A carregar artigo...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------
  // NOT FOUND
  // -------------------------------------------------------
  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Artigo não encontrado</h1>
            <p className="text-gray-600 mb-4">
              O artigo que procuras não existe ou foi removido.
            </p>
            <Button variant="ghost" onClick={() => router.push('/blog')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Blog
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------
  // POST DATA
  // -------------------------------------------------------
  const title = getLang(post.title);
  const content = getLang(post.content);
  const date = post.created_at ? new Date(post.created_at).toLocaleDateString() : '-';
  const xpReward = typeof post.xp_reward === 'number' ? post.xp_reward : 0;
  const durationMinutes =
    typeof post.reading_time === 'number' ? post.reading_time : 5;

  const totalXp = post.total_xp_distributed || 0;
  const registeredReaders = post.registered_readers || 0;

  const showCompletedBadge = isCompleted && !isAuthor;

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">

            {/* BACK BUTTON */}
            <div className="mb-6">
              <Button variant="ghost" onClick={() => router.push('/blog')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Blog
              </Button>
            </div>

            {/* HEADER CARD */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">{post.category || 'General'}</Badge>

                  {isAuthor ? (
                    <Badge className="bg-purple-600 text-white flex items-center gap-1">
                      <PenSquare className="h-3 w-3" />
                      Creator
                    </Badge>
                  ) : (
                    showCompletedBadge && (
                      <Badge className="bg-green-600 text-white flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    )
                  )}
                </div>

                <CardTitle className="text-3xl">{title}</CardTitle>

                {post.excerpt && (
                  <p className="text-gray-600 text-lg mt-2">{getLang(post.excerpt)}</p>
                )}
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{post.author || 'Admin'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{durationMinutes} min read</span>
                  </div>

                  {typeof post.views === 'number' && (
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{post.views}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* STATS CARD */}
            <Card className="mb-6">
              <CardContent className="py-4 text-sm text-gray-700">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">Creator</span>
                    <span className="font-semibold">{post.author || 'Admin'}</span>
                  </div>

                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">Created at</span>
                    <span>{date}</span>
                  </div>

                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">Completed</span>
                    <span>{registeredReaders} times</span>
                  </div>

                  <div>
                    <span className="block text-xs uppercase text-gray-500 mb-1">XP distributed</span>
                    <span>{totalXp} XP</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CONTENT + TRACKER */}
            <Card className="mb-6">
              <CardContent className="prose prose-lg max-w-none py-8">
                <ContentTracker
                  userId={user?.id ?? null}
                  contentId={post.id}
                  contentType="blog"
                  xpReward={xpReward}
                  estimatedMinutes={durationMinutes}
                  initialCompleted={isCompleted && !isAuthor}
                  disabled={isAuthor}
                  isAuthor={isAuthor}
                  onComplete={() => setIsCompleted(true)}
                >
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </ContentTracker>
              </CardContent>
            </Card>

            {/* COMPLETION MESSAGE */}
            {isCompleted && !isAuthor && (
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold mb-1">Leitura concluída!</h3>
                  <p className="text-sm text-gray-600">
                    Recebeste {xpReward} XP pela primeira leitura deste artigo.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* CATEGORY NAVIGATION (placeholder para futuro prev/next) */}
            <div className="flex justify-between mt-6 opacity-50 pointer-events-none">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous Article
              </Button>

              <Button>
                Next Article
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
