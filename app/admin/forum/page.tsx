'use client';

import { useEffect } from 'react';
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
import { Loader2, MessageCircle, ShieldCheck, TrendingUp } from 'lucide-react';

const forumMetrics = [
  { label: 'Threads ativos', value: 54 },
  { label: 'Mensagens (24h)', value: 312 },
  { label: 'Users engajados', value: 142 },
  { label: 'Reports pendentes', value: 7 },
];

const trendingThreads = [
  {
    title: 'Como prepararmos os próximos eventos?',
    replies: 68,
    activity: '2h',
  },
  {
    title: 'Ideias de badges de experiência',
    replies: 45,
    activity: '4h',
  },
  {
    title: 'Atualização das rules da comunidade',
    replies: 29,
    activity: '6h',
  },
];

const moderationQueue = [
  { id: 'report-1', type: 'Spam', user: 'guerreiro' },
  { id: 'report-2', type: 'Comportamento', user: 'lugani' },
  { id: 'report-3', type: 'Conteúdo impróprio', user: 'alvamar' },
];

const MetricItem = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
    <p className="text-xs uppercase text-muted-custom">{label}</p>
    <p className="text-3xl font-semibold text-heading">
      {value.toLocaleString('pt-PT')}
    </p>
  </div>
);

export default function AdminForumPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, loading, router, isAdmin]);

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
            LEGACY Admin ƒ?" Forum
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-purple-300" />
            Forum Control Center
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Monitoriza tópicos, acelera moderação e mantém uma comunidade saudável.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="bg-card-custom border-custom shadow-lg shadow-purple-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Visão geral do fórum
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Atividade instantânea e reports críticos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            {forumMetrics.map((metric) => (
              <MetricItem
                key={metric.label}
                label={metric.label}
                value={metric.value}
              />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Threads em destaque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-body">
              {trendingThreads.map((thread) => (
                <div
                  key={thread.title}
                  className="flex flex-col border border-slate-800 rounded-md p-3 bg-slate-950/60"
                >
                  <p className="text-sm font-semibold text-heading">
                    {thread.title}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-custom">
                    <span>{thread.replies} respostas</span>
                    <span>Última atividade há {thread.activity}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Moderação rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {moderationQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-slate-800 rounded-md p-3 bg-slate-950/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {item.type}
                    </p>
                    <p className="text-xs text-muted-custom">por {item.user}</p>
                  </div>
                  <Badge variant="secondary">Prioritário</Badge>
                </div>
              ))}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/admin/forum')}
              >
                Abrir central de moderação
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
