'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/app/components/SafeImage';
import { Loader2, ArrowLeft, Users, User, Trophy } from 'lucide-react';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface HousePublic {
  id: string;
  name: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  avatar_url: string | null;
  description: string | null;
  created_at: string | null;
}

interface PublicUser {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface HousePublicApiResponse {
  success: boolean;
  error?: string;
  house?: HousePublic;
  head?: PublicUser | null;
  moderators?: PublicUser[];
}

function formatStatusLabel(status: HouseStatus): string {
  switch (status) {
    case 'active':
      return 'Ativa';
    case 'under_construction':
      return 'Em construÃ§Ã£o';
    case 'development':
      return 'Em desenvolvimento';
    default:
      return status;
  }
}

function statusBadgeClass(status: HouseStatus): string {
  switch (status) {
    case 'active':
      return 'inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 border border-emerald-200';
    case 'under_construction':
      return 'inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[11px] px-2.5 py-0.5 border border-amber-200';
    case 'development':
    default:
      return 'inline-flex items-center rounded-full bg-gray-50 text-gray-600 text-[11px] px-2.5 py-0.5 border border-gray-200';
  }
}

export default function PublicHouseProfilePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const houseId = params?.houseId;

  const [house, setHouse] = useState<HousePublic | null>(null);
  const [head, setHead] = useState<PublicUser | null>(null);
  const [moderators, setModerators] = useState<PublicUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    user && (user.role === 'Super Admin' || user.role === 'Admin');

