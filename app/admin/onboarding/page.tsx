'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
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
  ClipboardList,
  Loader2,
  Mail,
  Share2,
  Sparkles,
} from 'lucide-react';

type OnboardingLead = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  country?: string | null;
  status?: string | null;
  assigned_to_username?: string | null;
  created_at?: string | null;
};

const stageConfigs = [
  {
    status: 'PENDING_RESPONSE',
    label: 'Aguardando primeiro contacto',
    badgeVariant: 'outline' as const,
    badgeLabel: 'Novo',
    description: 'Leads que ainda não foram contactados.',
  },
  {
    status: 'RESPONDED_WAITING',
    label: 'À espera de resposta',
    badgeVariant: 'secondary' as const,
    badgeLabel: 'Follow-up',
    description: 'Mensagens enviadas aguardando retorno.',
  },
  {
    status: 'FIRST_CONTACT_SCHEDULED',
    label: 'Primeiro contacto agendado',
    badgeVariant: 'default' as const,
    badgeLabel: 'Agendado',
    description: 'Chamadas iniciais marcadas.',
  },
  {
    status: 'FIRST_CONTACT_DONE',
    label: 'Primeiro contacto concluído',
    badgeVariant: 'default' as const,
    badgeLabel: 'Em progresso',
    description: 'Conexões iniciais registradas.',
  },
  {
    status: 'ONBOARDING_LEGACY',
    label: 'Trilha Legacy',
    badgeVariant: 'default' as const,
    badgeLabel: 'Legacy',
    description: 'Leads integrados ao programa principal.',
  },
  {
    status: 'ONBOARDING_DAO1',
    label: 'Trilha DAO1',
    badgeVariant: 'default' as const,
    badgeLabel: 'DAO1',
    description: 'Encaminhados para squads DAO1.',
  },
  {
    status: 'ONBOARDING_TELEGRAM',
    label: 'Trilha Telegram',
    badgeVariant: 'outline' as const,
    badgeLabel: 'Telegram',
    description: 'Mantidos em grupos exclusivos.',
  },
  {
    status: 'unknown',
    label: 'Outros estados',
    badgeVariant: 'outline' as const,
    badgeLabel: 'Outros',
    description: 'Estados fora da rota padrão.',
  },
];

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<{
    onboarding?: {
      pendingTotal?: number;
      pendingPorAbrir?: number;
      pendingByStatus?: Record<string, number>;
      byResponsible?: Record<string, number>;
    };
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [leads, setLeads] = useState<OnboardingLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const leadsRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

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

      const response = await fetch('/api/admin/stats', { headers });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setStatsError(payload.error || 'Falha ao carregar métricas.');
        setStats(null);
        return;
      }

      setStats(payload.stats);
    } catch (error: any) {
      console.error('Erro carregando stats de onboarding:', error);
      setStatsError(error?.message || 'Erro inesperado.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [getToken, isAdmin]);

  const fetchLeads = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingLeads(true);
    setLeadsError(null);

    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/onboarding?pageSize=8', {
        headers,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Não foi possível carregar leads.');
      }

      setLeads(payload.submissions || []);
    } catch (error: any) {
      console.error('Erro carregando leads de onboarding:', error);
      setLeadsError(error?.message || 'Erro inesperado.');
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchLeads();
    }
  }, [isAdmin, fetchStats, fetchLeads]);

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
        hint: 'Fases abertas em acompanhamento.',
      },
      {
        label: 'Leads a abrir',
        value: onboardingStats.pendingPorAbrir,
        hint: 'Primeiro contacto ainda não agendado.',
      },
      {
        label: 'Responsáveis',
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

  const handleScrollToLeads = () => {
    leadsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToPipeline = () => {
    pipelineRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSharePipeline = async () => {
    if (!navigator?.clipboard) {
      toast({
        title: 'Navegador não suportado',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado',
        description: 'Compartilhe este painel com o time.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link do pipeline.',
        variant: 'destructive',
      });
    }
  };

  const pendingFirstContacts =
    onboardingStats.pendingByStatus['FIRST_CONTACT_SCHEDULED'] ?? 0;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          A carregar onboarding...
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
            LEGACY Admin — Onboarding
          </span>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-[#fdd87c] md:text-4xl">
            <Mail className="h-7 w-7 text-emerald-300" />
            Onboarding Central
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-100 md:text-base">
            Priorize leads, distribua ações e mantenha o ritmo com dados reais de cada etapa.
          </p>
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
                Onboarding com ritmo
              </CardTitle>
            </div>
            <p className="max-w-3xl text-sm text-slate-200">
              Use este painel para responder rapidamente, organizar checklists e compartilhar o pipeline com o time.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                onClick={handleScrollToLeads}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Ver novos leads
              </Button>
              <Button
                className="flex-1 border border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={handleScrollToPipeline}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Revisar checklist
              </Button>
              <Button
                className="flex-1 border border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={handleSharePipeline}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar pipeline
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs">
              {loadingStats ? (
                <div className="md:col-span-3 text-center text-sm text-slate-300">
                  A carregar métricas rápidas...
                </div>
              ) : (
                quickMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-white/10 bg-[#021824]/80 px-3 py-2 text-slate-200"
                  >
                    <p className="text-[11px] uppercase tracking-wide">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-semibold text-[#fdd87c]">
                      {metric.value.toLocaleString('pt-PT')}
                    </p>
                    {metric.hint && (
                      <p className="text-[11px] text-slate-300">{metric.hint}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" ref={pipelineRef}>
        <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#fdd87c]">
              Métricas do pipeline
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Visualize quantos leads estão em cada etapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {stageData.map((stage) => (
              <div
                key={stage.status}
                className="space-y-2 rounded-lg border border-white/10 bg-[#021824]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{stage.label}</p>
                  <Badge variant={stage.badgeVariant as any}>
                    {stage.badgeLabel}
                  </Badge>
                </div>
                <p className="text-3xl font-semibold text-white">{stage.count}</p>
                <p className="text-xs text-slate-300">{stage.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-[#04131b]">
          <CardHeader>
            <CardTitle className="text-white">Ações rápidas</CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Priorização baseada em dados reais e leads que mais pedem atenção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase text-slate-300">Checklist</p>
                <p className="text-lg font-semibold text-white">
                  {pendingFirstContacts.toLocaleString('pt-PT')} contatos agendados
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Valide o primeiro contacto antes de avançar para outras etapas.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10">
                Ver agenda completa
              </Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase text-slate-300">Conversas abertas</p>
                <p className="text-lg font-semibold text-white">
                  {onboardingStats.pendingTotal.toLocaleString('pt-PT')} em aberto
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Consulte os leads listados abaixo para atuar rapidamente.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleScrollToLeads}>
                Atualizar leads
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section ref={leadsRef} className="space-y-4">
        <Card className="border border-white/10 bg-[#04131b]">
          <CardHeader>
            <CardTitle className="text-white text-sm font-semibold">
              Leads recentes
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              {leads.length} registros puxados diretamente do pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="flex items-center justify-center gap-2 text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando leads...
              </div>
            ) : leadsError ? (
              <p className="text-sm text-red-400">{leadsError}</p>
            ) : leads.length === 0 ? (
              <p className="text-sm text-slate-300">
                Ainda não existem leads cadastrados neste momento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-200">
                  <thead className="text-xs uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Lead</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">País</th>
                      <th className="px-3 py-2 text-left">Atribuído</th>
                      <th className="px-3 py-2 text-left">Criado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-950/40">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-white">
                            {lead.full_name || lead.email || 'Sem nome'}
                          </p>
                          <p className="text-xs text-slate-300">{lead.email}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="uppercase text-[10px]">
                            {lead.status ?? 'pending'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 uppercase text-xs">
                          {lead.country || 'N/A'}
                        </td>
                        <td className="px-3 py-2">
                          {lead.assigned_to_username || 'Unassigned'}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {lead.created_at
                            ? new Date(lead.created_at).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
