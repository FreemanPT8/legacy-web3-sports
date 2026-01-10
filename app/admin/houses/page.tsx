'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Building2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { SafeImage } from '@/app/components/SafeImage';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

type HouseStatus = 'development' | 'under_construction' | 'active';

interface AdminHouse {
  id: string;
  sport_name: string | null;
  sport_code: string | null;
  country_code: string;
  status: HouseStatus;
  created_at: string;
  avatar_url?: string | null;
  head?: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  moderators_count?: number;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  houses?: AdminHouse[];
}

interface HeadInvite {
  id: string;
  houseId: string;
  houseKey: string;
  houseName: string;
  countryCode: string | null;
  email: string;
  status: string | null;
  token?: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  targetUserId?: string | null;
}

interface JoinRequest {
  id: string;
  houseId: string;
  houseKey: string;
  houseName: string;
  countryCode: string | null;
  status: string | null;
  note: string | null;
  createdAt: string;
  user: {
    id: string | null;
    name: string;
    username: string | null;
    email: string | null;
  };
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

const statusOptions: { value: 'all' | HouseStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'development', label: 'In development' },
];

const secondaryButtonClasses =
  'border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60';

function StatusBadge({ status }: { status: HouseStatus }) {
  return (
    <span className={STATUS_BADGE_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function AdminHousesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const invitesSectionRef = useRef<HTMLDivElement | null>(null);

  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HouseStatus>('all');
  const [canCreateSports, setCanCreateSports] = useState(false);
  const [checkingSportPermission, setCheckingSportPermission] =
    useState(true);
  const [sportModalOpen, setSportModalOpen] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportCode, setNewSportCode] = useState('');
  const [newSportNamePt, setNewSportNamePt] = useState('');
  const [newSportNameEs, setNewSportNameEs] = useState('');
  const [creatingSport, setCreatingSport] = useState(false);
  const [houseToDelete, setHouseToDelete] = useState<AdminHouse | null>(null);
  const [deletingHouse, setDeletingHouse] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<HeadInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [decliningInviteId, setDecliningInviteId] = useState<string | null>(null);
  const [termInvite, setTermInvite] = useState<HeadInvite | null>(null);
  const [termChecked, setTermChecked] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
  const [joinSummary, setJoinSummary] = useState<{
    totals: Record<string, number>;
    houses: Array<{
      houseId: string;
      houseKey: string;
      name: string;
      countryCode: string | null;
      counts: Record<string, number>;
      lastRequest: string | null;
    }>;
  } | null>(null);
  const [joinSummaryLoading, setJoinSummaryLoading] = useState(false);
  const [joinSummaryError, setJoinSummaryError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';
  const highlightInvites = searchParams?.get('tab') === 'invites';

  const fetchHouses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError('No authentication token provided');
        setHouses([]);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/houses', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load Houses of Sports');
        setHouses([]);
      } else {
        setHouses(data.houses || []);
      }
    } catch (err) {
      console.error('Error loading houses in /admin/houses:', err);
      setError('Unexpected error while loading Houses of Sports');
      setHouses([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const handleDeleteHouse = useCallback(async () => {
    if (!houseToDelete) return;
    try {
      setDeletingHouse(true);
      const token = getToken();
      if (!token) {
        throw new Error('Sem token de autenticação.');
      }
      const response = await fetch(`/api/admin/houses/${houseToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Não foi possível remover a House.');
      }
      toast({
        title: 'House removida',
        description: `${houseToDelete.sport_name ?? 'House'} foi removida permanentemente.`,
      });
      setHouseToDelete(null);
      await fetchHouses();
    } catch (err) {
      toast({
        title: 'Erro ao remover House',
        description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setDeletingHouse(false);
    }
  }, [fetchHouses, getToken, houseToDelete, toast]);

  const refreshHeadInvites = useCallback(async () => {
    if (!user) {
      setPendingInvites([]);
      return;
    }

    const token = getToken();
    if (!token) {
      setPendingInvites([]);
      return;
    }

    setInvitesLoading(true);
    setInvitesError(null);
    try {
      const response = await fetch('/api/head-invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Falha ao carregar convites.');
      }
      setPendingInvites(payload.invites || []);
    } catch (err) {
      console.error('[admin/houses] load head invites failed', err);
      setPendingInvites([]);
      setInvitesError(
        err instanceof Error ? err.message : 'NÇœo foi possÇðvel carregar convites.',
      );
    } finally {
      setInvitesLoading(false);
    }
  }, [getToken, user]);

  const refreshJoinRequests = useCallback(async () => {
    if (!user) {
      setJoinRequests([]);
      return;
    }

    const token = getToken();
    if (!token) {
      setJoinRequests([]);
      setJoinRequestsError('Sessão inválida.');
      return;
    }

    setJoinRequestsLoading(true);
    setJoinRequestsError(null);
    try {
      const response = await fetch('/api/admin/houses/join-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Falha ao carregar pedidos.');
      }
      setJoinRequests(payload.requests || []);
    } catch (err) {
      console.error('[admin/houses] load join requests failed', err);
      setJoinRequests([]);
      setJoinRequestsError(
        err instanceof Error ? err.message : 'Não foi possível carregar os pedidos pendentes.',
      );
    } finally {
      setJoinRequestsLoading(false);
    }
  }, [getToken, user]);

  const handleCancelJoinRequest = useCallback(
    async (request: JoinRequest) => {
      const token = getToken();
      if (!token) {
        toast({
          title: 'Sessão inválida',
          description: 'Reinicia sessão antes de cancelar o pedido.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setCancelingRequestId(request.id);
        const response = await fetch(`/api/admin/houses/join-requests/${request.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Falha ao cancelar pedido.');
        }
        toast({
          title: 'Pedido cancelado',
          description: `Removeste o pedido de ${request.user.name} para a ${request.houseName}.`,
        });
        await refreshJoinRequests();
      } catch (err) {
        toast({
          title: 'Erro ao cancelar pedido',
          description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setCancelingRequestId(null);
      }
    },
    [getToken, refreshJoinRequests, toast],
  );


  const handleAcceptInvite = useCallback(
    async (invite: HeadInvite) => {
      const token = getToken();
      if (!token) {
        toast({
          title: 'SessÇõÇœo invÇ·lida',
          description: 'Reinicia sessÇõÇœo antes de aceitar o convite.',
          variant: 'destructive',
        });
        return;
      }
      try {
        setAcceptingInviteId(invite.id);
        const response = await fetch('/api/head-invites/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ inviteId: invite.id, acceptTerms: true }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'NÇœo foi possÇðvel aceitar o convite.');
        }
        toast({
          title: 'Convite aceite',
          description: `Assumiste a ${invite.houseName}.`,
        });
        await refreshHeadInvites();
        await fetchHouses();
      } catch (err) {
        toast({
          title: 'Erro ao aceitar convite',
          description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setAcceptingInviteId(null);
      }
    },
    [fetchHouses, getToken, refreshHeadInvites, toast],
  );

  const handleDeclineInvite = useCallback(
    async (invite: HeadInvite) => {
      const token = getToken();
      if (!token) {
        toast({
          title: 'SessÇõÇœo invÇ­lida',
          description: 'Reinicia sessÇõÇœo antes de rejeitar o convite.',
          variant: 'destructive',
        });
        return;
      }
      try {
        setDecliningInviteId(invite.id);
        const response = await fetch('/api/head-invites/decline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ inviteId: invite.id }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'NÇœo foi possÇðvel rejeitar o convite.');
        }
        toast({
          title: 'Convite rejeitado',
          description: `A equipa foi notificada da tua decisÇõÇœo.`,
        });
        await refreshHeadInvites();
      } catch (err) {
        toast({
          title: 'Erro ao rejeitar convite',
          description: err instanceof Error ? err.message : 'Tenta novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setDecliningInviteId(null);
      }
    },
    [getToken, refreshHeadInvites, toast],
  );

  const loadJoinSummary = useCallback(async () => {
    if (!user) {
      setJoinSummary(null);
      return;
    }
    const token = getToken();
    if (!token) {
      setJoinSummary(null);
      setJoinSummaryError('Sessão inválida.');
      return;
    }
    setJoinSummaryLoading(true);
    setJoinSummaryError(null);
    try {
      const response = await fetch('/api/admin/houses/join-report', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Falha ao carregar o resumo.');
      }
      setJoinSummary(payload.summary);
    } catch (err) {
      console.error('[admin/houses] join summary failed', err);
      setJoinSummary(null);
      setJoinSummaryError(err instanceof Error ? err.message : 'Falha ao carregar o resumo.');
    } finally {
      setJoinSummaryLoading(false);
    }
  }, [getToken, user]);

  const handleConfirmInvite = useCallback(async () => {
    if (!termInvite) return;
    if (!termChecked) {
      toast({
        title: 'Confirmação necessária',
        description: 'Lê e aceita o termo antes de assumir a House.',
        variant: 'destructive',
      });
      return;
    }
    await handleAcceptInvite(termInvite);
    setTermInvite(null);
  }, [handleAcceptInvite, termChecked, termInvite, toast]);

  useEffect(() => {
    if (authLoading || !user) return;
    void refreshHeadInvites();
  }, [authLoading, user, refreshHeadInvites]);

  useEffect(() => {
    if (authLoading || !user) return;
    void refreshJoinRequests();
    void loadJoinSummary();
  }, [authLoading, user, refreshJoinRequests, loadJoinSummary]);

  useEffect(() => {
    if (highlightInvites && pendingInvites.length && invitesSectionRef.current) {
      invitesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightInvites, pendingInvites.length]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      router.push('/login');
      return;
    }

    fetchHouses();
  }, [authLoading, user, router, fetchHouses]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (isSuperAdmin) {
      setCanCreateSports(true);
      setCheckingSportPermission(false);
      return;
    }

    let active = true;
    const fetchPermission = async () => {
      setCheckingSportPermission(true);
      try {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch('/api/admin/permissions/self', { headers });
        const data = await response.json();
        if (!active) return;
        if (response.ok && data?.success && data.permissions) {
          setCanCreateSports(!!data.permissions.canCreateSports);
        } else {
          setCanCreateSports(false);
        }
      } catch (err) {
        if (active) setCanCreateSports(false);
      } finally {
        if (active) setCheckingSportPermission(false);
      }
    };

    fetchPermission();

    return () => {
      active = false;
    };
  }, [authLoading, user, getToken, isSuperAdmin]);

  const resetSportForm = () => {
    setNewSportName('');
    setNewSportCode('');
    setNewSportNamePt('');
    setNewSportNameEs('');
  };

  const handleSportDialogChange = (open: boolean) => {
    setSportModalOpen(open);
    if (!open && !creatingSport) {
      resetSportForm();
    }
  };

  const handleCreateSport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newSportName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Define o nome do desporto antes de guardar.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingSport(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const translations: Record<string, string> = {
        en: newSportName.trim(),
      };
      if (newSportNamePt.trim()) {
        translations.pt = newSportNamePt.trim();
      }
      if (newSportNameEs.trim()) {
        translations.es = newSportNameEs.trim();
      }

      const trimmedCode = newSportCode.trim();

      const response = await fetch('/api/admin/sports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newSportName.trim(),
          code: trimmedCode || undefined,
          translations,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível criar o desporto.');
      }

      toast({
        title: 'Desporto criado',
        description:
          'Já podes criar Houses com este desporto. Atualiza a página de criação se já estiver aberta.',
      });
      resetSportForm();
      setSportModalOpen(false);
    } catch (err) {
      console.error('Error creating sport:', err);
      toast({
        title: 'Erro ao criar desporto',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível criar o desporto.',
        variant: 'destructive',
      });
    } finally {
      setCreatingSport(false);
    }
  };

  if (
    authLoading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin')
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading Houses of Sports...</span>
        </div>
      </div>
    );
  }

  const totalHouses = houses.length;
  const activeHouses = houses.filter((h) => h.status === 'active').length;
  const buildingHouses = houses.filter(
    (h) => h.status === 'under_construction',
  ).length;
  const developingHouses = houses.filter(
    (h) => h.status === 'development',
  ).length;
  const missingHeads = houses.filter((h) => !h.head).length;

  const formatCreatedAt = (value: string | null | undefined) => {
    if (!value) return 'Unknown date';
    try {
      return format(new Date(value), 'dd/MM/yyyy');
    } catch (error) {
      return value || 'Unknown date';
    }
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'Unknown date';
    try {
      return format(new Date(value), 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return value || 'Unknown date';
    }
  };

  const canShowSportActions = isSuperAdmin || canCreateSports;

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = houses.filter((house) => {
    if (
      statusFilter !== 'all' &&
      (house.status?.toLowerCase() || 'unknown') !== statusFilter
    ) {
      return false;
    }

    if (!normalizedSearch) return true;

    const terms = [
      house.sport_name,
      house.sport_code,
      house.country_code,
      house.head?.full_name,
      house.head?.username,
    ];

    return terms.some((value) =>
      value?.toLowerCase().includes(normalizedSearch),
    );
  });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] text-white px-4 py-10 md:px-10">
        <div className="mx-auto w-full max-w-6xl space-y-10">
          <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] p-6 md:p-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
            <div className="space-y-4 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
                HOUSES ADMIN
              </p>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#021824]/80">
                  <Building2 className="h-7 w-7 text-cyan-300" />
                </span>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-[#fdd87c]">
                    Houses of Sports
                  </h1>
                  <p className="text-sm text-slate-100">
                    Monitoriza o estado de cada house, confirma lideranca e
                    acelera ativacoes com o mesmo sistema visual da homepage.
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-end lg:w-auto">
              <Button
                className="flex-1 bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_15px_40px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045] sm:flex-none"
                onClick={() => router.push('/admin/houses/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar house
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => {
                  setStatusFilter('active');
                  setSearch('');
                }}
              >
                Ver houses ativas
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClasses}
                onClick={() => {
                  setStatusFilter('all');
                  setSearch('');
                }}
              >
                Reset filtros
              </Button>
            </div>
          </section>

          {user && (
            <section
              ref={invitesSectionRef}
              className={`rounded-3xl border border-white/10 bg-[#02121d]/70 p-6 shadow-[0_25px_70px_rgba(3,10,25,0.45)] transition ${
                highlightInvites ? 'ring-2 ring-[#fdd87c]/70' : ''
              }`}
            >
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">Convites pendentes</p>
                  <h2 className="text-xl font-semibold text-white">Head of House</h2>
                  <p className="text-sm text-slate-300">
                    Aceita ou rejeita convites oficiais sem sair deste painel. Ao aceitar confirmas o termo de
                    responsabilidade em vigor.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={secondaryButtonClasses}
                  onClick={() => void refreshHeadInvites()}
                  disabled={invitesLoading}
                >
                  Atualizar convites
                </Button>
              </div>
              {invitesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A verificar convites...
                </div>
              ) : invitesError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {invitesError}
                </div>
              ) : pendingInvites.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
                  Sem convites pendentes de momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-white">{invite.houseName}</p>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            {invite.houseKey} ¶ú {invite.countryCode || '--'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Convite enviado para {invite.email || 'conta Admin'}
                          </p>
                        </div>
                        <div className="text-xs text-slate-300">
                          {invite.expiresAt
                            ? `Expira em ${new Date(invite.expiresAt).toLocaleDateString('pt-PT')}`
                            : 'Sem data de expiraÇõÇœo'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] hover:opacity-90"
                          onClick={() => {
                            setTermInvite(invite);
                            setTermChecked(false);
                          }}
                          disabled={acceptingInviteId === invite.id}
                        >
                          {acceptingInviteId === invite.id && termInvite?.id === invite.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              A confirmar...
                            </>
                          ) : (
                            'Assumir House'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/30 text-white hover:border-rose-400/60 hover:text-rose-200"
                          onClick={() => void handleDeclineInvite(invite)}
                          disabled={decliningInviteId === invite.id}
                        >
                          {decliningInviteId === invite.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              A rejeitar...
                            </>
                          ) : (
                            'Recusar'
                          )}
                        </Button>
                        {invite.token && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-sm text-cyan-200 hover:text-cyan-100"
                            asChild
                          >
                            <Link href={`/head/invite?token=${invite.token}`} target="_blank">
                              Rever termo completo
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {canShowSportActions && (
            <section className="grid gap-4 md:grid-cols-2">
              {canCreateSports && (
                <Card className="border border-white/10 bg-[#04131b] shadow-xl shadow-black/30">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Adicionar novo desporto
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-300">
                      Regista desportos que ainda não existem para desbloquear
                      novas Houses oficiais.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-slate-300">
                      <p>
                        Super Admin e Admin com permissão podem criar desportos
                        em segundos. As Houses passam a estar disponíveis para
                        esse desporto assim que for criado.
                      </p>
                    </div>
                    <Button
                      className="bg-cyan-500 text-[#00111a] hover:bg-cyan-400"
                      disabled={checkingSportPermission || creatingSport}
                      onClick={() => setSportModalOpen(true)}
                    >
                      Criar desporto
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
              <CardHeader className="space-y-2 pb-2">
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                  TOTAL
                </p>
                <CardTitle className="text-3xl font-semibold text-white">
                  {totalHouses}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Houses registadas no ecossistema.
                </p>
              </CardContent>
            </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                ATIVAS
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {activeHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses com comunidade e lideranca operacionais.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                EM OBRAS
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {buildingHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses under construction a precisar de apoio.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                EM DESENV
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {developingHouses}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Casas ainda no plano inicial ou aguardando assets.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="space-y-2 pb-2">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                SEM HEAD
              </p>
              <CardTitle className="text-3xl font-semibold text-white">
                {missingHeads}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">
                Houses sem lideranca atribuida neste momento.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#02121d]/70 p-6 shadow-[0_25px_70px_rgba(3,10,25,0.45)]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                PEDIDOS PENDENTES
              </p>
              <h2 className="text-xl font-semibold text-white">Pedidos CTA das Houses</h2>
              <p className="text-sm text-slate-300">
                Super Admin vê todos os pedidos. Admins vêem os pedidos das Houses que lideram.
              </p>
            </div>
            <Button
              variant="outline"
              className={secondaryButtonClasses}
              onClick={() => void refreshJoinRequests()}
              disabled={joinRequestsLoading}
            >
              Atualizar pedidos
            </Button>
          </div>
          {joinRequestsError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              {joinRequestsError}
            </p>
          ) : null}
          {joinRequestsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              A carregar pedidos...
            </div>
          ) : joinRequests.length === 0 ? (
            <p className="text-sm text-slate-400">
              Não existem pedidos pendentes nas Houses que geres.
            </p>
          ) : (
            <div className="space-y-4">
              {joinRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-white/10 bg-[#010b16]/70 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{request.user.name}</p>
                      {request.user.username ? (
                        <p className="text-xs text-slate-400">@{request.user.username}</p>
                      ) : null}
                      {request.user.email ? (
                        <p className="text-xs text-slate-500">{request.user.email}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p className="font-semibold text-white">{request.houseName}</p>
                      <p>{request.houseKey}</p>
                      <p>{formatDateTime(request.createdAt)}</p>
                    </div>
                  </div>
                  {request.note ? (
                    <p className="mt-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-sm text-slate-200">
                      {request.note}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className={secondaryButtonClasses}
                      disabled={cancelingRequestId === request.id}
                      onClick={() => void handleCancelJoinRequest(request)}
                    >
                      {cancelingRequestId === request.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A cancelar...
                        </>
                      ) : (
                        'Cancelar pedido'
                      )}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
            FILTROS
          </p>
          <Card className="border border-white/10 bg-[#04131b]">
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Procurar por esporte, codigo ou head..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0"
                />
              </div>
              <div className="w-full md:w-60">
                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setStatusFilter(val as 'all' | HouseStatus)
                  }
                >
                  <SelectTrigger className="bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] border-white/10 text-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#03121a] text-white">
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <Button
                  variant="outline"
                  className={secondaryButtonClasses}
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Limpar filtros
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                  onClick={() => router.push('/admin/houses/create')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova house
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
            LISTA DE HOUSES
          </p>
          <Card className="border border-white/10 bg-[#04131b]/60 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
            <CardHeader>
              <CardTitle className="text-[#fdd87c]">
                Houses encontradas: {filtered.length}
              </CardTitle>
              <CardDescription className="text-sm text-slate-200">
                Os dados abaixo usam o mesmo layout dos cards de houses
                publicos mas com mais contexto para o admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-200">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  A carregar houses...
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-200">
                  {houses.length === 0
                    ? 'Nenhuma house registada ainda. Cria a primeira usando o botao acima.'
                    : 'Nenhuma house corresponde aos filtros atuais.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filtered.map((house) => {
                    const headName =
                      house.head?.full_name ||
                      house.head?.username ||
                      'Sem head atribuido';
                    const headUsername = house.head?.username
                      ? `@${house.head.username}`
                      : null;

                    return (
                      <article
                        key={house.id}
                        className="rounded-2xl border border-white/10 bg-[#04131b] p-5 shadow-[0_25px_70px_rgba(3,10,25,0.55)] transition hover:border-cyan-400/50"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-1 items-start gap-4">
                            <div className="h-16 w-16 rounded-2xl border border-white/10 bg-[#03121a] text-center text-sm font-semibold uppercase text-slate-300">
                              {house.avatar_url &&
                              house.avatar_url.trim() !== '' ? (
                                <SafeImage
                                  src={house.avatar_url}
                                  alt={house.sport_name || 'House of Sports'}
                                  className="h-full w-full rounded-2xl object-cover"
                                  width={64}
                                  height={64}
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center">
                                  {house.sport_code
                                    ?.slice(0, 3)
                                    ?.toUpperCase() ||
                                    house.country_code ||
                                    'HOS'}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Link
                                href={`/admin/houses/${house.id}`}
                                className="text-lg font-semibold text-[#fdd87c] hover:text-cyan-300"
                              >
                                {house.sport_name || 'House sem nome'}
                              </Link>
                              <p className="text-xs uppercase text-slate-400">
                                {house.sport_code || 'Sem codigo'} -{' '}
                                {house.country_code || 'XX'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                ID: {house.id}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col gap-3 text-sm text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full border border-white/10 bg-[#03121a] text-xs font-semibold uppercase text-slate-300">
                                {house.head?.avatar_url &&
                                house.head.avatar_url.trim() !== '' ? (
                                  <SafeImage
                                    src={house.head.avatar_url}
                                    alt={headName}
                                    className="h-full w-full rounded-full object-cover"
                                    width={48}
                                    height={48}
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center">
                                    {headName.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {headName}
                                </p>
                                {headUsername ? (
                                  <p className="text-xs text-slate-400">
                                    {headUsername}
                                  </p>
                                ) : (
                                  <p className="text-xs text-rose-300">
                                    Sem username
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-400">
                              Moderadores ativos:{' '}
                              <span className="font-semibold text-white">
                                {house.moderators_count ?? 0}
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-1 flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={house.status} />
                              <span className="text-xs text-slate-400">
                                Criada em {formatCreatedAt(house.created_at)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                                onClick={() =>
                                  router.push(`/admin/houses/${house.id}`)
                                }
                              >
                                Ver detalhes
                              </Button>
                              <Button
                                variant="outline"
                                className={secondaryButtonClasses}
                                onClick={() =>
                                  router.push(`/admin/houses/${house.id}/roles`)
                                }
                              >
                                Gerir roles
                              </Button>
                              {isSuperAdmin ? (
                                <Button
                                  variant="destructive"
                                  className="border border-rose-500/40 bg-gradient-to-r from-rose-600/80 to-red-700/80 text-white shadow-[0_10px_35px_rgba(244,63,94,0.35)] hover:opacity-90"
                                  onClick={() => setHouseToDelete(house)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Apagar
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
            RESUMO DOS PEDIDOS
          </p>
          <Card className="border border-white/10 bg-[#04131b]/70 shadow-[0_20px_60px_rgba(3,10,25,0.55)]">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-[#fdd87c]">Pedidos em análise</CardTitle>
                  <CardDescription className="text-sm text-slate-200">
                    Super Admin vê todas as Houses; Admin apenas as Houses que lidera.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className={secondaryButtonClasses}
                  onClick={() => {
                    void refreshJoinRequests();
                    void loadJoinSummary();
                  }}
                  disabled={joinSummaryLoading || joinRequestsLoading}
                >
                  Atualizar resumo
                </Button>
              </div>
              {joinSummaryLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A analisar pedidos...
                </div>
              ) : joinSummaryError ? (
                <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
                  {joinSummaryError}
                </p>
              ) : !joinSummary ? (
                <p className="mt-4 text-sm text-slate-300">Sem dados disponíveis.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {Object.entries(joinSummary.totals).map(([status, count]) => (
                      <div key={status} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{status}</p>
                        <p className="text-2xl font-semibold text-white">{count}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {joinSummary.houses.length === 0 ? (
                      <p className="text-sm text-slate-400">Sem pedidos nas Houses que geres.</p>
                    ) : (
                      joinSummary.houses.slice(0, 5).map((house) => (
                        <div
                          key={house.houseId}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{house.name}</p>
                            <span className="text-xs text-slate-400">{house.houseKey}</span>
                            <span className="text-[11px] uppercase text-slate-500">
                              {house.countryCode || '--'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            Pendentes: <span className="text-white">{house.counts.pending ?? 0}</span>{' '}
                            · Último pedido:{' '}
                            {house.lastRequest
                              ? formatDateTime(house.lastRequest)
                              : 'sem registo'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        </div>
      </div>
      <Dialog
        open={Boolean(termInvite)}
        onOpenChange={(open) => {
          if (!open && acceptingInviteId !== termInvite?.id) {
            setTermInvite(null);
            setTermChecked(false);
          }
        }}
      >
        <DialogContent className="border border-white/10 bg-[#02121c] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Termo de responsabilidade</DialogTitle>
            <DialogDescription className="text-slate-300">
              Antes de assumir o cargo lê o compromisso oficial. Só avançamos quando aceitas estes pontos.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[320px] rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-slate-200">
            <p className="mb-3">
              Ao aceitar o papel de Head of House representas o Legacy e a blockchain Apertum. Comprometes-te a:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Colocar o interesse dos membros acima de qualquer agenda pessoal ou comercial.</li>
              <li>Respeitar a autonomia de cada utilizador — ninguém é obrigado a seguir links, falar contigo ou aderir a iniciativas externas.</li>
              <li>Comunicar com verdade, sem promessas de rendimento, sem omitir riscos e sem linguagem enganadora.</li>
              <li>Cumprir limites operacionais: frequência de mensagens, templates aprovados, auditoria e mecanismos anti-spam.</li>
              <li>Atuar como guardião da reputação do Legacy e da Apertum; qualquer abuso implica remoção imediata.</li>
              <li>Aceitar avaliação contínua, relatórios de abuso e consequências definidas pela plataforma.</li>
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Aceitação válida por 90 dias ou até existir nova versão oficial.
            </p>
          </ScrollArea>
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white">
            <Checkbox
              id="term-checkbox"
              checked={termChecked}
              onCheckedChange={(value) => setTermChecked(Boolean(value))}
              className="border-white/40 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-[#04131b]"
            />
            <label htmlFor="term-checkbox" className="leading-relaxed">
              Confirmo que li e aceito integralmente este termo de responsabilidade.
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={secondaryButtonClasses}
              onClick={() => {
                if (acceptingInviteId === termInvite?.id) return;
                setTermInvite(null);
                setTermChecked(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              disabled={!termInvite || acceptingInviteId === termInvite.id}
              onClick={() => void handleConfirmInvite()}
            >
              {acceptingInviteId === termInvite?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A confirmar...
                </>
              ) : (
                'Aceitar e assumir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sportModalOpen} onOpenChange={handleSportDialogChange}>
        <DialogContent className="border border-white/10 bg-[#02121c] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Criar novo desporto</DialogTitle>
            <DialogDescription className="text-slate-300">
              Introduz o nome e, opcionalmente, códigos ou traduções. O
              desporto fica logo disponível para novas Houses.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSport}>
            <div className="space-y-2">
              <Label htmlFor="sport-name" className="text-xs uppercase">
                Nome (EN) *
              </Label>
              <Input
                id="sport-name"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                placeholder="Ex: Climbing"
                className="border-white/20 bg-[#010b15] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport-code" className="text-xs uppercase">
                Código curto (opcional)
              </Label>
              <Input
                id="sport-code"
                value={newSportCode}
                onChange={(e) => setNewSportCode(e.target.value)}
                placeholder="Ex: CLIMBING"
                className="border-white/20 bg-[#010b15] text-white uppercase"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sport-name-pt" className="text-xs uppercase">
                  Nome PT (opcional)
                </Label>
                <Input
                  id="sport-name-pt"
                  value={newSportNamePt}
                  onChange={(e) => setNewSportNamePt(e.target.value)}
                  placeholder="Escalada"
                  className="border-white/20 bg-[#010b15] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport-name-es" className="text-xs uppercase">
                  Nome ES (opcional)
                </Label>
                <Input
                  id="sport-name-es"
                  value={newSportNameEs}
                  onChange={(e) => setNewSportNameEs(e.target.value)}
                  placeholder="Escalada"
                  className="border-white/20 bg-[#010b15] text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60"
                onClick={() => handleSportDialogChange(false)}
                disabled={creatingSport}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creatingSport}
                className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
              >
                {creatingSport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A criar...
                  </>
                ) : (
                  'Criar desporto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(houseToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingHouse) {
            setHouseToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="border border-white/10 bg-[#02121c] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar House</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Tem a certeza que queres remover a{' '}
              <span className="font-semibold text-white">
                {houseToDelete?.sport_name ?? 'House'}
              </span>
              ? Esta ação é irreversível e apaga todos os registos associados a esta House.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingHouse}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingHouse}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
              onClick={() => void handleDeleteHouse()}
            >
              {deletingHouse ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A apagar...
                </>
              ) : (
                'Apagar definitivamente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
