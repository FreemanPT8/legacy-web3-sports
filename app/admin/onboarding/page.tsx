'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Sparkles, Loader2, ClipboardList } from 'lucide-react';

type OnboardingStatsPayload = {
  onboarding?: {
    pendingTotal?: number;
    pendingPorAbrir?: number;
    pendingByStatus?: Record<string, number>;
    byResponsible?: Record<string, number>;
  };
};

type StageConfig = {
  status: string;
  label: string;
  badgeVariant: 'default' | 'secondary' | 'outline';
  badgeLabel: string;
  description: string;
};

const stageConfigs: StageConfig[] = [
  {
    status: 'PENDING_RESPONSE',
    label: 'Aguardando primeiro contacto',
    badgeVariant: 'outline',
    badgeLabel: 'Novo',
    description: 'Leads que ainda não foram contactados.',
  },
  {
    status: 'RESPONDED_WAITING',
    label: 'À espera de resposta',
    badgeVariant: 'secondary',
    badgeLabel: 'Follow-up',
    description: 'Mensagens enviadas aguardando retorno.',
  },
  {
    status: 'FIRST_CONTACT_SCHEDULED',
    label: 'Primeiro contacto agendado',
    badgeVariant: 'default',
    badgeLabel: 'Agendado',
    description: 'Contatos com primeira chamada marcada.',
  },
  {
    status: 'FIRST_CONTACT_DONE',
    label: 'Primeiro contacto concluído',
    badgeVariant: 'default',
    badgeLabel: 'Em progresso',
    description: 'Primeiras conversas realizadas.',
  },
  {
    status: 'ONBOARDING_LEGACY',
    label: 'Trilha Legacy',
    badgeVariant: 'default',
    badgeLabel: 'Legacy',
    description: 'Leads ativados no programa principal.',
  },
  {
    status: 'ONBOARDING_DAO1',
    label: 'Trilha DAO1',
    badgeVariant: 'default',
    badgeLabel: 'DAO1',
    description: 'Leads encaminhados para as squads DAO1.',
  },
  {
    status: 'ONBOARDING_TELEGRAM',
    label: 'Trilha Telegram',
    badgeVariant: 'outline',
    badgeLabel: 'Telegram',
    description: 'Leads em grupos exclusivos do Telegram.',
  },
  {
    status: 'unknown',
    label: 'Outros estados',
    badgeVariant: 'outline',
    badgeLabel: 'Outros',
    description: 'Estados adicionais do pipeline.',
  },
];

