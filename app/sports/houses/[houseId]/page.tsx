'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Loader2, ArrowLeft, Users, MessageCircle } from 'lucide-react';

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

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

interface HousesApiResponse {
  success: boolean;
  houses?: House[];
  error?: string;
}

const STATUS_LABELS: Record<PublicHouseStatus, string> = {
  ACTIVE: 'Active',
  UNDER_CONSTRUCTION: 'In construction',
  IN_DEVELOPMENT: 'In development',
};

const STATUS_BADGE_CLASSES: Record<PublicHouseStatus, string> = {
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800',
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700',
};

export default function PublicHousePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const houseId = params?.houseId;

  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/sports/houses?locale=pt');
        const data: HousesApiResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error loading Houses of Sports.');
        }

        setHouses(data.houses || []);
      } catch (err: any) {
        console.error('Error loading Houses for public page:', err);
        setError(
          err?.message || 'Unexpected error while loading House information.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (houseId) {
      fetchHouses();
    }
  }, [houseId]);

  const house = useMemo(
    () => houses.find((h) => h.id === houseId),
    [houses, houseId]
  );

  const createdAtFormatted = useMemo(() => {
    if (!house?.created_at) return '';
    try {
      return new Date(house.created_at).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return house.created_at;
    }
  }, [house?.created_at]);

  const handleJoinHouse = () => {
    // placeholder, no backend ainda
    alert(
      'Em breve vais poder juntar-te oficialmente a esta House e ganhar XP com a comunidade. 🚀'
    );
  };

  const handleOpenChat = () => {
    // placeholder para o chat privado
    alert(
      'O chat privado da House ainda está em desenvolvimento. Em breve vais poder falar com a tua comunidade aqui.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/sports')}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar aos desportos
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-600 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>A carregar House of Sports…</span>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-700">
              {error}
            </div>
          ) : !house ? (
            <div className="py-10 text-center text-sm text-gray-600">
              Esta House não foi encontrada ou ainda não está disponível
              publicamente.
            </div>
          ) : (
            <>
              {/* HERO DA HOUSE */}
              <section className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">
                      House of Sports
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {house.name}
                    </h1>
                    {house.sport && (
                      <p className="mt-1 text-xs text-gray-600">
                        Desporto:{' '}
                        <span className="font-medium">
                          {house.sport.name}
                        </span>{' '}
                        · {house.sport.code}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {house.country_code && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-mono uppercase">
                          {house.country_code}
                        </span>
                      )}
                      <span className={STATUS_BADGE_CLASSES[house.status]}>
                        {STATUS_LABELS[house.status]}
                      </span>
                      {createdAtFormatted && (
                        <span>Created on {createdAtFormatted}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 md:w-64">
                    {user ? (
                      <>
                        <button
                          onClick={handleJoinHouse}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                          Join this House
                        </button>
                        <button
                          onClick={handleOpenChat}
                          className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Open House chat
                        </button>
                        <p className="text-[11px] text-gray-500">
                          Como membro autenticado vais poder participar em
                          missões, ganhar XP e falar com a comunidade desta
                          House.
                        </p>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/signup"
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                          Cria conta para seguir esta House
                        </Link>
                        <p className="text-[11px] text-gray-500">
                          Autentica-te para receber missões desta House,
                          acompanhar o progresso e conversar no chat privado.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* BLOCO SOBRE A HOUSE */}
              <section className="grid gap-6 md:grid-cols-[2fr,1.2fr] mb-10">
                <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-sm font-semibold mb-2">
                    Sobre esta House
                  </h2>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Esta é a comunidade Web3 oficial para profissionais e
                    entusiastas de{' '}
                    <span className="font-semibold">
                      {house.sport?.name ?? 'este desporto'}
                    </span>{' '}
                    em {house.country_code ?? 'este país'}. Aqui vais encontrar
                    missões, desafios, conteúdos educativos e eventos focados
                    nesta disciplina.
                  </p>
                  <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                    À medida que a House evoluir, vais ver{' '}
                    <span className="font-semibold">
                      rankings, leaderboards, badges
                    </span>{' '}
                    e recompensas ligadas à blockchain Apertum.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-sm font-semibold mb-2">
                      Leadership &amp; Team
                    </h3>
                    {house.head ? (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">
                          Head of House
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {house.head.full_name || house.head.username}
                        </p>
                        {house.head.username && (
                          <p className="text-xs text-gray-500">
                            @{house.head.username} ·{' '}
                            {house.head.role || 'Member'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mb-2">
                        O Head of House ainda está a ser definido.
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>
                        {house.moderators.length > 0
                          ? `${house.moderators.length} moderator(es) a apoiar esta House.`
                          : 'Ainda não existem moderadores definidos.'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* FUTURO: MISSÕES, EVENTOS, ETC. */}
              <section className="mb-8">
                <div className="rounded-xl bg-white border border-dashed border-gray-300 p-4 text-xs text-gray-500">
                  Em breve vais encontrar aqui:
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Missões específicas desta House</li>
                    <li>Leaderboard de membros com mais XP</li>
                    <li>Eventos, treinos e desafios comunitários</li>
                    <li>Badges e recompensas ligadas à blockchain Apertum</li>
                  </ul>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
