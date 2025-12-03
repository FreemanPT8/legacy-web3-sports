'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Loader2,
  ArrowLeft,
  User,
  UserPlus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface HouseDetail {
  id: string;
  name: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string | null;
  avatar_url: string | null;
  description: string | null;
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
  house?: {
    id: string;
    name?: string;
    sport_name?: string | null;
    sport_code?: string | null;
    country_code?: string;
    status?: HouseStatus;
    created_at?: string | null;
    avatar_url?: string | null;
    description?: string | null;
  };
  head?: HeadUser | null;
  moderators?: ModeratorUser[];
}

interface ApiHeadResponse {
  success: boolean;
  error?: string;
  head?: HeadUser | null;
}

interface ApiGenericResponse {
  success: boolean;
  error?: string;
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

export default function AdminHouseDetailPage() {
  const router = useRouter();
  const params = useParams<{ houseId: string }>();
  const houseId = params?.houseId;

  const { user, getToken, loading: authLoading } = useAuth();

  const [house, setHouse] = useState<HouseDetail | null>(null);
  const [head, setHead] = useState<HeadUser | null>(null);
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingHead, setSavingHead] = useState(false);
  const [removingHead, setRemovingHead] = useState(false);
  const [savingMod, setSavingMod] = useState(false);
  const [removingModId, setRemovingModId] = useState<string | null>(null);
  const [savingPermModId, setSavingPermModId] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState<HouseStatus>('development');
  const [headUserIdInput, setHeadUserIdInput] = useState('');
  const [modUserIdInput, setModUserIdInput] = useState('');

  // novos drafts para perfil público
  const [avatarDraft, setAvatarDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // 1) Proteção da rota
  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  // 2) Carregar detalhes da House
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
          setLoading(false);
          return;
        }

        const h = json.house;

        const detail: HouseDetail = {
          id: h.id,
          name: h.name || 'Unnamed House',
          sport_name: h.sport_name ?? null,
          sport_code: h.sport_code ?? null,
          country_code: h.country_code ?? '',
          status: h.status ?? 'development',
          created_at: h.created_at ?? null,
          avatar_url: h.avatar_url ?? null,
          description: h.description ?? null,
        };

