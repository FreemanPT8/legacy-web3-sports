'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
          throw new Error(sportsJson.error || 'Error loading sports.');
        }

        if (!housesRes.ok || !housesJson.success) {
          throw new Error(
            housesJson.error || 'Error loading Houses of Sports.'
          );
        }

        setSports(sportsJson.sports || []);
        setHouses(housesJson.houses || []);
      } catch (err: any) {
        console.error('Error loading sports/houses:', err);
        setError(
          err?.message ||
            'Unexpected error while loading sports and houses.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Agrupar Houses por status
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
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-50">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
            <div className="grid md:grid-cols-[2fr,1.2fr] gap-10 items-start">
              {/* Texto principal */}
              <div>
                <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-300 mb-4 border border-emerald-700/40">
                  EducaÃ§Ã£o Web3 Â· Comunidades de Desporto
                </span>

                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-50">
                  Desporto, comunidade e Web3, na Apertum Blockchain.
                </h1>

                <p className="mt-4 text-sm md:text-base text-slate-300 max-w-xl leading-relaxed">
                  A LEGACY Ã© o ponto de entrada para profissionais e
                  entusiastas que querem perceber o que a{' '}
                  <strong>blockchain</strong>, a{' '}
                  <strong>Apertum Blockchain</strong> e a{' '}
                  <strong>Web3</strong> podem trazer ao desporto na prÃ³xima
                  dÃ©cada: comunidades mais fortes, reputaÃ§Ã£o digital, XP
                  partilhado e novas formas de reconhecer contributos reais.
                </p>

                {user ? (
                  <p className="mt-4 text-xs text-slate-400">
                    EstÃ¡s autenticado como{' '}
                    <span className="font-semibold">
                      @{user.username ?? 'member'}
                    </span>
                    . Faz o onboarding personalizado, descobre as Houses
                    mais alinhadas com o teu desporto e comeÃ§a a acumular XP
                    na tua jornada Web3.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">
                    Cria uma conta gratuita para fazer o{' '}
                    <strong>onboarding personalizado</strong>, aprender
                    sobre blockchain, Web3 e comunidades de desporto, e
                    juntar-te Ã s Houses oficiais de cada disciplina.
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/sports/onboarding"
                    className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 transition shadow-sm"
                  >
                    Fazer onboarding personalizado
                  </Link>
                  <Link
                    href="/sports/houses"
                    className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800/60 transition"
                  >
                    Explorar Houses of Sports
                  </Link>
                </div>
              </div>

              {/* Card: estado das Houses */}
              <div className="bg-slate-900/70 rounded-2xl border border-slate-700/70 px-5 py-5 shadow-lg shadow-black/30">
                <h2 className="text-sm font-semibold text-slate-100 mb-3">
                  Estado atual das Houses of Sports
                </h2>

                {loading ? (
                  <p className="text-xs text-slate-400">
                    A carregar dados das Housesâ€¦
                  </p>
                ) : (
                  <div className="space-y-3 text-xs">
                    <RowStatus
                      colorClass="bg-emerald-400"
                      label="Houses ativas"
                      value={housesByStatus.ACTIVE.length}
                    />
                    <RowStatus
                      colorClass="bg-amber-300"
                      label="Houses em construÃ§Ã£o"
                      value={housesByStatus.UNDER_CONSTRUCTION.length}
                    />
                    {isLegacyTeam && (
                      <RowStatus
                        colorClass="bg-slate-400"
                        label="Houses em desenvolvimento"
                        value={housesByStatus.IN_DEVELOPMENT.length}
                      />
                    )}
                  </div>
                )}

                <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
                  Cada House representa um desporto num paÃ­s e vai agregando
                  membros, XP e iniciativas. As Houses ativas jÃ¡ estÃ£o a ser
                  lideradas por um Head of House e vÃ£o ganhar cada vez mais
                  funÃ§Ãµes on-chain.
                </p>

                <div className="mt-4 text-right">
                  <Link
                    href="/sports/houses"
                    className="inline-flex items-center text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
                  >
                    Ver todas as Houses â†’
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VISÃƒO GERAL + HOUSES */}
        <section className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-200 mb-4">
              {error}
            </div>
          )}

          {/* IntroduÃ§Ã£o Ã s Houses */}
          <div>
            <h2 className="text-lg font-semibold mb-1">
              House of Sports â€“ visÃ£o geral
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              As Houses of Sports sÃ£o coletivos de jogadores, treinadores,
              organizaÃ§Ãµes e entusiastas do mesmo desporto, focados em
              explorar a Web3 em conjunto. As Houses ativas jÃ¡ estÃ£o abertas
              a membros; as Houses em construÃ§Ã£o estÃ£o a preparar conteÃºdos,
              missÃµes e estrutura; e as Houses em desenvolvimento representam
              as prÃ³ximas ondas de desportos a entrar no ecossistema.
            </p>
          </div>

          {/* RESUMO RÃPIDO (texto) */}
          <div className="flex flex-col md:flex-row gap-6 md:items-end md:justify-between">
            <div className="text-xs text-slate-300 space-y-1">
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
                em construÃ§Ã£o
              </p>
              <p>
                <span className="font-semibold">
                  {housesByStatus.IN_DEVELOPMENT.length}
                </span>{' '}
                em desenvolvimento
                {!isLegacyTeam && (
                  <span className="text-[11px] text-slate-400">
                    {' '}
                    (apenas visÃ­veis Ã  equipa LEGACY)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* HOUSES ATIVAS */}
          <HousesSection
            title="Houses ativas"
            description="Comunidades de desporto que jÃ¡ estÃ£o a funcionar e a receber membros."
            houses={housesByStatus.ACTIVE}
          />

          {/* HOUSES EM CONSTRUÃ‡ÃƒO */}
          <HousesSection
            title="Houses em construÃ§Ã£o"
            description="Casas que jÃ¡ tÃªm lideranÃ§a definida e estÃ£o a preparar missÃµes, conteÃºdos e eventos."
            houses={housesByStatus.UNDER_CONSTRUCTION}
          />

          {/* HOUSES EM DESENVOLVIMENTO â€“ sÃ³ equipa LEGACY */}
          {isLegacyTeam && (
            <HousesSection
              title="Houses em desenvolvimento"
              description="Ideias de Houses que estÃ£o a ganhar forma. Ã‰ o pipeline para as prÃ³ximas comunidades a lanÃ§ar."
              houses={visibleInDevelopment}
            />
          )}
        </section>

        {/* BLOCO EDUCATIVO / CHAMADA PARA ONBOARDING */}
        <section className="border-t border-slate-800 bg-slate-950/80">
          <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Para quem Ã© o LEGACY?
              </h2>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                Para treinadores, atletas, dirigentes, criadores de conteÃºdo e
                entusiastas que querem entender, sem jargÃ£o tÃ©cnico, como a
                Web3 e a Apertum Blockchain podem impactar o desporto na
                prÃ³xima dÃ©cada: desde reputaÃ§Ã£o digital atÃ© recompensas
                partilhadas dentro de comunidades.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                O onboarding Ã© personalizado por desporto: escolhes a tua
                disciplina, explicas o teu contexto e recebemos-te nas Houses
                e conteÃºdos mais adequados ao teu perfil.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-5 text-xs text-slate-200 space-y-3">
              <p>
                1. Escolhe o teu desporto e responde a poucas perguntas sobre
                o teu papel (atleta, treinador, organizaÃ§Ã£o, etc.).
              </p>
              <p>
                2. Recebe uma sugestÃ£o de House of Sports e um trajeto de
                conteÃºdos Web3 alinhado com os teus objetivos.
              </p>
              <p>
                3. ComeÃ§a a acumular XP Ã  medida que completas missÃµes,
                cursos e participas na comunidade.
              </p>

              <div className="pt-1">
                <Link
                  href="/sports/onboarding"
                  className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 transition shadow-sm"
                >
                  ComeÃ§ar onboarding de desporto
                </Link>
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
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${colorClass}`} />
        {label}
      </span>
      <span className="font-semibold text-slate-50">{value}</span>
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
          <h3 className="text-md font-semibold text-slate-50">{title}</h3>
          <p className="text-xs text-slate-300">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subset.map((house) => (
          <Link
            key={house.id}
            href={`/sports/houses/${house.id}`}
            className="block rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-sm hover:border-emerald-400/80 hover:shadow-md hover:shadow-emerald-500/20 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-50 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] font-semibold text-slate-200 overflow-hidden border border-slate-700 shrink-0">
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
                <span className="text-[10px] font-mono uppercase bg-slate-800 rounded px-2 py-0.5 text-slate-200">
                  {house.country_code}
                </span>
              )}
            </div>
            {house.sport && (
              <div className="text-[11px] uppercase text-slate-400 mb-1">
                {house.sport.name} Â· {house.sport.code}
              </div>
            )}
            {house.head ? (
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-200 overflow-hidden border border-slate-700">
                  {house.head.avatar_url ? (
                    <SafeImage
                      src={house.head.avatar_url}
                      alt={house.head.full_name || house.head.username || 'Head of House'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {(house.head.full_name || house.head.username || '?')
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-200 leading-tight">
                  <div className="font-medium">
                    {house.head.full_name || house.head.username || 'Head of House'}
                  </div>
                  {house.head.username && (
                    <div className="text-[11px] text-slate-400">@{house.head.username}</div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-1">
                Head of House a definir.
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              {house.moderators.length > 0
                ? `${house.moderators.length} moderador(es) jÃ¡ atribuÃ­dos.`
                : 'Sem moderadores definidos ainda.'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}


