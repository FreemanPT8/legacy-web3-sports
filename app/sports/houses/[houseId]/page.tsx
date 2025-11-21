'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Loader2,
  ArrowLeft,
  Users,
  User,
  Trophy,
  Pencil,
} from 'lucide-react';

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

interface HouseProfile {
  house_id: string;
  image_url: string | null;
  tagline?: string;
  description?: string;
  updated_at?: string | null;
}

interface HouseProfileApiResponse {
  success: boolean;
  error?: string;
  locale?: string;
  profile?: HouseProfile | null;
}

function formatStatusLabel(status: PublicHouseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'UNDER_CONSTRUCTION':
      return 'Em construção';
    case 'IN_DEVELOPMENT':
      return 'Em desenvolvimento';
    default:
      return status;
  }
}

function statusBadgeClass(status: PublicHouseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 border border-emerald-200';
    case 'UNDER_CONSTRUCTION':
      return 'inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[11px] px-2.5 py-0.5 border border-amber-200';
    case 'IN_DEVELOPMENT':
    default:
      return 'inline-flex items-center rounded-full bg-gray-50 text-gray-600 text-[11px] px-2.5 py-0.5 border border-gray-200';
  }
}

export default function PublicHouseProfilePage() {
  const params = useParams<{ houseId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const houseId = params?.houseId;

  const [houses, setHouses] = useState<House[]>([]);
  const [profile, setProfile] = useState<HouseProfile | null>(null);

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
        // 1) Lista de Houses (já usada antes)
        const res = await fetch('/api/sports/houses?locale=pt');
        const json: HousesApiResponse = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Erro ao carregar House.');
        }

        setHouses(json.houses || []);

        // 2) Perfil público da House (imagem, tagline, descrição)
        try {
          const profileRes = await fetch(
            `/api/house-profiles/${houseId}?locale=pt`
          );
          const profileJson: HouseProfileApiResponse =
            await profileRes.json();

          if (!profileRes.ok || !profileJson.success) {
            console.warn(
              'Falha ao carregar perfil da House:',
              profileJson.error
            );
          } else {
            setProfile(profileJson.profile ?? null);
          }
        } catch (profileErr) {
          console.warn('Erro ao carregar perfil da House:', profileErr);
        }
      } catch (err: any) {
        console.error('Error loading Houses list for profile:', err);
        setError(
          err?.message || 'Erro inesperado ao carregar dados da House.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [houseId]);

  const house = useMemo(
    () => houses.find((h) => h.id === houseId),
    [houses, houseId]
  );

  const createdAtFormatted = useMemo(() => {
    if (!house?.created_at) return '';
    try {
      return new Date(house.created_at).toLocaleString('pt-PT');
    } catch {
      return house.created_at;
    }
  }, [house?.created_at]);

  const profileUpdatedAtFormatted = useMemo(() => {
    if (!profile?.updated_at) return '';
    try {
      return new Date(profile.updated_at).toLocaleString('pt-PT');
    } catch {
      return profile.updated_at || '';
    }
  }, [profile?.updated_at]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>A carregar House of Sports…</span>
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
              {error || 'House não encontrada ou ainda não está disponível.'}
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Houses
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // House em desenvolvimento só visível para Admin/Super Admin
  if (house.status === 'IN_DEVELOPMENT' && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-gray-700 mb-4">
              Esta House ainda está em desenvolvimento e não tem perfil público
              disponível.
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Houses
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
                Voltar às Houses
              </button>

              {isAdmin && (
                <Link
                  href={`/sports/houses/${house.id}/edit`}
                  className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  <Pencil className="h-3 w-3 mr-1.5" />
                  Editar perfil público
                </Link>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar da House (imagem se existir) */}
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white border border-blue-100 flex items-center justify-center shadow-sm overflow-hidden">
                  {profile?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.image_url}
                      alt={`Imagem da House ${house.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Trophy className="h-8 w-8 text-blue-500" />
                  )}
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {house.name}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    {house.sport && (
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-0.5">
                        {house.sport.name}{' '}
                        <span className="ml-1 text-[10px] uppercase text-gray-400">
                          {house.sport.code}
                        </span>
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
                  {profile?.tagline && (
                    <p className="mt-2 text-sm text-gray-700">
                      {profile.tagline}
                    </p>
                  )}
                  {createdAtFormatted && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      Criada em {createdAtFormatted}
                    </p>
                  )}
                  {profileUpdatedAtFormatted && (
                    <p className="text-[10px] text-gray-400">
                      Perfil atualizado em {profileUpdatedAtFormatted}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA principal */}
              <div className="flex flex-col items-start md:items-end gap-2 text-xs">
                <p className="text-gray-500 max-w-xs text-left md:text-right">
                  Esta House representa a comunidade de{' '}
                  {house.sport?.name || 'um desporto'} em{' '}
                  {house.country_code || 'um país'} dentro do ecossistema
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

        {/* CONTEÚDO PRINCIPAL DA HOUSE */}
        <section className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Descrição / visão da House */}
          <div className="grid gap-6 md:grid-cols-[1.7fr,1.3fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Sobre esta House
              </h2>

              {profile?.description ? (
                <p className="text-xs text-gray-600 whitespace-pre-line">
                  {profile.description}
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-600 mb-2">
                    As Houses of Sports são comunidades focadas num desporto
                    específico, ligadas ao universo Web3 e à Apertum
                    Blockchain. O objetivo desta House é juntar atletas,
                    treinadores, clubes e entusiastas que queiram explorar
                    novas formas de{' '}
                    <strong>
                      comunidade, incentivos e recompensas on-chain
                    </strong>
                    .
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Nesta fase inicial, a House está a definir a sua visão, a
                    estrutura de comunidade, as missões e o tipo de conteúdo
                    educativo que vai disponibilizar: desde noções base de
                    blockchain e Web3 até modelos de participação em comunidade
                    no desporto.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Em versões futuras, o Head of House e a equipa vão poder
                    editar esta secção diretamente no painel de administração,
                    definindo a identidade visual e a descrição oficial da
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
                {house.head ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {house.head.full_name || house.head.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{house.head.username} · {house.head.role || 'Membro'}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-500">
                      O Head of House é responsável por orientar a comunidade,
                      definir prioridades de conteúdo, missões e eventos, sempre
                      ligado à visão da SPORTS OFFICES e ao ecossistema da
                      Apertum.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Esta House ainda não tem Head definido publicamente. Quando
                    o Head estiver atribuído, vais poder ver aqui quem lidera a
                    comunidade deste desporto.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Moderadores da House
                </h3>
                {house.moderators.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Ainda não existem moderadores públicos para esta House.
                    Moderadores vão apoiar o Head na gestão de missões,
                    conteúdo e comunidade.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs text-gray-700">
                    {house.moderators.map((mod) => (
                      <li key={mod.user_id} className="flex flex-col">
                        <span className="font-medium">
                          {mod.full_name || mod.username}
                        </span>
                        <span className="text-gray-500">
                          {mod.username && <>@{mod.username} · </>}
                          {mod.role || 'Membro'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Secção futura para membros / XP / chat */}
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-5 text-xs text-gray-600">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              O que vem a seguir para esta House?
            </h2>
            <p className="mb-2">
              Em próximos desenvolvimentos, esta página vai mostrar:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Número de membros ativos da House e XP coletivo (soma de XP de
                todos os membros).
              </li>
              <li>
                Um botão para entrar no <strong>chat privado da House</strong>{' '}
                (apenas para membros).
              </li>
              <li>
                Missões e trilhos de aprendizagem específicos deste desporto,
                com recompensas em XP e, mais tarde, integração on-chain.
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-gray-500">
              Para já, o passo mais importante é garantires que o teu perfil
              está alinhado com o desporto certo através do onboarding
              personalizado.
            </p>
          </div>

          {/* CTA final */}
          <div className="border-t pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Queres fazer parte desta visão para o desporto em Web3?
              </h3>
              <p className="text-xs text-gray-500 max-w-xl">
                A LEGACY existe para ajudar profissionais e entusiastas a
                navegarem o mundo da blockchain e da comunidade, sem jargão
                técnico e passo a passo, desporto a desporto.
              </p>
            </div>
            <Link
              href="/sports/onboarding"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Começar onboarding personalizado
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
