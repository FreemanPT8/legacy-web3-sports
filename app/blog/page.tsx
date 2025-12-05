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

  xp_reward?: number | null;
  reading_time?: number | null;
  total_xp_given?: number | null;
  registered_readers_count?: number | null;

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
    return d.toLocaleDateString('pt-PT');
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <Header />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          {/* HERO / HEADER DO BLOG */}
          <section className="max-w-6xl mx-auto mb-10">
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 px-6 py-8 md:px-10 md:py-10 shadow-[0_0_60px_rgba(56,189,248,0.18)]">
              <div className="space-y-4 md:space-y-5">
                <div className="inline-flex items-center rounded-full border border-sky-400/40 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                  Blog · Web3 · Desporto · Apertum
                </div>

                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Artigos que ligam Web3, desporto e a Apertum — sem bullshit.
                </h1>

                <p className="text-sm md:text-base text-slate-200 max-w-2xl">
                  Aqui encontras explicações diretas sobre blockchain, a Apertum
                  e o impacto real no desporto. Sem hype vazio, sem jargão
                  técnico — apenas contexto, exemplos e caminhos que podes
                  aplicar.
                </p>

                {user ? (
                  <p className="text-[12px] text-sky-100/80">
                    Estás autenticado como{' '}
                    <span className="font-semibold">
                      @{user.username ?? 'member'}
                    </span>
                    . Leituras completas dão-te XP e entram para o teu histórico
                    de aprendizagem.
                  </p>
                ) : (
                  <p className="text-[12px] text-sky-100/80">
                    Cria uma conta gratuita para acumular XP ao leres artigos,
                    guardar favoritos e acompanhar o teu progresso dentro do
                    ecossistema LEGACY.
                  </p>
                )}

                {/* Stats globais */}
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <Card className="border-slate-700/80 bg-slate-900/80">
                    <CardContent className="py-4">
                      <div className="text-[11px] uppercase text-slate-400 mb-1">
                        Artigos publicados
                      </div>
                      <div className="text-2xl font-bold text-sky-400">
                        {globalStats.totalArticles}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-emerald-600/50 bg-emerald-950/40">
                    <CardContent className="py-4">
                      <div className="text-[11px] uppercase text-emerald-200/80 mb-1">
                        XP disponível para ganhar
                      </div>
                      <div className="text-2xl font-bold text-emerald-300 flex items-center gap-1">
                        <Award className="h-5 w-5" />
                        {globalStats.totalXpAvailable}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-indigo-600/50 bg-indigo-950/40">
                    <CardContent className="py-4">
                      <div className="text-[11px] uppercase text-indigo-200/80 mb-1">
                        Leituras registadas
                      </div>
                      <div className="text-2xl font-bold text-indigo-300">
                        {globalStats.totalRegisteredReaders}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* LISTA DE POSTS */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto" />
                <p className="mt-4 text-slate-300">
                  A carregar artigos...
                </p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 max-w-xl mx-auto">
              <p className="text-slate-300">
                Ainda não há artigos publicados. Em breve vais ver aqui
                explicações, análises e frameworks sobre Web3 e desporto.
              </p>
            </div>
          ) : (
            <section className="max-w-6xl mx-auto grid md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    className="flex flex-col bg-slate-900/80 border border-slate-800 hover:border-sky-500/70 hover:shadow-[0_0_40px_rgba(56,189,248,0.20)] transition-all cursor-pointer"
                    onClick={() => router.push(`/blog/${post.id}`)}
                  >
                    <CardHeader className="space-y-3">
                      {/* Badges topo */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-600 text-slate-200">
                            {post.category || 'General'}
                          </Badge>

                          {isAuthor && (
                            <Badge className="bg-amber-500 text-white flex items-center gap-1">
                              <PenSquare className="h-3 w-3" />
                              Creator
                            </Badge>
                          )}

                          {isCompleted && (
                            <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Título + excerpt */}
                      <CardTitle className="text-lg md:text-xl line-clamp-2 text-slate-50">
                        {title}
                      </CardTitle>
                      <p className="text-sm text-slate-300 line-clamp-3">
                        {excerpt}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col justify-between space-y-3 pb-5">
                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-1">
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
                      <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap gap-3">
                        <span>
                          XP por leitura:{' '}
                          <span className="font-semibold text-slate-100">
                            {xpReward} XP
                          </span>
                        </span>
                        <span>
                          XP distribuído:{' '}
                          <span className="font-semibold text-slate-100">
                            {totalXp} XP
                          </span>
                        </span>
                        <span>
                          Leitores registados:{' '}
                          <span className="font-semibold text-slate-100">
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
