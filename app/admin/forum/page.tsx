'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';

type TopicSummary = {
  id: string;
  title?: string | null;
  views?: number | null;
  room?: { name?: string | null };
};

type PostSummary = {
  id: string;
  content?: string | null;
  created_at?: string | null;
  topic?: { id: string; title?: string | null };
  author?: { username?: string | null };
};

type ForumSummary = {
  topicCount: number;
  postCount: number;
  roomCount: number;
  topTopics: TopicSummary[];
  recentPosts: PostSummary[];
};

const truncate = (value: string | undefined | null, length = 80) => {
  if (!value) return '—';
  return value.length > length ? `${value.slice(0, length)}...` : value;
};

export default function AdminForumPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [summary, setSummary] = useState<ForumSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, loading, router, isAdmin]);

  const fetchSummary = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/forum/summary', { headers });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setSummaryError(payload.error || 'Não foi possível carregar dados do fórum.');
        setSummary(null);
        return;
      }

      setSummary(payload.summary || null);
    } catch (error: any) {
      console.error('Erro carregando resumo do fórum:', error);
      setSummaryError(error?.message || 'Erro inesperado.');
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchSummary();
    }
  }, [isAdmin, fetchSummary]);

  const quickMetrics = useMemo(
    () => [
      { label: 'Threads totais', value: summary?.topicCount ?? 0 },
      { label: 'Posts registrados', value: summary?.postCount ?? 0 },
      { label: 'Salas monitoradas', value: summary?.roomCount ?? 0 },
    ],
    [summary],
  );

  const topTopics = summary?.topTopics ?? [];
  const recentPosts = summary?.recentPosts ?? [];

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-custom">
          <Loader2 className="h-5 w-5 animate-spin" />
          A carregar fórum...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <section className="mt-2 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl">
          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
            LEGACY Admin — Fórum
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-purple-300" />
            Forum Control Room
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Monitore tópicos ativos, priorize moderação e acompanhe os dados oficiais do fórum.
          </p>
          {summaryError && (
            <p className="mt-3 text-xs text-red-400">{summaryError}</p>
          )}
        </div>
      </section>

      <section>
        <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-purple-900/60 shadow-2xl mx-auto max-w-6xl">
          <CardHeader className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-100 border border-purple-500/40">
                Pulse
              </Badge>
              <CardTitle className="text-heading text-lg">
                Fórum com ritmo
              </CardTitle>
            </div>
            <p className="text-muted-custom text-sm max-w-3xl">
              Use métricas reais para priorizar threads, moderação e crescimento da comunidade.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push('/admin/forum')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Ver threads em destaque
              </Button>
              <Button
                className="flex-1 border border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
                onClick={() => router.push('/admin/forum')}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Ir para moderação
              </Button>
              <Button
                className="flex-1 border border-emerald-500 text-emerald-100 bg-emerald-950/50 hover:bg-emerald-900"
                onClick={() => router.push('/admin')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Comparar métricas gerais
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
              {loadingSummary ? (
                <div className="md:col-span-3 text-center text-sm text-muted-custom">
                  A carregar métricas do fórum...
                </div>
              ) : (
                quickMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                  >
                    <p className="text-[11px] uppercase text-muted-custom">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-semibold text-heading">
                      {metric.value.toLocaleString('pt-PT')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <Card className="bg-card-custom border-custom shadow-lg shadow-purple-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Top threads por views
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Baseado nos dados oficiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTopics.length === 0 ? (
              <p className="text-xs text-muted-custom">Sem dados disponíveis.</p>
            ) : (
              topTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between gap-3 border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60 text-sm"
                >
                  <div>
                    <p className="font-semibold text-heading">
                      {topic.title ?? 'Sem título'}
                    </p>
                    {topic.room?.name && (
                      <p className="text-[11px] text-muted-custom">
                        Sala: {topic.room.name}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-custom">
                    {topic.views?.toLocaleString('pt-PT') ?? '0'} views
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Atividade recente
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Últimos posts publicados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPosts.length === 0 ? (
              <p className="text-xs text-muted-custom">Sem atividade recente.</p>
            ) : (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-muted-custom uppercase tracking-wide">
                    <span>
                      {post.topic?.title ?? 'Sem tópico'} ·{' '}
                      {post.author?.username ? `@${post.author.username}` : '—'}
                    </span>
                    {post.created_at && (
                      <span>
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-body">
                    {truncate(post.content)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
