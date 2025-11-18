'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
}

interface HeadUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface ModeratorUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
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

  const [statusDraft, setStatusDraft] = useState<HouseStatus>('development');
  const [headUserIdInput, setHeadUserIdInput] = useState('');
  const [modUserIdInput, setModUserIdInput] = useState('');

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
        };

        setHouse(detail);
        setStatusDraft(detail.status);
        setHead(json.head ?? null);
        setModerators(json.moderators ?? []);
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

      setHouse((prev) =>
        prev ? { ...prev, status: statusDraft } : prev
      );
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
        // Se estava em "development", passamos localmente para "under_construction"
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
      // Se estava em under_construction e sem Head, voltamos para development
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

  // 6) Estados intermédios

  if (authLoading) {
    return null;
  }

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
            <Button variant="outline" onClick={() => router.push('/admin/houses')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Houses
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
                Admin panel for this House of Sports. Manage Head of House,
                moderators and status.
              </p>
            </div>
            <div className="text-xs text-gray-500 text-right">
              <div>ID: {house.id}</div>
              {createdAtFormatted && (
                <div>Created at: {createdAtFormatted}</div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Info geral da House */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>House information</CardTitle>
                <CardDescription>
                  Sport, country, status and basic metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Select
                      value={statusDraft}
                      onValueChange={(value) =>
                        setStatusDraft(value as HouseStatus)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-48">
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
                  The main leader of this House.
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
                    No Head of House defined yet.
                  </p>
                )}

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
                    Use this to promote an existing Admin / Super Admin as Head
                    of House. You can change the Head at any time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Moderadores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                House moderators
              </CardTitle>
              <CardDescription>
                Users who help manage this House (missions, content, community).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <p className="text-[11px] text-gray-500">
                Moderators do not replace the Head of House, but can manage
                missions, events and community tools for this sport.
              </p>

              {moderators.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No moderators assigned yet.
                </p>
              ) : (
                <div className="border rounded-md divide-y bg-white">
                  {moderators.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {mod.full_name || mod.username || 'Unknown user'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {mod.username && <>@{mod.username} · </>}
                          {mod.role || 'Member'}
                        </p>
                      </div>
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
                    </div>
                  ))}
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
