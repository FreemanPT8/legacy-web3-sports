'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Users, Building2, Activity, ShieldCheck } from 'lucide-react';

type OverviewResponse = {
  success: true;
  totals: {
    houses: number;
    active: number;
    underConstruction: number;
    inDevelopment: number;
    paused: number;
  };
  members: {
    globalCount: number;
    topHouses: Array<{ houseId: string; houseKey: string; name: string; members: number }>;
  };
  capacity: Array<{
    house_id: string;
    name: string;
    monthly_capacity: number | null;
    pending_requests: number;
    status: 'ok' | 'limit' | 'blocked';
  }>;
  alerts: {
    openBySeverity: Record<'low' | 'medium' | 'high', number>;
    top: Array<{
      id: string;
      houseId: string;
      type: string;
      severity: string;
      createdAt: string;
    }>;
  };
  onboarding: Array<{ houseKey: string; name: string; publishedPopups: number }>;
  poolPressure: Array<{ sportCode: string; pending: number }>;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminHousesOverviewPage() {
  const { data, error } = useSWR<OverviewResponse>('/api/admin/houses/overview', fetcher, { refreshInterval: 60_000 });
  const loading = !data && !error;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
        <div className="flex items-center gap-2 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>A carregar visão global das Houses...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          Falha ao carregar dados. Recarrega a página ou confirma permissões de admin.
        </div>
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    low: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
    medium: 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
    high: 'text-rose-300 bg-rose-500/10 border border-rose-500/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#041021]/90 via-[#031525]/80 to-[#021d2c]/80 p-6 shadow-[0_35px_90px_rgba(3,10,25,0.6)] md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">GOVERNANÇA LEGACY</p>
              <h1 className="text-3xl font-semibold text-[#fdd87c] sm:text-4xl">Panorama das Houses</h1>
              <p className="text-sm text-slate-200">
                KPIs em tempo real para proteger qualidade, capacidade e reputação. Estilo visual alinhado com Education XP.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
                {data.totals.houses} Houses
              </Badge>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:border-cyan-400/60 hover:text-cyan-300"
                asChild
              >
                <Link href="/admin/houses">Ver Houses</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Building2 className="h-6 w-6 text-cyan-300" />}
            label="Ativas"
            value={data.totals.active}
            subLabel="Operacionais e validadas"
          />
          <MetricCard
            icon={<Activity className="h-6 w-6 text-amber-300" />}
            label="Em construção"
            value={data.totals.underConstruction}
            subLabel="Com Head ou status em obra"
          />
          <MetricCard
            icon={<Users className="h-6 w-6 text-emerald-300" />}
            label="Membros totais"
            value={data.members.globalCount}
            subLabel="Utilizadores em Houses"
          />
          <MetricCard
            icon={<ShieldCheck className="h-6 w-6 text-rose-300" />}
            label="Alertas abertos"
            value={data.alerts.openBySeverity.low + data.alerts.openBySeverity.medium + data.alerts.openBySeverity.high}
            subLabel="Riscos em monitorização"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-[#03121d]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Top Houses por membros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.members.topHouses.length ? (
                data.members.topHouses.map((house) => (
                  <div
                    key={house.houseId}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                  >
                    <span className="text-white">{house.name}</span>
                    <span className="text-white/70">{house.members.toLocaleString()} membros</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Sem dados de membros ainda.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#03121d]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Pressão por desporto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.poolPressure.length ? (
                data.poolPressure.map((sport) => (
                  <div key={sport.sportCode} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <span className="text-white uppercase">{sport.sportCode}</span>
                    <span className="text-white/70">{sport.pending} pendentes</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Sem pressão registada nas pools.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-[#03101b]/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white">Capacidade vs pedidos</CardTitle>
              <Badge className="border-white/20 bg-white/10 text-white">Mês atual</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.capacity.length ? (
                data.capacity.slice(0, 5).map((entry) => (
                  <div key={entry.house_id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{entry.name}</p>
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                          entry.status === 'blocked'
                            ? 'bg-rose-500/15 text-rose-200 border border-rose-400/40'
                            : entry.status === 'limit'
                            ? 'bg-amber-500/15 text-amber-200 border border-amber-400/40'
                            : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40'
                        }`}
                      >
                        {entry.status === 'blocked' ? 'Bloqueada' : entry.status === 'limit' ? 'Limite' : 'Ok'}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">
                      Capacidade: {entry.monthly_capacity ? entry.monthly_capacity : '—'} · Pedidos pendentes:{' '}
                      {entry.pending_requests}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Ainda não existem dados de pedidos vs. capacidade.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#030c16]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Alertas recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.alerts.top.length ? (
                data.alerts.top.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-white">{alert.type}</p>
                      <p className="text-xs text-white/50">{new Date(alert.createdAt).toLocaleString('pt-PT')}</p>
                    </div>
                    <span className={severityColors[alert.severity?.toLowerCase()] ?? severityColors.medium}>
                      {alert.severity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Sem alertas ativos.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-[#030d18]/85">
            <CardHeader>
              <CardTitle className="text-lg text-white">Onboarding a rever</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              {data.onboarding.length ? (
                data.onboarding.map((house) => (
                  <div key={house.houseKey} className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
                    <p className="text-white font-semibold">{house.name}</p>
                    <p className="text-xs text-white/70">0 pop-ups publicados</p>
                  </div>
                ))
              ) : (
                <p>Todos as Houses têm pop-ups publicados.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#030d18]/85">
            <CardHeader>
              <CardTitle className="text-lg text-white">Governança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              <p>• Monitoriza a capacidade para evitar desgaste dos Heads.</p>
              <p>• Alertas são auditáveis e resolvidos pelo HQ.</p>
              <p>• Este painel reflete a mesma linguagem visual do Education XP.</p>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subLabel: string;
}) {
  return (
    <Card className="border-white/10 bg-[#03121d]/80">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{label}</p>
          <p className="text-2xl font-semibold text-white">{value.toLocaleString()}</p>
          <p className="text-xs text-white/60">{subLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}