  useEffect(() => {
    if (!houseId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/sports/houses/${houseId}`);
        const json: HousePublicApiResponse = await res.json();

        if (!res.ok || !json.success || !json.house) {
          throw new Error(json.error || 'Erro ao carregar House.');
        }

        setHouse(json.house);
        setHead(json.head ?? null);
        setModerators(json.moderators ?? []);
      } catch (err: any) {
        console.error('Error loading public House:', err);
        setError(
          err?.message || 'Erro inesperado ao carregar dados da House.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [houseId]);

  const createdAtFormatted = useMemo(() => {
    if (!house?.created_at) return '';
    try {
      return new Date(house.created_at).toLocaleString('pt-PT');
    } catch {
      return house.created_at;
    }
  }, [house?.created_at]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>A carregar House of Sportsâ€¦</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              {error || 'House nÃ£o encontrada ou ainda nÃ£o estÃ¡ disponÃ­vel.'}
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar Ã s Houses
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // House em development sÃ³ visÃ­vel para Admin/Super Admin
  if (house.status === 'development' && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-gray-700 mb-4">
              Esta House ainda estÃ¡ em desenvolvimento e nÃ£o tem perfil pÃºblico
              disponÃ­vel.
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar Ã s Houses
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* HERO / HEADER DA HOUSE */}
        <section className="bg-gradient-to-b from-blue-50 to-transparent border-b border-blue-100">
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push('/sports/houses')}
                className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar Ã s Houses
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar da House (imagem se existir) */}
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white border border-blue-100 flex items-center justify-center shadow-sm overflow-hidden">
                  {house.avatar_url && house.avatar_url.trim() !== '' ? (
                    <SafeImage
                      src={house.avatar_url}
                      alt={`Imagem da House ${house.name}`}
                      className="h-full w-full object-cover"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-blue-600">
                      <Trophy className="h-8 w-8" />
                      <span className="text-[10px] font-semibold uppercase">
                        {house.sport_code || 'House'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {house.name}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    {house.sport_name && (
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-0.5">
                        {house.sport_name}{' '}
                        {house.sport_code && (
                          <span className="ml-1 text-[10px] uppercase text-gray-400">
                            {house.sport_code}
                          </span>
                        )}
                      </span>
                    )}
                    {house.country_code && (
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] uppercase font-mono">
                        {house.country_code}
                      </span>
                    )}
                    <span className={statusBadgeClass(house.status)}>
                      {formatStatusLabel(house.status)}
                    </span>
                  </div>
                  {createdAtFormatted && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      Criada em {createdAtFormatted}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA principal */}
              <div className="flex flex-col items-start md:items-end gap-2 text-xs">
                <p className="text-gray-500 max-w-xs text-left md:text-right">
                  Esta House representa a comunidade de{' '}
                  {house.sport_name || 'um desporto'} em{' '}
                  {house.country_code || 'um paÃ­s'} dentro do ecossistema
                  Web3/Apertum.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/sports/onboarding"
                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Fazer onboarding de desporto
                  </Link>
                  {user && (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Ir para a minha dashboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTEÃšDO PRINCIPAL DA HOUSE */}
        <section className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* DescriÃ§Ã£o / visÃ£o da House */}
          <div className="grid gap-6 md:grid-cols-[1.7fr,1.3fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Sobre esta House
              </h2>

              {house.description ? (
                <p className="text-xs text-gray-600 whitespace-pre-line">
                  {house.description}
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-600 mb-2">
                    As Houses of Sports sÃ£o comunidades focadas num desporto
                    especÃ­fico, ligadas ao universo Web3 e Ã  Apertum
                    Blockchain. O objetivo desta House Ã© juntar atletas,
                    treinadores, clubes e entusiastas que queiram explorar
                    novas formas de{' '}
                    <strong>
                      comunidade, incentivos e recompensas on-chain
                    </strong>
                    .
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Nesta fase inicial, a House estÃ¡ a definir a sua visÃ£o, a
                    estrutura de comunidade, as missÃµes e o tipo de conteÃºdo
                    educativo que vai disponibilizar: desde noÃ§Ãµes base de
                    blockchain e Web3 atÃ© modelos de participaÃ§Ã£o em comunidade
                    no desporto.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Em versÃµes futuras, o Head of House e a equipa vÃ£o poder
                    editar esta secÃ§Ã£o diretamente no painel de administraÃ§Ã£o,
                    definindo a identidade visual e a descriÃ§Ã£o oficial da
                    House.
                  </p>
                </>
              )}
            </div>

            {/* Head + Moderadores */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Head of House
                </h3>
                {head ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {head.full_name || head.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {head.username && <>@{head.username} Â· </>}
                      {head.role || 'Membro'}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-500">
                      O Head of House Ã© responsÃ¡vel por orientar a comunidade,
                      definir prioridades de conteÃºdo, missÃµes e eventos, sempre
                      ligado Ã  visÃ£o da SPORTS OFFICES e ao ecossistema da
                      Apertum.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Esta House ainda nÃ£o tem Head definido publicamente. Quando
                    o Head estiver atribuÃ­do, vais poder ver aqui quem lidera a
                    comunidade deste desporto.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Moderadores da House
                </h3>
                {moderators.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Ainda nÃ£o existem moderadores pÃºblicos para esta House.
                    Moderadores vÃ£o apoiar o Head na gestÃ£o de missÃµes,
                    conteÃºdo e comunidade.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs text-gray-700">
                    {moderators.map((mod) => (
                      <li key={mod.id} className="flex flex-col">
                        <span className="font-medium">
                          {mod.full_name || mod.username}
                        </span>
                        <span className="text-gray-500">
                          {mod.username && <>@{mod.username} Â· </>}
                          {mod.role || 'Membro'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* SecÃ§Ã£o futura para membros / XP / chat */}
          <div className="rounded-xl border border-dashed border-gray-300 bg_white/60 bg-white p-5 text-xs text-gray-600">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              O que vem a seguir para esta House?
            </h2>
            <p className="mb-2">
              Em prÃ³ximos desenvolvimentos, esta pÃ¡gina vai mostrar:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                NÃºmero de membros ativos da House e XP coletivo (soma de XP de
                todos os membros).
              </li>
              <li>
                Um botÃ£o para entrar no <strong>chat privado da House</strong>{' '}
                (apenas para membros).
              </li>
              <li>
                MissÃµes e trilhos de aprendizagem especÃ­ficos deste desporto,
                com recompensas em XP e, mais tarde, integraÃ§Ã£o on-chain.
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-gray-500">
              Para jÃ¡, o passo mais importante Ã© garantires que o teu perfil
              estÃ¡ alinhado com o desporto certo atravÃ©s do onboarding
              personalizado.
            </p>
          </div>

          {/* CTA final */}
          <div className="border-t pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Queres fazer parte desta visÃ£o para o desporto em Web3?
              </h3>
              <p className="text-xs text-gray-500 max-w-xl">
                A LEGACY existe para ajudar profissionais e entusiastas a
                navegarem o mundo da blockchain e da comunidade, sem jargÃ£o
                tÃ©cnico e passo a passo, desporto a desporto.
              </p>
            </div>
            <Link
              href="/sports/onboarding"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ComeÃ§ar onboarding personalizado
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

