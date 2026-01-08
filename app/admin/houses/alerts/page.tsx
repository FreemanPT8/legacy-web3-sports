'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, Shield, RefreshCcw, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type AlertRecord = {
  id: string;
  houseId: string;
  houseKey: string;
  houseName: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  details: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
};

type AlertsResponse =
  | { success: true; alerts: AlertRecord[] }
  | { success: false; error: string };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const severityStyles: Record<
  AlertRecord['severity'],
  { badge: string; label: string }
> = {
  low: { badge: 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/40', label: 'Baixo' },
  medium: { badge: 'bg-amber-500/10 text-amber-200 border border-amber-400/40', label: 'Médio' },
  high: { badge: 'bg-rose-500/10 text-rose-200 border border-rose-400/40', label: 'Alto' },
};

const statusLabels: Record<AlertRecord['status'], string> = {
  open: 'Aberto',
  in_progress: 'Em análise',
  resolved: 'Resolvido',
};

export default function AdminHouseAlertsPage() {
  const [statusFilter, setStatusFilter] = useState<AlertRecord['status']>('open');
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertRecord['severity']>('all');
  const [houseFilter, setHouseFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryKey = useMemo(() => {
    const params = new URLSearchParams({ status: statusFilter });
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    if (houseFilter.trim()) params.set('house', houseFilter.trim());
    return `/api/admin/houses/alerts?${params.toString()}`;
  }, [statusFilter, severityFilter, houseFilter]);

  const { data, error, isValidating, mutate } = useSWR<AlertsResponse>(queryKey, fetcher, {
    refreshInterval: 60_000,
  });

  const alerts = data && 'success' in data && data.success ? data.alerts : [];
  const loading = !data && !error;

  const severitySummary = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 },
    );
  }, [alerts]);

  const handleStatusUpdate = useCallback(
    async (alertId: string, nextStatus: AlertRecord['status']) => {
      setUpdatingId(alertId);
      try {
        const response = await fetch(`/api/admin/houses/alerts?id=${encodeURIComponent(alertId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Falha ao atualizar alerta.');
        }
        toast({
          title: 'Estado atualizado',
          description: `Alerta marcado como ${statusLabels[nextStatus]}.`,
        });
        mutate();
      } catch (err) {
        console.error('[admin/houses/alerts] status update failed', err);
        toast({
          title: 'Erro ao atualizar alerta',
          description: err instanceof Error ? err.message : 'Tenta novamente brevemente.',
          variant: 'destructive',
        });
      } finally {
        setUpdatingId(null);
      }
    },
    [mutate, toast],
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-white/80">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          A carregar alertas críticos...
        </div>
      );
    }

    if (error || (data && 'success' in data && !data.success)) {
      return (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-6 py-5 text-rose-100">
          Falha ao carregar alertas. Recarrega a página ou confirma permissões de Governação.
        </div>
      );
    }

    if (!alerts.length) {
      return (
        <Card className="border-white/10 bg-black/20 text-white">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Shield className="h-10 w-10 text-emerald-300" />
            <p className="text-center text-sm text-white/70">
              Sem alertas com os filtros atuais. Mantém a monitorização ativa.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border-white/10 bg-[#03121d]/80 text-white">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                    {alert.houseKey}
                    <span className="tracking-normal text-white/70">{alert.houseName}</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold">{alert.type}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${severityStyles[alert.severity].badge}`}>
                    Severidade · {severityStyles[alert.severity].label}
                  </span>
                  <Badge
                    variant="outline"
                    className={`px-3 py-1 text-xs font-medium ${
                      alert.status === 'resolved'
                        ? 'border-emerald-400/40 text-emerald-200'
                        : alert.status === 'in_progress'
                        ? 'border-amber-400/40 text-amber-200'
                        : 'border-rose-400/40 text-rose-200'
                    }`}
                  >
                    {statusLabels[alert.status]}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 text-sm text-white/80 md:grid-cols-2">
                <div>
                  <p className="text-white/60">Criado em</p>
                  <p>{new Date(alert.createdAt).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <p className="text-white/60">Detalhes-chave</p>
                  {Object.keys(alert.details).length ? (
                    <ul className="mt-1 space-y-1 text-xs text-white/70">
                      {Object.entries(alert.details).map(([key, value]) => (
                        <li key={key} className="flex justify-between gap-2 border-b border-white/10 pb-1">
                          <span className="uppercase tracking-wide text-white/50">{key}</span>
                          <span className="text-right text-white">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-white/60">Sem dados adicionais.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {alert.status !== 'in_progress' && alert.status !== 'resolved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400/40 text-amber-200 hover:bg-amber-500/10"
                    disabled={updatingId === alert.id}
                    onClick={() => handleStatusUpdate(alert.id, 'in_progress')}
                  >
                    {updatingId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    Marcar como em análise
                  </Button>
                )}
                {alert.status !== 'resolved' && (
                  <Button
                    size="sm"
                    className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                    disabled={updatingId === alert.id}
                    onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                  >
                    {updatingId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Resolver incidente
                  </Button>
                )}
                {alert.status !== 'open' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    disabled={updatingId === alert.id}
                    onClick={() => handleStatusUpdate(alert.id, 'open')}
                  >
                    Reabrir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#041021]/90 via-[#031525]/80 to-[#021d2c]/80 p-6 shadow-[0_35px_90px_rgba(3,10,25,0.6)] md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">Governança · Alertas</p>
              <h1 className="text-3xl font-semibold text-[#fdd87c] sm:text-4xl">Monitorização de risco</h1>
              <p className="text-sm text-slate-200">
                Painel para Super Admin e Heads autorizados acompanharem alertas críticos, bloqueios e abuso de templates. Visual alinhado com Education XP.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="ghost" asChild className="text-white hover:text-cyan-200">
                <Link href="/admin/houses" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar às Houses
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => mutate()}
                className="border-white/30 text-white hover:border-cyan-400/60 hover:text-cyan-300"
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {(['low', 'medium', 'high'] as Array<AlertRecord['severity']>).map((level) => (
            <Card key={level} className="border-white/10 bg-[#030e18]/80 text-white">
              <CardContent className="flex items-center justify-between py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">Severidade</p>
                  <p className="text-2xl font-semibold">{severityStyles[level].label}</p>
                </div>
                <Badge className={severityStyles[level].badge}>{severitySummary[level]}</Badge>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/20 p-5 text-white shadow-[0_25px_80px_rgba(1,10,26,0.5)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['open', 'in_progress', 'resolved'] as Array<AlertRecord['status']>).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === statusFilter ? 'default' : 'outline'}
                  className={
                    status === statusFilter
                      ? 'bg-cyan-500/80 text-white hover:bg-cyan-500'
                      : 'border-white/30 text-white hover:border-cyan-400/60 hover:text-cyan-200'
                  }
                  onClick={() => setStatusFilter(status)}
                >
                  {statusLabels[status]}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex rounded-full border border-white/20 bg-white/5 p-1">
                {(['all', 'low', 'medium', 'high'] as const).map((severity) => (
                  <Button
                    key={severity}
                    variant="ghost"
                    size="sm"
                    className={`rounded-full px-3 text-xs ${
                      severityFilter === severity ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                    }`}
                    onClick={() => setSeverityFilter(severity)}
                  >
                    {severity === 'all' ? 'Todas' : severityStyles[severity].label}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Filtrar por House key"
                value={houseFilter}
                onChange={(event) => setHouseFilter(event.target.value.toUpperCase())}
                className="w-48 border-white/20 bg-transparent text-white placeholder:text-white/30 focus-visible:ring-cyan-400"
              />
            </div>
          </div>
        </section>

        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}
