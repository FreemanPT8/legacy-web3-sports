'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMultilingualContent } from '@/lib/i18n';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Calendar,
  User,
  Eye,
  Clock,
  CheckCircle2,
  PenSquare,
  Award,
} from 'lucide-react';

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

  // métricas de XP / leitores (vindas da tabela, se existirem)
  xp_reward?: number | null;
  reading_time?: number | null;
  total_xp_given?: number | null;
  registered_readers_count?: number | null;

  // flag calculada no /api/blog para o utilizador atual
  is_completed?: boolean | null;
};

export default function BlogPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language } = useLanguage();

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

  // helpers multilíngua
  const resolveTitle = (title: MultiLang | string) =>
    typeof title === 'string'
      ? title
      : getMultilingualContent(title, language);

  const resolveExcerpt = (excerpt: MultiLang | string) =>
    typeof excerpt === 'string'
      ? excerpt
      : getMultilingualContent(excerpt, language);

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  };

  // estatísticas globais para o header (XP total em jogo, nº artigos, etc.)
  const globalStats = useMemo(() => {
    if (!posts.length) {
      return {
        totalArticles: 0,
        totalXpAvailable: 0,
        totalRegisteredReaders: 0,
      };
    }

    const totalArticles = posts.length;
    const totalXpAvailable = posts.reduce((sum, p) => {
      const xp = typeof p.xp_reward === 'number' ? p.xp_reward : 0;
      return sum + xp;
    }, 0);

    const totalRegisteredReaders = posts.reduce((sum, p) => {
      const readers =
        typeof p.registered_readers_count === 'number'
          ? p.registered_readers_count
          : 0;
      return sum + readers;
    }, 0);

    return {
      totalArticles,
      totalXpAvailable,
      totalRegisteredReaders,
    };
  }, [posts]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-10">
        <div className="container mx-auto px-4">
          {/* HERO / HEADER DO BLOG */}
          <section className="max-w-4xl mx-auto mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Blog
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
              Artigos para te ajudar a perceber o universo Web3, a
              blockchain Apertum e a integração com o desporto, sem
              bullshit, sem hype, só conteúdo prático.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Card className="border-blue-100 bg-blue-50/60">
                <CardContent className="py-4">
                  <div className="text-xs uppercase text-gray-500 mb-1">
                    Artigos publicados
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {globalStats.totalArticles}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-100 bg-emerald-50/60">
                <CardContent className="py-4">
                  <div className="text-xs uppercase text-gray-500 mb-1">
                    XP disponível para ganhar
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 flex items-center gap-1">
                    <Award className="h-5 w-5" />
                    {globalStats.totalXpAvailable}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-indigo-100 bg-indigo-50/60">
                <CardContent className="py-4">
                  <div className="text-xs uppercase text-gray-500 mb-1">
                    Leituras registadas
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">
                    {globalStats.totalRegisteredReaders}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* LISTA DE POSTS */}
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
            <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {posts.map((post) => {
                const title = resolveTitle(post.title);
                const excerpt = resolveExcerpt(post.excerpt);

                const xpReward =
                  typeof post.xp_reward === 'number'
                    ? post.xp_reward
                    : 0;

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

                const isAuthor =
                  !!user && !!post.author_id && post.author_id === user.id;

                const isCompleted =
                  !!post.is_completed && !isAuthor; // nunca mostrar completed ao autor

                return (
                  <Card
                    key={post.id}
                    className="flex flex-col hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    <CardHeader className="space-y-3">
                      {/* Badges topo */}
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

                      {/* Título + excerpt */}
                      <CardTitle className="text-xl line-clamp-2">
                        {title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {excerpt}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col justify-between space-y-3">
                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-1">
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
                        {typeof post.views === 'number' && post.views >= 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.views}
                          </span>
                        )}
                      </div>

                      {/* Estatísticas de XP */}
                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                        <span>
                          XP por leitura:{' '}
                          <span className="font-semibold">
                            {xpReward} XP
                          </span>
                        </span>
                        <span>
                          XP distribuído:{' '}
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
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
