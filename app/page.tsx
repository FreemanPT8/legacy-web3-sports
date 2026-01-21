'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, ArrowRight, ChevronDown, CircleDot, GraduationCap, ShieldCheck } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
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
    copy: 'Regista-te com o teu desporto e país. Quando fizer sentido, tratamos do matching.',
    icon: Activity,
    bullets: [],
  },
  {
    title: '2 · Consome conteúdos',
    copy: 'Aprende no teu ritmo com o caminho guiado da Academia e o apoio do glossário dinâmico.',
    icon: GraduationCap,
    bullets: [],
  },
  {
    title: '3 · Ganha XP e progride',
    copy: 'Cada leitura, lição e interação acrescenta XP, desbloqueia o leaderboard global e mostra consistência.',
    icon: ShieldCheck,
    bullets: [],
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

const testimonials = [
  { quote: 'Finalmente um caminho para aprender Web3 sem ruído nem hype.', role: 'Coach, Portugal' },
  { quote: 'O glossário integrado mudou tudo. Aprendo sem sair da aula.', role: 'Atleta, Espanha' },
  { quote: 'Comecei do zero. Hoje entendo o que estou a fazer.', role: 'Entusiasta, França' },
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
      'Não. Temos glossário integrado, cursos introdutórios e pop-ups guiados. Começas do zero e evoluis com contexto.',
  },
  {
    question: 'O que é XP e para que serve?',
    answer: 'XP regista cada lição e interação no teu perfil e leaderboard para mostrar consistência ao longo do tempo.',
  },
  {
    question: 'Posso mostrar o XP fora da Academia?',
    answer:
      'O painel e o leaderboard capturam streaks e progresso para que possas provar consistência antes de enviar emails ou candidaturas.',
  },
  {
    question: 'Quanto tempo posso voltar à Academia?',
    answer: 'O acesso mantém-se. Basta iniciares sessão novamente para continuar exatamente onde paraste.',
  },
  {
    question: 'Isto é aconselhamento financeiro?',
    answer:
      'Não. É educação e comunidade. Não prometemos ganhos nem damos recomendações financeiras.',
  },
];

const HERO_TRUST_COPY = 'Sem custos. Sem promessas fáceis. Evolução visível com XP.';
const HERO_URGENCY = 'A Web3 já está em produção. A maioria entra tarde e sem contexto.';
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
  const [showAllWins, setShowAllWins] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
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
    : 'Começa a tua jornada Web3 com ligação automática às Houses certas.';
  const handleHeroSelect = async (asset: MediaAsset) => {
    await heroMedia.setAsset(asset);
  };

  const handleOffsetChange = async (value: number[]) => {
    const next = value[0];
    await heroMedia.setOffset(next);
  };

  const displayedWins = showAllWins ? sevenDayWins : sevenDayWins.slice(0, 3);

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
              O portal Legacy junta ligação automática às Houses, cursos com XP autenticado e acompanhamento num único fluxo. Começas a entender o ecossistema
              Apertum sem ruído, descobres onde o XP aparece e vês como a comunidade se organiza antes de dar o passo seguinte.
            </p>
            <p className="mt-3 text-cyan-200">{heroActionDescription}</p>
          </div>
        </section>


        <section className="relative px-6 py-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-12 left-6 h-48 w-48 rounded-full bg-[#fdd87c]/15 blur-3xl" />
            <div className="absolute -bottom-16 right-6 h-52 w-52 rounded-full bg-[#5af3ff]/15 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-[#020b16] px-8 py-10 text-sm text-slate-200 shadow-[0_25px_60px_rgba(3,10,25,0.45)]">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">EM 7 DIAS</p>
            <h2 className="text-3xl font-semibold text-[#fdd87c]">O que ganhas em 7 dias</h2>
            <p className="text-sm text-slate-200">
              Em menos de uma semana ficas com um mapa claro do ecossistema e sabes onde concentrar a tua atenção.
            </p>
            <ul className="space-y-3">
              {displayedWins.map((win) => (
                <li key={win} className="flex items-start gap-3 text-sm text-slate-200">
                  <CircleDot className="mt-1 h-4 w-4 text-cyan-300" />
                  <span>{win}</span>
                </li>
              ))}
            </ul>
            {sevenDayWins.length > 3 && (
              <div className="pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  onClick={() => setShowAllWins((prev) => !prev)}
                >
                  {showAllWins ? 'Ver menos' : 'Ver mais'}
                </Button>
              </div>
            )}
          </div>
        </section>
        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -right-12 h-52 w-52 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">GLOSSÁRIO LEGACY</p>
              <h2 className="text-3xl font-semibold text-[#fdd87c]">A arma principal para aprender rápido.</h2>
              <p className="text-sm text-slate-200">Clicas numa palavra e a definição aparece sem saíres da lição.</p>
              <p className="text-sm text-slate-200">Sem abrir separadores. Sem perder o foco.</p>
              <p className="text-xs text-slate-400">Tudo o que aprendes fica registado em XP — automaticamente.</p>
              {user ? (
                <p className="text-sm text-cyan-200">
                  <Link href="/education/glossary" className="text-cyan-200 hover:text-white">
                    Abrir Glossário
                  </Link>
                </p>
              ) : (
                <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                  <Link href="/signup">Registar para desbloquear o glossário</Link>
                </Button>
              )}
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
            <div className="absolute -top-18 -left-16 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-12 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto space-y-6 max-w-6xl">
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
                </Card>
              ))}
            </div>
            <div className="flex justify-center">
              <Button
                variant="default"
                asChild
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href} className="flex items-center justify-center gap-2">
                  {user ? SECONDARY_CTA.label : PRIMARY_CTA.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
          <div className="relative mx-auto max-w-6xl space-y-10">
            <div className="space-y-3">
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
            <div className="rounded-3xl border border-white/10 bg-[#04131b]/60 p-6">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">Houses (opcional)</p>
              <p className="mt-2 text-sm text-slate-200">
                Quando quiseres aprender com pessoas alinhadas e locais, explora as Houses.
              </p>
              <Link href="/sports/houses" className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">
                Explorar Houses
              </Link>
            </div>
            <div className="text-center text-xs text-cyan-200">
              <Link href="/education/leaderboard" className="hover:text-white">
                Ver XP e Leaderboard
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">PERGUNTAS FREQUENTES</p>
              <h3 className="text-2xl font-semibold text-white">Dúvidas que já foram feitas antes</h3>
              <p className="text-sm text-slate-200">
                Sem ruído, abrimos o que já foi perguntado para que possas seguir em frente com clareza.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((faq) => {
                const isOpen = openFaq === faq.question;
                return (
                  <Card
                    key={faq.question}
                    className="border border-white/10 bg-[#04131b]/70 p-6 shadow-[0_20px_60px_rgba(3,10,25,0.55)]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : faq.question)}
                      className="flex w-full items-center justify-between text-left text-sm font-semibold text-white"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition ${isOpen ? 'rotate-180 text-cyan-200' : 'text-slate-400'}`}
                      />
                    </button>
                    {isOpen && <p className="mt-4 text-sm text-slate-200">{faq.answer}</p>}
                  </Card>
                );
              })}
            </div>
            <div className="text-center">
              <Button variant="default" asChild className="mx-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]">
                <Link href={user ? SECONDARY_CTA.href : PRIMARY_CTA.href} className="flex items-center justify-center gap-2">
                  {user ? SECONDARY_CTA.label : PRIMARY_CTA.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
