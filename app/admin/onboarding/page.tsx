'use client';

import { useMemo, useState } from 'react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { OnboardingPopup, type OnboardingPopupData } from '@/components/education/OnboardingPopup';
import { fetchHouseOnboardingData } from '@/data/onboarding-demo';
import { Loader2, RefreshCcw, MonitorPlay, Save } from 'lucide-react';

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
      const data = await fetchHouseOnboardingData(houseKey);
      const popup = data.popups[0] ?? DEFAULT_DRAFT;
      setDraft(popup);
      setHighlightsInput((popup.highlights ?? []).join('\n'));
      setStatus(`Sequência importada de ${data.house}.`);
    } catch {
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
