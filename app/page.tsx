'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, CircleDot, GraduationCap, ShieldCheck, Users } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaAsset } from '@/types/builder';

const GUEST_PRIMARY = { label: 'Junte-se Agora', href: '/sports/onboarding' };
const GUEST_SECONDARY = {
  label: 'Começar a Jornada Web3',
  description:
    'És profissional ou entusiasta de algum desporto específico? Preenche o formulário e recebe ajuda personalizada nos primeiros passos.',
  href: '/sports/onboarding',
};
const MEMBER_PRIMARY = { label: 'Explorar Cursos', href: '/education/courses' };
const MEMBER_SECONDARY = {
  label: 'Ver Houses',
  description: 'A comunidade global das Houses of Sports está pronta para te receber.',
  href: '/sports/houses',
};

const pillarCards = [
  {
    title: 'Explora o Blog Público',
    description:
      'Aprende Web3, Blockchain e Apertum com histórias e análises escritas por jornalistas e entusiastas.',
    icon: BookOpen,
    href: '/blog',
    action: 'Ver artigos',
  },
  {
    title: 'Aprende com Conteúdos Exclusivos',
    description:
      'Cursos, módulos e lições gamificadas que recompensam XP real e privado para quem quer aprofundar o conhecimento.',
    icon: GraduationCap,
    href: '/education/courses',
    action: 'Entrar nos cursos',
  },
  {
    title: 'Conecta-te a uma Casa de Desporto',
    description:
      'Houses of Sports espalhadas pelo mundo para te aproximar de mentores e pares no ecossistema Apertum.',
    icon: Users,
    href: '/sports/houses',
    action: 'Explorar Houses',
  },
];

const storySteps = [
  {
    title: '1 · Consome conhecimentos públicos',
    copy: 'Lê o blog para dominar os fundamentos Web3 e perceber o papel da Apertum.',
    icon: Activity,
  },
  {
    title: '2 · Aprofunda com conteúdos exclusivos',
    copy: 'Segues cursos da Academia Web3, completas lições e acumulas XP genuíno.',
    icon: GraduationCap,
  },
  {
    title: '3 · Prepara-te com a comunidade',
    copy: 'As Houses of Sports ligam-te a profissionais que vivem o ecossistema Web3 diariamente.',
    icon: ShieldCheck,
  },
];

const academyHighlights = [
  'Módulos guiados para todos os níveis',
  'XP de aprendizagem autenticada a cada lição concluída',
  'Tutoriais em Blockchain e nos principais desportos',
];

const navigationHighlights = [
  {
    label: 'XP & Níveis',
    description: 'Vê como o teu XP evolui, desbloqueia streaks e acompanha o teu progresso.',
    href: '/education/xp',
  },
  {
    label: 'Leaderboard',
    description: 'Sobe na tabela global e vê quem lidera a aprendizagem Web3.',
    href: '/education/leaderboard',
  },
  {
    label: 'Eventos',
    description: 'Explora próximos eventos físicos e digitais ligados ao ecossistema Apertum.',
    href: '/events',
  },
  {
    label: 'Fórum',
    description: 'Entra nas salas do fórum para trocar ideias com a comunidade.',
    href: '/forum',
  },
];

const legacyValues = ['Conteúdos públicos', 'Cursos privados com XP genuíno', 'Houses globais / capacitação profissional'];

const faqs = [
  {
    question: 'Preciso ser atleta para participar?',
    answer:
      'O Legacy aceita profissionais, entusiastas e curiosos pela Web3. O foco é aproximar qualquer pessoa interessada em desporto e Apertum.',
  },
  {
    question: 'Como ganho XP?',
    answer:
      'Conclui lições e cursos da Academia Web3, participa em desafios da comunidade e os pontos são adicionados automaticamente ao teu perfil.',
  },
];

const CTA_SUBTITLE = 'Para membros Legacy ou quem quer fazer parte da comunidade global Web3 + Desporto.';

