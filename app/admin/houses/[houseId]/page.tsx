'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { HouseProfilePayload } from '@/lib/houses/profile';
import { SafeImage } from '@/app/components/SafeImage';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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

type ProfileResponse = {
  success: true;
  profile: HouseProfilePayload;
};

type HouseNote = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

type NotesResponse = {
  success: true;
  notes: HouseNote[];
};

type HistoryEntry = {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

type HistoryResponse = {
  success: true;
  entries: HistoryEntry[];
};

type QualityMetrics = {
  members: number;
  completionRate: number;
  completionUsers: number;
  totalCompletions: number;
  retention: { d30: number; d60: number; d90: number };
  feedback: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    unresolved: number;
  };
  updatedAt: string;
};

type MetricsResponse = {
  success: true;
  metrics: QualityMetrics;
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
  const {
    data: profileData,
    error: profileError,
    isLoading: profileLoading,
  } = useSWR<ProfileResponse>(
    params?.houseId ? `/api/admin/houses/${params.houseId}/profile` : null,
    fetcher,
  );
  const {
    data: notesData,
    error: notesError,
    isLoading: notesLoading,
    mutate: mutateNotes,
  } = useSWR<NotesResponse>(params?.houseId ? `/api/admin/houses/${params.houseId}/notes` : null, fetcher);
  const {
    data: historyData,
    error: historyError,
    isLoading: historyLoading,
  } = useSWR<HistoryResponse>(params?.houseId ? `/api/admin/houses/${params.houseId}/history` : null, fetcher);
  const {
    data: qualityData,
    error: qualityError,
    isLoading: qualityLoading,
  } = useSWR<MetricsResponse>(params?.houseId ? `/api/admin/houses/${params.houseId}/metrics` : null, fetcher);
  const [monthlyCapacity, setMonthlyCapacity] = useState<string>('');
  const [supportMode, setSupportMode] = useState<string>('async');
  const [governanceStatus, setGovernanceStatus] = useState<string>('active');
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<
    { id: string; type: string; severity: 'low' | 'medium' | 'high'; createdAt: string }[]
  >([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

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

  const handleAddNote = async () => {
    if (!params?.houseId) return;
    const trimmed = newNote.trim();
    if (!trimmed) {
      toast({ title: 'Nota vazia', description: 'Escreve algo antes de guardar.', variant: 'destructive' });
      return;
    }
    setAddingNote(true);
    try {
      const response = await fetch(`/api/admin/houses/${params.houseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Não foi possível guardar a nota.');
      }
      setNewNote('');
      toast({ title: 'Nota adicionada', description: 'Registo interno atualizado.' });
      await mutateNotes();
    } catch (err) {
      console.error('[admin/houses] add note failed', err);
      toast({
        title: 'Erro ao guardar nota',
        description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setAddingNote(false);
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
  const profileHouse = profileData?.profile.house;
  const supportModeLabel: Record<string, string> = {
    async: 'Assíncrono (mensagens)',
    sync: 'Síncrono (calls)',
    hybrid: 'Híbrido (mensagens + calls)',
  };
  const notes = notesData?.notes ?? [];
  const noteCharacterLimit = 1000;
  const historyEntries = historyData?.entries ?? [];
  const qualityMetrics = qualityData?.metrics;
  const qualifiesExemplar = Boolean(
    qualityMetrics &&
      qualityMetrics.members >= 25 &&
      qualityMetrics.completionRate >= 0.6 &&
      qualityMetrics.retention.d60 >= 0.5,
  );

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

        <section className="grid gap-6 lg:grid-cols-3">
          {profileLoading ? (
            <Card className="border-white/10 bg-[#041524]/90 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5 text-cyan-300" />
                  Identidade pública
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar perfil público e métricas...
                </div>
              </CardContent>
            </Card>
          ) : profileError || !profileHouse ? (
            <Card className="border-white/10 bg-[#041524]/90 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5 text-rose-300" />
                  Falha ao carregar perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-white/70">
                Não foi possível recuperar o perfil público desta House. Verifica o endpoint ou tenta novamente.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-white/10 bg-[#03182a]/90">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <span>Identidade pública</span>
                    <span
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-white/80"
                    >
                      {profileHouse.badge}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/80">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">posicionamento</p>
                    <p className="pt-2 text-lg font-semibold text-white">{profileHouse.positioning.title}</p>
                    <p className="text-white/60">{profileHouse.positioning.subtitle || '—'}</p>
                  </div>
                  <Separator className="border-white/10" />
                  <div className="grid gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                    <span>Status: {profileHouse.status}</span>
                    <span>Governança: {profileHouse.governanceStatus}</span>
                    <span>Suporte: {supportModeLabel[profileHouse.supportModel.contactMode] ?? '—'}</span>
                  </div>
                  <Separator className="border-white/10" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">missão</p>
                    <p className="pt-2 text-sm text-white/80">{profileHouse.mission.title}</p>
                    <ul className="mt-2 space-y-1 text-white/70">
                      {(Array.isArray(profileHouse.mission.body)
                        ? profileHouse.mission.body
                        : [profileHouse.mission.body]
                      ).map((line, index) => (
                        <li key={index} className="text-xs text-white/70">
                          • {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-[#03131f]/90">
                <CardHeader>
                  <CardTitle className="text-white">Head & Segmentação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-white/80">
                  {profileHouse.head ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <SafeImage
                        src={profileHouse.head.photoUrl || ''}
                        alt={profileHouse.head.name}
                        className="h-14 w-14 rounded-full border border-cyan-500/30 object-cover"
                      />
                      <div>
                        <p className="font-semibold text-white">{profileHouse.head.name}</p>
                        <p className="text-xs text-white/60">@{profileHouse.head.username ?? 'sem-username'}</p>
                        {profileHouse.head.country && (
                          <p className="text-xs text-white/50">{profileHouse.head.country}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                      Nenhum Head associado.
                    </p>
                  )}
                  <div className="grid gap-3 text-xs">
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-cyan-300">Para quem é</p>
                      <ul className="space-y-1 text-white/75">
                        {profileHouse.audience.for.length ? (
                          profileHouse.audience.for.map((item) => <li key={item}>• {item}</li>)
                        ) : (
                          <li className="text-white/50">Sem definição.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-rose-300">Não é para</p>
                      <ul className="space-y-1 text-white/75">
                        {profileHouse.audience.notFor.length ? (
                          profileHouse.audience.notFor.map((item) => <li key={item}>• {item}</li>)
                        ) : (
                          <li className="text-white/50">Sem definição.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-[#03121d]/90">
                <CardHeader>
                  <CardTitle className="text-white">Operação pública</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-white/80">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Expectativas</p>
                    <ul className="mt-2 space-y-1 text-white/70">
                      {profileHouse.supportModel.expectationNotes.length ? (
                        profileHouse.supportModel.expectationNotes.map((note) => <li key={note}>• {note}</li>)
                      ) : (
                        <li className="text-white/50">Sem notas registadas.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Cultura</p>
                    <ul className="mt-2 space-y-1 text-white/70">
                      {profileHouse.culture.length ? (
                        profileHouse.culture.map((value) => <li key={value}>• {value}</li>)
                      ) : (
                        <li className="text-white/50">Adiciona princípios culturais para a House.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">CTA público</p>
                    <p className="pt-2 text-sm text-white">
                      {profileHouse.cta.label}{' '}
                      <span className="text-white/60">({profileHouse.cta.helper || 'sem aviso'})</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/70">
                    <p>Membros: {profileHouse.metrics.memberCount.toLocaleString()}</p>
                    <p>XP total: {profileHouse.metrics.xpTotal.toLocaleString()}</p>
                    <p>
                      Termos aceites:{' '}
                      <span className="font-semibold text-white">{profileHouse.metrics.termAcceptances}</span>
                    </p>
                    <p>
                      Pop-ups publicados:{' '}
                      <span className="font-semibold text-white">{profileHouse.metrics.onboarding.published}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </section>

        <section className="grid gap-6">
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Métricas de qualidade</CardTitle>
              <CardDescription className="text-xs text-white/60">
                Baseadas em conclusões de cursos e atividade de XP dos membros desta House.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              {qualityLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A calcular métricas...
                </div>
              ) : qualityError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-100">
                  Não foi possível obter as métricas. Tenta novamente ou confirma as permissões.
                </div>
              ) : qualityMetrics ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <QualityStat label="Membros ativos" value={qualityMetrics.members.toLocaleString()} />
                    <QualityStat
                      label="Utilizadores com cursos concluídos"
                      value={`${qualityMetrics.completionUsers.toLocaleString()} (${Math.round(
                        (qualityMetrics.completionRate ?? 0) * 100,
                      )}%)`}
                    />
                    <QualityStat label="Cursos concluídos (total)" value={qualityMetrics.totalCompletions.toLocaleString()} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Retenção por atividade (XP)</p>
                    <ProgressRow label="Últimos 30 dias" value={qualityMetrics.retention.d30} />
                    <ProgressRow label="Últimos 60 dias" value={qualityMetrics.retention.d60} />
                    <ProgressRow label="Últimos 90 dias" value={qualityMetrics.retention.d90} />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Feedback qualitativo</p>
                    {qualityMetrics.feedback.total > 0 ? (
                      <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                        <FeedbackBadge label="Total registado" value={qualityMetrics.feedback.total} />
                        <FeedbackBadge
                          label="Pendentes"
                          value={qualityMetrics.feedback.unresolved}
                          accent="text-amber-300"
                        />
                        <FeedbackBadge label="Negativos" value={qualityMetrics.feedback.negative} accent="text-rose-300" />
                        <FeedbackBadge label="Neutros" value={qualityMetrics.feedback.neutral} accent="text-slate-200" />
                        <FeedbackBadge label="Positivos" value={qualityMetrics.feedback.positive} accent="text-emerald-300" />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-white/70">Ainda não existem registos na tabela de feedback.</p>
                    )}
                  </div>
                  <p className="text-xs text-white/60">
                    Atualizado{' '}
                    {new Date(qualityMetrics.updatedAt).toLocaleString('pt-PT', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/70">Sem dados suficientes para calcular as métricas.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-gradient-to-r from-[#041021]/90 via-[#031d2c]/85 to-[#02263b]/85">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-[#fdd87c]">
                <ShieldCheck className="h-5 w-5 text-[#fdd87c]" />
                House exemplar
              </CardTitle>
              <CardDescription className="text-xs text-white/70">
                Critérios automáticos: 25+ membros ativos, ≥60% com cursos concluídos e retenção de 60 dias ≥50%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/85">
              {qualityLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A analisar métricas...
                </div>
              ) : qualifiesExemplar ? (
                <div className="rounded-2xl border border-[#fdd87c]/40 bg-[#fdd87c]/10 px-4 py-3">
                  <p className="font-semibold text-[#fdd87c]">Elegível</p>
                  <p className="text-white/80">
                    Esta House tem desempenho consistente — podes marcá-la como exemplar nos materiais públicos para inspirar
                    outras equipas.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white/80">
                  <p className="font-semibold text-white">Ainda não elegível</p>
                  <p className="text-sm text-white/70">
                    Mantém o foco em conclusões de cursos e retenção. Quando todos os critérios forem cumpridos, este painel
                    destacará automaticamente.
                  </p>
                </div>
              )}
              {qualityMetrics && (
                <p className="text-xs text-white/60">
                  Status calculado em {new Date(qualityMetrics.updatedAt).toLocaleString('pt-PT')}.
                </p>
              )}
            </CardContent>
          </Card>
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

        <section className="grid gap-6">
          <Card className="border-white/10 bg-gradient-to-br from-[#040f1a]/90 via-[#031521]/85 to-[#021822]/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
                Notas internas
              </CardTitle>
              <CardDescription className="text-xs text-white/60">
                Visíveis apenas para Admin/Super Admin. Usa para registar decisões ou contexto sensível.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-white/80">
              {notesLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar notas...
                </div>
              ) : notesError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-100">
                  Não foi possível carregar as notas internas. Recarrega a página ou tenta mais tarde.
                </div>
              ) : notes.length ? (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-3">
                        <SafeImage
                          src={note.author?.avatarUrl || ''}
                          alt={note.author?.name || 'Admin'}
                          className="h-10 w-10 rounded-full border border-white/15 object-cover"
                        />
                        <div>
                          <p className="font-medium text-white">{note.author?.name ?? 'Admin'}</p>
                          <p className="text-xs text-white/60">
                            {new Date(note.createdAt).toLocaleString('pt-PT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm text-white/80">{note.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/70">Ainda não existem notas internas para esta House.</p>
              )}

              <div className="space-y-3">
                <Label htmlFor="house-note" className="text-sm text-white/80">
                  Adicionar nota
                </Label>
                <Textarea
                  id="house-note"
                  rows={4}
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value.slice(0, noteCharacterLimit))}
                  placeholder="Regista decisões, follow-ups ou contexto que outras equipas precisam de saber."
                  className="border-white/20 bg-[#010913] text-white placeholder:text-white/40"
                />
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    {newNote.length}/{noteCharacterLimit} caracteres
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    {addingNote ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      'Guardar nota'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6">
          <Card className="border-white/10 bg-[#041524]/90">
            <CardHeader>
              <CardTitle className="text-white">Histórico operacional</CardTitle>
              <CardDescription className="text-xs text-white/60">
                Registo automático de alterações de capacidade, governance, alerts ou promoção de Head.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar histórico...
                </div>
              ) : historyError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-100">
                  Não foi possível carregar o histórico. Tenta mais tarde.
                </div>
              ) : historyEntries.length ? (
                <div className="space-y-3">
                  {historyEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[0_10px_30px_rgba(1,9,19,0.45)]"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/60">
                        <span>{entry.action}</span>
                        <span>
                          {new Date(entry.createdAt).toLocaleString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">
                        {entry.author ? (
                          <>
                            Ação por <span className="text-white/80">{entry.author.name}</span>
                            {entry.author.username ? ` (@${entry.author.username})` : null}
                          </>
                        ) : (
                          'Ação automática'
                        )}
                      </div>
                      {entry.payload && Object.keys(entry.payload).length > 0 && (
                        <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#010913]/80 p-3 text-xs text-white/70">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/70">Sem eventos recentes registados para esta House.</p>
              )}
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

function QualityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  const percent = Math.max(0, Math.min(1, value || 0));
  const formatted = `${Math.round(percent * 100)}%`;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="text-white">{formatted}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/15 bg-black/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00d2ff] via-[#42e8c9] to-[#fdd87c]"
          style={{ width: `${percent * 100}%` }}
        />
      </div>
    </div>
  );
}

function FeedbackBadge({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#010913]/60 px-3 py-2">
      <p className={`text-[10px] uppercase tracking-[0.35em] ${accent || 'text-white/60'}`}>{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value.toLocaleString()}</p>
    </div>
  );
}
