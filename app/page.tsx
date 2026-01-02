'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, ArrowRight, CircleDot, GraduationCap, ShieldCheck } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useManagedMediaSetting } from '@/hooks/useManagedMediaSetting';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaAsset } from '@/types/builder';

const PRIMARY_CTA = { label: 'Registar e Começar', href: '/signup' };
const SECONDARY_CTA = { label: 'Explorar a Academia', href: '/education/courses' };

const storySteps = [
  {
    title: '1 · Regista-te',
    copy: 'Cria a tua conta em segundos e recebe onboarding personalizado para a tua realidade.',
    icon: Activity,
    bullets: [],
  },
  {
    title: '2 · Consome conteúdos',
    copy: 'Aprende no teu ritmo com o caminho guiado da Academia e o apoio do glossário dinâmico.',
    icon: GraduationCap,
    bullets: [
      { label: 'Começa pelas aulas e pelo glossário.', href: '/education/courses' },
      { label: 'Usa o blog para ganhar contexto real.', href: '/blog' },
      { label: 'Entra na comunidade quando fizer sentido para ti.', href: '/sports/houses' },
    ],
  },
  {
    title: '3 · Ganha XP e progride',
    copy: 'Cada leitura, lição e interação acrescenta XP, desbloqueia o leaderboard global e mostra consistência.',
    icon: ShieldCheck,
    bullets: [],
  },
];

const academyHighlights = [
  'Módulos guiados para todos os níveis',
  'XP de aprendizagem autenticada a cada lição concluída',
  'Tutoriais em Blockchain e nos principais desportos',
];

const coursePreviews = [
  {
    title: 'Começa Aqui: Apertum Essentials',
    summary: 'Mapa mental simples para entender a Apertum, carteiras e segurança básica.',
  },
  {
    title: 'Desporto + Blockchain',
    summary: 'Casos reais de clubes, atletas e equipas que já operam com Web3.',
  },
  {
    title: 'XP aplicado no dia a dia',
    summary: 'Como usar o XP como prova de consistência para entrar em comunidades e jobs.',
  },
];

const sevenDayWins = [
  'Sabes por onde começar e o que ignorar.',
  'Reconheces erros comuns antes de os cometer.',
  'Consegues ler informação básica on-chain.',
  'Usas o glossário sem travar a aprendizagem.',
  'Tens um mapa mental claro do ecossistema.',
];

const glossaryDemo = {
  term: 'Apertum Blockchain',
  definition: 'Rede modular focada em desporto e creators com XP registado on-chain.',
  example: 'Ex.: Cada lição concluída gera XP e desbloqueia novas missões.',
};

const navigationHighlights = [
  {
    label: 'Painel de XP',
    description: 'Consulta streaks, níveis e XP variável para cada conteúdo consumido.',
    href: '/education/xp',
  },
  {
    label: 'XP + Leaderboard',
    description: 'Cada ação gera XP e posiciona-te na tabela global da comunidade.',
    href: '/education/leaderboard',
  },
  {
    label: 'Missões e streaks',
    description: 'Progressão contínua para mostrar consistência sem pressão.',
    href: '/education/xp',
  },
];

const legacyValues = [
  'Educação pública primeiro',
  'XP antes de promessas',
  'Segurança em vez de hype',
  'Comunidade + Apertum',
];

const testimonials = [
  { quote: 'Finalmente um caminho para aprender Web3 sem ruído nem hype.', role: 'Coach, Portugal' },
  { quote: 'O glossário integrado mudou tudo. Aprendo sem sair da aula.', role: 'Atleta, Espanha' },
  { quote: 'XP fez-me voltar todos os dias. Não por vício, por clareza.', role: 'Gestor, Brasil' },
  { quote: 'Comecei do zero. Hoje entendo o que estou a fazer.', role: 'Entusiasta, França' },
  { quote: 'Apertum só fez sentido quando ganhei contexto com o Legacy.', role: 'Community Builder, Itália' },
  { quote: 'Provei primeiro, depois decidi entrar. Não há promessas vazias.', role: 'Creator, Estados Unidos' },
];

