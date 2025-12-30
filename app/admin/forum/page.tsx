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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          A carregar fórum...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full space-y-8 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] px-4 py-6 md:px-8">
      <section className="mt-2 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-4 py-6 md:px-6 md:py-8 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl">
          <span className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-200">
            LEGACY Admin — Fórum
          </span>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-[#fdd87c] md:text-4xl">
            <MessageCircle className="h-7 w-7 text-purple-300" />
            Forum Control Room
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-100 md:text-base">
            Monitore tópicos ativos, priorize moderação e acompanhe os dados oficiais do fórum.
          </p>
          {summaryError && (
            <p className="mt-3 text-xs text-red-400">{summaryError}</p>
          )}
        </div>
      </section>

      <section>
        <Card className="mx-auto max-w-6xl border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
          <CardHeader className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-cyan-400/40 bg-cyan-400/10 text-cyan-100">
                Pulse
              </Badge>
              <CardTitle className="text-lg text-[#fdd87c]">
                Fórum com ritmo
              </CardTitle>
            </div>
            <p className="max-w-3xl text-sm text-slate-200">
              Use métricas reais para priorizar threads, moderação e crescimento da comunidade.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                onClick={() => router.push('/admin/forum')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Ver threads em destaque
              </Button>
              <Button
                className="flex-1 border border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => router.push('/admin/forum')}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Ir para moderação
              </Button>
              <Button
                className="flex-1 border border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => router.push('/admin')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Comparar métricas gerais
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
              {loadingSummary ? (
                <div className="md:col-span-3 text-center text-sm text-slate-300">
                  A carregar métricas do fórum...
                </div>
              ) : (
                quickMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-white/10 bg-[#021824]/80 p-3 text-slate-200"
                  >
                    <p className="text-[11px] uppercase text-slate-300">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-semibold text-[#fdd87c]">
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
        <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#fdd87c]">
              Top threads por views
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Baseado nos dados oficiais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTopics.length === 0 ? (
              <p className="text-xs text-slate-300">Sem dados disponíveis.</p>
            ) : (
              topTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#021824]/80 px-3 py-2 text-sm shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {topic.title ?? 'Sem título'}
                    </p>
                    {topic.room?.name && (
                      <p className="text-[11px] text-slate-300">
                        Sala: {topic.room.name}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-slate-300">
                    {topic.views?.toLocaleString('pt-PT') ?? '0'} views
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-[#04131b]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white">
              Atividade recente
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Últimos posts publicados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPosts.length === 0 ? (
              <p className="text-xs text-slate-300">Sem atividade recente.</p>
            ) : (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="space-y-1 rounded-md border border-white/10 bg-[#021824]/80 p-3 text-xs shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
                >
                  <div className="flex items-center justify-between text-slate-300 uppercase tracking-wide">
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
                  <p className="text-[11px] text-slate-200">
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
