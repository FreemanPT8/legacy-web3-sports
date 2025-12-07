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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Loader2,
  ArrowLeft,
  ExternalLink,
  User,
  Users,
  Shield,
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
  development: 'In development',
  under_construction: 'In construction',
  active: 'Active',
};

function StatusBadge({ status }: { status: HouseStatus }) {
  const map: Record<
    HouseStatus,
    { label: string; variant: 'default' | 'secondary' | 'outline' }
  > = {
    active: { label: 'Active', variant: 'default' },
    under_construction: { label: 'In construction', variant: 'secondary' },
    development: { label: 'In development', variant: 'outline' },
  };

  const config = map[status];

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
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

  // Proteção da rota
  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  // Carregar detalhes para overview
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading House overview...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading House overview...</span>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <p className="text-gray-700 dark:text-gray-200">
            {error || 'House not found or could not be loaded.'}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/houses')}
            className="inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Houses
          </Button>
        </div>
      </div>
    );
  }

  const publicProfileUrl = `/sports/houses/${house.id}`;
  const moderatorsCount = moderators.length;
  const hasHead = !!head;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <main>
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          {/* Back + título */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/admin/houses')}
              className="mb-1 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Houses
            </button>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    {house.name || 'House of Sports'}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Admin overview for this House of Sports. From here tens
                    acesso rápido à edição, liderança e permissões.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 text-xs text-gray-500 dark:text-gray-300 text-right">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(publicProfileUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Public profile
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(`/admin/houses/${house.id}/edit`)
                    }
                  >
                    Edit House
                  </Button>
                </div>
                <div>ID: {house.id}</div>
                {createdAtFormatted && <div>Created at: {createdAtFormatted}</div>}
              </div>
            </div>
          </div>

          {/* Mensagem de erro se existir */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Quick metrics */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-300">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <StatusBadge status={house.status ?? 'development'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-300">
                  Head of House
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasHead ? (
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {head?.full_name || head?.username || 'Head'}
                    </p>
                    {head?.username && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{head.username} · {head.role || 'Member'}
                      </p>
                    )}
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900"
                  >
                    Missing Head
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-300">
                  Moderators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{moderatorsCount}</div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Users helping to manage missions, content and community tools.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grid principal: informação + gestão */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Info da House */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>House information</CardTitle>
                <CardDescription>
                  Sport, country, public profile e breve resumo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Sport + Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                      Sport
                    </p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {house.sport_name || 'Unknown sport'}
                    </p>
                    {house.sport_code && (
                      <p className="text-xs text-gray-500 uppercase">
                        {house.sport_code}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                      Country
                    </p>
                    <Badge
                      variant="outline"
                      className="uppercase font-mono dark:border-gray-700"
                    >
                      {house.country_code || '—'}
                    </Badge>
                  </div>
                </div>

                {/* Public profile preview */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t pt-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Este painel é apenas uma visão geral. A edição da House
                    (sport, país, status, avatar, descrição) é feita em{' '}
                    <span className="font-mono text-[11px] bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded">
                      /admin/houses/{house.id}/edit
                    </span>
                    . O perfil público está em{' '}
                    <span className="font-mono text-[11px] bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded">
                      {publicProfileUrl}
                    </span>
                    .
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={publicProfileUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View public profile
                    </Link>
                    <Link
                      href="/sports/houses"
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                    >
                      All Houses
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gestão rápida: rotas de administração */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Admin actions
                </CardTitle>
                <CardDescription>
                  Atalhos para editar esta House, a liderança e as permissões.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/houses/${house.id}/edit`)
                  }
                >
                  <Trophy className="h-4 w-4" />
                  <span>Edit House (sport, country, status, profile)</span>
                </Button>

                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/houses/${house.id}/roles`)
                  }
                >
                  <User className="h-4 w-4" />
                  <span>Manage Head & moderators</span>
                </Button>

                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/houses/${house.id}/permissions`)
                  }
                >
                  <Shield className="h-4 w-4" />
                  <span>Manage moderator permissions</span>
                </Button>

                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  A gestão detalhada sai deste overview para manter o código
                  mais limpo. As rotas acima vão usar a mesma API que já existe
                  hoje, apenas separada por ecrãs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
