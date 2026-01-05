'use client';

import { useMemo, useState } from 'react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { OnboardingPopup, type OnboardingPopupData } from '@/components/education/OnboardingPopup';
import type { HouseOnboardingSequence, OnboardingLogEntry } from '@/types/onboarding';
import { useOnboardingLogs } from '@/hooks/useOnboardingLogs';
import { useTermAgreement } from '@/hooks/useTermAgreement';
import { Loader2, RefreshCcw, MonitorPlay, Save, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_LABELS: Record<'delivered' | 'primary' | 'secondary' | 'dismiss', { label: string }> = {
  delivered: { label: 'Entregues' },
  primary: { label: 'CTA principal' },
  secondary: { label: 'CTA secund?ria' },
  dismiss: { label: 'Fechados' },
};

const DEFAULT_DRAFT: OnboardingPopupData = {
  id: 'draft-popup',
  house: 'House of Legacy',
  xpGate: 'XP 0',
  title: 'Novo pop-up personalizado',
  body: 'Utiliza este pop-up para reforçar o próximo passo da House. Mantém a linguagem clara, auditável e sem hype.',
  highlights: [
    '1 pop-up = 1 decisão útil.',
    'CTA principal deve apontar para um recurso oficial.',
  ],
  badgeLabel: 'Rascunho',
  primaryCta: { label: 'CTA principal', href: '/education/xp' },
  secondaryCta: { label: 'CTA secundária', href: '/education/houses' },
};

export default function AdminOnboardingPage() {
  const [houseKey, setHouseKey] = useState('LEGACY');
  const [draft, setDraft] = useState<OnboardingPopupData>(DEFAULT_DRAFT);
  const [highlightsInput, setHighlightsInput] = useState(DEFAULT_DRAFT.highlights?.join('\n') ?? '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [houseSequence, setHouseSequence] = useState<HouseOnboardingSequence | null>(null);
  const [sequenceDraft, setSequenceDraft] = useState<OnboardingPopupData[]>([DEFAULT_DRAFT]);
  const { acceptedAt, loading: termLoading, accept, isAccepted } = useTermAgreement();
  const editingDisabled = !isAccepted;
  const { logs: liveLogs, loading: logsLoading, error: logsError, refresh: refreshLogs } = useOnboardingLogs();
  const logTotals = useMemo(() => {
    return liveLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<OnboardingLogEntry['action'], number>);
  }, [liveLogs]);
  const latestLogs = useMemo(() => liveLogs.slice(0, 10), [liveLogs]);

  const resolvedDraft = useMemo<OnboardingPopupData>(() => {
    const highlights =
      highlightsInput
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean) ?? [];
    return {
      ...draft,
      house: draft.house || houseKey,
      highlights,
    };
  }, [draft, highlightsInput, houseKey]);

  const handleLoadHouse = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/onboarding/house?house=${encodeURIComponent(houseKey)}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to sync');
      const popup = data.sequence.popups[0] ?? DEFAULT_DRAFT;
      setHouseSequence(data.sequence);
      setSequenceDraft(data.sequence.popups);
      setDraft(popup);
      setHighlightsInput((popup.highlights ?? []).join('\n'));
      setStatus(`Sequência importada de ${data.sequence.house}.`);
    } catch (error) {
      console.error('[admin/onboarding] sync failed', error);
      setHouseSequence(null);
      setSequenceDraft([]);
      setStatus('Falha ao sincronizar. Mantém o rascunho atual.');
    } finally {
      setLoading(false);
    }
  };

  const handleDraftChange = (field: keyof OnboardingPopupData, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCtaChange = (key: 'primaryCta' | 'secondaryCta', field: 'label' | 'href', value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { label: '', href: '' }),
        [field]: value,
      },
    }));
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  const handleSave = () => {
    setStatus('Rascunho guardado localmente. Integração real ligará ao Painel Admin.');
  };

  const handleSelectPopup = (popup: OnboardingPopupData) => {
    setDraft(popup);
    setHighlightsInput((popup.highlights ?? []).join('\n'));
    setStatus(`Pop-up "${popup.title}" selecionado para edição.`);
  };

  const handleDuplicatePopup = (index: number) => {
    setSequenceDraft((prev) => {
      const copy = [...prev];
      const base = copy[index];
      if (!base) return prev;
      const duplicated: OnboardingPopupData = {
        ...base,
        id: `${base.id}-copy-${Date.now()}`,
        title: `${base.title} (cópia)`,
      };
      copy.splice(index + 1, 0, duplicated);
      setStatus('Pop-up duplicado (não persistido).');
      return copy;
    });
  };

  const handleMovePopup = (index: number, direction: 'up' | 'down') => {
    setSequenceDraft((prev) => {
      const copy = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      setStatus('Ordem atualizada (não persistido).');
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-[#010913] text-white">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-300">Admin · Onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fdd87c]">Painel — Pop-ups personalizados</h1>
          <p className="mt-2 text-sm text-slate-300">
            Sincroniza as sequências por House, ajusta copy/CTAs e pré-visualiza com o mesmo modal usado pelos membros.
          </p>
        </div>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-3 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Termo de Responsabilidade</p>
            <p className="text-lg font-semibold text-white">Heads confirmam que seguem o Termo antes de editar pop-ups.</p>
            <p className="text-sm text-slate-300">Sem aceitacao ativa (&lt;= 90 dias), o painel permanece em modo de leitura.</p>
            <div className="flex flex-wrap items-center gap-3">
              {acceptedAt ? (
                <span className="text-xs text-emerald-300">Aceite em {new Date(acceptedAt).toLocaleString()}</span>
              ) : (
                <span className="text-xs text-amber-200">Ainda n?o aceitaste o Termo.</span>
              )}
              <Button size="sm" onClick={accept} disabled={termLoading || isAccepted} className="bg-emerald-500/20 text-emerald-100">
                {isAccepted ? 'Termo ativo' : 'Aceitar Termo'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className={cn('flex flex-col gap-6', editingDisabled && 'pointer-events-none opacity-40')}>
        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">House</label>
                <Input
                  value={houseKey}
                  onChange={(event) => setHouseKey(event.target.value.toUpperCase())}
                  className="mt-2 border-white/10 bg-[#010913]"
                />
              </div>
              <Button onClick={handleLoadHouse} disabled={loading} className="bg-cyan-500/20 text-cyan-100">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sync
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Sincronizar demo
                  </>
                )}
              </Button>
            </div>
            {status ? <p className="text-sm text-emerald-200">{status}</p> : null}
          </CardContent>
        </Card>

        {sequenceDraft.length ? (
          <Card className="border-white/10 bg-[#04131b]/80">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {houseSequence ? `${houseSequence.house} · ${houseSequence.sport}` : 'Sequência carregada'}
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {houseSequence ? 'Pop-ups da House' : 'Pop-ups (demo)'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  {sequenceDraft.length} {sequenceDraft.length === 1 ? 'mensagem' : 'mensagens'}
                </p>
              </div>

              <div className="space-y-3">
                {sequenceDraft.map((popup, index) => (
                  <div
                    key={popup.id}
                    className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">{popup.xpGate ?? 'XP —'}</p>
                        <p className="text-lg font-semibold text-white">{popup.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleMovePopup(index, 'up')} disabled={index === 0}>
                          <ArrowUp className="mr-1 h-4 w-4" /> Up
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMovePopup(index, 'down')}
                          disabled={index === sequenceDraft.length - 1}
                        >
                          <ArrowDown className="mr-1 h-4 w-4" /> Down
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDuplicatePopup(index)}>
                          <Copy className="mr-1 h-4 w-4" /> Duplicar
                        </Button>
                        <Button size="sm" onClick={() => handleSelectPopup(popup)}>
                          Editar
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-300 line-clamp-2">{popup.body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Logs & Analytics</p>
                <h2 className="text-xl font-semibold text-white">?ltimas a??es</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={refreshLogs} className="border-white/20 text-white hover:bg-white/10">
                  <RefreshCcw className="mr-1 h-4 w-4" /> Atualizar
                </Button>
                <span className="text-xs text-slate-400">{logsLoading ? 'A carregar?' : `${liveLogs.length} eventos`}</span>
              </div>
            </div>

            {logsError ? <p className="text-sm text-amber-300">{logsError}</p> : null}

            <div className="grid gap-3 sm:grid-cols-4">
              {(['delivered','primary','secondary','dismiss'] as Array<keyof typeof ACTION_LABELS>).map((key) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{ACTION_LABELS[key].label}</p>
                  <p className="text-2xl font-semibold text-white">{logTotals[key] ?? 0}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {latestLogs.length ? (
                latestLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{ACTION_LABELS[log.action].label}</p>
                      <p className="text-xs text-slate-400">Popup: {log.popupId}</p>
                    </div>
                    <span className="text-xs text-slate-300">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sem eventos registados.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">House label</label>
                <Input
                  value={draft.house}
                  onChange={(event) => handleDraftChange('house', event.target.value)}
                  className="mt-2 border-white/10 bg-[#010913]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">XP / Trigger</label>
                <Input
                  value={draft.xpGate ?? ''}
                  onChange={(event) => handleDraftChange('xpGate', event.target.value)}
                  className="mt-2 border-white/10 bg-[#010913]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Título</label>
              <Input
                value={draft.title}
                onChange={(event) => handleDraftChange('title', event.target.value)}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Mensagem</label>
              <Textarea
                value={draft.body}
                onChange={(event) => handleDraftChange('body', event.target.value)}
                rows={4}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Highlights (1 por linha)</label>
              <Textarea
                value={highlightsInput}
                onChange={(event) => setHighlightsInput(event.target.value)}
                rows={4}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Badge opcional</label>
              <Input
                value={draft.badgeLabel ?? ''}
                onChange={(event) => handleDraftChange('badgeLabel', event.target.value)}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CTA principal</p>
                <Input
                  value={draft.primaryCta?.label ?? ''}
                  placeholder="Label"
                  onChange={(event) => handleCtaChange('primaryCta', 'label', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
                <Input
                  value={draft.primaryCta?.href ?? ''}
                  placeholder="/education/xp"
                  onChange={(event) => handleCtaChange('primaryCta', 'href', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CTA secundária</p>
                <Input
                  value={draft.secondaryCta?.label ?? ''}
                  placeholder="Label"
                  onChange={(event) => handleCtaChange('secondaryCta', 'label', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
                <Input
                  value={draft.secondaryCta?.href ?? ''}
                  placeholder="/education/houses"
                  onChange={(event) => handleCtaChange('secondaryCta', 'href', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="bg-gradient-to-r from-[#fdd87c] to-[#fcb045] text-[#1e1500]" onClick={handlePreview}>
                <MonitorPlay className="mr-2 h-4 w-4" /> Pré-visualizar pop-up
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Guardar rascunho
              </Button>
            </div>
          </CardContent>
        </Card>

        </div>
        {!isAccepted ? (
          <p className="text-sm text-amber-300">Aceita o Termo para editar e publicar pop-ups.</p>
        ) : null}

      </main>

      <Footer />

      {previewOpen ? (
        <OnboardingPopup
          data={resolvedDraft}
          open
          lockSeconds={3}
          onClose={() => setPreviewOpen(false)}
          onAction={({ action }) => {
            if (action !== 'dismiss') {
              setStatus(`Simulaste ação: ${action}.`);
            }
          }}
        />
      ) : null}
    </div>
  );
}
