'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CryptoTicker } from '@/components/CryptoTicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Trophy,
  BookOpen,
  Users,
  Zap,
  Target,
  Globe2,
  TrendingUp,
  Award,
} from 'lucide-react';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { MediaAsset } from '@/types/builder';

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80';

const SECTION_KEYS = ['hero', 'web3Academy', 'web3Sports'] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const DEFAULT_ACADEMY_IMAGE =
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80';
const DEFAULT_SPORTS_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80';

const DEFAULT_MEDIA_SETTINGS: Record<
  SectionKey,
  { asset: MediaAsset | null; offset: number }
> = {
  hero: { asset: null, offset: 0 },
  web3Academy: { asset: null, offset: 0 },
  web3Sports: { asset: null, offset: 0 },
};

export default function Home() {
  const { t } = useLanguage();
  const { user, getToken } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [stats, setStats] = useState<any>(null);
  const [mediaSettings, setMediaSettings] = useState<
    Record<SectionKey, { asset: MediaAsset | null; offset: number }>
  >(() => ({ ...DEFAULT_MEDIA_SETTINGS }));
  const [heroOffset, setHeroOffset] = useState(0);
  const [mediaSettingsLoaded, setMediaSettingsLoaded] = useState(false);
  const [mediaDialogState, setMediaDialogState] = useState<{
    open: boolean;
    section: SectionKey | null;
  }>({ open: false, section: null });
  const library = useMediaLibrary();

  const heroAsset = mediaSettings.hero.asset;
  const heroImageUrl = heroAsset?.url || DEFAULT_HERO_IMAGE;
  const academyImageUrl =
    mediaSettings.web3Academy.asset?.url || DEFAULT_ACADEMY_IMAGE;
  const sportsImageUrl =
    mediaSettings.web3Sports.asset?.url || DEFAULT_SPORTS_IMAGE;

  const sectionDialogTitles: Record<SectionKey, string> = {
    hero: 'Imagem do Hero',
    web3Academy: 'Imagem da Web3 Academy',
    web3Sports: 'Imagem da Web3 Sports',
  };

  const sectionDialogDescriptions: Record<SectionKey, string> = {
    hero: 'Selecione ou envie a imagem que ficará no hero principal da homepage.',
    web3Academy:
      'Escolha a imagem que representa a Web3 Academy e o seu conteúdo de formação.',
    web3Sports:
      'Defina a imagem que transmite a experiência Web3 para desportos e comunidades.',
  };

  const openMediaDialogFor = useCallback(
    (section: SectionKey) => {
      setMediaDialogState({ open: true, section });
      void library.openLibrary('library');
    },
    [library],
  );

  const handleMediaDialogOpenChange = useCallback((open: boolean) => {
    setMediaDialogState((prev) => ({
      open,
      section: open ? prev.section : null,
    }));
  }, []);

  const updateMediaSetting = useCallback(
    async (payload: {
      section: SectionKey;
      assetId?: string | null;
      offset?: number;
    }) => {
      try {
      const token = getToken?.();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/media/settings', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          console.error('Failed to persist media setting:', data?.error);
        }
        return data?.setting ?? null;
      } catch (error) {
        console.error('Failed to persist media setting:', error);
        return null;
      }
    },
    [],
  );

  const applyMediaSelection = useCallback(
    (section: SectionKey, asset: MediaAsset) => {
      let previousOffset = 0;
      setMediaSettings((prev) => {
        previousOffset = prev[section].offset;
        return {
          ...prev,
          [section]: {
            ...prev[section],
            asset,
          },
        };
      });
      void updateMediaSetting({
        section,
        assetId: asset.id,
        offset: section === 'hero' ? heroOffset : previousOffset,
      });
    },
    [heroOffset, updateMediaSetting],
  );

  const handleMediaSelect = useCallback(
    (asset: MediaAsset) => {
      const section = mediaDialogState.section;
      if (!section) return;
      applyMediaSelection(section, asset);
    },
    [applyMediaSelection, mediaDialogState.section],
  );

  const activeDialogSection = mediaDialogState.section;
  const dialogTitle = activeDialogSection
    ? sectionDialogTitles[activeDialogSection]
    : 'Media Library';
  const dialogDescription = activeDialogSection
    ? sectionDialogDescriptions[activeDialogSection]
    : 'Selecione ou envie ficheiros para o Legacy.';

  const pillarCards = [
    {
      title: 'Explora o Blog Público',
      desc: 'Artigos e notícias que descomplicam Web3, Blockchain e Apertum.',
      icon: BookOpen,
      link: '/blog',
      cta: 'Ver artigos',
    },
    {
      title: 'Aprende com Conteúdos Exclusivos',
      desc: 'Cursos, módulos e lições com XP genuíno dentro da Academia Web3.',
      icon: Award,
      link: '/education/courses',
      cta: 'Entrar nos cursos',
    },
    {
      title: 'Conecta-te a uma House',
      desc: 'Houses of Sports globais para praticantes, criadores e curious minds.',
      icon: Users,
      link: '/sports/houses',
      cta: 'Explorar Houses',
    },
  ];

  const academyHighlights = [
    { label: 'Cursos com XP validado', value: '12+' },
    { label: 'Módulos guiados', value: '4' },
    { label: 'Lições públicas+privadas', value: '28' },
  ];

  const sportsHighlights = [
    { label: 'Houses em funcionamento', value: '9' },
    { label: 'Regiões de operação', value: '6' },
    { label: 'Mentores ativos', value: '18' },
  ];

  const storySteps = [
    {
      title: '1 · Conhecimento aberto',
      desc: 'O blog mostra Web3, Blockchain e Apertum em linguagem clara.',
    },
    {
      title: '2 · Cursos + XP',
      desc: 'Avança pelos cursos da Academia e acumula XP real e privado.',
    },
    {
      title: '3 · Houses e comunidade',
      desc: 'Conecta-te às Houses of Sports e encontra mentores/pares mundiais.',
    },
  ];


  const handleHeroOffsetChange = useCallback(
    (value: number) => {
      const heroAssetId = mediaSettings.hero.asset?.id ?? null;
      setHeroOffset(value);
      setMediaSettings((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          offset: value,
        },
      }));
      void updateMediaSetting({
        section: 'hero',
        assetId: heroAssetId,
        offset: value,
      });
    },
    [mediaSettings.hero.asset?.id, updateMediaSetting],
  );

  const handleRemoveHeroImage = useCallback(() => {
    setMediaSettings((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        asset: null,
      },
    }));
    setHeroOffset(0);
    void updateMediaSetting({
      section: 'hero',
      assetId: null,
      offset: 0,
    });
  }, [updateMediaSetting]);

  const fetchMediaSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/media/settings');
      const data = await response.json();
      if (data.success) {
      const nextSettings = SECTION_KEYS.reduce((acc, section) => {
        const remote = data.settings?.[section];
        return {
          ...acc,
          [section]: {
            asset: remote?.asset ?? null,
            offset:
              typeof remote?.offset === 'number'
                ? remote.offset
                : typeof remote?.vertical_offset === 'number'
                ? remote.vertical_offset
                : 0,
          },
        };
      }, {} as Record<SectionKey, { asset: MediaAsset | null; offset: number }>);
        setMediaSettings(nextSettings);
        setHeroOffset(nextSettings.hero.offset ?? 0);
      }
    } catch (error) {
      console.error('Failed to load media settings:', error);
    } finally {
      setMediaSettingsLoaded(true);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/education/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchMediaSettings();
  }, [fetchMediaSettings]);

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <CryptoTicker />
      <Header />

      <main className="flex-1 px-4">
        {/* HERO DARK FUTURISTA */}
        <section className="relative overflow-hidden text-white min-h-[640px] bg-slate-950">
            <div className="absolute inset-0">
              <img
                src={heroImageUrl}
                alt="Hero legacy"
                className="w-full h-full object-cover object-center"
                style={{
                  objectPosition: `center calc(50% + ${heroOffset}px)`,
                  opacity: mediaSettingsLoaded ? 1 : 0,
                }}
              />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
          </div>
          {isSuperAdmin && (
            <div className="absolute top-6 right-6 flex flex-col gap-3 bg-slate-900/70 px-4 py-3 rounded-2xl border border-white/20 shadow-xl">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/50 text-white/80"
                  onClick={() => openMediaDialogFor('hero')}
                >
                  Editar imagem
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-red-500/60 text-red-300 hover:bg-red-500/10"
                  onClick={handleRemoveHeroImage}
                >
                  Eliminar imagem
                </Button>
              </div>
              <label className="text-xs uppercase tracking-widest text-slate-300">
                Ajuste vertical
              </label>
              <input
                type="range"
                min={-200}
                max={200}
                value={heroOffset}
                onChange={(event) => handleHeroOffsetChange(Number(event.target.value))}
                className="w-48 accent-sky-400"
              />
            </div>
          )}
          <div className="relative z-10 container mx-auto px-0 h-full" />
        </section>

        <section className="py-12 bg-background text-white">
          <div className="container mx-auto px-4 text-center space-y-4">
            <p className="text-xs tracking-[0.6em] uppercase text-slate-400">LEGACY XP</p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              {t('hero.title')}
            </h1>
            <p className="text-base text-gray-400 max-w-3xl mx-auto">
              {t('hero.description')}
            </p>
            <div className="flex justify-center flex-wrap gap-4">
              <Link href={user ? '/education/courses' : '/signup'}>
                <Button size="lg" className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
                  {user ? 'Continuar Aprendizagem' : 'Junte-se Agora'}
                </Button>
              </Link>
              <Link href="/education">
                <Button size="lg" variant="outline" className="px-8 border-sky-500 text-sky-200 hover:bg-slate-900">
                  Saiba Mais
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-950 text-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {pillarCards.map((card) => (
                <div key={card.title} className="bg-card border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <card.icon className="h-8 w-8 text-sky-400 mb-3" />
                    <h3 className="text-xl font-semibold text-gray-100 mb-2">{card.title}</h3>
                    <p className="text-sm text-gray-400">{card.desc}</p>
                  </div>
                  <Link href={card.link}>
                    <Button size="sm" variant="ghost" className="px-3 border border-slate-700 text-slate-200 hover:bg-white/5 mt-4">
                      {card.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-background text-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center max-w-6xl mx-auto">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-slate-400">Web3 Academy</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-100 mb-4">
                  Cursos imersivos, módulos guiados, XP genuíno.
                </h2>
                <p className="text-gray-400 mb-6 max-w-3xl">
                  {t('hero.description')}
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Link href="/education/courses">
                    <Button size="lg" className="px-6 bg-sky-500 hover:bg-sky-400 text-slate-950">
                      Explorar cursos
                    </Button>
                  </Link>
                  <Link href="/education/courses">
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-6 border-gray-600 text-gray-200 hover:bg-gray-900"
                    >
                      Ver módulos
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-6 flex-wrap">
                  {academyHighlights.map((item) => (
                    <div key={item.label} className="bg-card border border-slate-800 rounded-2xl px-5 py-4 text-left">
                      <p className="text-3xl font-semibold text-gray-100">{item.value}</p>
                      <p className="text-sm uppercase tracking-widest text-gray-400 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative h-64 md:h-80 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                <img
                  src={academyImageUrl}
                  alt="Web3 Academy experience"
                  className="w-full h-full object-cover object-center"
                />
                {isSuperAdmin && (
                  <div className="absolute top-3 right-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/60 text-white/80 hover:bg-white/5"
                      onClick={() => openMediaDialogFor('web3Academy')}
                    >
                      Editar imagem
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-950 text-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center max-w-6xl mx-auto">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-slate-400">Web3 Sports</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-100 mb-4">
                  Houses of Sports e onboarding personalizado.
                </h2>
                <p className="text-gray-400 mb-6 max-w-3xl">
                  Comunidade global para aplicar Web3 com segurança e propósito.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Link href="/sports/houses">
                    <Button size="lg" className="px-6 bg-sky-500 hover:bg-sky-400 text-slate-950">
                      Explorar Houses
                    </Button>
                  </Link>
                  <Link href="/sports/onboarding">
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-6 border-gray-600 text-gray-200 hover:bg-gray-900"
                    >
                      Iniciar Onboarding
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-6 flex-wrap">
                  {sportsHighlights.map((item) => (
                    <div key={item.label} className="bg-card border border-slate-800 rounded-2xl px-5 py-4 text-left">
                      <p className="text-3xl font-semibold text-gray-100">{item.value}</p>
                      <p className="text-sm uppercase tracking-widest text-gray-400 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative h-64 md:h-80 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                <img
                  src={sportsImageUrl}
                  alt="People collaborating in sports tech"
                  className="w-full h-full object-cover object-center"
                />
                {isSuperAdmin && (
                  <div className="absolute top-3 right-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/60 text-white/80 hover:bg-white/5"
                      onClick={() => openMediaDialogFor('web3Sports')}
                    >
                      Editar imagem
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-background text-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {storySteps.map((step) => (
                <div key={step.title} className="bg-card border border-slate-800 rounded-2xl p-5 h-full shadow-sm">
                  <h3 className="text-2xl font-bold text-sky-300 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-slate-950 text-white">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400 mb-4">Legacy é</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Conteúdos públicos', 'Cursos privados com XP genuíno', 'Houses globais / capacitação profissional'].map((chip) => (
                <span
                  key={chip}
                  className="px-4 py-2 border border-slate-800 rounded-full text-sm text-gray-200 bg-white/5"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-background text-white">
          <div className="container mx-auto px-4 text-center space-y-6 max-w-3xl">
            <h3 className="text-2xl font-semibold text-gray-100">FAQs rápidas</h3>
            <div className="space-y-4 text-left">
              <div className="bg-card border border-slate-800 rounded-2xl p-5">
                <p className="text-lg font-semibold text-gray-100">Preciso ser atleta profissional?</p>
                <p className="text-sm text-gray-400 mt-2">
                  Não. Legacy aceita qualquer pessoa curiosa por Web3, desporto ou blockchain, com especial cuidado para profissionais do desporto.
                </p>
              </div>
              <div className="bg-card border border-slate-800 rounded-2xl p-5">
                <p className="text-lg font-semibold text-gray-100">Como ganho XP dentro da Legacy?</p>
                <p className="text-sm text-gray-400 mt-2">
                  Conclui lições e cursos exclusivos, participa da comunidade Houses e revisita o blog para inspiração contínua.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* CTA FINAL */}
        <section className="py-16 bg-gradient-to-r from-slate-950 via-blue-900 to-slate-950 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.readyJourney')}
            </h2>
            <p className="text-xl text-sky-200 mb-6 max-w-2xl mx-auto">
              {t('home.joinThousands')}
            </p>
            <p className="text-sm text-gray-200 mb-8 max-w-2xl mx-auto">
              {user
                ? 'És parte da comunidade Legacy? Explora agora as Houses of Sports e continua a crescer com os teus pares.'
                : 'És profissional ou entusiasta de um desporto específico? Preenche o formulário de Onboarding personalizado e recebe ajuda dedicada nos primeiros passos.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={user ? '/sports/houses' : '/sports/onboarding'}>
                <Button
                  size="lg"
                  className="px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                >
                  {user ? 'Explorar Houses' : 'Começar Onboarding'}
                </Button>
              </Link>
              <Link href="/blog">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 border-sky-300 text-sky-100 hover:bg-slate-900"
                >
                  {t('home.exploreBlog')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <MediaLibraryDialog
          open={mediaDialogState.open}
          onOpenChange={(open) => handleMediaDialogOpenChange(open)}
          library={library}
          onSelect={handleMediaSelect}
          title={dialogTitle}
          description={dialogDescription}
          allowUrl
        />
      </main>

      <Footer />
    </div>
  );
}
