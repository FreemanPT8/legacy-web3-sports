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
import { Loader2, BarChart3, Globe2, Activity } from 'lucide-react';

const analyticsMetrics = [
  { label: 'Conversão leads → onboarding', value: '3.6%' },
  { label: 'Retenção semanal', value: '81%' },
  { label: 'Sessões por membro', value: '4.2' },
  { label: 'Novas houses detectadas', value: '9' },
];

const trafficSources = [
  { label: 'Direct', percent: '35%', trend: '+4%' },
  { label: 'Parceiros', percent: '27%', trend: '+1%' },
  { label: 'Blog & News', percent: '21%', trend: '+6%' },
  { label: 'Houses', percent: '17%', trend: '-2%' },
];

const highlightInsights = [
  {
    title: 'Live Experience',
    detail: '2.4x mais interação vs a semana anterior',
    badge: 'up',
  },
  {
    title: 'Onboarding Funnel',
    detail: 'Taxa de resposta caiu 1.2% (alerta amarelo)',
    badge: 'warning',
  },
  {
    title: 'Houses em ascensão',
    detail: 'Países CL, PT e BR trazem maior tráfego',
    badge: 'globe',
  },
];

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
    <p className="text-xs uppercase text-muted-custom">{label}</p>
    <p className="text-3xl font-semibold text-heading">{value}</p>
  </div>
);

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-custom">
          <Loader2 className="h-5 w-5 animate-spin" />
          A carregar analytics...
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
            LEGACY Admin ƒ?" Analytics
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-cyan-300" />
            Insights & Analytics
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Entrega uma visão clara sobre tráfego, comportamento e tendências do ecossistema.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="bg-card-custom border-custom shadow-lg shadow-cyan-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Métricas de performance
            </CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Atualizado em tempo real para tomares decisões informadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            {analyticsMetrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-blue-400" />
                Origens de tráfego
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trafficSources.map((source) => (
                <div
                  key={source.label}
                  className="flex items-center justify-between border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                >
                  <div>
                    <p className="text-sm text-heading">{source.label}</p>
                    <p className="text-xs text-muted-custom">
                      tendência {source.trend}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-blue-200">
                    {source.percent}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle className="text-heading flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Insights ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highlightInsights.map((insight) => (
                <div
                  key={insight.title}
                  className="flex items-center justify-between border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {insight.title}
                    </p>
                    <p className="text-xs text-muted-custom">{insight.detail}</p>
                  </div>
                  <Badge
                    variant={insight.badge === 'warning' ? 'secondary' : 'default'}
                  >
                    {insight.badge === 'warning' ? 'Atenção' : 'OK'}
                  </Badge>
                </div>
              ))}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/admin')}
              >
                Ver taxa completa
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