const faqs = [
  {
    question: 'Isto é mesmo gratuito?',
    answer:
      'Sim. O acesso à Academia, Glossário e leaderboard é gratuito. Podes avançar no teu ritmo e ganhar XP sem custos escondidos.',
  },
  {
    question: 'Preciso de experiência em cripto?',
    answer:
      'Não. Temos glossário integrado, cursos introdutórios e onboarding guiado. Começas do zero e evoluis com contexto.',
  },
  {
    question: 'Isto é para atletas apenas?',
    answer:
      'O foco é desporto + Web3, mas aceitamos profissionais, estudantes e curiosos que querem aprender e contribuir.',
  },
  {
    question: 'O que é XP e para que serve?',
    answer:
      'XP é o registo da tua consistência. Cada leitura, lição ou desafio gera XP que aparece no teu perfil e leaderboard.',
  },
  {
    question: 'Como é que a Apertum entra aqui?',
    answer:
      'A Apertum fornece a blockchain e os programas que usamos para autenticar XP, Houses e oportunidades reais.',
  },
  {
    question: 'Isto é aconselhamento financeiro?',
    answer:
      'Não. É educação e comunidade. Não prometemos ganhos nem damos recomendações financeiras.',
  },
];

const HERO_TRUST_COPY = 'Sem custos. Sem promessas fáceis. Evolução visível com XP.';
const HERO_URGENCY = 'A Web3 já é o presente — e apenas uma minoria está realmente posicionada.';
const LEGACY_SIGNATURE = 'Educação antes de exposição.';

