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
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';
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
  seo?: {
    imageSettings?: {
      zoom: number;
      offsetY: number;
    };
    [key: string]: unknown;
  };
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
    imageSettings: { zoom: number; offsetY: number };
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
    const baseText =
      preview && preview.trim().length > 0
        ? preview
        : typeof excerpt === 'string'
        ? excerpt
        : getMultilingualContent(excerpt, language);
    return splitReadMore(baseText || '');
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
    <div className="min-h-screen bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] text-white">
      <Header />

      <main className="space-y-16">
        {/* HERO / HEADER DO BLOG */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <HeroSection className="px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)] md:px-10">
              <HeroTextColumn className="space-y-6">
                <HeroEyebrow className="text-cyan-200">
                  Blog · Web3 · Desporto · Apertum
                </HeroEyebrow>
                <div className="space-y-3">
                  <HeroTitle className="text-3xl md:text-4xl tracking-tight">
                    Artigos que ligam Web3, desporto e Apertum – sem bullshit.
                  </HeroTitle>
                  <HeroDescription className="max-w-2xl text-slate-100">
                    Aqui encontras explicações diretas sobre blockchain, Apertum e o impacto real no desporto. Sem hype vazio, sem jargão técnico – apenas contexto, exemplos e caminhos que podes aplicar na prática.
                  </HeroDescription>
                </div>

                {user ? (
                  <p className="text-[12px] text-slate-100">
                    Estás autenticado como{' '}
                    <span className="font-semibold text-white">
                      @{user.username ?? 'member'}
                    </span>
                    . Leituras completas dão-te XP e entram para o teu histórico
                    de aprendizagem.
                  </p>
                ) : (
                  <p className="text-[12px] text-slate-100">
                    Cria uma conta gratuita para acumular XP ao leres artigos,
                    guardar favoritos e acompanhar o teu progresso dentro do
                    ecossistema LEGACY.
                  </p>
                )}

                {/* Stats globais */}
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <Card className="border border-white/10 bg-[#04131b]/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    <CardContent className="py-4">
                      <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                        Artigos publicados
                      </div>
                      <div className="text-2xl font-bold text-[#5af3ff]">
                        {globalStats.totalArticles}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-white/10 bg-[#04131b]/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    <CardContent className="py-4">
                      <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                        XP disponível em artigos
                      </div>
                      <div className="flex items-baseline gap-1 text-2xl font-bold text-[#5af3ff]">
                        <Award className="h-5 w-5 text-[#fdd87c]" />
                        <span>{globalStats.totalXpAvailable}</span>
                        <span className="text-xs font-normal text-slate-300">
                          XP
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-white/10 bg-[#04131b]/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    <CardContent className="py-4">
                      <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                        Leituras registadas
                      </div>
                      <div className="text-2xl font-bold text-[#5af3ff]">
                        {globalStats.totalRegisteredReaders}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </HeroTextColumn>
            </HeroSection>
          </div>
        </section>

        {/* LISTA DE POSTS */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            {loading ? (
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#04131b]/80 px-6 py-16 text-center shadow-[0_30px_65px_rgba(3,10,25,0.55)]">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-10 -left-8 h-48 w-48 rounded-full bg-[#5af3ff]/10 blur-3xl" />
                  <div className="absolute -bottom-12 -right-6 h-56 w-56 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                </div>
                <div className="relative flex flex-col items-center gap-4 text-slate-200">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-400" />
                  <p className="text-sm text-slate-200">
                    A carregar artigos...
                  </p>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-16 text-center shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-16 -right-12 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
                  <div className="absolute -bottom-16 -left-12 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                </div>
                <div className="relative mx-auto max-w-xl space-y-4">
                  <p className="text-sm text-slate-100">
                    Ainda não há artigos publicados. Em breve vais ver aqui
                    explicações, análises e frameworks sobre Web3, desporto e o
                    ecossistema Apertum.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#020c18] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
                  <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
                </div>
                <div className="relative grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                  const imageSettings =
                    post.seo?.imageSettings ?? { zoom: 1, offsetY: 0 };
                  const initials = title
                    .split(' ')
                    .map((word) => word[0] || '')
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <Card
                      key={post.id}
                      className="flex cursor-pointer flex-col border border-white/10 bg-[#04131b] shadow-[0_30px_65px_rgba(3,10,25,0.55)] transition hover:-translate-y-1 hover:border-cyan-400/70 hover:shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                      onClick={() => router.push(`/blog/${post.id}`)}
                    >
                      {imageUrl ? (
                        <div className="h-40 w-full overflow-hidden rounded-t-[24px]">
                          <Image
                            src={imageUrl}
                            alt={title}
                            width={640}
                            height={240}
                            className="h-full w-full object-cover transition-transform duration-300"
                            unoptimized
                            style={{
                              transform: `scale(${imageSettings.zoom})`,
                              objectPosition: `center ${imageSettings.offsetY}%`,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded-t-[24px] bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]">
                          <div className="text-xl uppercase tracking-[0.4em] text-[#5af3ff]">
                            {initials}
                          </div>
                        </div>
                      )}

                      <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-[#fdd87c]/40 bg-[#fdd87c]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#fdd87c]"
                            >
                              {post.category || 'Geral'}
                            </Badge>
                            {isAuthor && (
                              <Badge className="flex items-center gap-1 border border-white/15 bg-[#14718f] text-[11px] text-white">
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
                            <span className="rounded-full border border-[#fdd87c]/40 bg-[#fdd87c]/10 px-3 py-1 text-[11px] font-semibold text-[#fdd87c]">
                              +{xpReward} XP
                            </span>
                          )}
                        </div>

                        <CardTitle className="line-clamp-2 text-base font-semibold text-white">
                          {title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col justify-between space-y-4 pb-5">
                        <p className="line-clamp-3 text-sm text-slate-200">
                          {excerptToShow}
                        </p>

                        <div className="flex items-center justify-between">
                          {hasReadMore && (
                            <span className="inline-flex text-xs font-semibold uppercase tracking-[0.3em] text-[#fdd87c]">
                              Continuar a ler
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-semibold text-[#5af3ff] hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation();
                                setPreviewPost({
                                  post,
                                  content: resolvedFullExcerpt,
                                  title,
                                  imageUrl: imageUrl,
                                  imageSettings,
                                });
                              }}
                            >
                            Ver mais
                          </Button>
                        </div>

                        <div className="mt-2 space-y-2 text-[11px] text-slate-300">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 pb-2">
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
                              <span className="inline-flex items-center gap-1 text-[#fdd87c]">
                                <Award className="h-3 w-3 text-[#fdd87c]" />
                                {xpReward} XP disponível
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3 text-cyan-300" />
                              {post.views ?? 0} views
                            </span>
                            {totalXp > 0 && (
                              <span className="inline-flex items-center gap-1 text-cyan-200">
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
            </div>
          )}
          </div>
        </section>
      </main>

      {previewPost && (
        <Dialog
          open={!!previewPost}
          onOpenChange={(open) => !open && setPreviewPost(null)}
        >
          <DialogContent className="max-w-2xl border border-white/10 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#021c27] text-white shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-[#fdd87c]">
                {previewPost.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {previewPost.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/5 shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
                  <Image
                    src={previewPost.imageUrl}
                    alt={previewPost.title}
                    width={800}
                    height={360}
                    className="h-[220px] w-full object-cover transition-transform duration-300"
                    unoptimized
                    style={{
                      transform: `scale(${previewPost.imageSettings.zoom})`,
                      objectPosition: `center ${previewPost.imageSettings.offsetY}%`,
                    }}
                  />
                </div>
              )}
              <div className="space-y-2 rounded-2xl border border-white/10 bg-[#04131b] p-4 text-sm text-slate-100">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
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
                  className="prose prose-invert max-w-none text-slate-100"
                  dangerouslySetInnerHTML={{
                    __html:
                      previewPost.content ||
                      'Ainda sem descrição detalhada para este artigo.',
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="text-sm font-semibold text-[#5af3ff] hover:text-white"
                  onClick={() => setPreviewPost(null)}
                >
                  Voltar atrás
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  onClick={() => {
                    if (previewPost?.post?.id) {
                      router.push(`/blog/${previewPost.post.id}`);
                      setPreviewPost(null);
                    }
                  }}
                >
                  Ver blog post
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}
