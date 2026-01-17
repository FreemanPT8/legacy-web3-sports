'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
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
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Lock,
  CheckCircle,
  Clock,
  PenSquare,
  Award,
} from 'lucide-react';
import { XP_REWARDS } from '@/lib/xp';
import { ContentTracker } from '@/components/ContentTracker';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { removeReadMoreMarker } from '@/lib/read-more';
import { renderGlossaryTokens } from '@/lib/glossary/tokens';
import { getAvailableLanguages } from '@/lib/language';
import type { Language } from '@/lib/i18n';
import type { LangCode } from '@/types/builder';
import { TranslationFallbackDialog } from '@/components/language/TranslationFallbackDialog';
import { GlossaryRichText } from '@/components/glossary/GlossaryRichText';
import { ContentComments } from '@/components/comments/ContentComments';

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang | string;
  excerpt: MultiLang | string;
  content: MultiLang | string;
  image_url?: string | null;
  category?: string | null;
  author?: string | null;
  author_id?: string | null;
  created_at?: string;
  views?: number | null;
  registered_views?: number | null;
  registered_readers_count?: number | null;
  total_xp_given?: number | null;

  registered_readers?: number | null;
  total_xp_distributed?: number | null;

  registered_only?: boolean | null;
  xp_reward?: number | null;
  reading_time?: number | null;
  seo?: {
    imageSettings?: {
      zoom: number;
      offsetY: number;
    };
    [key: string]: unknown;
  };
};

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
  const { language, setLanguage, setLanguageUnsafe } = useLanguage();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [dismissedLanguage, setDismissedLanguage] = useState<Language | null>(null);

  const id = params.id as string;

  useEffect(() => {
    const fetchPost = async () => {
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
        } else {
          setPost(data.post);
          setNotFound(false);
          setIsCompleted(!!data.isCompleted);
          setIsAuthor(!!data.isAuthor);
        }
      } catch (error) {
        console.error('Error loading public blog post:', error);
        setNotFound(true);
        setPost(null);
        setIsCompleted(false);
        setIsAuthor(false);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    }
  }, [id, getToken]);

  useEffect(() => {
    setDismissedLanguage(null);
  }, [post?.id]);

  const normalizeRecord = (
    value: MultiLang | string | null | undefined,
  ): Partial<Record<LangCode, string>> | null => {
    if (!value || typeof value === 'string') return null;
    return value as Partial<Record<LangCode, string>>;
  };

  const availableLanguages = useMemo(() => {
    if (!post) return [];
    return getAvailableLanguages(
      normalizeRecord(post.title),
      normalizeRecord(post.excerpt),
      normalizeRecord(post.content),
    );
  }, [post]);

  const missingCurrentLanguage = Boolean(
    post &&
      availableLanguages.length > 0 &&
      !availableLanguages.some((lang) => lang.code === language),
  );

  const showLanguageDialog =
    Boolean(post) &&
    missingCurrentLanguage &&
    dismissedLanguage !== language;

  const pickTranslation = (
    field: MultiLang | string,
    fallback: string,
  ) => {
    if (typeof field === 'string') {
      return field || fallback;
    }
    const preferenceOrder: Language[] = [
      language,
      'pt',
      'en',
      'es',
      'fr',
      'it',
      'de',
    ];
    for (const code of preferenceOrder) {
      const value = field[code];
      if (typeof value === 'string' && value.trim().length) {
        return value;
      }
    }
    const firstValue = Object.values(field).find(
      (value) => typeof value === 'string' && value.trim().length,
    );
    return firstValue || fallback;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto" />
            <p className="mt-4 text-slate-300">
              A carregar artigo...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4 max-w-md">
            <h1 className="text-2xl font-semibold mb-2 text-white">
              Artigo não encontrado
            </h1>
            <p className="text-slate-200 mb-4 text-sm">
              O artigo que procuras não existe, não está publicado ou deixou de
              estar disponível.
            </p>
            <button
              onClick={() => router.push('/blog')}
              className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao blog
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

  const htmlContent = renderGlossaryTokens(
    removeReadMoreMarker(pickTranslation(post.content, '')),
  );
  const xpRewardRaw = normalizeXpReward(post.xp_reward);
  const xpReward = Math.max(xpRewardRaw, XP_REWARDS.BLOG_MIN);
  const estimatedMinutes =
    typeof post.reading_time === 'number' ? post.reading_time : 5;

  const creatorName = post.author || 'Admin';
  const registeredReaders =
    typeof post.registered_readers === 'number'
      ? post.registered_readers
      : post.registered_readers_count || 0;
  const totalXpDistributed =
    typeof post.total_xp_distributed === 'number'
      ? post.total_xp_distributed
      : post.total_xp_given || 0;

  const completedForReader = isCompleted && !isAuthor;

  const handleTrackerCompletion = (alreadyCompleted: boolean) => {
    setIsCompleted(true);
    if (alreadyCompleted) return;
    setPost((prev) => {
      if (!prev) return prev;
      const currentRegistered =
        typeof prev.registered_readers === 'number'
          ? prev.registered_readers
          : prev.registered_readers_count || 0;
      const currentXp =
        typeof prev.total_xp_distributed === 'number'
          ? prev.total_xp_distributed
          : prev.total_xp_given || 0;

      return {
        ...prev,
        registered_readers: currentRegistered + 1,
        registered_readers_count: currentRegistered + 1,
        total_xp_distributed: currentXp + xpReward,
        total_xp_given: currentXp + xpReward,
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push('/blog')}
              className="mb-4 inline-flex items-center text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao blog
            </button>

            {post.image_url && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#04131b]/80">
                <div className="relative w-full pb-[56.25%]">
                  <Image
                    src={post.image_url}
                    alt={pickTranslation(post.title, 'Blog cover')}
                    fill
                    className="object-cover object-center transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 768px"
                    priority
                    style={{
                      transform: `scale(${
                        post.seo?.imageSettings?.zoom ?? 1
                      })`,
                      objectPosition: `center ${
                        post.seo?.imageSettings?.offsetY ?? 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Header do artigo */}
            <Card className="mb-4 border border-white/10 bg-[#04131b]/80">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-white/20 bg-[#000c12]/40 text-slate-200"
                    >
                      {post.category || 'General'}
                    </Badge>

                    {isAuthor ? (
                      <Badge className="bg-purple-600 text-white flex items-center gap-1">
                        <PenSquare className="h-3 w-3" />
                        Creator
                      </Badge>
                    ) : completedForReader ? (
                      <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    ) : null}
                  </div>

                  {post.registered_only && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Lock className="h-3 w-3" />
                      Apenas membros registados
                    </span>
                  )}
                </div>

                <CardTitle className="text-3xl text-white">
                  {pickTranslation(post.title, 'Untitled post')}
                </CardTitle>
                {post.excerpt && (
                  <div
                    className="text-slate-200 text-base mt-3 prose prose-invert prose-p:text-slate-200 max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: pickTranslation(post.excerpt, ''),
                    }}
                  />
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-cyan-300" />
                    <span>{creatorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-cyan-300" />
                    <span>
                      {post.created_at
                        ? new Date(post.created_at).toLocaleDateString(
                            'pt-PT',
                          )
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cyan-300" />
                    <span>{estimatedMinutes} min read</span>
                  </div>
                  {typeof post.views === 'number' &&
                    post.views >= 0 && (
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-cyan-300" />
                        <span>{post.views}</span>
                      </div>
                    )}
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-sky-400" />
                    <span>{xpReward} XP por leitura</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meta info: stats de XP e leitores */}
            <Card className="mb-6 border border-white/10 bg-[#04131b]/80">
              <CardContent className="py-4 text-sm text-slate-300">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <span className="block text-[11px] uppercase text-slate-400 mb-1">
                      Leituras totais
                    </span>
                    <span className="font-semibold text-white flex items-center gap-2">
                      <Eye className="h-4 w-4 text-cyan-300" />
                      {typeof post.views === 'number' ? post.views : 0}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase text-slate-400 mb-1">
                      Leitores registados
                    </span>
                    <span className="font-semibold text-white">
                      {registeredReaders}
                    </span>
                  </div>
                  {user && (
                    <div>
                      <span className="block text-[11px] uppercase text-slate-400 mb-1">
                        XP distribuido
                      </span>
                      <span className="font-semibold text-white">
                        {totalXpDistributed} XP
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[11px] uppercase text-slate-400 mb-1">
                      Categoria
                    </span>
                    <span className="text-slate-200">
                      {post.category || 'General'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo + ContentTracker */}
            <Card className="mb-6 border border-white/10 bg-[#04131b]/80">
              <CardContent className="prose prose-invert prose-headings:text-white prose-p:text-slate-200 prose-strong:text-white max-w-none py-8">
                {!isAuthor ? (
                  <ContentTracker
                    userId={user?.id ?? null}
                    contentId={post.id}
                    contentType="blog"
                    xpReward={xpReward}
                    estimatedMinutes={estimatedMinutes}
                    initialCompleted={completedForReader}
                    isAuthor={isAuthor}
                    onComplete={handleTrackerCompletion}
                  >
                    <GlossaryRichText html={htmlContent} />
                  </ContentTracker>
                ) : (
                  <GlossaryRichText html={htmlContent} />
                )}
              </CardContent>
            </Card>

            {/* Mensagem de conclusão para leitores (nunca para criador) */}
            {completedForReader && (
              <Card className="mb-6 bg-emerald-950/60 border border-emerald-700/80">
                <CardContent className="py-6 text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1 text-white">
                    Artigo concluído!
                  </h3>
                  <p className="text-sm text-emerald-100/90">
                    Ganhaste {xpReward} XP por leres este artigo (apenas da
                    primeira vez).
                  </p>
                </CardContent>
              </Card>
            )}

            {post && (
              <ContentComments
                contentId={post.id}
                contentType="blog_post"
                title="Comentários privados deste artigo"
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
      {post && (
        <TranslationFallbackDialog
          open={showLanguageDialog}
          context="blog"
          currentLanguage={language}
          availableLanguages={availableLanguages}
          onSelectLanguage={(next) => {
            setLanguageUnsafe?.(next);
            setDismissedLanguage(null);
          }}
          onBack={() => {
            router.push('/blog');
            setDismissedLanguage(language);
          }}
          onClose={() => setDismissedLanguage(language)}
        />
      )}
    </div>
  );
}

