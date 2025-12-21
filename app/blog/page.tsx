'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { splitReadMore } from '@/lib/read-more';
import { getMultilingualContent } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const normalizeXpReward = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.xp_reward !== undefined) {
      return normalizeXpReward(obj.xp_reward);
    }
    if (obj.reward !== undefined) {
      return normalizeXpReward(obj.reward);
    }
  }
  return 0;
};

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  excerpt_preview?: string | null;
  excerpt_has_read_more?: boolean;
  image_url?: string | null;
  category?: string | null;
  author?: string | null;
  author_id?: string | null;
  created_at?: string;
  views?: number | null;

  xp_reward?: number | null;
  reading_time?: number | null;

  // campos antigos possíveis
  total_xp_given?: number | null;
  registered_readers_count?: number | null;

  // campos novos vindos da API
  registered_readers?: number | null;
  total_xp_distributed?: number | null;

  is_completed?: boolean | null;
};

export default function BlogPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const { language } = useLanguage();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState<{
    post: BlogPost;
    content: string;
    title: string;
    imageUrl: string | null;
  } | null>(null);

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
    typeof title === 'string' ? title : getMultilingualContent(title, language);

  const resolveExcerpt = (excerpt: MultiLang | string, preview?: string) => {
    const text =
      preview ??
      (typeof excerpt === 'string'
        ? excerpt
        : getMultilingualContent(excerpt, language));
    return splitReadMore(text);
  };

  const stripHtml = (value?: string) =>
    value ? value.replace(/<[^>]*>/g, '').trim() : '';

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-PT');
  };

  // estatísticas globais para o header (XP total em jogo, número de artigos, etc.)
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
      const xp = normalizeXpReward(p.xp_reward);
      return sum + xp;
    }, 0);

    const totalRegisteredReaders = posts.reduce((sum, p) => {
      const readers =
        typeof p.registered_readers === 'number'
          ? p.registered_readers
          : typeof p.registered_readers_count === 'number'
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
    <div className="min-h-screen bg-[#000c12] text-white">
      <Header />

      <main className="space-y-16">
        {/* HERO / HEADER DO BLOG */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-white/10 bg-[#05212b] px-6 py-8 shadow-[0_0_60px_rgba(34,211,238,0.20)] md:px-10 md:py-10">
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                  Blog · Web3 · Desporto · Apertum
                </p>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Artigos que ligam Web3, desporto e Apertum — sem bullshit.
                  </h1>
                  <p className="max-w-2xl text-sm text-slate-300">
                    Aqui encontras explicações diretas sobre blockchain, Apertum
                    e o impacto real no desporto. Sem hype vazio, sem jargão
                    técnico — apenas contexto, exemplos e caminhos que podes
                    aplicar na prática.
                  </p>
                </div>

                {user ? (
                  <p className="text-[12px] text-slate-300">
                    Estás autenticado como{' '}
                    <span className="font-semibold text-white">
                      @{user.username ?? 'member'}
                    </span>
                    . Leituras completas dão-te XP e entram para o teu histórico
                    de aprendizagem.
                  </p>
                ) : (
                  <p className="text-[12px] text-slate-300">
                    Cria uma conta gratuita para acumular XP ao leres artigos,
                    guardar favoritos e acompanhar o teu progresso dentro do
                    ecossistema LEGACY.
                  </p>
                )}

                {/* Stats globais */}
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <Card className="border border-white/10 bg-[#000c12]">
                    <CardContent className="py-4">
                      <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        Artigos publicados
                      </div>
                      <div className="text-2xl font-bold text-cyan-300">
                        {globalStats.totalArticles}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-white/10 bg-[#000c12]">
                    <CardContent className="py-4">
                      <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        XP disponível em artigos
                      </div>
                      <div className="flex items-baseline gap-1 text-2xl font-bold text-cyan-300">
                        <Award className="h-5 w-5 text-cyan-300" />
                        <span>{globalStats.totalXpAvailable}</span>
                        <span className="text-xs font-normal text-slate-300">
                          XP
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-white/10 bg-[#000c12]">
                    <CardContent className="py-4">
                      <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        Leituras registadas
                      </div>
                      <div className="text-2xl font-bold text-cyan-200">
                        {globalStats.totalRegisteredReaders}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LISTA DE POSTS */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-400" />
                  <p className="mt-4 text-sm text-slate-300">
                    A carregar artigos...
                  </p>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="mx-auto max-w-xl py-16 text-center">
                <p className="text-sm text-slate-200">
                  Ainda não há artigos publicados. Em breve vais ver aqui
                  explicações, análises e frameworks sobre Web3, desporto e o
                  ecossistema Apertum.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {posts.map((post) => {
                  const title = resolveTitle(post.title);
                  const {
                    before: excerptPreview,
                    after: excerptAfter,
                    hasReadMore,
                  } = resolveExcerpt(
                    post.excerpt,
                    post.excerpt_preview ?? undefined,
                  );
                  const fallbackExcerpt =
                    'Ainda sem descrição detalhada para este artigo.';
                  const normalizedExcerpt =
                    stripHtml(excerptPreview).length > 0
                      ? excerptPreview
                      : fallbackExcerpt;
                  const fullExcerpt = `${excerptPreview}${excerptAfter}`;
                  const resolvedFullExcerpt =
                    stripHtml(fullExcerpt).length > 0
                      ? fullExcerpt
                      : normalizedExcerpt;
                  const plainExcerpt = stripHtml(resolvedFullExcerpt);
                  const excerptToShow =
                    plainExcerpt.length > 0 ? plainExcerpt : fallbackExcerpt;

                  const xpReward = normalizeXpReward(post.xp_reward);

                  const readingMinutes =
                    typeof post.reading_time === 'number'
                      ? post.reading_time
                      : 5;

                  const totalXp =
                    typeof post.total_xp_distributed === 'number'
                      ? post.total_xp_distributed
                      : typeof post.total_xp_given === 'number'
                      ? post.total_xp_given
                      : 0;

                  const registeredReaders =
                    typeof post.registered_readers === 'number'
                      ? post.registered_readers
                      : typeof post.registered_readers_count === 'number'
                      ? post.registered_readers_count
                      : 0;

                  const isAuthor =
                    !!user && !!post.author_id && post.author_id === user.id;

                  const isCompleted = !!post.is_completed && !isAuthor;

                  const imageUrl = post.image_url || null;
                  const initials = title
                    .split(' ')
                    .map((word) => word[0] || '')
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <Card
                      key={post.id}
                      className="flex cursor-pointer flex-col border border-white/10 bg-[#000c12] transition hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(34,211,238,0.30)]"
                      onClick={() => router.push(`/blog/${post.id}`)}
                    >
                      {imageUrl ? (
                        <div className="h-40 w-full overflow-hidden rounded-t-[24px]">
                          <Image
                            src={imageUrl}
                            alt={title}
                            width={640}
                            height={240}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded-t-[24px] bg-gradient-to-br from-slate-800 via-slate-900 to-black">
                          <div className="text-xl uppercase tracking-[0.4em] text-white">
                            {initials}
                          </div>
                        </div>
                      )}

                      <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-white/30 bg-[#000c12] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100"
                            >
                              {post.category || 'Geral'}
                            </Badge>
                            {isAuthor && (
                              <Badge className="flex items-center gap-1 bg-amber-500 text-[11px] text-white">
                                <PenSquare className="h-3 w-3" />
                                Autor
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="flex items-center gap-1 bg-emerald-500/90 text-[11px] text-white">
                                <CheckCircle2 className="h-3 w-3" />
                                Lido
                              </Badge>
                            )}
                          </div>
                          {xpReward > 0 && (
                            <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                              +{xpReward} XP
                            </span>
                          )}
                        </div>

                        <CardTitle className="line-clamp-2 text-base font-semibold text-white">
                          {title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col justify-between space-y-4 pb-5">
                        <p className="line-clamp-3 text-sm text-slate-300">
                          {excerptToShow}
                        </p>

                        <div className="flex items-center justify-between">
                          {hasReadMore && (
                            <span className="inline-flex text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                              Continuar a ler
                            </span>
                          )}
                          {(hasReadMore ||
                            stripHtml(resolvedFullExcerpt).length >
                              stripHtml(normalizedExcerpt).length) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-cyan-200 hover:text-cyan-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPreviewPost({
                                  post,
                                  content: resolvedFullExcerpt,
                                  title,
                                  imageUrl: imageUrl,
                                });
                              }}
                            >
                              Ver mais
                            </Button>
                          )}
                        </div>

                        <div className="mt-2 space-y-2 text-[11px] text-slate-400">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/5 pb-2">
                            {post.author && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3 text-cyan-300" />
                                {post.author}
                              </span>
                            )}
                            {post.created_at && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-cyan-300" />
                                {formatDate(post.created_at)}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-cyan-300" />
                              {readingMinutes} min
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            {xpReward > 0 && (
                              <span className="inline-flex items-center gap-1 text-cyan-200">
                                <Award className="h-3 w-3 text-cyan-300" />
                                {xpReward} XP disponível
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3 text-cyan-300" />
                              {post.views ?? 0} views
                            </span>
                            {totalXp > 0 && (
                              <span className="inline-flex items-center gap-1 text-slate-300">
                                <Award className="h-3 w-3 text-cyan-300" />
                                {totalXp} XP já distribuído
                              </span>
                            )}
                            {registeredReaders > 0 && (
                              <span className="text-[10px] text-slate-300">
                                {registeredReaders} leituras
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {previewPost && (
        <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
          <DialogContent className="max-w-2xl border border-white/10 bg-[#000c12] text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                {previewPost.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {previewPost.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/5">
                  <Image
                    src={previewPost.imageUrl}
                    alt={previewPost.title}
                    width={800}
                    height={360}
                    className="h-[220px] w-full object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="space-y-2 rounded-2xl border border-white/10 bg-[#051620] p-4 text-sm text-slate-300">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {previewPost.post.author && (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3 text-cyan-300" />
                      {previewPost.post.author}
                    </span>
                  )}
                  {previewPost.post.created_at && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-cyan-300" />
                      {formatDate(previewPost.post.created_at)}
                    </span>
                  )}
                  {typeof previewPost.post.reading_time === 'number' && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-cyan-300" />
                      {previewPost.post.reading_time} min
                    </span>
                  )}
                </div>
                <div
                  className="prose prose-invert max-w-none text-slate-200"
                  dangerouslySetInnerHTML={{
                    __html:
                      previewPost.content ||
                      'Ainda sem descrição detalhada para este artigo.',
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}
