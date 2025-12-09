'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Sparkles, Loader2, ClipboardList } from 'lucide-react';

const quickMetrics = [
  { label: 'Leads novos (24h)', value: 28, hint: 'Contactados' },
  { label: 'Onboardings em curso', value: 12, hint: 'Equipa Design' },
  { label: 'Pendentes por responder', value: 6, hint: 'Follow-up' },
  { label: 'Tempo médio (dias)', value: 4, hint: 'Meta: ≤ 7' },
];

const pipelineStages = [
  {
    label: 'Descoberta',
    count: 14,
    badgeVariant: 'default',
    badgeLabel: 'Active',
  },
  {
    label: 'Introducao',
    count: 8,
    badgeVariant: 'secondary',
    badgeLabel: 'In review',
  },
  {
    label: 'Checklist',
    count: 5,
    badgeVariant: 'outline',
    badgeLabel: 'Awaiting input',
  },
  {
    label: 'Conclusao',
    count: 3,
    badgeVariant: 'default',
    badgeLabel: 'Completed',
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
  const { user, loading } = useAuth();

  const isAdmin =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [loading, user, router, isAdmin]);

  const stages = useMemo(() => pipelineStages, []);


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
            LEGACY Admin ƒ?" Onboarding
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="h-7 w-7 text-emerald-300" />
            Onboarding Central
          </h1>
          <p className="mt-2 text-sm md:text-base text-blue-100/90 max-w-2xl">
            acompanha cadaLead, responde a tempo e garante que ninguém fica esquecido no processo.
          </p>
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
              Use dados reais do pipeline para priorizar mensagens, acelerar o
              contato e garantir que ninguém fique parado em cada etapa.
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
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                <p className="font-semibold uppercase tracking-wide text-[11px]">
                  Leads (24h)
                </p>
                <p className="text-2xl font-bold mt-1">
                  {quickMetrics[0]?.value ?? 0}
                </p>
                <p className="text-muted-custom text-[11px]">
                  Atualizado automaticamente.
                </p>
              </div>
              <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-blue-100">
                <p className="font-semibold uppercase tracking-wide text-[11px]">
                  Onboardings ativos
                </p>
                <p className="text-2xl font-bold mt-1">
                  {quickMetrics[1]?.value ?? 0}
                </p>
                <p className="text-muted-custom text-[11px]">
                  Meta de {quickMetrics[3]?.value ?? 0} dias para conclusão.
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
                <p className="font-semibold uppercase tracking-wide text-[11px]">
                  Pendentes
                </p>
                <p className="text-2xl font-bold mt-1">
                  {quickMetrics[2]?.value ?? 0}
                </p>
                <p className="text-muted-custom text-[11px]">
                  Acompanhe essas conversas para não atrasar.
                </p>
              </div>
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
              Visão imediata dos pontos críticos no onboarding ativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            {quickMetrics.map((metric) => (
              <StatTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                hint={metric.hint}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader className="pb-3 flex flex-col gap-2">
            <CardTitle className="text-heading">Pipeline de onboarding</CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Complementa com follow-ups e responsáveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {stages.map((stage) => (
              <div
                key={stage.label}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-heading">{stage.label}</p>
                  <Badge variant={stage.badgeVariant as any}>{stage.badgeLabel}</Badge>
                </div>
                <p className="text-3xl font-semibold text-heading">
                  {stage.count}
                </p>
                <p className="text-xs text-muted-custom">
                  {stage.badgeVariant === 'outline'
                    ? 'Requer feedback do mentor'
                    : 'Trilha em andamento'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card-custom border-custom">
          <CardHeader>
            <CardTitle className="text-heading">Ações rápidas</CardTitle>
            <CardDescription className="text-xs text-muted-custom">
              Centraliza tarefas e cronogramas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-muted-custom uppercase">Checklist</p>
                <p className="text-lg font-semibold text-heading">
                  Completar acompanhamento de convidados VIP
                </p>
              </div>
              <Button variant="outline" className="border-emerald-500">
                Ver planning
              </Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-muted-custom uppercase">
                  Mensagens pendentes
                </p>
                <p className="text-lg font-semibold text-heading">
                  3 conversas aguardam resposta
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
