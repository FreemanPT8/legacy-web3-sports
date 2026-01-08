'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

type GovernanceResponse = {
  success: true;
  house: {
    id: string;
    houseKey: string;
    name: string;
    monthlyCapacity: number | null;
    supportMode: string | null;
    governanceStatus: string;
    pendingRequests: number;
    memberCount: number;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (res.status === 401) throw new Error('Unauthorized');
  return res.json();
});

export default function AdminHouseGovernancePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data, error, mutate } = useSWR<GovernanceResponse>(
    params?.houseId ? `/api/admin/houses/${params.houseId}/governance` : null,
    fetcher,
  );
  const [monthlyCapacity, setMonthlyCapacity] = useState<string>('');
  const [supportMode, setSupportMode] = useState<string>('async');
  const [governanceStatus, setGovernanceStatus] = useState<string>('active');
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<
    { id: string; type: string; severity: 'low' | 'medium' | 'high'; createdAt: string }[]
  >([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.house) {
      setMonthlyCapacity(data.house.monthlyCapacity?.toString() ?? '');
      setSupportMode(data.house.supportMode ?? 'async');
      setGovernanceStatus(data.house.governanceStatus ?? 'active');
      void loadAlerts(data.house.houseKey);
    }
  }, [data]);

  const loadAlerts = async (houseKey: string) => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const response = await fetch(
        `/api/admin/houses/alerts?house=${encodeURIComponent(houseKey)}&status=open`,
        { cache: 'no-store' },
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Falha ao carregar alertas.');
      }
      setAlerts(payload.alerts ?? []);
    } catch (error) {
      console.error('[admin/houses/gov] alerts fetch failed', error);
      setAlertsError('Falha ao carregar alertas.');
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!params?.houseId) return;
    setSaving(true);
    try {
      const payload = {
        monthlyCapacity: monthlyCapacity === '' ? null : Number(monthlyCapacity),
        supportMode,
        governanceStatus,
      };
      const response = await fetch(`/api/admin/houses/${params.houseId}/governance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Falha ao atualizar');
      }
      toast({ title: 'Alterações guardadas', description: 'Capacidade e limites atualizados.' });
      await mutate();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível atualizar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!params?.houseId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          House inválida.
        </div>
      </div>
    );
  }

  if (!data && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
        <div className="flex items-center gap-2 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>A carregar House...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          Não foi possível carregar esta House. <button className="underline" onClick={() => router.back()}>Voltar atrás</button>
        </div>
      </div>
    );
  }

  const { house } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#041021]/90 via-[#021624]/80 to-[#021f2f]/80 p-6 shadow-[0_35px_90px_rgba(3,10,25,0.6)] md:p-10">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">HOUSE · CAPACIDADE</p>
            <h1 className="text-3xl font-semibold text-[#fdd87c]">{house.name}</h1>
            <p className="text-sm text-white/70">
              Ajusta limites e modo de operação desta House sem sair do painel. Visual aligned com Education XP.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-[#041524]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-amber-300" /> Alertas abertos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              {alertsLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar alertas...
                </div>
              ) : alertsError ? (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-rose-100">
                  {alertsError}
                </div>
              ) : alerts.length ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs uppercase tracking-[0.3em] text-white/70"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span>{alert.type}</span>
                        <span
                          className={`rounded-full px-3 py-0.5 text-[10px] font-semibold ${
                            alert.severity === 'high'
                              ? 'bg-rose-500/20 text-rose-100'
                              : alert.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-100'
                              : 'bg-emerald-500/20 text-emerald-100'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-white/50">
                        {new Date(alert.createdAt).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <p className="text-xs text-white/60">+{alerts.length - 3} alertas adicionais monitorizados.</p>
                  )}
                  <Button
                    variant="outline"
                    className="border-cyan-400/40 text-cyan-200 hover:border-cyan-300"
                    onClick={() => window.open(`/admin/houses/alerts?house=${data.house.houseKey}`, '_blank')}
                  >
                    Abrir painel de alertas
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-white/70">
                  Nenhum alerta aberto para esta House. Último fetch automático a cada 60s.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-[#03121d]/85">
            <CardHeader>
              <CardTitle className="text-lg text-white">Capacidade mensal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="capacity" className="text-sm text-white/70">
                Nº máximo de pedidos orientados por mês
              </Label>
              <Input
                id="capacity"
                inputMode="numeric"
                value={monthlyCapacity}
                onChange={(event) => setMonthlyCapacity(event.target.value)}
                placeholder="Ex.: 40"
                className="border-white/20 bg-[#010913] text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/60">
                Deixa vazio para não definir limite automático. Pedidos pendentes atuais: {house.pendingRequests}.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#03121d]/85">
            <CardHeader>
              <CardTitle className="text-lg text-white">Modo de suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-white/70">Contacto permitido</Label>
                <Select value={supportMode} onValueChange={(value) => setSupportMode(value)}>
                  <SelectTrigger className="border-white/20 bg-[#010913] text-left text-white">
                    <SelectValue placeholder="Seleciona" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#03121d] text-white">
                    <SelectItem value="async">Assíncrono (mensagens)</SelectItem>
                    <SelectItem value="sync">Síncrono (calls)</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-white/70">Estado operacional</Label>
                <Select value={governanceStatus} onValueChange={(value) => setGovernanceStatus(value)}>
                  <SelectTrigger className="border-white/20 bg-[#010913] text-left text-white">
                    <SelectValue placeholder="Seleciona" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#03121d] text-white">
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="limited">Limitada</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                    <SelectItem value="under_review">Em revisão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/80">
                Membros atuais: {house.memberCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:border-cyan-400/60 hover:text-cyan-200"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              'Guardar alterações'
            )}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
