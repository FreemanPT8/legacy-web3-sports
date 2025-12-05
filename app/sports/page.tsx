// app/sports/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CryptoTicker } from '@/components/CryptoTicker';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/app/components/SafeImage';

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface Sport {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

interface House {
  id: string;
  name: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  country_code: string | null;
  status: PublicHouseStatus;
  created_at: string | null;
  sport: {
    id: string;
    code: string;
    name: string;
  } | null;
  head: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  } | null;
  moderators: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  }[];
}

interface SportsApiResponse {
  success: boolean;
  sports?: Sport[];
  error?: string;
}

interface HousesApiResponse {
  success: boolean;
  houses?: House[];
  error?: string;
}

export default function SportsPage() {
  const { user } = useAuth();
  const isLegacyTeam =
    user?.role === 'Admin' || user?.role === 'Super Admin';

  const [sports, setSports] = useState<Sport[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sportsRes, housesRes] = await Promise.all([
          fetch('/api/sports?locale=pt'),
          fetch('/api/sports/houses?locale=pt'),
        ]);

        const sportsJson: SportsApiResponse = await sportsRes.json();
        const housesJson: HousesApiResponse = await housesRes.json();

        if (!sportsRes.ok || !sportsJson.success) {
          throw new Error(sportsJson.error || 'Erro ao carregar desportos.');
        }

        if (!housesRes.ok || !housesJson.success) {
          throw new Error(
            housesJson.error || 'Erro ao carregar Houses of Sports.'
          );
        }

        setSports(sportsJson.sports || []);
        setHouses(housesJson.houses || []);
      } catch (err: any) {
        console.error('Erro ao carregar sports/houses:', err);
        setError(
          err?.message ||
            'Erro inesperado ao carregar desportos e Houses.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const housesByStatus = useMemo(() => {
    const base: Record<PublicHouseStatus, House[]> = {
      ACTIVE: [],
      UNDER_CONSTRUCTION: [],
      IN_DEVELOPMENT: [],
    };

    for (const h of houses) {
      base[h.status].push(h);
    }

    return base;
  }, [houses]);

  const visibleInDevelopment = isLegacyTeam
    ? housesByStatus.IN_DEVELOPMENT
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <CryptoTicker />
      <Header />

      <main className="flex-1 bg-white">
        {/* HERO alinhado com a homepage */}
        <section className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid md:grid-cols-[2fr,1.1fr] gap-10 items-start">
              {/* Texto principal */}
              <div className="space-y-5">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 border border-white/20">
                  Educação Web3 · Comunidades de Desporto
                </span>

                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  Desporto, comunidade e Web3 na Apertum Blockchain.
                </h1>

                <p className="text-sm md:text-base text-blue-50 max-w-xl leading-relaxed">
                  A LEGACY é o ponto de entrada para profissionais e
                  entusiastas que querem perceber o que a{' '}
                  <strong>blockchain</strong>, a{' '}
                  <strong>Apertum Blockchain</strong> e a{' '}
                  <strong>Web3</strong> podem trazer ao desporto na próxima
                  década: comunidades mais fortes, reputação digital, XP
                  partilhado e novas formas de reconhecer contributos reais.
                </p>

                {user ? (
                  <p className="text-xs text-blue-100/90 max-w-xl">
                    Estás autenticado como{' '}
                    <span className="font-semibold">
                      @{user.username ?? 'member'}
                    </span>
                    . Faz o onboarding personalizado, descobre as Houses
                    mais alinhadas com o teu desporto e começa a acumular XP
                    na tua jornada Web3.
                  </p>
                ) : (
                  <p className="text-xs text-blue-100/90 max-w-xl">
                    Cria uma conta gratuita para fazer o{' '}
                    <strong>onboarding personalizado</strong>, aprender
                    sobre blockchain, Web3 e comunidades de desporto, e
                    juntar-te às Houses oficiais de cada disciplina.
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/sports/onboarding">
                    <Button
                      size="lg"
                      className="bg-white text-blue-700 hover:bg-blue-50"
                    >
                      Fazer onboarding personalizado
                    </Button>
                  </Link>
                  <Link href="/sports/houses">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                    >
                      Explorar Houses of Sports
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Card: estado das Houses */}
              <div className="bg-white/95 text-gray-900 rounded-2xl border border-blue-100 px-5 py-5 shadow-xl shadow-blue-900/20">
                <h2 className="text-sm font-semibold mb-3">
                  Estado atual das Houses of Sports
                </h2>

                {loading ? (
                  <p className="text-xs text-gray-500">
                    A carregar dados das Houses…
                  </p>
                ) : (
                  <div className="space-y-3 text-xs">
                    <RowStatus
                      colorClass="bg-emerald-500"
                      label="Houses ativas"
                      value={housesByStatus.ACTIVE.length}
                    />
                    <RowStatus
                      colorClass="bg-amber-400"
                      label="Houses em construção"
                      value={housesByStatus.UNDER_CONSTRUCTION.length}
                    />
                    {isLegacyTeam && (
                      <RowStatus
                        colorClass="bg-gray-400"
                        label="Houses em desenvolvimento"
                        value={housesByStatus.IN_DEVELOPMENT.length}
                      />
                    )}
                  </div>
                )}

                <p className="mt-4 text-[11px] text-gray-600 leading-relaxed">
                  Cada House representa um desporto num país e vai agregando
                  membros, XP e iniciativas. As Houses ativas já estão a ser
                  lideradas por um Head of House e vão ganhar cada vez mais
                  funções on-chain.
                </p>

                <div className="mt-4 text-right">
                  <Link
                    href="/sports/houses"
                    className="inline-flex items-center text-[11px] font-medium text-blue-700 hover:text-blue-600"
                  >
                    Ver todas as Houses →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                fill="white"
              />
            </svg>
          </div>
        </section>

        {/* Secção visão geral das Houses */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            {error && (
              <div className="max-w-4xl mx-auto mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="max-w-4xl mx-auto space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Houses of Sports – visão geral
                </h2>
                <p className="text-sm text-gray-600 max-w-3xl mt-2">
                  As Houses of Sports são coletivos de jogadores, treinadores,
                  organizações e entusiastas do mesmo desporto, focados em
                  explorar a Web3 em conjunto. As Houses ativas já estão
                  abertas a membros; as Houses em construção estão a preparar
                  conteúdos, missões e estrutura; e as Houses em desenvolvimento
                  representam as próximas ondas de desportos a entrar no
                  ecossistema.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 md:items-end md:justify-between">
                <div className="text-xs text-gray-700 space-y-1">
                  <p>
                    <span className="font-semibold">
                      {housesByStatus.ACTIVE.length}
                    </span>{' '}
                    Houses ativas
                  </p>
                  <p>
                    <span className="font-semibold">
                      {housesByStatus.UNDER_CONSTRUCTION.length}
                    </span>{' '}
                    em construção
                  </p>
                  <p>
                    <span className="font-semibold">
                      {housesByStatus.IN_DEVELOPMENT.length}
                    </span>{' '}
                    em desenvolvimento
                    {!isLegacyTeam && (
                      <span className="text-[11px] text-gray-400">
                        {' '}
                        (apenas visíveis à equipa LEGACY)
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-xs text-gray-500 max-w-sm">
                  <p>
                    Quer aprofundar por desporto, país e estado da House?
                    Explora a lista completa de Houses e usa filtros
                    avançados na página dedicada.
                  </p>
                  <div className="mt-3">
                    <Link href="/sports/houses">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        Ver página completa das Houses
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Houses em destaque (primeiras 6 de cada estado) */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto space-y-10">
              <HousesSection
                title="Houses ativas"
                description="Comunidades de desporto que já estão a funcionar e a receber membros."
                houses={housesByStatus.ACTIVE}
              />

              <HousesSection
                title="Houses em construção"
                description="Casas que já têm liderança definida e estão a preparar missões, conteúdos e eventos."
                houses={housesByStatus.UNDER_CONSTRUCTION}
              />

              {isLegacyTeam && (
                <HousesSection
                  title="Houses em desenvolvimento"
                  description="Ideias de Houses que estão a ganhar forma. É o pipeline para as próximas comunidades a lançar."
                  houses={visibleInDevelopment}
                />
              )}
            </div>
          </div>
        </section>

        {/* Bloco educativo / chamada para onboarding */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Para quem é o LEGACY?
                </h2>
                <p className="text-sm md:text-base text-blue-100 mb-3 leading-relaxed">
                  Para treinadores, atletas, dirigentes, criadores de conteúdo e
                  entusiastas que querem entender, sem jargão técnico, como a
                  Web3 e a Apertum Blockchain podem impactar o desporto na
                  próxima década: desde reputação digital até recompensas
                  partilhadas dentro de comunidades.
                </p>
                <p className="text-sm text-blue-100 leading-relaxed">
                  O onboarding é personalizado por desporto: escolhes a tua
                  disciplina, explicas o teu contexto e recebemos-te nas Houses
                  e conteúdos mais adequados ao teu perfil.
                </p>
              </div>

              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-xs text-blue-50 space-y-3">
                <p>
                  <strong>1.</strong> Escolhe o teu desporto e responde a
                  poucas perguntas sobre o teu papel (atleta, treinador,
                  organização, etc.).
                </p>
                <p>
                  <strong>2.</strong> Recebe uma sugestão de House of Sports e
                  um trajeto de conteúdos Web3 alinhado com os teus objetivos.
                </p>
                <p>
                  <strong>3.</strong> Começa a acumular XP à medida que
                  completas missões, cursos e participas na comunidade.
                </p>

                <div className="pt-1">
                  <Link href="/sports/onboarding">
                    <Button className="bg-white text-blue-700 hover:bg-blue-50 w-full md:w-auto">
                      Começar onboarding de desporto
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function RowStatus({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-gray-700">
        <span className={`h-2 w-2 rounded-full ${colorClass}`} />
        {label}
      </span>
      <span className="font-semibold text-gray-900 text-xs">{value}</span>
    </div>
  );
}

function HousesSection({
  title,
  description,
  houses,
}: {
  title: string;
  description: string;
  houses: House[];
}) {
  if (houses.length === 0) return null;

  const subset = houses.slice(0, 6);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-md font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <p className="text-[11px] text-gray-400">
          {houses.length} {houses.length === 1 ? 'House' : 'Houses'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subset.map((house) => (
          <Link
            key={house.id}
            href={`/sports/houses/${house.id}`}
            className="block"
          >
            <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col">
              <div className="mb-3 h-20 rounded-lg border border-gray-100 overflow-hidden bg-gray-50">
                {house.cover_image_url || house.avatar_url ? (
                  <SafeImage
                    src={house.cover_image_url || house.avatar_url || ''}
                    alt={house.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-r from-blue-100 via-cyan-100 to-gray-100" />
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-[12px] font-semibold text-gray-600 overflow-hidden border border-gray-200 shrink-0">
                    {house.avatar_url || house.cover_image_url ? (
                      <SafeImage
                        src={house.avatar_url || house.cover_image_url || ''}
                        alt={house.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {house.name
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="truncate">{house.name}</span>
                </div>
                {house.country_code && (
                  <span className="text-[10px] font-mono uppercase bg-gray-100 rounded px-2 py-0.5 text-gray-700">
                    {house.country_code}
                  </span>
                )}
              </div>

              {house.sport && (
                <div className="text-[11px] uppercase text-gray-400 mb-1">
                  {house.sport.name} · {house.sport.code}
                </div>
              )}

              {house.head ? (
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-600 overflow-hidden border border-gray-200">
                    {house.head.avatar_url ? (
                      <SafeImage
                        src={house.head.avatar_url}
                        alt={
                          house.head.full_name ||
                          house.head.username ||
                          'Head of House'
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {(
                          house.head.full_name ||
                          house.head.username ||
                          '?'
                        )
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-800 leading-tight">
                    <div className="font-medium">
                      {house.head.full_name ||
                        house.head.username ||
                        'Head of House'}
                    </div>
                    {house.head.username && (
                      <div className="text-[11px] text-gray-500">
                        @{house.head.username}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-1">
                  Head of House a definir.
                </p>
              )}

              <p className="text-[11px] text-gray-500">
                {house.moderators.length > 0
                  ? `${house.moderators.length} moderador(es) já atribuídos.`
                  : 'Sem moderadores definidos ainda.'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
