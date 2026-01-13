'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';

type HouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface Sport {
  id: string;
  code: string | null;
  name: string;
  created_at: string | null;
}

interface House {
  id: string;
  sport_id: string;
  title: string;
  sport_name: string | null;
  country_code: string;
  status: HouseStatus;
  head_username: string | null;
  head_full_name: string | null;
  moderators_count: number;
  created_at: string | null;
}

const STATUS_LABELS: Record<HouseStatus, string> = {
  IN_DEVELOPMENT: 'Em desenvolvimento',
  UNDER_CONSTRUCTION: 'Em construção',
  ACTIVE: 'Ativa',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200',
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200',
};

export default function SportDetailPage() {
  const params = useParams<{ sportId: string }>();
  const router = useRouter();
  const sportId = params?.sportId as string;

  const [sport, setSport] = useState<Sport | null>(null);
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

        const sportsJson = await sportsRes.json();
        const housesJson = await housesRes.json();

        if (!sportsRes.ok || !sportsJson.success) {
          setError(sportsJson.error || 'Erro ao carregar o desporto.');
          setLoading(false);
          return;
        }

        if (!housesRes.ok || !housesJson.success) {
          setError(
            housesJson.error ||
              'Erro ao carregar as Houses associadas a este desporto.',
          );
          setLoading(false);
          return;
        }

        const sports: Sport[] = sportsJson.sports ?? [];
        const foundSport = sports.find((s) => s.id === sportId) || null;

        if (!foundSport) {
          setError('Desporto não encontrado.');
          setSport(null);
          setHouses([]);
          setLoading(false);
          return;
        }

        const allHouses: House[] = housesJson.houses ?? [];
        const housesForSport = allHouses.filter(
          (h: House) => h.sport_id === sportId,
        );

        setSport(foundSport);
        setHouses(housesForSport);
      } catch (err) {
        console.error('Erro ao carregar detalhe do desporto:', err);
        setError('Erro de rede ao carregar o detalhe do desporto.');
      } finally {
        setLoading(false);
      }
    };

    if (sportId) {
      fetchData();
    } else {
      setLoading(false);
      setError('ID de desporto inválido.');
    }
  }, [sportId]);

  const goBack = () => {
    router.push('/sports');
  };

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button
            onClick={goBack}
            className="mb-4 inline-flex items-center text-xs text-blue-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao portal LEGACY Sports
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-blue-100 gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              A carregar informação deste desporto…
            </div>
          ) : error || !sport ? (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-6 text-center text-sm text-red-100">
              {error || 'Desporto não encontrado.'}
            </div>
          ) : (
            <>
              {/* Hero do desporto */}
              <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 shadow-lg overflow-hidden mb-6">
                <div className="h-24 bg-gradient-to-r from-indigo-600 via-blue-500 to-emerald-500" />
                <div className="px-6 pb-6 -mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-slate-950 border border-slate-700 shadow flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-cyan-300" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {sport.name}
                      </h1>
                      {sport.code && (
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-blue-200/80">
                          {sport.code}
                        </p>
                      )}
                      {sport.created_at && (
                        <p className="mt-1 text-[11px] text-blue-200/80">
                          Adicionado ao LEGACY em{' '}
                          {new Date(sport.created_at).toLocaleDateString(
                            'pt-PT',
                          )}
                        </p>
                      )}
                      <p className="mt-2 text-xs md:text-sm text-blue-100 max-w-xl leading-relaxed">
                        Este desporto faz parte do ecossistema LEGACY na{' '}
                        <strong>Apertum Blockchain</strong>. Ao longo do tempo,
                        vai ganhar percursos de XP, missões e recompensas
                        ligadas a comunidades que levam a sério a educação, a
                        transparência e o mérito.
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-blue-100/90 max-w-xs">
                    <p>
                      Se este é o teu desporto, o próximo passo é simples:{' '}
                      <strong>cria conta</strong> e ligamos-te automaticamente à
                      melhor House disponível ou guardamos o teu perfil numa
                      pool até existir uma comunidade ativa para ti.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/sports/houses">
                        <span className="inline-flex items-center rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-blue-100 hover:bg-slate-900">
                          Ver Houses deste e de outros desportos
                        </span>
                      </Link>
                      <Link href="/signup">
                        <span className="inline-flex items-center rounded-md bg-white text-slate-950 px-2.5 py-1 text-[11px] font-semibold hover:bg-slate-100">
                          Criar conta e ligar-me
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* Houses deste desporto */}
              <section className="rounded-2xl border border-slate-800 bg-slate-950/90 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Houses of Sports de {sport.name}
                    </h2>
                    <p className="text-xs text-blue-200/80 max-w-xl">
                      Estas Houses representam comunidades deste desporto em
                      países específicos. Algumas já estão ativas, outras ainda
                      estão a ganhar estrutura.
                    </p>
                  </div>
                  <span className="text-[11px] text-blue-200/80">
                    {houses.length} House
                    {houses.length === 1 ? '' : 's'} ligada(s) a este desporto
                  </span>
                </div>

                {houses.length === 0 ? (
                  <p className="text-sm text-blue-100">
                    Ainda não existe nenhuma House visível para esta disciplina.
                    À medida que a plataforma evoluir, as comunidades oficiais
                    vão aparecer aqui.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-800 bg-slate-900 text-[11px] font-semibold uppercase text-blue-200/80">
                        <tr>
                          <th className="px-3 py-3">House</th>
                          <th className="px-3 py-3">País</th>
                          <th className="px-3 py-3">Estado</th>
                          <th className="px-3 py-3">Head of House</th>
                          <th className="px-3 py-3">Moderadores</th>
                          <th className="px-3 py-3">Criada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {houses.map((house) => {
                          const headUsername = house.head_username
                            ? `@${house.head_username}`
                            : null;

                          return (
                            <tr
                              key={house.id}
                              className="hover:bg-slate-900/70 text-blue-50"
                            >
                              <td className="px-3 py-3 align-top">
                                <div className="flex flex-col">
                                  <Link
                                    href={`/sports/houses/${house.id}`}
                                    className="font-medium text-white hover:underline"
                                  >
                                    {house.title}
                                  </Link>
                                  <span className="text-[11px] text-blue-300/70">
                                    {house.id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[11px] font-medium text-blue-100">
                                  {house.country_code}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span
                                  className={STATUS_BADGE_CLASSES[house.status]}
                                >
                                  {STATUS_LABELS[house.status]}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top text-xs text-blue-50">
                                {headUsername ? (
                                  <div className="flex flex-col">
                                    <span className="text-[11px] text-blue-200/90">
                                      {headUsername}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-blue-300/70">
                                    Head of House a definir
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top text-xs text-blue-50">
                                {house.moderators_count}
                              </td>
                              <td className="px-3 py-3 align-top text-xs text-blue-50">
                                {house.created_at
                                  ? new Date(
                                      house.created_at,
                                    ).toLocaleDateString('pt-PT')
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
