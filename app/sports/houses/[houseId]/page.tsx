'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/app/components/SafeImage';
import { Loader2, ArrowLeft, Users, User, Trophy } from 'lucide-react';
import { ContentComments } from '@/components/comments/ContentComments';

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
  member_count: number;
  xp_total: number;
  xp_breakdown: {
    head: number;
    moderators: number;
    members: number;
  };
  participant_breakdown: {
    total: number;
    head: number;
    moderators: number;
    members: number;
  };
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
      return 'Em construção';
    case 'development':
      return 'Em desenvolvimento';
    default:
      return status;
  }
}

function statusBadgeClass(status: HouseStatus): string {
  switch (status) {
    case 'active':
      return 'inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] px-2.5 py-0.5 border border-emerald-500/40';
    case 'under_construction':
      return 'inline-flex items-center rounded-full bg-amber-500/10 text-amber-300 text-[11px] px-2.5 py-0.5 border border-amber-500/40';
    case 'development':
    default:
      return 'inline-flex items-center rounded-full bg-slate-700/60 text-slate-200 text-[11px] px-2.5 py-0.5 border border-slate-500';
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
          err?.message || 'Erro inesperado ao carregar dados da House.',
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
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-custom">
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
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-body mb-4">
              {error || 'House não encontrada ou ainda não está disponível.'}
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-body hover:bg-slate-800"
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

  // House em development só visível para Admin/Super Admin
  if (house.status === 'development' && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <p className="text-body mb-4">
              Esta House ainda está em desenvolvimento e não tem perfil público
              disponível.
            </p>
            <button
              onClick={() => router.push('/sports/houses')}
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-body hover:bg-slate-800"
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
    <div className="min-h-screen flex flex-col bg-page">
      <Header />

      <main className="flex-1">
        {/* HERO / HEADER DA HOUSE */}
        <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push('/sports/houses')}
                className="inline-flex items-center text-xs text-muted-custom hover:text-body"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar às Houses
              </button>

              {isAdmin && (
                <Link
                  href={`/sports/houses/${house.id}/edit`}
                  className="text-[11px] text-blue-300 hover:text-blue-200"
                >
                  Editar perfil público
                </Link>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar da House */}
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-slate-900 border border-slate-600 flex items-center justify-center shadow-sm overflow-hidden">
                  {house.avatar_url && house.avatar_url.trim() !== '' ? (
                    <SafeImage
                      src={house.avatar_url}
                      alt={`Imagem da House ${house.name}`}
                      className="h-full w-full object-cover"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-blue-300">
                      <Trophy className="h-8 w-8" />
                      <span className="text-[10px] font-semibold uppercase">
                        {house.sport_code || 'House'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-heading">
                    {house.name}
                  </h1>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-custom">
                    {house.sport_name && (
                      <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-600 px-2.5 py-0.5">
                        {house.sport_name}{' '}
                        {house.sport_code && (
                          <span className="ml-1 text-[10px] uppercase text-slate-400">
                            {house.sport_code}
                          </span>
                        )}
                      </span>
                    )}

                    {house.country_code && (
                      <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-600 px-2.5 py-0.5 text-[11px] uppercase font-mono">
                        {house.country_code}
                      </span>
                    )}

                    <span className={statusBadgeClass(house.status)}>
                      {formatStatusLabel(house.status)}
                    </span>
                  </div>

                  {createdAtFormatted && (
                    <p className="mt-1 text-[11px] text-muted-custom">
                      Criada em {createdAtFormatted}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA principal */}
              <div className="flex flex-col items-start md:items-end gap-2 text-xs">
                <p className="text-muted-custom max-w-xs text-left md:text-right">
                  Esta House representa a comunidade de{' '}
                  {house.sport_name || 'um desporto'} em{' '}
                  {house.country_code || 'um país'} dentro do ecossistema
                  Web3/Apertum. Ao criares conta, ligamos-te automaticamente a
                  esta House (quando houver vaga) ou guardamos o teu perfil até
                  a comunidade abrir portas.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                  >
                    Criar conta e ligar-me
                  </Link>
                  {user && (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-body hover:bg-slate-800"
                    >
                      Ir para a minha dashboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTEÚDO PRINCIPAL */}
        <section className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Descrição / visão da House */}
          <div className="grid gap-6 md:grid-cols-[1.7fr,1.3fr]">
            <div className="rounded-xl border border-custom bg-card-custom p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-heading mb-2">
                Sobre esta House
              </h2>
              {house.description ? (
                <p className="text-xs text-body whitespace-pre-line">
                  {house.description}
                </p>
              ) : (
                <>
                  <p className="text-xs text-body mb-2">
                    As Houses of Sports são comunidades focadas num desporto
                    específico, ligadas ao universo Web3 e à Apertum Blockchain.
                    O objetivo desta House é juntar atletas, treinadores, clubes
                    e entusiastas que queiram explorar novas formas de{' '}
                    <strong>
                      comunidade, incentivos e recompensas on-chain
                    </strong>
                    .
                  </p>
                  <p className="text-xs text-body mb-2">
                    Nesta fase inicial, a House está a definir a sua visão, a
                    estrutura de comunidade, as missões e o tipo de conteúdo
                    educativo que vai disponibilizar: desde noções base de
                    blockchain e Web3 até modelos de participação em comunidade
                    no desporto.
                  </p>
                  <p className="text-[11px] text-muted-custom mt-2">
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
              <div className="rounded-xl border border-custom bg-card-custom p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-heading mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Head of House
                </h3>

                {head ? (
                  <div>
                    <p className="text-sm font-medium text-heading">
                      {head.full_name || head.username}
                    </p>
                    <p className="text-xs text-muted-custom">
                      {head.username && <>@{head.username} · </>}
                      {head.role || 'Membro'}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-custom">
                      O Head of House é responsável por orientar a comunidade,
                      definir prioridades de conteúdo, missões e eventos, sempre
                      ligado à visão da SPORTS OFFICES e ao ecossistema da
                      Apertum.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-custom">
                    Esta House ainda não tem Head definido publicamente. Quando
                    o Head estiver atribuído, vais poder ver aqui quem lidera a
                    comunidade deste desporto.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-custom bg-card-custom p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-heading mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Moderadores da House
                </h3>

                {moderators.length === 0 ? (
                  <p className="text-xs text-muted-custom">
                    Ainda não existem moderadores públicos para esta House.
                    Moderadores vão apoiar o Head na gestão de missões,
                    conteúdo e comunidade.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs text-body">
                    {moderators.map((mod) => (
                      <li key={mod.id} className="flex flex-col">
                        <span className="font-medium text-heading">
                          {mod.full_name || mod.username}
                        </span>
                        <span className="text-muted-custom">
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

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5 text-xs text-body">
            <h2 className="text-sm font-semibold text-heading mb-2">
              Membros e XP da House
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">Participantes</p>
                <p className="text-lg font-semibold text-heading">{house.participant_breakdown.total}</p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">Heads</p>
                <p className="text-lg font-semibold text-heading">{house.participant_breakdown.head}</p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">Moderadores</p>
                <p className="text-lg font-semibold text-heading">{house.participant_breakdown.moderators}</p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">Membros</p>
                <p className="text-lg font-semibold text-heading">{house.participant_breakdown.members}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">XP total</p>
                <p className="text-lg font-semibold text-heading">{house.xp_total.toLocaleString('pt-PT')}</p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">XP Head</p>
                <p className="text-lg font-semibold text-heading">
                  {house.xp_breakdown.head.toLocaleString('pt-PT')}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">XP Moderadores</p>
                <p className="text-lg font-semibold text-heading">
                  {house.xp_breakdown.moderators.toLocaleString('pt-PT')}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-custom">XP Membros</p>
                <p className="text-lg font-semibold text-heading">
                  {house.xp_breakdown.members.toLocaleString('pt-PT')}
                </p>
              </div>
            </div>
          </div>

          <ContentComments
            contentId={house.id}
            contentType="house"
            houseId={house.id}
            title="Comentários privados desta House"
          />

          {/* CTA final */}
          <div className="border-t border-slate-800 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-heading">
                Queres fazer parte desta visão para o desporto em Web3?
              </h3>
              <p className="text-xs text-muted-custom max-w-xl">
                A LEGACY existe para ajudar profissionais e entusiastas a
                navegarem o mundo da blockchain e da comunidade, sem jargão
                técnico e passo a passo, desporto a desporto.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Criar conta no LEGACY
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
