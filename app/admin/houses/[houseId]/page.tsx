'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  User,
  Users,
  Shield,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { SafeImage } from '@/app/components/SafeImage';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface HouseDetailFromApi {
  id: string;
  name?: string;
  sport_name?: string | null;
  sport_code?: string | null;
  country_code?: string;
  status?: HouseStatus;
  created_at?: string | null;
  avatar_url?: string | null;
  description?: string | null;
}

interface HeadUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface ModeratorPermissions {
  canManageMissions?: boolean;
  canManageContent?: boolean;
  canManageMembers?: boolean;
}

interface ModeratorUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  permissions?: ModeratorPermissions | null;
}

interface HouseDetailApiResponse {
  success: boolean;
  error?: string;
  house?: HouseDetailFromApi;
  head?: HeadUser | null;
  moderators?: ModeratorUser[];
}

const STATUS_LABELS: Record<HouseStatus, string> = {
  active: 'Active',
  under_construction: 'Under construction',
  development: 'In development',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  active:
    'inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200',
  under_construction:
    'inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200',
  development:
    'inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200',
};

const secondaryButtonClasses =
  'border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60';

function StatusBadge({ status }: { status: HouseStatus }) {
  const safeStatus = status ?? 'development';
  return (
    <span className={STATUS_BADGE_CLASSES[safeStatus]}>
      {STATUS_LABELS[safeStatus]}
    </span>
  );
}

