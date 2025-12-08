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
import {
  Mail,
  Sparkles,
  Loader2,
} from 'lucide-react';

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