export default function HomePage() {
  const { user } = useAuth();
  const mediaLibrary = useMediaLibrary();
  const heroMedia = useManagedMediaSetting('hero', {
    fallbackUrl:
      'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1600&q=80',
    initialOffset: 0,
    enableOffset: true,
  });
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const openHeroMediaLibrary = () => {
    setHeroDialogOpen(true);
    void mediaLibrary.openLibrary();
  };

  const heroImageUrl =
    heroMedia.assetUrl ||
    'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1600&q=80';
  const heroOffset = heroMedia.offset ?? 0;
  const heroActionDescription = user
    ? 'Explora cursos e liga-te a Houses globais.'
    : 'Começa a tua jornada Web3 com onboarding personalizado.';
  const handleHeroSelect = async (asset: MediaAsset) => {
    await heroMedia.setAsset(asset);
  };

  const handleOffsetChange = async (value: number[]) => {
    const next = value[0];
    await heroMedia.setOffset(next);
  };

  return (
    <div className="min-h-screen bg-[#000c12] text-white">
      <Header />

      <main className="space-y-16">
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-16 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-12 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center" style={{ minHeight: '420px' }}>
            <div className="relative z-10 flex-1 space-y-6">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">LEGACY XP</p>
              <h1 className="text-4xl font-semibold leading-tight text-[#fdd87c] md:text-5xl">
                Academia Web3 Gratuita, focada na Apertum Blockchain
              </h1>
              <p className="text-lg text-slate-100">
                Educação prática e progressiva para homens e mulheres em qualquer parte do mundo. Especial atenção ao desporto — mas aberta a qualquer
                pessoa com curiosidade pela Web3.
              </p>
              <p className="text-base font-semibold text-white">{LEGACY_SIGNATURE}</p>
              <p className="text-sm text-amber-200 font-medium">{HERO_URGENCY}</p>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="default"
                  asChild
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                >
                  <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href} className="flex items-center gap-2">
                    {PRIMARY_CTA.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="border-white/40 text-white hover:bg-white/10">
                  <Link href={SECONDARY_CTA.href}>{SECONDARY_CTA.label}</Link>
                </Button>
              </div>
              <p className="text-xs text-cyan-200/80">{HERO_TRUST_COPY}</p>
            </div>
            <div className="relative flex-1 rounded-[32px] border border-white/10 bg-[#04131b] shadow-[0_30px_80px_rgba(3,10,25,0.65)]">
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
        <section className="px-6">
          <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#020b16] px-6 py-8 text-sm text-slate-200 shadow-[0_25px_60px_rgba(3,10,25,0.45)]">
            <p>
              O portal Legacy junta onboarding personalizado, cursos com XP autenticado e ligação às Houses of Sports num único fluxo. Começas a entender o
              ecossistema Apertum sem ruído, descobres onde o XP aparece e vês como a comunidade se organiza antes de dar o passo seguinte.
            </p>
            <p className="mt-3 text-cyan-200">{heroActionDescription}</p>
          </div>
        </section>

        <section className="relative px-6 py-10">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 left-6 h-40 w-40 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-12 right-10 h-44 w-44 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-black/30 px-8 py-10 text-center shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">PORQUÊ COMEÇAR PELA EDUCAÇÃO?</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#fdd87c]">{LEGACY_SIGNATURE}</h2>
            <p className="mt-3 text-sm text-slate-200">
              A Web3 recompensa quem entende o contexto antes de agir. Por isso mostramos produto — Academia e Glossário — antes de falar de comunidade,
              eventos ou Houses. Conhecimento primeiro, exposição depois.
            </p>
          </div>
        </section>


        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">LEGACY XP HIGHLIGHTS</p>
                <h2 className="text-3xl font-semibold text-[#fdd87c]">Transparência total de XP</h2>
              </div>
              <span className="text-sm text-slate-200">Alterna entre conteúdo público e privado com XP auditado.</span>
            </div>
            <p className="text-sm text-slate-200">
              XP não serve para competir. Serve para mostrar consistência, desbloquear progressão e construir reputação ao longo do tempo.
            </p>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-white">XP não é um jogo. É o teu rasto de evolução.</p>
              <p className="text-sm text-slate-200">Cada conteúdo consumido gera XP e mostra consistência ao longo do tempo.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Leituras do blog', value: '5 - 33 XP' },
                { label: 'Lições concluídas', value: '7 - 33 XP' },
                { label: 'Streak 7 dias', value: '222 XP' },
                { label: 'Leaderboard mundial', value: 'Prova social de consistência' },
              ].map((item) => (
                <Card
                  key={item.label}
                  className={cn(
                    'border border-white/10 bg-[#04131b] shadow-[0_20px_60px_rgba(3,10,25,0.55)]',
                    'duration-200 hover:-translate-y-0.5',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-200">{item.label}</CardTitle>
                    <CardDescription className="text-2xl font-bold text-white">{item.value}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <p className="text-xs text-slate-400">XP é parcialmente variável para evitar abuso e incentivar envolvimento real.</p>
          </div>
        </section>


        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-18 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-12 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">COMO FUNCIONA</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">3 passos para dominares o ecossistema</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {storySteps.map((step) => (
                <Card
                  key={step.title}
                  className="border border-white/10 bg-[#04131b] p-6 shadow-[0_20px_60px_rgba(3,10,25,0.55)]"
                >
                  <div className="flex items-center gap-3">
                    <step.icon className="h-5 w-5 text-cyan-300" />
                    <CardTitle className="text-base font-semibold">{step.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-3 text-sm text-slate-200">{step.copy}</CardDescription>
                  {step.bullets && step.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2 text-xs text-slate-200">
                      {step.bullets.map((bullet) => (
                        <li key={bullet.label} className="flex items-start gap-2">
                          <span className="text-cyan-300">?</span>
                          {bullet.href ? (
                            <Link href={bullet.href} className="text-cyan-200 hover:text-white transition">
                              {bullet.label}
                            </Link>
                          ) : (
                            <span>{bullet.label}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                variant="default"
                asChild
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
              </Button>
              <Button variant="outline" asChild className="border-white/40 text-white hover:bg-white/10">
                <Link href={SECONDARY_CTA.href}>{SECONDARY_CTA.label}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-18 -right-14 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-12 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">WEB3 ACADEMY</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">Academia Web3</h2>
              <p className="text-sm text-slate-200">
                Cursos estruturados que combinam teoria, prática e XP autenticado para profissionais ou quem quer explorar Blockchain e Apertum.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {coursePreviews.map((course) => (
                  <Card key={course.title} className="border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_35px_rgba(3,10,25,0.45)]">
                    <CardTitle className="text-base font-semibold text-white">{course.title}</CardTitle>
                    <CardDescription className="mt-2 text-sm text-slate-200">{course.summary}</CardDescription>
                  </Card>
                ))}
              </div>
              <ul className="space-y-2 text-sm text-slate-200">
                {academyHighlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-cyan-300" />
                    {highlight}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Em 7 dias, consegues:</p>
                <ul className="space-y-2 text-sm text-slate-200">
                  {sevenDayWins.map((win) => (
                    <li key={win} className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-cyan-300" />
                      {win.charAt(0).toUpperCase() + win.slice(1)}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">Sem promessas financeiras.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="default"
                  asChild
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                >
                  <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
                </Button>
                <Button variant="outline" asChild className="border-white/40 text-white hover:bg-white/10">
                  <Link href={SECONDARY_CTA.href}>{SECONDARY_CTA.label}</Link>
                </Button>
              </div>
            </div>
            <div className="relative rounded-[32px] border border-white/10 bg-[#04131b] p-6 shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
              <div
                className="h-56 rounded-[24px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url('${heroImageUrl}')`,
                }}
              />
              <div
                className="mt-4 h-40 rounded-[18px] border border-white/15 bg-cover bg-center shadow-[0_15px_40px_rgba(3,10,25,0.45)]"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(2,12,18,0.2), rgba(2,12,18,0.75)), url('${heroImageUrl}')`,
                }}
              >
                <div className="flex h-full flex-col justify-end rounded-[18px] bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Preview da aula</p>
                  <p className="text-sm font-semibold text-white">XP Fundamentals ∙ Interface real da lição</p>
                  <p className="text-xs text-slate-200">Screenshot real do player usado na Academia.</p>
                </div>
              </div>
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
                  <Card key={item.label} className="border border-white/10 bg-[#04131b] p-4 shadow-[0_10px_35px_rgba(3,10,25,0.45)]">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
                {[{
                  label: 'Lições',
                  value: 'Lições em construção',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#04131b] p-4 shadow-[0_10px_35px_rgba(3,10,25,0.45)]">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
                {[{
                  label: 'Membros',
                  value: 'Primeiros membros a chegar',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#04131b] p-4 shadow-[0_10px_35px_rgba(3,10,25,0.45)]">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
                {[{
                  label: 'Idiomas',
                  value: 'Idiomas planeados',
                }].map((item) => (
                  <Card key={item.label} className="border border-white/10 bg-[#04131b] p-4 shadow-[0_10px_35px_rgba(3,10,25,0.45)]">
                    <CardTitle className="text-xs uppercase tracking-[0.5em] text-cyan-300">{item.label}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{item.value}</CardDescription>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>



        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">GLOSSÁRIO LEGACY</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">A arma principal para aprender rápido.</h2>
              <p className="text-sm text-slate-200">Clicas na palavra. A definição aparece. Continuas a aprender.</p>
              <p className="text-sm text-slate-200">Sem abrir separadores. Sem sair da aula. Sem te perder.</p>
              <p className="text-xs text-slate-400">
                {user ? 'Disponível directamente nas tuas aulas e leituras.' : 'Precisas de login para desbloquear o Glossário integrado.'}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="default"
                  asChild
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                >
                  <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
                </Button>
                <Button variant="outline" asChild className="border-white/40 text-white hover:bg-white/10">
                  <Link href={SECONDARY_CTA.href}>{SECONDARY_CTA.label}</Link>
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                {user ? (
                  <Link className="text-cyan-200 hover:text-white" href="/education/glossary">
                    Abrir o Glossário integrado
                  </Link>
                ) : (
                  <>
                    Já tens conta?{' '}
                    <Link href="/login" className="text-cyan-200 hover:text-white">
                      Entrar
                    </Link>{' '}
                    para desbloquear o Glossário.
                  </>
                )}
              </p>
            </div>
            <div className="relative rounded-[32px] border border-white/10 bg-[#04131b] p-6 shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
              <div className="rounded-[24px] border border-white/10 bg-[#020f19] p-6">
                <p className="text-sm text-slate-200">
                  Aprende sobre a{' '}
                  <span className="cursor-pointer border-b border-dotted border-cyan-300 text-white hover:text-cyan-200">
                    {glossaryDemo.term}
                  </span>{' '}
                  em contexto real.
                </p>
                <div className="relative mt-6">
                  <div className="absolute left-6 -top-3 h-3 w-3 rotate-45 border-l border-t border-white/20 bg-[#03131d]" />
                  <Card className="border border-white/10 bg-[#03131d] p-4 shadow-[0_15px_40px_rgba(3,10,25,0.45)]">
                    <CardTitle className="text-xs uppercase tracking-[0.4em] text-cyan-200">Definição instantânea</CardTitle>
                    <CardDescription className="mt-2 text-sm text-slate-100">{glossaryDemo.definition}</CardDescription>
                    <p className="mt-3 text-xs text-slate-300">{glossaryDemo.example}</p>
                  </Card>
                </div>
                <p className="mt-4 text-xs text-slate-400">Demo visual do pop-up real dentro da Academia.</p>
                <p className="mt-2 text-xs text-slate-300">O glossário não é um extra. É o que permite aprender sem interromper o raciocínio.</p>
              </div>
            </div>
          </div>
        </section>


        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-18 -right-14 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">XP + REPUTAÇÃO</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">Depois da Academia e do Glossário, prova o teu progresso</h2>
              <p className="mt-2 text-sm text-slate-200">
                XP e leaderboard trabalham juntos: mostram consistência, desbloqueiam missões e revelam em que ponto estás no ecossistema Apertum.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {navigationHighlights.map((item) => (
                <Card
                  key={item.label}
                  className="flex h-full flex-col justify-between border border-white/10 bg-[#04131b] p-5 shadow-[0_20px_60px_rgba(3,10,25,0.55)]"
                >
                  <div className="space-y-2">
                    <CardTitle className="text-sm font-semibold text-white">{item.label}</CardTitle>
                    <CardDescription className="text-xs text-slate-200">{item.description}</CardDescription>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10" asChild>
                      <Link href={item.href} className="text-xs">
                        Explorar
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>


        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-18 -left-16 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-12 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">HOUSES OF SPORTS</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">Uma comunidade global para aprender e evoluir com mais contexto.</h2>
              <p className="text-sm text-slate-200">
                As Houses são opcionais. Podes fazer todo o percurso na Academia de forma independente. Se e quando quiseres aprender com pessoas alinhadas,
                as Houses ajudam-te a acelerar com mentoria e networking.
              </p>
              <p className="text-sm text-slate-200">
                São comunidades distribuídas por várias cidades que ligam atletas, profissionais e entusiastas que querem crescer no universo Web3 + Desporto.
                Mentores, eventos, treino e networking num só lugar.
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
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="default"
                    asChild
                    className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  >
                    <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
                  </Button>
                  <Button variant="outline" asChild className="border-white/40 text-white hover:bg-white/10">
                    <Link href={SECONDARY_CTA.href}>{SECONDARY_CTA.label}</Link>
                  </Button>
                </div>
                <p className="text-xs text-slate-300">
                  Opcional. A academia funciona sem Houses. Quando estiveres pronto,{' '}
                  <Link href="/sports/houses" className="text-cyan-200 hover:text-white">
                    explora as Houses
                  </Link>{' '}
                  ou{' '}
                  <Link href="/sports/onboarding" className="text-cyan-200 hover:text-white">
                    encontra a tua House ideal
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="relative rounded-[32px] border border-white/10 bg-[#04131b] p-6 shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
              <div
                className="h-64 rounded-[24px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.75)), url('${heroImageUrl}')`,
                }}
              />
              <p className="mt-4 text-xs text-slate-200">
                Começa pelo onboarding personalizado, partilha o teu contexto (atleta, treinador, gestor, criador de conteúdo ou fã) e recebe recomendações
                sobre a melhor House para ti.
              </p>
            </div>
          </div>
        </section>

        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-18 -left-16 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-18 -right-14 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">PROVA SOCIAL</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">O que os beta testers dizem</h2>
              <p className="text-sm text-slate-200">Sem números inflacionados. Apenas quem já testou o ecossistema Legacy.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.quote} className="border border-white/10 bg-[#04131b] p-5 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
                  <CardDescription className="text-sm text-slate-100">“{testimonial.quote}”</CardDescription>
                  <p className="mt-4 text-xs uppercase tracking-[0.4em] text-cyan-200">{testimonial.role}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-6">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">LEGACY É</p>
            <div className="flex flex-wrap gap-3">
              {legacyValues.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-white/30 bg-[#04131b]/80 px-4 py-1 text-xs uppercase tracking-[0.4em] text-cyan-100 shadow-[0_10px_30px_rgba(3,10,25,0.45)]"
                >
                  {value}
                </span>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <Card key={faq.question} className="border border-white/10 bg-[#04131b] p-6 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">{faq.question}</CardTitle>
                    <CardDescription className="text-sm text-slate-200">{faq.answer}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">LEGACY XP</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#fdd87c]">{LEGACY_SIGNATURE}</h2>
            <p className="mt-2 text-sm text-slate-200">
              Se a Web3 já é o presente, faz sentido entrares com clareza. Regista-te, começa pela Academia gratuita e constrói o teu percurso com método.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                variant="default"
                asChild
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
                asChild
              >
                <Link href={SECONDARY_CTA.href}>{SECONDARY_CTA.label}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
