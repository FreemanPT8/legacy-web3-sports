// app/sports/houses/[houseId]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';

type PublicLifecycleStatus =
  | 'IN_DEVELOPMENT'
  | 'UNDER_CONSTRUCTION'
  | 'ACTIVE';

interface PublicHouse {
  id: string;
  name: string;
  hero_title: string;
  hero_subtitle: string;
  description: string;
  cover_image_url: string | null;
  country_code: string | null;
  lifecycle_status: PublicLifecycleStatus;
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
    permissions: Record<string, any>;
  }[];
}

interface ApiResponse {
  success: boolean;
  houses?: PublicHouse[];
  error?: string;
}

const STATUS_LABEL: Record<PublicLifecycleStatus, string> = {
  ACTIVE: 'Active',
  UNDER_CONSTRUCTION: 'In construction',
  IN_DEVELOPMENT: 'In development',
};

const STATUS_COLORS: Record<PublicLifecycleStatus, string> = {
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800',
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800',
};

export default function HousePublicProfilePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const houseId = params?.houseId;

  const [houses, setHouses] = useState<PublicHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!houseId) return;

    const fetchHouses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/sports/houses?locale=pt');
        const data: ApiResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Error loading Houses of Sports.');
          setLoading(false);
          return;
        }

        setHouses(data.houses || []);
      } catch (err) {
        console.error('Error fetching house profile:', err);
        setError('Network error while loading House profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, [houseId]);

  const house = useMemo(
    () => houses.find((h) => h.id === houseId),
    [houses, houseId]
  );

  const otherHousesSameSport = useMemo(() => {
    if (!house || !house.sport) return [];
    return houses.filter(
      (h) => h.id !== house.id && h.sport?.id === house.sport?.id
    );
  }, [houses, house]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        {loading ? (
          <div className="max-w-4xl mx-auto px-4 py-16 text-sm text-slate-500">
            Loading House profile…
          </div>
        ) : !house ? (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <p className="mb-4 text-sm text-slate-600">
              {error || 'House not found or not public.'}
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              ← Back to Houses
            </button>
          </div>
        ) : (
          <>
            {/* HERO */}
            <section className="border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50">
              <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
                <button
                  onClick={() => router.push('/sports/houses')}
                  className="mb-4 inline-flex items-center text-xs text-slate-500 hover:text-slate-700"
                >
                  ← Back to Houses
                </button>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-500">
                        {house.sport?.name ?? 'Web3 Sport House'}
                      </span>
                      {house.country_code && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-[10px] font-mono uppercase text-slate-600">
                          {house.country_code}
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                      {house.hero_title}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                      {house.hero_subtitle}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className={STATUS_COLORS[house.lifecycle_status]}>
                        {STATUS_LABEL[house.lifecycle_status]}
                      </span>
                      {house.head && (
                        <span>
                          Head of House:{' '}
                          <strong>
                            {house.head.full_name || house.head.username}
                          </strong>
                          {house.head.username && ` (@${house.head.username})`}
                        </span>
                      )}
                      <span>
                        Moderators: <strong>{house.moderators.length}</strong>
                      </span>
                    </div>
                  </div>

                  {house.cover_image_url && (
                    <div className="w-full md:w-56 h-32 md:h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
                      {/* simples <img> por enquanto */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={house.cover_image_url}
                        alt={house.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* BODY */}
            <section className="max-w-4xl mx-auto px-4 py-10 space-y-8">
              <div className="grid gap-6 md:grid-cols-[2fr,1.2fr] items-start">
                {/* Descrição / sobre a House */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900 mb-2">
                    About this House
                  </h2>
                  <p className="text-xs text-slate-600 whitespace-pre-line">
                    {house.description}
                  </p>

                  <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
                    <strong>Em breve:</strong> missões específicas desta House,
                    leaderboard, drops e integrações on-chain na Apertum
                    Blockchain.
                  </div>
                </div>

                {/* Head + moderadores */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">
                      Leadership
                    </h3>
                    {house.head ? (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <div className="font-medium">
                          {house.head.full_name || house.head.username}
                        </div>
                        {house.head.username && (
                          <div className="text-[11px] text-slate-500">
                            @{house.head.username} ·{' '}
                            {house.head.role || 'Head of House'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Esta House ainda não tem Head definido.
                      </p>
                    )}

                    <div className="mt-4">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Moderators ({house.moderators.length})
                      </h4>
                      {house.moderators.length === 0 ? (
                        <p className="text-[11px] text-slate-500">
                          Nenhum moderador definido ainda.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {house.moderators.map((mod) => (
                            <li
                              key={mod.user_id}
                              className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-700"
                            >
                              <div className="font-medium">
                                {mod.full_name || mod.username}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                @{mod.username} · {mod.role || 'Moderator'}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500">
                    <div className="font-semibold mb-1">
                      Chat privado da House
                    </div>
                    <p>
                      O chat em tempo real desta House ainda não está
                      disponível. Em breve, membros verificados vão poder
                      conversar, organizar treinos e coordenar missões por aqui.
                    </p>
                  </div>
                </div>
              </div>

              {/* Outras Houses do mesmo desporto */}
              {otherHousesSameSport.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    Other Houses for this sport
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {otherHousesSameSport.map((h) => (
                      <Link
                        key={h.id}
                        href={`/sports/houses/${h.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 hover:border-blue-400 hover:bg-white transition-colors"
                      >
                        <div className="font-medium">{h.hero_title}</div>
                        <div className="text-[10px] text-slate-500">
                          {h.country_code && (
                            <>
                              {h.country_code} ·{' '}
                            </>
                          )}
                          {STATUS_LABEL[h.lifecycle_status]}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