        setHouse(detail);
        setStatusDraft(detail.status);
        setHead(json.head ?? null);
        setModerators(json.moderators ?? []);
        setAvatarDraft(detail.avatar_url ?? '');
        setDescriptionDraft(detail.description ?? '');
      } catch (err) {
        console.error('Error loading House detail:', err);
        setError('Unexpected error while loading House detail.');
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
      return house.created_at;
    }
  }, [house?.created_at]);

  // --- Permissões derivadas no client ---
  const isSuperAdmin = user?.role === 'Super Admin';
  const isHeadOfThisHouse = !!(head && user && head.id === user.id);

  // Quem pode mexer em quê:
  const canManageHead = isSuperAdmin; // só Super Admin define/remove Head
  const canManageModerators = isSuperAdmin || isHeadOfThisHouse;

  const ensurePermissions = (
    raw: ModeratorPermissions | null | undefined
  ): Required<ModeratorPermissions> => {
    return {
      canManageMissions: !!raw?.canManageMissions,
      canManageContent: !!raw?.canManageContent,
      canManageMembers: !!raw?.canManageMembers,
    };
  };

  // 3) Atualizar status da House
  const handleSaveStatus = async () => {
    if (!house) return;

    try {
      setSavingStatus(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setSavingStatus(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: statusDraft }),
      });

      const json: ApiGenericResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to update House status');
        return;
      }

      setHouse((prev) => (prev ? { ...prev, status: statusDraft } : prev));
    } catch (err) {
      console.error('Error updating House status:', err);
      setError('Unexpected error while updating House status');
    } finally {
      setSavingStatus(false);
    }
  };

  // 4) Head of House

  const handlePromoteHead = async () => {
    if (!house) return;
    if (!headUserIdInput.trim()) {
      setError('Please provide a userId to promote as Head.');
      return;
    }
    if (!canManageHead) {
      setError('Only Super Admin can change the Head of House.');
      return;
    }

    try {
      setSavingHead(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setSavingHead(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}/head`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: headUserIdInput.trim() }),
      });

      const json: ApiHeadResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to set Head of House');
        return;
      }

      if (json.head) {
        setHead(json.head);
        // se estava em development e ganhou Head → under_construction
        setHouse((prev) =>
          prev
            ? {
                ...prev,
                status:
                  prev.status === 'development'
                    ? 'under_construction'
                    : prev.status,
              }
            : prev
        );
        setStatusDraft((prev) =>
          prev === 'development' ? 'under_construction' : prev
        );
      }

      setHeadUserIdInput('');
    } catch (err) {
      console.error('Error promoting Head of House:', err);
      setError('Unexpected error while promoting Head of House');
    } finally {
      setSavingHead(false);
    }
  };

  const handleRemoveHead = async () => {
    if (!house || !head) return;
    if (!canManageHead) {
      setError('Only Super Admin can remove the Head of House.');
      return;
    }

    try {
      setRemovingHead(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setRemovingHead(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}/head`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json: ApiGenericResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to remove Head of House');
        return;
      }

      setHead(null);
      // se estava under_construction e perdeu Head → development
      setHouse((prev) =>
        prev
          ? {
              ...prev,
              status:
                prev.status === 'under_construction'
                  ? 'development'
                  : prev.status,
            }
          : prev
      );
      setStatusDraft((prev) =>
        prev === 'under_construction' ? 'development' : prev
      );
    } catch (err) {
      console.error('Error removing Head of House:', err);
      setError('Unexpected error while removing Head of House');
    } finally {
      setRemovingHead(false);
    }
  };

  // 5) Moderators

  const handleAddModerator = async () => {
    if (!house) return;
    if (!modUserIdInput.trim()) {
      setError('Please provide a userId for the moderator.');
      return;
    }
    if (!canManageModerators) {
      setError(
        'Only the Head of this House or a Super Admin can add moderators.'
      );
      return;
    }

    try {
      setSavingMod(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setSavingMod(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}/moderators`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: modUserIdInput.trim() }),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        moderator?: ModeratorUser;
      };

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to add moderator');
        return;
      }

      if (json.moderator) {
        setModerators((prev) => {
          const exists = prev.some((m) => m.id === json.moderator!.id);
          if (exists) return prev;
          return [...prev, json.moderator!];
        });
      }

      setModUserIdInput('');
    } catch (err) {
      console.error('Error adding moderator:', err);
      setError('Unexpected error while adding moderator');
    } finally {
      setSavingMod(false);
    }
  };

  const handleRemoveModerator = async (userId: string) => {
    if (!house) return;
    if (!canManageModerators) {
      setError(
        'Only the Head of this House or a Super Admin can remove moderators.'
      );
      return;
    }

    try {
      setRemovingModId(userId);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setRemovingModId(null);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}/moderators`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const json: ApiGenericResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to remove moderator');
        return;
      }

      setModerators((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      console.error('Error removing moderator:', err);
      setError('Unexpected error while removing moderator');
    } finally {
      setRemovingModId(null);
    }
  };

  const updateModeratorPermission = (
    modId: string,
    key: keyof ModeratorPermissions,
    value: boolean
  ) => {
    setModerators((prev) =>
      prev.map((m) => {
        if (m.id !== modId) return m;
        const current = ensurePermissions(m.permissions ?? undefined);
        return {
          ...m,
          permissions: {
            ...current,
            [key]: value,
          },
        };
      })
    );
  };

  const handleSaveModeratorPermissions = async (userId: string) => {
    if (!house) return;
    if (!canManageModerators) {
      setError(
        'Only the Head of this House or a Super Admin can change moderator permissions.'
      );
      return;
    }

    const moderator = moderators.find((m) => m.id === userId);
    if (!moderator) return;

    try {
      setSavingPermModId(userId);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setSavingPermModId(null);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}/moderators`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          permissions: moderator.permissions ?? {},
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        permissions?: ModeratorPermissions | null;
      };

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to update moderator permissions');
        return;
      }

      if (typeof json.permissions !== 'undefined') {
        setModerators((prev) =>
          prev.map((m) =>
            m.id === userId ? { ...m, permissions: json.permissions ?? null } : m
          )
        );
      }
    } catch (err) {
      console.error('Error updating moderator permissions:', err);
      setError('Unexpected error while updating moderator permissions');
    } finally {
      setSavingPermModId(null);
    }
  };

  // 6) Guardar perfil público (imagem + descrição)
  const handleSaveProfile = async () => {
    if (!house) return;

    try {
      setSavingProfile(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setSavingProfile(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${house.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_url: avatarDraft.trim() || null,
          description: descriptionDraft.trim() || null,
        }),
      });

      const json: ApiGenericResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to update public profile');
        return;
      }

      setHouse((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: avatarDraft.trim() || null,
              description: descriptionDraft.trim() || null,
            }
          : prev
      );
    } catch (err) {
      console.error('Error updating public profile:', err);
      setError('Unexpected error while updating public profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // 7) Estados intermédios

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading House details...</span>
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
              {error || 'House not found or could not be loaded.'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/houses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Houses
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const publicProfileUrl = `/sports/houses/${house.id}`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <button
            onClick={() => router.push('/admin/houses')}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Houses
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                {house.name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Admin panel for this House of Sports. Manage status, leadership
                and moderators. Ligada ao perfil público em{' '}
                <span className="font-mono text-xs text-gray-700">
                  /sports/houses/{house.id}
                </span>
                .
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-gray-500 text-right">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(publicProfileUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Public profile
                </Button>
              </div>
              <div>ID: {house.id}</div>
              {createdAtFormatted && <div>Created at: {createdAtFormatted}</div>}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Quick metrics */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBadge status={house.status} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Head of House</CardTitle>
              </CardHeader>
              <CardContent>
                {head ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      {head.full_name || head.username || 'Head'}
                    </span>
                    {head.username && (
                      <span className="text-xs text-gray-500">@{head.username}</span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                    Missing Head
                  </Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Moderators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{moderators.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* GRID PRINCIPAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Info + status */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>House information</CardTitle>
                <CardDescription>
                  Sport, country, status and connection to the public profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">
                      Sport
                    </p>
                    <p className="font-medium text-gray-900">
                      {house.sport_name || 'Unknown sport'}
                    </p>
                    {house.sport_code && (
                      <p className="text-xs text-gray-500 uppercase">
                        {house.sport_code}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">
                      Country
                    </p>
                    <Badge variant="outline" className="uppercase font-mono">
                      {house.country_code}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={house.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 max-w-sm">
                      <strong>Regra sugerida:</strong> sem Head =&gt; development;
                      Head mas House ainda a ser montada =&gt; under construction;
                      House a receber membros =&gt; active (por agora controlado
                      manualmente aqui).
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Select
                      value={statusDraft}
                      onValueChange={(value) =>
                        setStatusDraft(value as HouseStatus)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-52">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">
                          In development
                        </SelectItem>
                        <SelectItem value="under_construction">
                          In construction
                        </SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleSaveStatus}
                      disabled={savingStatus}
                    >
                      {savingStatus && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save status
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4 mt-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-xs text-gray-600">
                    Este painel afeta o que os utilizadores veem em{' '}
                    <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">
                      {publicProfileUrl}
                    </span>
                    .
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={publicProfileUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View public profile
                    </Link>
                    <Link
                      href="/sports/houses"
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition"
                    >
                      All Houses
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Head of House */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Head of House
                </CardTitle>
                <CardDescription>
                  Main leader of this House. Changing this impacts public view.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {head ? (
                  <div className="border rounded-md px-3 py-2 bg-gray-50">
                    <p className="font-medium text-gray-900">
                      {head.full_name || head.username || 'Unknown user'}
                    </p>
                    {head.username && (
                      <p className="text-xs text-gray-500">
                        @{head.username} · {head.role || 'Member'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No Head of House defined yet. Quando definires um, a House
                    tende a passar de &quot;development&quot; para
                    &quot;under construction&quot;.
                  </p>
                )}

                {canManageHead ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Paste user_id of Admin / Super Admin"
                      value={headUserIdInput}
                      onChange={(e) => setHeadUserIdInput(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handlePromoteHead}
                        disabled={savingHead}
                      >
                        {savingHead && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {head ? 'Change Head' : 'Set Head'}
                      </Button>
                      {head && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRemoveHead}
                          disabled={removingHead}
                        >
                          {removingHead && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Remove Head
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Usa apenas utilizadores com role <strong>Admin</strong> ou{' '}
                      <strong>Super Admin</strong> como Head nesta fase. O nome e
                      o username aparecem no perfil público da House.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Apenas contas <strong>Super Admin</strong> podem definir ou
                    alterar o Head of House. Admins podem consultar, mas não
                    alterar este campo.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Perfil público: imagem + descrição */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Public profile (image & description)</CardTitle>
              <CardDescription>
                Define como esta House aparece na página pública e no perfil da
                própria House.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {avatarDraft ? (
                    <img
                      src={avatarDraft}
                      alt={house.name}
                      className="h-20 w-20 rounded-xl object-cover border border-gray-200 bg-gray-100"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 text-center px-2">
                      No image yet
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Avatar URL (temporário)
                  </label>
                  <Input
                    placeholder="https://... (LEGACY House image)"
                    value={avatarDraft}
                    onChange={(e) => setAvatarDraft(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-500">
                    Mais tarde podes ter um sistema de upload com o layout
                    visual LEGACY. Por agora usamos um URL direto para a imagem
                    da House.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Short description
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Descrição curta da House (apresentação para a página pública)."
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Podes escrever em português por agora. No futuro vamos
                  internacionalizar esta descrição para as 6 línguas.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save public profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Moderadores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                House moderators
              </CardTitle>
              <CardDescription>
                Users who help manage missions, content and community tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageModerators ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Input
                    placeholder="Paste user_id to add as moderator"
                    value={modUserIdInput}
                    onChange={(e) => setModUserIdInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddModerator}
                    disabled={savingMod}
                  >
                    {savingMod && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add moderator
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">
                  Apenas o <strong>Head desta House</strong> ou um{' '}
                  <strong>Super Admin</strong> podem adicionar ou remover
                  moderadores. Podes ver a lista abaixo, mas não alterar.
                </p>
              )}

              <p className="text-[11px] text-gray-500">
                Moderators não substituem o Head of House, mas podem gerir
                missões, eventos e comunidade. Cada moderador pode ter
                permissões específicas (missões, conteúdo, membros) definidas
                aqui.
              </p>

              {moderators.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No moderators assigned yet.
                </p>
              ) : (
                <div className="border rounded-md divide-y bg-white">
                  {moderators.map((mod) => {
                    const perms = ensurePermissions(mod.permissions ?? undefined);

                    return (
                      <div
                        key={mod.id}
                        className="px-3 py-2 text-sm space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {mod.full_name || mod.username || 'Unknown user'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mod.username && <>@{mod.username} · </>}
                              {mod.role || 'Member'}
                            </p>
                          </div>
                          {canManageModerators && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={removingModId === mod.id}
                              onClick={() => handleRemoveModerator(mod.id)}
                            >
                              {removingModId === mod.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Remove
                            </Button>
                          )}
                        </div>

                        {/* Permissões do moderador */}
                        <div className="mt-1">
                          <p className="text-[11px] text-gray-500 mb-1">
                            Permissions for this moderator:
                          </p>
                          <div className="flex flex-wrap gap-3 text-[11px] text-gray-700">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-gray-300"
                                checked={perms.canManageMissions}
                                disabled={!canManageModerators}
                                onChange={(e) =>
                                  updateModeratorPermission(
                                    mod.id,
                                    'canManageMissions',
                                    e.target.checked
                                  )
                                }
                              />
                              <span>Gerir missões</span>
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-gray-300"
                                checked={perms.canManageContent}
                                disabled={!canManageModerators}
                                onChange={(e) =>
                                  updateModeratorPermission(
                                    mod.id,
                                    'canManageContent',
                                    e.target.checked
                                  )
                                }
                              />
                              <span>Gerir conteúdo</span>
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-gray-300"
                                checked={perms.canManageMembers}
                                disabled={!canManageModerators}
                                onChange={(e) =>
                                  updateModeratorPermission(
                                    mod.id,
                                    'canManageMembers',
                                    e.target.checked
                                  )
                                }
                              />
                              <span>Gerir membros</span>
                            </label>
                            {canManageModerators && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto"
                                disabled={savingPermModId === mod.id}
                                onClick={() =>
                                  handleSaveModeratorPermissions(mod.id)
                                }
                              >
                                {savingPermModId === mod.id && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Save permissions
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
