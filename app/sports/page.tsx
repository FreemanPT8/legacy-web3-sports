'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, ArrowRight, MapPin, ShieldCheck, Trophy, Users } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';

type Sport = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  discipline?: string | null;
};

type House = {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  country?: string | null;
  sportName?: string | null;
  headOfHouse?: {
    name?: string | null;
  } | null;
  membersCount?: number | null;
};

export default function SportsLandingPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sportsRes, housesRes] = await Promise.all([
          fetch('/api/sports?locale=pt'),
          fetch('/api/sports/houses?locale=pt'),
        ]);

        if (!sportsRes.ok || !housesRes.ok) {
          throw new Error('Não foi possível carregar os desportos e Houses.');
        }

        const sportsJson = await sportsRes.json();
        const housesJson = await housesRes.json();

        setSports(Array.isArray(sportsJson?.sports) ? sportsJson.sports : []);
        setHouses(Array.isArray(housesJson?.houses) ? housesJson.houses : []);
      } catch (err) {
        console.error('Erro ao carregar dados de desporto', err);
        setError('Algo correu mal ao carregar os dados. Tenta novamente em breve.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const totalSports = sports.length;
  const totalHouses = houses.length;
  const totalMembers = houses.reduce((acc, house) => acc + (house.membersCount ?? 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 space-y-16">
        {/* Hero */}
        <HeroSection className="px-6 py-16" overlayVariant="inverse">
          <div className="relative mx-auto max-w-6xl">
            <HeroContent className="lg:items-center">
              <HeroTextColumn>
                <HeroEyebrow>LEGACY SPORTS</HeroEyebrow>
                <HeroTitle className="leading-tight md:text-5xl">Desportos e Houses na Web3</HeroTitle>
                <HeroDescription className="text-base text-slate-100">
                  Explora os desportos cobertos pelo Legacy, descobre Houses oficiais e encontra o ponto de partida
                  certo para a tua jornada Web3 + Desporto.
                </HeroDescription>
                <HeroDescription className="text-slate-200">
                  Cada House é um hub para treino, networking e XP. Escolhe a comunidade certa e acompanha o teu progresso
                  com o mesmo design system da homepage.
                </HeroDescription>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                >
                  <Link href="/sports/onboarding" className="flex items-center gap-2">
                    Começar onboarding
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/sports/houses" className="flex items-center gap-2">
                    Ver Houses
                    <Users className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-cyan-200/80">
                Podes sempre ajustar o teu desporto principal e a tua House mais tarde no teu perfil Legacy.
              </p>
              </HeroTextColumn>

              <div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Activity className="h-4 w-4" />
                      <span>Desportos</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">{totalSports}</CardTitle>
                    <CardDescription className="text-xs text-slate-200">
                      Modalidades com Houses e trilhos dedicados.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Users className="h-4 w-4" />
                      <span>Houses</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">{totalHouses}</CardTitle>
                    <CardDescription className="text-xs text-slate-200">
                      Comunidades locais e globais ligadas ao Legacy.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border border-white/10 bg-[#04131b]/80 backdrop-blur">
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-cyan-300">
                      <Trophy className="h-4 w-4" />
                      <span>Membros</span>
                    </div>
                    <CardTitle className="text-3xl font-semibold text-white">{totalMembers}</CardTitle>
                    <CardDescription className="text-xs text-slate-200">
                      Pessoas a construir reputação Web3 em conjunto.
                    </CardDescription>
                  </CardHeader>
                </Card>
                </div>
              </div>
            </HeroContent>
          </div>
        </HeroSection>

        {/* Secção desportos */}
        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">DESPORTOS</p>
                <h2 className="text-3xl font-semibold text-[#fdd87c]">Onde o Legacy joga</h2>
              </div>
              <p className="max-w-xl text-sm text-slate-200">
                O Legacy come?a por desportos-chave e vai expandindo ao ritmo da comunidade. Cada modalidade pode ter
                Houses locais, Houses globais e trilhos espec?ficos na Academia Web3.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12 text-sm text-slate-200">
                A carregar desportos...
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {!loading && !error && sports.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-[#04131b] px-4 py-6 text-sm text-slate-200">
                Estamos a preparar a lista inicial de desportos. Em breve vais poder ver todas as modalidades cobertas pelo
                Legacy.
              </div>
            )}

            {!loading && !error && sports.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {sports.map((sport) => {
                  const href = sport.slug ? `/sports/${sport.slug}` : undefined;

                  return (
                    <Card
                      key={sport.id}
                      className="flex h-full flex-col justify-between border border-white/10 bg-[#04131b] transition-transform duration-150 hover:-translate-y-0.5 hover:border-cyan-400/50 shadow-[0_25px_60px_rgba(3,10,25,0.55)]"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base font-semibold text-white">{sport.name}</CardTitle>
                          <span className="rounded-full border border-white/10 bg-[#00141f]/80 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-cyan-200">
                            Desporto
                          </span>
                        </div>
                        <CardDescription className="text-xs text-slate-200">
                          {sport.description ??
                            'Modalidade com trilhos dedicados na Academia Web3 e Houses em desenvolvimento.'}
                        </CardDescription>
                        {sport.discipline && (
                          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                            {sport.discipline}
                          </p>
                        )}
                        {href && (
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/30 text-slate-200 hover:bg-white/10"
                              asChild
                            >
                              <Link href={href} className="text-xs">
                                Ver detalhes
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Secção Houses */}
        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-20 -right-14 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-12 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">HOUSES OF SPORTS</p>
                <h2 className="text-3xl font-semibold text-[#fdd87c]">Houses ativas e preparação</h2>
              </div>
              <p className="max-w-xl text-sm text-slate-200">
                As Houses são hubs locais para treino, networking e preparação Web3. Escolhe a que faz mais sentido
                para o teu contexto ou começa pela House Global.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12 text-sm text-slate-200">
                A carregar Houses...
              </div>
            )}

            {!loading && !error && houses.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-[#000c12] px-4 py-6 text-sm text-slate-200">
                As Houses estão a ser preparadas. Em breve vais poder escolher a cidade ou grupo que melhor te
                representa.
              </div>
            )}

            {!loading && houses.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {houses.map((house) => {
                  const href = `/sports/houses/${encodeURIComponent(house.slug ?? house.id)}`;
                  const members = house.membersCount ?? 0;

                  return (
                    <Card
                      key={house.id}
                      className="flex h-full flex-col justify-between border border-white/10 bg-[#04131b] transition-transform duration-150 hover:-translate-y-0.5 hover:border-cyan-400/50 shadow-[0_25px_60px_rgba(3,10,25,0.55)]"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base font-semibold text-white">{house.name}</CardTitle>
                          <span className="rounded-full border border-white/10 bg-[#00141f]/80 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-cyan-200">
                            House
                          </span>
                        </div>
                        <CardDescription className="space-y-1 text-xs text-slate-200">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                            <span>
                              {house.city}
                              {house.city && house.country && ', '}
                              {house.country}
                            </span>
                          </div>
                          {house.sportName && (
                            <div className="flex items-center gap-2">
                              <Activity className="h-3.5 w-3.5 text-cyan-300" />
                              <span>{house.sportName}</span>
                            </div>
                          )}
                          {house.headOfHouse?.name && (
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
                              <span>Head of House: {house.headOfHouse.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-cyan-300" />
                            <span>
                              {members} membro{members === 1 ? '' : 's'} ativos
                            </span>
                          </div>
                        </CardDescription>
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/30 text-slate-200 hover:bg-white/10"
                            asChild
                          >
                            <Link href={href}>Ver detalhes da House</Link>
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA final */}
        <section className="relative px-6 py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27]" />
            <div className="absolute -top-16 -left-14 h-60 w-60 rounded-full bg-[#fdd87c]/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">PRONTO PARA ESCOLHER O TEU CAMINHO?</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#fdd87c]">
              Define o desporto, a House e começa a ganhar XP genuíno.
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              O onboarding personalizado do Legacy ajuda-te a escolher a melhor combinação entre Academia Web3 e Houses
              of Sports para o teu contexto.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                <Link href="/sports/onboarding">Começar onboarding</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/education/courses">Explorar cursos da Academia</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
