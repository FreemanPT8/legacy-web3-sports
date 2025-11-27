'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  User,
  Eye,
  Clock,
  CheckCircle2,
  PenSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  category?: string | null;
  author?: string | null;
  author_id?: string | null;
  created_at?: string;
  views?: number | null;
  registered_views?: number | null;
  registered_readers_count?: number | null;
  total_xp_given?: number | null;
  xp_reward?: number | null;
  reading_time?: number | null;
  is_completed?: boolean | null;
};

export default function BlogPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('/api/blog', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.posts)) {
          setPosts(data.posts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading blog posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [getToken]);

  const getTitle = (title: MultiLang | string) => {
    if (typeof title === 'string') return title;
    return title.en || title.pt || title.es || 'Untitled post';
  };

  const getExcerpt = (excerpt: MultiLang | string) => {
    if (typeof excerpt === 'string') return excerpt;
    return (
      excerpt.en ||
      excerpt.pt ||
      excerpt.es ||
      'No description available.'
    );
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Blog
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
              Artigos para te ajudar a perceber o universo Web3, a
              blockchain Apertum e a integração com o desporto.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  A carregar artigos...
                </p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 dark:text-gray-300">
                Ainda não há artigos publicados.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {posts.map((post) => {
                const isAuthor =
                  !!user && !!post.author_id && post.author_id === user.id;
                const isCompleted =
                  !!post.is_completed && !isAuthor; // NUNCA mostrar completed ao autor

                const xpReward =
                  typeof post.xp_reward === 'number' ? post.xp_reward : 0;
                const readingMinutes =
                  typeof post.reading_time === 'number'
                    ? post.reading_time
                    : 5;

                const totalXp =
                  typeof post.total_xp_given === 'number'
                    ? post.total_xp_given
                    : 0;
                const registeredReaders =
                  typeof post.registered_readers_count === 'number'
                    ? post.registered_readers_count
                    : 0;

                return (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {post.category || 'General'}
                          </Badge>

                          {isAuthor && (
                            <Badge className="bg-amber-500 text-white flex items-center gap-1">
                              <PenSquare className="h-3 w-3" />
                              Creator
                            </Badge>
                          )}

                          {isCompleted && (
                            <Badge className="bg-green-600 text-white flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-xl">
                        {getTitle(post.title)}
                      </CardTitle>

                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {getExcerpt(post.excerpt)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {post.author || 'Admin'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {readingMinutes} min read
                        </span>
                        {typeof post.views === 'number' &&
                          post.views >= 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {post.views}
                            </span>
                          )}
                      </div>

                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                        <span>
                          XP por leitura:{' '}
                          <span className="font-semibold">
                            {xpReward} XP
                          </span>
                        </span>
                        <span>
                          XP distribuído até agora:{' '}
                          <span className="font-semibold">
                            {totalXp} XP
                          </span>
                        </span>
                        <span>
                          Leitores registados:{' '}
                          <span className="font-semibold">
                            {registeredReaders}
                          </span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
