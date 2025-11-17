'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, UserIcon, Shield, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface AdminHouse {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  head?: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  moderators_count?: number;
}

interface HeadUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface ModeratorUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface ApiHouseListResponse {
  success: boolean;
  houses?: AdminHouse[];
  error?: string;
}

interface ApiHeadResponse {
  success: boolean;
  head: HeadUser | null;
  error?: string;
}

interface ApiModeratorsResponse {
  success: boolean;
  moderators: ModeratorUser[];
  error?: string;
}

interface ApiGenericResponse {
  success: boolean;
  error?: string;
}

function StatusBadge({ status }: { status: HouseStatus }) {
  const map: Record<HouseStatus, { label: string; variant: string }> = {
    active: { label: 'Active', variant: 'bg-green-100 text-green-800' },
    under_construction: {
      label: 'Under construction',
      variant: 'bg-yellow-100 text-yellow-800',
    },
    development: {
      label: 'In development',
      variant: 'bg-gray-100 text-gray-800',
    },
  };

  const cfg = map[status] ?? map.development;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.variant}`}
    >
      {cfg.label}
    </span>
  );
}

export default function AdminHouseDetailPage() {
  const router = useRouter();
  const params = useParams<{ houseId: string }>();
  const houseId = params?.houseId as string;

  const { user, loading: authLoading, getToken } = useAuth();

  const [house, setHouse] = useState<AdminHouse | null>(null);
  const [head, setHead] = useState<HeadUser | null>(null);
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headUserIdInput, setHeadUserIdInput] = useState('');
  const [modUserIdInput, setModUserIdInput] = useState('');

  const [savingHead, setSavingHead] = useState(false);
  const [removingHead, setRemovingHead] = useState(false);
  const [savingMod, setSavingMod] = useState(false);
  const [removingModId, setRemovingModId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }

    if (!houseId) {
      setError('Invalid House ID');
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = getToken();
        if (!token) {
          setError('No authentication token provided');
          setLoading(false);
          return;
        }

        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };

        // 1) Buscar lista de Houses e encontrar esta
        const housesRes = await fetch('/api/admin/houses', {
          method: 'GET',
          headers,
        });

        const housesJson: ApiHouseListResponse = await housesRes.json();

        if (!housesJson.success || !housesJson.houses) {
          setError(housesJson.error || 'Failed to load house');
          setLoading(false);
          return;
        }

        const current = housesJson.houses.find((h) => h.id === houseId);

        if (!current) {
          setError('House not found');
          setLoading(false);
          return;
        }

        setHouse(current);

        // 2) Head atual
        const headRes = await fetch(`/api/admin/houses/${houseId}/head`, {
          method: 'GET',
          headers,
        });

        const headJson: ApiHeadResponse = await headRes.json();
        if (headJson.success) {
          setHead(headJson.head);
        } else {
          setError(headJson.error || 'Failed to load head of house');
        }

        // 3) Moderadores
        const modsRes = await fetch(
          `/api/admin/houses/${houseId}/moderators`,
          {
            method: 'GET',
            headers,
          }
        );

        const modsJson: ApiModeratorsResponse = await modsRes.json();
        if (modsJson.success && Array.isArray(modsJson.moderators)) {
          setModerators(modsJson.moderators);
        } else if (!modsJson.success) {
          setError(modsJson.error || 'Failed to load moderators');
        }
      } catch (err) {
        console.error('Error loading house detail:', err);
        setError('Unexpected error loading house details');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [authLoading, user, getToken, router, houseId]);

  const createdAtFormatted = useMemo(() => {
    if (!house?.created_at) return '';
    try {
      return format(new Date(house.created_at), 'yyyy-MM-dd HH:mm');
    } catch {
      return house.created_at;
    }
  }, [house?.created_at]);

  const handlePromoteHead = async () => {
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

      const res = await fetch(`/api/admin/houses/${houseId}/head`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: headUserIdInput.trim() }),
      });

      const json: ApiHeadResponse = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to set Head of House');
        return;
      }

      setHead(json.head);
      setHeadUserIdInput('');
    } catch (err) {
      console.error('Error promoting Head of House:', err);
      setError('Unexpected error while promoting Head of House');
    } finally {
      setSavingHead(false);
    }
  };

  const handleRemoveHead = async () => {
    if (!head) return;

    try {
      setRemovingHead(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setRemovingHead(false);
        return;
      }

      const res = await fetch(`/api/admin/houses/${houseId}/head`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json: ApiGenericResponse = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to remove Head of House');
        return;
      }

      setHead(null);
    } catch (err) {
      console.error('Error removing Head of House:', err);
      setError('Unexpected error while removing Head of House');
    } finally {
      setRemovingHead(false);
    }
  };

  const handleAddModerator = async () => {
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

      const res = await fetch(
        `/api/admin/houses/${houseId}/moderators`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: modUserIdInput.trim() }),
        }
      );

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        moderator?: ModeratorUser;
      };

      if (!json.success) {
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
    try {
      setRemovingModId(userId);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setRemovingModId(null);
        return;
      }

      const res = await fetch(
        `/api/admin/houses/${houseId}/moderators`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      const json: ApiGenericResponse = await res.json();

      if (!json.success) {
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading House details...</span>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            {error || 'House not found or could not be loaded.'}
          </p>
          <Button variant="outline" onClick={() => router.push('/admin/houses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Houses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/houses')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Houses
            </button>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <Trophy className="h-7 w-7 text-yellow-500" />
              {house.sport_name || 'Unknown sport'}
            </h1>
            <p className="text-gray-600">
              House ID: <span className="font-mono text-xs">{house.id}</span>
            </p>
          </div>
          <div className="text-right space-y-1">
            <StatusBadge status={house.status} />
            <div className="text-xs text-gray-500">
              Country:{' '}
              <span className="uppercase font-mono">
                {house.country_code}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Created: <span>{createdAtFormatted}</span>
            </div>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4 text-red-800 text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Head of House + Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Head of House
              </CardTitle>
              <CardDescription>
                Define or update the leader responsible for this House.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {head ? (
                <div className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {head.full_name || head.username || 'Unknown user'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {head.email || 'No email'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Role: {head.role || 'Member'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingHead}
                      onClick={handleRemoveHead}
                    >
                      {removingHead && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Remove Head
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  This House has no Head defined yet.
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm text-gray-700">
                  Promote a user to Head of House by providing their{' '}
                  <span className="font-mono text-xs">userId</span> (podes
                  copiar do Supabase por agora – mais tarde fazemos pesquisa por
                  username/email).
                </p>
                <div className="flex flex-col md:flex-row gap-2">
                  <Input
                    placeholder="User ID (uuid) do novo Head"
                    value={headUserIdInput}
                    onChange={(e) => setHeadUserIdInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handlePromoteHead}
                    disabled={savingHead || !headUserIdInput.trim()}
                  >
                    {savingHead && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Promote to Head
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moderators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-purple-500" />
                Moderators
              </CardTitle>
              <CardDescription>
                Manage House moderators (total: {moderators.length}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-auto border rounded-lg p-2 bg-gray-50">
                {moderators.length === 0 ? (
                  <div className="text-xs text-gray-500">
                    No moderators yet.
                  </div>
                ) : (
                  moderators.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between text-sm bg-white rounded-md px-2 py-1 shadow-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {mod.full_name || mod.username || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {mod.email || 'No email'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={removingModId === mod.id}
                        onClick={() => handleRemoveModerator(mod.id)}
                      >
                        {removingModId === mod.id && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-gray-700">
                  Add a moderator by{' '}
                  <span className="font-mono text-[10px]">userId</span>.
                </p>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="User ID (uuid) do moderador"
                    value={modUserIdInput}
                    onChange={(e) => setModUserIdInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddModerator}
                    disabled={savingMod || !modUserIdInput.trim()}
                  >
                    {savingMod && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add Moderator
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
