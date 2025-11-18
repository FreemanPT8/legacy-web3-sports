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
  IN_DEVELOPMENT: 'In Development',
  UNDER_CONSTRUCTION: 'Under Construction',
  ACTIVE: 'Active',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800',
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800',
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
          setError(sportsJson.error || 'Error loading sport');
          setLoading(false);
          return;
        }

        if (!housesRes.ok || !housesJson.success) {
          setError(housesJson.error || 'Error loading Houses for this sport');
          setLoading(false);
          return;
        }

        const sports: Sport[] = sportsJson.sports ?? [];
        const foundSport = sports.find((s) => s.id === sportId) || null;

        if (!foundSport) {
          setError('Sport not found');
          setSport(null);
          setHouses([]);
          setLoading(false);
          return;
        }

        const allHouses: House[] = housesJson.houses ?? [];
        const housesForSport = allHouses.filter(
          (h) => h.sport_id === sportId
        );

        setSport(foundSport);
        setHouses(housesForSport);
      } catch (err) {
        console.error('Error loading sport detail:', err);
        setError('Network error while loading sport detail');
      } finally {
        setLoading(false);
      }
    };

    if (sportId) {
      fetchData();
    } else {
      setLoading(false);
      setError('Invalid sport ID');
    }
  }, [sportId]);

  const goBack = () => {
    router.push('/sports');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button
            onClick={goBack}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Sports
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading sport…
            </div>
          ) : error || !sport ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {error || 'Sport not found.'}
            </div>
          ) : (
            <>
              {/* Hero do desporto */}
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
                <div className="h-28 bg-gradient-to-r from-indigo-600 via-blue-500 to-emerald-500" />
                <div className="px-6 pb-6 -mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-white shadow flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-indigo-500" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {sport.name}
                      </h1>
                      {sport.code && (
                        <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                          {sport.code}
                        </p>
                      )}
                      {sport.created_at && (
                        <p className="mt-1 text-xs text-gray-400">
                          Added on{' '}
                          {new Date(sport.created_at).toLocaleDateString(
                            'pt-PT'
                          )}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-600 max-w-xl">
                        This sport is part of the LEGACY Web3 ecosystem. Soon,
                        you&apos;ll find tailored XP paths, missions and
                        on-chain rewards designed specifically for {sport.name}.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Houses deste desporto */}
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Houses of Sports for {sport.name}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {houses.length} House
                    {houses.length === 1 ? '' : 's'}
                  </span>
                </div>

                {houses.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    There is no House of Sports for this discipline yet. As the
                    platform evolves, official communities will appear here.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-3">House</th>
                          <th className="px-3 py-3">Country</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Head of House</th>
                          <th className="px-3 py-3">Moderators</th>
                          <th className="px-3 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {houses.map((house) => (
                          <tr key={house.id} className="hover:bg-gray-50/60">
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-col">
                                <Link
                                  href={`/sports/houses/${house.id}`}
                                  className="font-medium text-gray-900 hover:underline"
                                >
                                  {house.title}
                                </Link>
                                <span className="text-[11px] text-gray-400">
                                  {house.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                {house.country_code}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span
                                className={
                                  STATUS_BADGE_CLASSES[house.status]
                                }
                              >
                                {STATUS_LABELS[house.status]}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top text-sm text-gray-700">
                              {house.head_username ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {house.head_full_name ||
                                      house.head_username}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    @{house.head_username}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No Head defined
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top text-sm text-gray-700">
                              {house.moderators_count}
                            </td>
                            <td className="px-3 py-3 align-top text-sm text-gray-700">
                              {house.created_at
                                ? new Date(
                                    house.created_at
                                  ).toLocaleDateString('pt-PT')
                                : '-'}
                            </td>
                          </tr>
                        ))}
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