const StatTile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
    <p className="text-xs uppercase text-muted-custom">{label}</p>
    <p className="text-3xl font-semibold text-heading">
      {(value ?? 0).toLocaleString('pt-PT')}
    </p>
    {hint && <p className="text-xs text-muted-custom">{hint}</p>}
  </div>
);

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [stats, setStats] = useState<OnboardingStatsPayload | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStats(true);
    setStatsError(null);

    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/admin/stats', { headers });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        setStatsError(payload.error || 'Falha ao carregar métricas de onboarding.');
        setStats(null);
        return;
      }

      setStats(payload.stats);
    } catch (error: any) {
      console.error('Erro ao buscar stats de onboarding:', error);
      setStatsError(error?.message || 'Erro inesperado ao carregar dados.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  const onboardingStats = useMemo(
    () => ({
      pendingTotal: stats?.onboarding?.pendingTotal ?? 0,
      pendingPorAbrir: stats?.onboarding?.pendingPorAbrir ?? 0,
      pendingByStatus: stats?.onboarding?.pendingByStatus ?? {},
      byResponsible: stats?.onboarding?.byResponsible ?? {},
    }),
    [stats],
  );

  const quickMetrics = useMemo(
    () => [
      {
        label: 'Onboardings ativos',
        value: onboardingStats.pendingTotal,
        hint: 'Inclui todas as fases abertas do pipeline.',
      },
      {
        label: 'Leads por abrir',
        value: onboardingStats.pendingPorAbrir,
        hint: 'Contatos ainda não iniciados.',
      },
      {
        label: 'Responsáveis engajados',
        value: Object.keys(onboardingStats.byResponsible).length,
        hint: 'Admins com leads atribuídos.',
      },
    ],
    [onboardingStats],
  );

  const stageData = useMemo(
    () =>
      stageConfigs.map((stage) => ({
        ...stage,
        count: onboardingStats.pendingByStatus[stage.status] ?? 0,
      })),
    [onboardingStats],
  );

  const firstContactScheduled =
    onboardingStats.pendingByStatus['FIRST_CONTACT_SCHEDULED'] ?? 0;

  const pendingTotal = onboardingStats.pendingTotal;

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-custom">
          <Loader2 className="h-5 w-5 animate-spin" />
          A carregar onboarding...
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
            LEGACY Admin — Onboarding
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="h-7 w-7 text-emerald-300" />
            Onboarding Central
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            Acompanhe cada lead, responda rapidamente e garanta que ninguém fica parado no fluxo.
          </p>
          {statsError && (
            <p className="mt-3 text-xs text-red-400">{statsError}</p>
          )}
        </div>
      </section>

      {/* ACTION PANEL */}
      <section>
        <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-900/60 shadow-2xl mx-auto max-w-6xl">
          <CardHeader className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-500/40">
                Pulse
              </Badge>
              <CardTitle className="text-heading text-lg">
                Onboarding com ritmo
              </CardTitle>
            </div>
            <p className="text-muted-custom text-sm max-w-3xl">
              Dados reais do pipeline para priorizar respostas e acelerar
              cada etapa do contato.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => router.push('/admin/onboarding')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Ver novos leads
              </Button>
              <Button
                className="flex-1 border border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-900"
                onClick={() => router.push('/admin/onboarding')}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Revisar checklist
              </Button>
              <Button
                className="flex-1 border border-blue-600 text-blue-100 bg-blue-950/50 hover:bg-blue-900"
                onClick={() => router.push('/admin')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Compartilhar pipeline
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
              {loadingStats ? (
                <div className="md:col-span-3 text-center text-sm text-muted-custom">
                  A carregar métricas rápidas...
                </div>
              ) : (
                quickMetrics.map((metric) => (
                  <StatTile
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    hint={metric.hint}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <Card className="bg-card-custom border-custom shadow-lg shadow-emerald-950/40">
          <CardHeader>
            <CardTitle className="text-heading text-sm font-semibold">
              Métricas rápidas
            </CardTitle>
            <CardDescription className="text-muted-custom text-xs">
              Visão imediata das fases críticas do pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {stageData.map((stage) => (
              <div
                key={stage.status}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-heading">
                    {stage.label}
                  </p>
                  <Badge variant={stage.badgeVariant as any}>
                    {stage.badgeLabel}
                  </Badge>
                </div>
                <p className="text-3xl font-semibold text-heading">
                  {stage.count}
                </p>
                <p className="text-xs text-muted-custom">
                  {stage.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader>
            <CardTitle className="text-heading">Ações rápidas</CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Priorize follow-ups com base nos números reais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-muted-custom uppercase">Checklist</p>
                <p className="text-lg font-semibold text-heading">
                  {firstContactScheduled.toLocaleString('pt-PT')} contatos agendados
                </p>
                <p className="text-xs text-muted-custom mt-1">
                  Contatos com primeira chamada marcada.
                </p>
              </div>
              <Button variant="outline" className="border-emerald-500">
                Ver planning
              </Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-muted-custom uppercase">Mensagens pendentes</p>
                <p className="text-lg font-semibold text-heading">
                  {pendingTotal.toLocaleString('pt-PT')} conversas abertas
                </p>
                <p className="text-xs text-muted-custom mt-1">
                  Acompanhe essas conversas para não atrasar o onboarding.
                </p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Abrir inbox
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
