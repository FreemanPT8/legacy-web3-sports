'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';

type HouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface House {
  id: string;
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

const STATUS_COLORS: Record<HouseStatus, string> = {
  IN_DEVELOPMENT: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  UNDER_CONSTRUCTION: 'bg-blue-50 text-blue-800 border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export default function HouseProfilePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const houseId = params?.houseId as string;

  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHouse = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/sports/houses?locale=pt');
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading House');
          setLoading(false);
          return;
        }

        const all: House[] = data.houses ?? [];
        const found = all.find((h) => h.id === houseId) || null;

        if (!found) {
          setError('House not found');
        }

        setHouse(found);
      } catch (err) {
        console.error('Error loading House profile:', err);
        setError('Network error while loading House');
      } finally {
        setLoading(false);
      }
    };

    if (houseId) {
      fetchHouse();
    } else {
      setLoading(false);
      setError('Invalid House ID');
    }
  }, [houseId]);

  const goBack = () => {
    router.push('/sports/houses');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={goBack}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Houses
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading House profile…
            </div>
          ) : error || !house ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {error || 'House not found.'}
            </div>
          ) : (
            <>
              {/* Hero / header da House */}
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
                {/* Cover */}
                <div className="h-32 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500" />

                {/* Conteúdo principal */}
                <div className="px-6 pb-6 -mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-white shadow flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-yellow-500" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {house.title}
                      </h1>
                      <p className="mt-1 text-sm text-gray-600">
                        Official LEGACY community for{' '}
                        <span className="font-semibold">
                          {house.sport_name || 'this sport'}
                        </span>{' '}
                        in <span className="font-semibold">{house.country_code}</span>.
                      </p>
                      {house.created_at && (
                        <p className="mt-1 text-xs text-gray-400">
                          Created on{' '}
                          {new Date(house.created_at).toLocaleDateString('pt-PT')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[house.status]}`}
                    >
                      {STATUS_LABELS[house.status]}
                    </span>
                    <span className="text-xs text-gray-500">
                      Moderators:{' '}
                      <span className="font-semibold">
                        {house.moderators_count}
                      </span>
                    </span>
                  </div>
                </div>
              </section>

              {/* Head, descrição e espaço para features futuras */}
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
                {/* Coluna principal */}
                <section className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      About this House
                    </h2>
                    <p className="text-sm text-gray-700">
                      This House will soon have its own missions, rankings and
                      events connected to the Apertum blockchain. Members will be
                      able to earn XP and collectibles by completing sport and
                      Web3 challenges specific to this community.
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      For now, this is an experimental preview. More features will
                      be unlocked as the LEGACY platform evolves.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Upcoming features
                    </h2>
                    <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                      <li>XP integrated with House-specific missions</li>
                      <li>Leaderboards for members of this House</li>
                      <li>Collectible badges and on-chain achievements</li>
                      <li>Realtime chat channel for the community</li>
                      <li>Web3 rewards powered by Apertum blockchain</li>
                    </ul>
                  </div>
                </section>

                {/* Side column – Head of House */}
                <aside className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Head of House
                    </h2>

                    {house.head_username ? (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          {house.head_full_name
                            ? house.head_full_name.charAt(0).toUpperCase()
                            : house.head_username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {house.head_full_name || house.head_username}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{house.head_username}
                          </div>
                          <p className="mt-2 text-xs text-gray-600">
                            Responsible for guiding the community, approving
                            moderators and curating missions for this House.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        This House does not have a Head defined yet. While the
                        House is in development, LEGACY admins are preparing the
                        leadership and governance model for this community.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
