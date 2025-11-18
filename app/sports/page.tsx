'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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
          throw new Error(housesJson.error || 'Error loading Houses of Sports.');
        }

        setSports(sportsJson.sports || []);
        setHouses(housesJson.houses || []);
      } catch (err: any) {
        console.error('Error loading sports/houses:', err);
        setError(
          err?.message || 'Unexpected error while loading sports and houses.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const housesByStatus = useMemo(() => {
    const base = {
      ACTIVE: [] as House[],
      UNDER_CONSTRUCTION: [] as House[],
      IN_DEVELOPMENT: [] as House[],
    };

    for (const h of houses) {
      base[h.status].push(h);
    }

    return base;
  }, [houses]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-b from-blue-50 to-transparent border-b border-blue-100">
          <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
            <div className="grid md:grid-cols-[2fr,1.3fr] gap-8 items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 mb-3">
                  Educação Web3 · Comunidades de Desporto
                </span>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                  Web3 Sports
                </h1>
                <p className="mt-3 text-sm md:text-base text-gray-600 max-w-xl">
                  Explora como a LEGACY está a trazer a{' '}
                  <strong>blockchain</strong>, a{' '}
                  <strong>Apertum Blockchain</strong> e as{' '}
                  <strong>comunidades Web3</strong> para o mundo do desporto.
                  Cada disciplina pode ter a sua própria House of Sports, com
                  missões, XP e recompensas on-chain.
                </p>

                {user ? (
                  <p className="mt-4 text-xs text-gray-500">
                    Estás autenticado como{' '}
                    <span className="font-semibold">
                      @{user.username ?? 'member'}
                    </span>
                    . Completa o onboarding personalizado, segue as tuas Houses
                    favoritas e desbloqueia cursos sobre Web3, comunidade e
                    economia do desporto.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-gray-500">
                    Cria uma conta gratuita para fazer o{' '}
                    <strong>onboarding personalizado</strong>, aprender sobre
                    blockchain, Web3 e comunidade no desporto, e juntar-te às
                    Houses oficiais de cada disciplina.
                  </p>
                )}
              </div>

              <div className="bg-white shadow-sm rounded-2xl border border-blue-100 px-4 py-4 md:px-6 md:py-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Estado das Houses
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Houses ativas
                    </span>
                    <span className="font-semibold text-gray-900">
                      {housesByStatus.ACTIVE.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      Em construção
                    </span>
                    <span className="font-semibold text-gray-900">
                      {housesByStatus.UNDER_CONSTRUCTION.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Em desenvolvimento
                    </span>
                    <span className="font-semibold text-gray-900">
                      {housesByStatus.IN_DEVELOPMENT.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t pt-3 text-[11px] text-gray-500">
                  Cada House é a comunidade oficial de um desporto num país.
                  Em breve vais poder entrar, participar em missões, ganhar XP
                  e participar no chat privado da tua House.
                </div>

                <div className="mt-3 text-right">
                  <Link
                    href="/sports/houses"
                    className="inline-flex items-center text-[11px] font-medium text-blue-700 hover:text-blue-800"
                  >
                    Ver todas as Houses →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LISTA DE HOUSES RESUMIDA */}
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">A carregar desportos…</p>
          ) : (
            <>
              {/* ACTIVE */}
              <HousesSection
                title="Active Houses"
                description="Comunidades de desporto que já estão a funcionar e a receber membros."
                houses={housesByStatus.ACTIVE}
              />

              {/* UNDER CONSTRUCTION */}
              <HousesSection
                title="Houses em construção"
                description="Casas que já têm liderança definida e estão a preparar missões, conteúdos e eventos."
                houses={housesByStatus.UNDER_CONSTRUCTION}
              />

              {/* IN DEVELOPMENT */}
              <HousesSection
                title="Houses em desenvolvimento"
                description="Ideias de Houses que estão a ganhar forma. Acompanha a evolução de cada projeto."
                houses={housesByStatus.IN_DEVELOPMENT}
              />
            </>
          )}
        </section>

        {/* LISTA DE DESPORTOS */}
        <section className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-lg font-semibold mb-1">Todos os desportos</h2>
            <p className="text-xs text-gray-500 mb-4">
              Explora as disciplinas disponíveis. Algumas já têm House
              associada, outras serão lançadas em breve. Cada desporto terá o
              seu próprio ecossistema de conteúdo, missões e comunidade.
            </p>

            {loading ? (
              <p className="text-sm text-gray-500">A carregar desportos…</p>
            ) : sports.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ainda não existem desportos configurados.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {sports.map((sport) => (
                  <Link
                    key={sport.id}
                    href={`/sports/${sport.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition"
                  >
                    <div className="text-sm font-semibold text-gray-900 mb-1 capitalize">
                      {sport.name}
                    </div>
                    <div className="text-[11px] uppercase text-gray-400 mb-2">
                      {sport.code}
                    </div>
                    <p className="text-xs text-gray-600">
                      Entra no universo Web3 de {sport.name}. Descobre Houses,
                      missões e caminhos de XP desenhados para esta disciplina.
                    </p>
                    {sport.created_at && (
                      <p className="mt-2 text-[10px] text-gray-400">
                        Added on{' '}
                        {new Date(sport.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
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
  if (houses.length === 0) {
    return null;
  }

  const subset = houses.slice(0, 6); // mostra só até 6 aqui (resto está em /sports/houses)

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subset.map((house) => (
          <Link
            key={house.id}
            href={`/sports/houses/${house.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-900">
                {house.name}
              </div>
              {house.country_code && (
                <span className="text-[10px] font-mono uppercase bg-gray-100 rounded px-2 py-0.5">
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
              <p className="text-xs text-gray-600 mb-1">
                Head of House:{' '}
                <span className="font-medium">
                  {house.head.full_name || house.head.username}
                </span>
              </p>
            ) : (
              <p className="text-xs text-gray-500 mb-1">
                Head of House a definir.
              </p>
            )}
            <p className="text-[11px] text-gray-500">
              {house.moderators.length > 0
                ? `${house.moderators.length} moderator(es) já atribuídos.`
                : 'Sem moderadores definidos ainda.'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