export default function HomePage() {
  const { user } = useAuth();
  const mediaLibrary = useMediaLibrary();
  const [heroAsset, setHeroAsset] = useState<MediaAsset | null>(null);
  const [heroOffset, setHeroOffset] = useState(0);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const openHeroMediaLibrary = () => {
    setHeroDialogOpen(true);
    void mediaLibrary.openLibrary();
  };

  const heroButtons = useMemo(() => {
    if (user) {
      return [MEMBER_PRIMARY, MEMBER_SECONDARY];
    }
    return [GUEST_PRIMARY, GUEST_SECONDARY];
  }, [user]);

  const heroImageUrl = heroAsset?.url || 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1600&q=80';
  const heroActionDescription = user
    ? 'Explora cursos e liga-te a Houses globais.'
    : 'Começa a tua jornada Web3 com onboarding personalizado.';

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const res = await fetch('/api/media/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success) return;
        const hero = data.settings?.hero;
        if (hero?.asset) {
          setHeroAsset(hero.asset);
        }
        if (typeof hero?.offset === 'number') {
          setHeroOffset(hero.offset);
        }
      } catch (error) {
        console.error('Unable to load hero settings', error);
      }
    };
    fetchHero();
  }, []);

  const persistHeroSetting = async (assetId: string | null, offset?: number) => {
    try {
      await fetch('/api/admin/media/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'hero', assetId, offset }),
      });
    } catch (error) {
      console.error('Unable to persist hero setting', error);
    }
  };

  const handleHeroSelect = async (asset: MediaAsset) => {
    setHeroAsset(asset);
    await persistHeroSetting(asset.id, heroOffset);
  };

  const handleOffsetChange = async (value: number[]) => {
    const next = value[0];
    setHeroOffset(next);
    await persistHeroSetting(heroAsset?.id ?? null, next);
  };

  return (
    <div className="min-h-screen bg-[#000c12] text-white">
      <Header />

      <main className="space-y-16">
        <section className="relative isolate overflow-hidden bg-[#000c12] px-6 py-16">
          <div className="absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center" style={{ minHeight: '420px' }}>
            <div className="relative z-10 flex-1 space-y-6">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">LEGACY XP</p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                LEGACY: Gamified Web3 Academy for Sports
              </h1>
              <p className="text-lg text-slate-200">{heroActionDescription}</p>
              <div className="flex flex-wrap gap-4">
                {heroButtons.map((action) => (
                  <Button key={action.label} variant="default" asChild>
                    <Link href={action.href} className="flex items-center gap-2">
                      {action.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-300">{CTA_SUBTITLE}</p>
            </div>
            <div className="relative flex-1 rounded-[32px] border border-white/10 bg-slate-950 shadow-2xl">
              <div
                className="h-72 rounded-[32px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.65)), url('${heroImageUrl}')`,
                  backgroundPosition: `center ${heroOffset}px`,
                }}
              ></div>
              {user?.role === 'Super Admin' && (
                <div className="absolute right-4 -top-4 flex items-center gap-3 rounded-full border border-white/40 bg-black/80 px-4 py-2 text-xs text-white">
                  <Button size="sm" variant="ghost" onClick={openHeroMediaLibrary}>
                    Editar imagem
                  </Button>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-slate-200">
                    <span>Offset</span>
                    <Slider
                      className="w-24"
                      value={[heroOffset]}
                      min={-120}
                      max={120}
                      step={1}
                      onValueChange={handleOffsetChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <MediaLibraryDialog
            open={heroDialogOpen || mediaLibrary.isOpen}
            onOpenChange={(open) => {
              setHeroDialogOpen(open);
              if (open) {
                mediaLibrary.openLibrary();
              } else {
                mediaLibrary.closeLibrary();
              }
            }}
            library={mediaLibrary}
            onSelect={handleHeroSelect}
            title="Imagem do Hero"
            description="Seleciona ou envia a imagem principal para a homepage do Legacy."
          />
        </section>

        <section className="bg-[#05212b] px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">LEGACY XP HIGHLIGHTS</p>
                <h2 className="text-3xl font-semibold text-white">Transparência total de XP</h2>
              </div>
              <span className="text-sm text-slate-300">Alterna entre conteúdo público e privado com XP auditado.</span>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Aprende com blog público', value: '5 - 33 XP' },
                { label: 'Lições concluídas', value: '7 - 33 XP' },
                { label: 'Streak 7 dias', value: '222 XP' },
                { label: 'Streak 30 dias', value: '1.111 XP' },
              ].map((item) => (
                <Card
                  key={item.label}
                  className={cn('border border-white/10 bg-[#000c12]', 'duration-200 hover:-translate-y-0.5')}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-200">{item.label}</CardTitle>
                    <CardDescription className="text-2xl font-bold text-white">{item.value}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#000c12] px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">TRÊS PILARES</p>
              <h2 className="text-3xl font-semibold text-white">O Legacy revela o que existe de verdade em cada área</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {pillarCards.map((pill) => (
                <Card
                  key={pill.title}
                  className={cn('border-white/10 bg-[#05212b] text-white shadow-xl', 'flex flex-col justify-between p-6')}
                >
                  <div className="flex items-center gap-4">
                    <pill.icon className="h-6 w-6 text-cyan-300" />
                    <CardTitle className="text-lg font-bold">{pill.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-4 text-sm text-slate-200">{pill.description}</CardDescription>
                  <Link href={pill.href} className="mt-6 text-sm font-semibold text-cyan-300">
                    {pill.action} <ArrowRight className="inline-block h-4 w-4" />
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#05212b] px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">STORY</p>
              <h2 className="text-3xl font-semibold text-white">3 passos para dominar o ecossistema</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {storySteps.map((step) => (
                <Card key={step.title} className="border border-white/10 bg-[#000c12] p-6">
                  <div className="flex items-center gap-3">
                    <step.icon className="h-5 w-5 text-cyan-300" />
                    <CardTitle className="text-base font-semibold">{step.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-3 text-sm text-slate-200">{step.copy}</CardDescription>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#000c12] px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">EXPLORA O LEGACY</p>
              <h2 className="text-3xl font-semibold text-white">O que podes fazer dentro da plataforma</h2>
              <p className="mt-2 text-sm text-slate-300">
                Do XP à tabela de líderes, passando por eventos e fórum, o Legacy conecta aprendizagem, comunidade e oportunidades reais.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {navigationHighlights.map((item) => (
                <Card
                  key={item.label}
                  className="flex h-full flex-col justify-between border border-white/10 bg-[#05212b] p-5"
                >
                  <div className="space-y-2">
                    <CardTitle className="text-sm font-semibold text-white">{item.label}</CardTitle>
                    <CardDescription className="text-xs text-slate-200">{item.description}</CardDescription>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={item.href} className="text-xs">
                        Entrar
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#05212b] px-6 py-16">
          <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">HOUSES OF SPORTS</p>
              <h2 className="text-3xl font-semibold text-white">A tua casa dentro do ecossistema</h2>
              <p className="text-sm text-slate-200">
                As Houses of Sports são comunidades distribuídas por várias cidades, pensadas para ligar atletas, profissionais e entusiastas que querem
                crescer no universo Web3 + Desporto. Mentores, eventos, treino e networking num só lugar.
              </p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-cyan-300" />
                  Mentoria local com foco em Web3 e carreira.
                </li>
                <li className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-cyan-300" />
                  Eventos presenciais e digitais com a comunidade Legacy.
                </li>
                <li className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-cyan-300" />
                  Pontos de contacto oficiais da Apertum no desporto.
                </li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Button variant="default" asChild>
                  <Link href="/sports/houses">Explorar Houses</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/sports/onboarding">Encontrar a tua House</Link>
                </Button>
              </div>
            </div>
            <div className="relative rounded-[32px] border border-white/10 bg-[#000c12] p-6">
              <div
                className="h-64 rounded-[24px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.75)), url('${heroImageUrl}')`,
                }}
              />
              <p className="mt-4 text-xs text-slate-300">
                Começa pelo onboarding personalizado, partilha o teu contexto (atleta, treinador, gestor, criador de conteúdo ou fã) e recebe recomendações
                sobre a melhor House para ti.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#000c12] px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">WEB3 ACADEMY</p>
              <h2 className="text-3xl font-semibold text-white">Academia Web3</h2>
              <p className="text-sm text-slate-300">
                Cursos estruturados que combinam teoria, prática e XP autenticado para profissionais ou quem quer explorar Blockchain e Apertum.
              </p>
              <ul className="space-y-2 text-sm text-slate-200">
                {academyHighlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-cyan-300" />
                    {highlight}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4">
                <Button variant="secondary" asChild>
                  <Link href="/education/courses">Explorar Academia Web3</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/education/courses">Ver Cursos</Link>
                </Button>
              </div>
            </div>
            <div className="relative rounded-[32px] border border-white/10 bg-[#05212b] p-6 shadow-2xl">
              <div
                className="h-56 rounded-[24px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url('${heroImageUrl}')`,
                }}
              />
              {user?.role === 'Super Admin' && (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-200">
                  <Button size="sm" variant="ghost" onClick={openHeroMediaLibrary}>
                    Editar imagem
                  </Button>
                  <span>Offset {heroOffset}px</span>
                </div>
              )}
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[{
                  label: 'Cursos',
                  value: 'Cursos em preparação',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#000c12] p-4">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
                {[{
                  label: 'Lições',
                  value: 'Lições em construção',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#000c12] p-4">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
                {[{
                  label: 'Membros',
                  value: 'Primeiros membros a chegar',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#000c12] p-4">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
                {[{
                  label: 'Idiomas',
                  value: 'Idiomas planeados',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#000c12] p-4">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#000c12] px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-6">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">LEGACY É</p>
            <div className="flex flex-wrap gap-3">
              {legacyValues.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-white/30 bg-[#05212b] px-4 py-1 text-xs uppercase tracking-[0.4em] text-cyan-100"
                >
                  {value}
                </span>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <Card key={faq.question} className="border border-white/10 bg-[#05212b] p-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">{faq.question}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{faq.answer}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-[#1d98a6] via-[#14718f] to-[#126e84] px-6 py-16">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.6em] text-white">PRONTO PARA COMEÇAR A TUA JORNADA WEB3?</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">O Legacy é a tua porta de entrada para a Web3 + Desporto.</h2>
            <p className="mt-2 text-sm text-cyan-50">A comunidade de Houses e os cursos da Academia estão alinhados para te preparar para o futuro.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="default" asChild>
                <Link href={user ? '/sports/houses' : '/sports/onboarding'}>
                  {user ? 'Ir para as Houses' : 'Começar'}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/education/courses">Descobrir a Academia</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