export default function AdminHouseOverviewPage() {
  const router = useRouter();
  const params = useParams<{ houseId: string }>();
  const houseId = params?.houseId;

  const { user, getToken, loading: authLoading } = useAuth();

  const [house, setHouse] = useState<HouseDetailFromApi | null>(null);
  const [head, setHead] = useState<HeadUser | null>(null);
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!houseId) return;

      setLoading(true);
      setError(null);

      try {
        const token = getToken();
        if (!token) {
          setError('No authentication token provided');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/admin/houses/${houseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json: HouseDetailApiResponse = await res.json();

        if (!res.ok || !json.success || !json.house) {
          setError(json.error || 'Failed to load House detail.');
          setHouse(null);
          setHead(null);
          setModerators([]);
          setLoading(false);
          return;
        }

        setHouse(json.house);
        setHead(json.head ?? null);
        setModerators(json.moderators ?? []);
      } catch (err) {
        console.error('Error loading House overview:', err);
        setError('Unexpected error while loading House overview.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user && houseId) {
      fetchDetail();
    }
  }, [authLoading, user, houseId, getToken]);

  const createdAtFormatted = useMemo(() => {
    if (!house?.created_at) return '';
    try {
      return format(new Date(house.created_at), 'dd/MM/yyyy HH:mm');
    } catch {
      return house.created_at as string;
    }
  }, [house?.created_at]);

  const publicProfileUrl = house ? `/sports/houses/${house.id}` : '#';
  const moderatorsCount = moderators.length;
  const hasHead = !!head;
  const safeStatus: HouseStatus = house?.status ?? 'development';
  const heroTitle =
    house?.name || house?.sport_name || 'House of Sports overview';

  if (
    authLoading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading House overview...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading House overview...</span>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white px-4">
        <div className="rounded-2xl border border-white/10 bg-[#05212b] p-6 text-center space-y-4">
          <p className="text-sm text-slate-300">
            {error || 'House not found or could not be loaded.'}
          </p>
          <Button
            variant="outline"
            className={secondaryButtonClasses}
            onClick={() => router.push('/admin/houses')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Houses
          </Button>
        </div>
      </div>
    );
  }

  const permissionBadge = (
    label: string,
    active: boolean,
    colorClasses: string,
  ) =>
    active ? (
      <span
        key={label}
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colorClasses}`}
      >
        {label}
      </span>
    ) : null;

  const renderPermissionBadges = (permissions?: ModeratorPermissions | null) => {
    if (!permissions) {
      return (
        <span className="text-xs text-slate-400">Sem permissoes definidas</span>
      );
    }

    const badges = [
      permissionBadge(
        'Missions',
        !!permissions.canManageMissions,
        'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
      ),
      permissionBadge(
        'Content',
        !!permissions.canManageContent,
        'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
      ),
      permissionBadge(
        'Members',
        !!permissions.canManageMembers,
        'border-amber-400/40 bg-amber-500/10 text-amber-200',
      ),
    ].filter(Boolean);

    if (badges.length === 0) {
      return (
        <span className="text-xs text-slate-400">Sem permissoes definidas</span>
      );
    }

    return <div className="flex flex-wrap gap-2">{badges}</div>;
  };

  return (
    <div className="min-h-screen bg-[#000c12] text-white px-4 py-10 md:px-10">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#04141c] via-[#03121a] to-[#020b11] p-6 md:p-10 shadow-2xl shadow-black/40 space-y-6">
          <button
            onClick={() => router.push('/admin/houses')}
            className="inline-flex items-center text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Houses
          </button>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                HOUSE OVERVIEW
              </p>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#05212b]">
                  <Building2 className="h-7 w-7 text-cyan-300" />
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-white">
                    {heroTitle}
                  </h1>
                  <p className="text-sm text-slate-300">
                    Painel completo com o mesmo design system da homepage para
                    acompanhar estado, lideranca, permissoes e estatisticas
                    desta house.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
                onClick={() => window.open(publicProfileUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver perfil publico
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => router.push(`/admin/houses/${house.id}/edit`)}
              >
                Editar house
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <span>ID: {house.id}</span>
            {createdAtFormatted && <span>Criada em {createdAtFormatted}</span>}
            <span>Estado atual: {STATUS_LABELS[safeStatus]}</span>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                STATUS
              </p>
              <CardTitle className="text-white">Situacao atual</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <StatusBadge status={safeStatus} />
              <p className="text-sm text-slate-300">
                Atualiza o estado para alinhar expectativas com a comunidade.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                HEAD
              </p>
              <CardTitle className="text-white">Lideranca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasHead ? (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full border border-white/10 bg-[#03121a]">
                    {head?.avatar_url ? (
                      <SafeImage
                        src={head.avatar_url}
                        alt={head.full_name || head.username || 'Head'}
                        className="h-full w-full rounded-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-slate-300">
                        {(head?.full_name || head?.username || 'HH')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">
                      {head?.full_name || head?.username || 'Head'}
                    </p>
                    {head?.username && (
                      <p className="text-xs text-slate-400">
                        @{head.username} - {head?.role || 'Member'}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-rose-300">
                  Sem head atribuido. Define um responsavel em Roles.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                MODERATORS
              </p>
              <CardTitle className="text-white">Operacao</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">
                {moderatorsCount}
              </p>
              <p className="text-sm text-slate-300">
                Utilizadores com funcoes ativas nesta house.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                LOCAL
              </p>
              <CardTitle className="text-white">Esporte e pais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-300">
              <p>
                <span className="text-white">Esporte:</span>{' '}
                {house.sport_name || 'Sem nome definido'}
              </p>
              <p>
                <span className="text-white">Codigo:</span>{' '}
                {house.sport_code || 'N/A'}
              </p>
              <p>
                <span className="text-white">Pais:</span>{' '}
                {house.country_code || 'N/A'}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="text-white">House information</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Perfil publico, descricao, identificadores e avatar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-3xl border border-white/10 bg-[#03121a]">
                  {house.avatar_url ? (
                    <SafeImage
                      src={house.avatar_url}
                      alt={heroTitle}
                      className="h-full w-full rounded-3xl object-cover"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-slate-300">
                      {(house.sport_code || house.country_code || 'HOS')
                        .slice(0, 3)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-300">
                    Public profile:{' '}
                    <Link
                      href={publicProfileUrl}
                      target="_blank"
                      className="text-cyan-300 hover:text-cyan-200"
                    >
                      {publicProfileUrl}
                    </Link>
                  </p>
                  <p className="text-sm text-slate-300">
                    Edit path:{' '}
                    <span className="font-mono text-xs text-slate-400">
                      /admin/houses/{house.id}/edit
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                  DESCRICAO
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {house.description?.trim() || 'Sem descricao definida.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="text-white">Admin actions</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Atalhos para gerir papeis, permissoes e conteudo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => router.push(`/admin/houses/${house.id}/roles`)}
              >
                <User className="mr-2 h-4 w-4" />
                Gerir head e moderadores
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() =>
                  router.push(`/admin/houses/${house.id}/permissions`)
                }
              >
                <Shield className="mr-2 h-4 w-4" />
                Configurar permissoes
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => router.push('/admin/missions')}
              >
                <Users className="mr-2 h-4 w-4" />
                Abrir missoes
              </Button>
              <p className="text-xs text-slate-400">
                Estas rotas usam o mesmo sistema visual, o que garante
                consistencia no fluxo de administracao.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
            MODERADORES E PERMISSOES
          </p>
          <Card className="border border-white/10 bg-[#05212b]">
            <CardHeader>
              <CardTitle className="text-white">Lista de moderadores</CardTitle>
              <CardDescription className="text-sm text-slate-300">
                Tabela escura alinhada com o resto do design system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moderators.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-300">
                  Nenhum moderador atribuido ainda. Usa o botao de Roles para
                  adicionar.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="bg-[#05212b] text-xs uppercase tracking-[0.3em] text-slate-300">
                        <th className="px-4 py-3 font-medium">Membro</th>
                        <th className="px-4 py-3 font-medium">Funcao</th>
                        <th className="px-4 py-3 font-medium">Permissoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moderators.map((moderator, index) => (
                        <tr
                          key={moderator.id}
                          className={`text-sm ${
                            index % 2 === 0 ? 'bg-[#000c12]' : 'bg-[#020b11]'
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full border border-white/10 bg-[#03121a]">
                                {moderator.avatar_url ? (
                                  <SafeImage
                                    src={moderator.avatar_url}
                                    alt={
                                      moderator.full_name ||
                                      moderator.username ||
                                      'Moderator'
                                    }
                                    className="h-full w-full rounded-full object-cover"
                                    width={40}
                                    height={40}
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300">
                                    {(moderator.full_name ||
                                      moderator.username ||
                                      'MD')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {moderator.full_name ||
                                    moderator.username ||
                                    'Moderator'}
                                </p>
                                {moderator.username && (
                                  <p className="text-xs text-slate-400">
                                    @{moderator.username}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {moderator.role || 'Moderator'}
                          </td>
                          <td className="px-4 py-4">
                            {renderPermissionBadges(moderator.permissions)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
