'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  Shield,
  Inbox,
  UserPlus,
  Slash,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  FileDown,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type PoolType = 'no_sport' | 'sport_pending' | 'suggestion';
type PoolStatus = 'pending' | 'assigned' | 'dismissed';

interface PoolEntry {
  id: string;
  poolType: PoolType;
  status: PoolStatus;
  sportId: string | null;
  houseId: string | null;
  countryCode: string | null;
  suggestedSportName: string | null;
  suggestedCountryCode: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  notifiedAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
  user: {
    id: string;
    username: string | null;
    fullName: string | null;
    email: string | null;
    country: string | null;
    primaryCountryCode: string | null;
    primarySportId: string | null;
    sportSelectionMethod: string | null;
    requiresAssignment: boolean;
    assignmentNotes: string | null;
    createdAt: string | null;
  } | null;
  sport: {
    id: string;
    code: string | null;
    name: string | null;
  } | null;
  house: {
    id: string;
    countryCode: string | null;
    status: string | null;
    name: string | null;
  } | null;
}

interface PoolApiResponse {
  success: boolean;
  pool: PoolType;
  status: PoolStatus;
  total: number;
  totals: Record<PoolStatus, number>;
  entries: PoolEntry[];
  error?: string;
}

interface HouseOption {
  id: string;
  sport_id: string | null;
  sport_name: string | null;
  country_code: string;
  status: string;
}

interface SportOption {
  id: string;
  name: string;
  code?: string | null;
}

const POOL_LABELS: Record<PoolType, string> = {
  no_sport: 'Pool sem desporto',
  sport_pending: 'A aguardar House do desporto',
  suggestion: 'Sugestões de novos desportos',
};

const STATUS_LABELS: Record<PoolStatus, string> = {
  pending: 'Pendentes',
  assigned: 'Atribuídos',
  dismissed: 'Arquivados',
};

const STATUS_BADGES: Record<PoolStatus, string> = {
  pending: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  assigned: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  dismissed: 'border-slate-500/40 bg-slate-600/10 text-slate-200',
};

export default function SportPoolsAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, loading: authLoading, getToken } = useAuth();

  const normalizePoolParam = (value: string | null): PoolType => {
    if (value === 'no_sport' || value === 'suggestion') return value;
    return 'sport_pending';
  };
  const normalizeStatusParam = (value: string | null): PoolStatus => {
    if (value === 'assigned' || value === 'dismissed') return value;
    return 'pending';
  };

  const [poolType, setPoolType] = useState<PoolType>(() => normalizePoolParam(searchParams.get('pool')));
  const [statusFilter, setStatusFilter] = useState<PoolStatus>(() => normalizeStatusParam(searchParams.get('status')));
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [totals, setTotals] = useState<Record<PoolStatus, number>>({
    pending: 0,
    assigned: 0,
    dismissed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [houses, setHouses] = useState<HouseOption[]>([]);
  const [housesLoading, setHousesLoading] = useState(true);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);

  const [assignModalEntry, setAssignModalEntry] = useState<PoolEntry | null>(null);
  const [assignSportId, setAssignSportId] = useState('');
  const [assignHouseId, setAssignHouseId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [changeSportEntry, setChangeSportEntry] = useState<PoolEntry | null>(null);
  const [changeSportId, setChangeSportId] = useState('');
  const [changeSportNote, setChangeSportNote] = useState('');
  const [changingSport, setChangingSport] = useState(false);

  const [dismissEntry, setDismissEntry] = useState<PoolEntry | null>(null);
  const [dismissNote, setDismissNote] = useState('');
  const [dismissLoading, setDismissLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const normalizeSortParam = (value: string | null): 'newest' | 'oldest' | 'status' => {
    if (value === 'oldest' || value === 'status') return value;
    return 'newest';
  };
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'status'>(() =>
    normalizeSortParam(searchParams.get('sort')),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(() => searchParams.get('entry'));
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAuthorized = !!user && (user.role === 'Admin' || isSuperAdmin);

  const fetchEntries = useCallback(async () => {
    if (!isAuthorized) return;
    const token = getToken?.();
    if (!token) {
      setError('No authentication token found.');
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/sport-pools?pool=${poolType}&status=${statusFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data: PoolApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load sport pool entries.');
      }
      setEntries(data.entries);
      setTotals(data.totals);
      if (
        poolType === 'no_sport' &&
        statusFilter === 'pending' &&
        data.entries.length === 0
      ) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set('pool', 'sport_pending');
        nextParams.set('status', 'pending');
        setPoolType('sport_pending');
        setStatusFilter('pending');
        router.replace(`${pathname}?${nextParams.toString()}`);
      }
    } catch (err: any) {
      console.error('Failed to load sport pools:', err);
      setEntries([]);
      setError(
        err instanceof Error ? err.message : 'Unexpected error loading pools.',
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, isAuthorized, poolType, statusFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAuthorized) {
      router.push('/admin');
      return;
    }
    void fetchEntries();
  }, [authLoading, user, isAuthorized, fetchEntries, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const token = getToken?.();
    if (!token) return;
    let cancelled = false;

    const loadHouses = async () => {
      try {
        setHousesLoading(true);
        const response = await fetch('/api/admin/houses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!cancelled) {
          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to load houses.');
          }
          setHouses(data.houses || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load houses for sport pools:', err);
          setHouses([]);
        }
      } finally {
        if (!cancelled) setHousesLoading(false);
      }
    };

    void loadHouses();
    return () => {
      cancelled = true;
    };
  }, [getToken, isAuthorized]);

  useEffect(() => {
    let cancelled = false;
    const loadSports = async () => {
      try {
        setSportsLoading(true);
        const response = await fetch('/api/sports?locale=pt');
        const data = await response.json();
        if (!cancelled) {
          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to load sports.');
          }
          setSports(
            (data.sports || []).map((sport: any) => ({
              id: sport.id,
              name: sport.name,
              code: sport.code,
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load sports list:', err);
          setSports([]);
        }
      } finally {
        if (!cancelled) setSportsLoading(false);
      }
    };

    void loadSports();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignCountryCode = useMemo(() => {
    if (!assignModalEntry) return null;
    const raw =
      assignModalEntry.countryCode ??
      assignModalEntry.suggestedCountryCode ??
      assignModalEntry.user?.primaryCountryCode ??
      null;
    return raw ? raw.toUpperCase() : null;
  }, [assignModalEntry]);

  const filteredHouses = useMemo(() => {
    if (!assignSportId) return [];
    return houses.filter((house) => {
      if (house.sport_id !== assignSportId) return false;
      if (!assignCountryCode) return true;
      return (house.country_code || '').toUpperCase() === assignCountryCode;
    });
  }, [houses, assignSportId, assignCountryCode]);

  const availableCountries = useMemo(() => {
    const codes = new Set<string>();
    houses.forEach((house) => {
      if (house.country_code) codes.add(house.country_code.toUpperCase());
    });
    entries.forEach((entry) => {
      if (entry.countryCode) codes.add(entry.countryCode.toUpperCase());
      if (entry.suggestedCountryCode) codes.add(entry.suggestedCountryCode.toUpperCase());
    });
    return Array.from(codes).sort();
  }, [houses, entries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (sportFilter !== 'ALL') {
        const entrySportId = entry.sport?.id ?? entry.sportId ?? null;
        if (entrySportId !== sportFilter) return false;
      }
      if (countryFilter !== 'ALL') {
        const entryCountry =
          entry.countryCode ??
          entry.suggestedCountryCode ??
          entry.user?.primaryCountryCode ??
          entry.user?.country ??
          null;
        if (!entryCountry || entryCountry.toUpperCase() !== countryFilter) return false;
      }
      if (!normalizedSearch) return true;
      const haystack = [
        entry.user?.fullName,
        entry.user?.username,
        entry.user?.email,
        entry.sport?.name,
        entry.suggestedSportName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
    const getTimestamp = (value?: string | null) => (value ? new Date(value).getTime() : 0);
    return filtered.sort((a, b) => {
      if (sortOrder === 'oldest') {
        return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
      }
      if (sortOrder === 'status') {
        const rank: Record<PoolStatus, number> = { pending: 0, assigned: 1, dismissed: 2 };
        const diff = rank[a.status] - rank[b.status];
        if (diff !== 0) return diff;
        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      }
      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });
  }, [entries, sportFilter, countryFilter, searchQuery, sortOrder]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const handleExportCsv = useCallback(() => {
    if (!filteredEntries.length) {
      toast({
        title: 'Sem dados para exportar',
        description: 'Filtra pelo menos uma entrada antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'entry_id',
      'pool_type',
      'status',
      'created_at',
      'assigned_at',
      'notified_at',
      'user_full_name',
      'user_email',
      'country',
      'sport_name',
      'suggested_sport',
      'source',
      'notes',
    ];

    const escapeCell = (value: string | null | undefined) => {
      if (!value) return '""';
      const normalized = value.replace(/"/g, '""');
      return `"${normalized}"`;
    };

    const rows = filteredEntries.map((entry) => {
      const country =
        entry.countryCode ??
        entry.suggestedCountryCode ??
        entry.user?.primaryCountryCode ??
        entry.user?.country ??
        '';
      const sportName = entry.sport?.name ?? entry.suggestedSportName ?? '';
      return [
        entry.id,
        entry.poolType,
        entry.status,
        entry.createdAt ?? '',
        entry.assignedAt ?? '',
        entry.notifiedAt ?? '',
        entry.user?.fullName ?? entry.user?.username ?? '',
        entry.user?.email ?? '',
        country,
        sportName,
        entry.suggestedSportName ?? '',
        entry.metadata?.source ? String(entry.metadata.source) : '',
        entry.notes ?? '',
      ]
        .map(escapeCell)
        .join(',');
    });

    const csvContent = [headers.map((header) => `"${header}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sport-pools-${poolType}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Exportação gerada',
      description: `Incluímos ${filteredEntries.length} entradas.`,
    });
  }, [filteredEntries, poolType, toast]);

  useEffect(() => {
    if (!highlightEntryId) return;
    const node = entryRefs.current.get(highlightEntryId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.classList.add('ring-2', 'ring-cyan-400/60');
      const timer = setTimeout(() => {
        node.classList.remove('ring-2', 'ring-cyan-400/60');
        setHighlightEntryId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightEntryId, filteredEntries]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('pool', poolType);
    params.set('status', statusFilter);
    params.set('sort', sortOrder);
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    }
    if (highlightEntryId) {
      params.set('entry', highlightEntryId);
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [poolType, statusFilter, searchQuery, highlightEntryId, sortOrder, pathname, router]);

  useEffect(() => {
    if (!isSuperAdmin && poolType !== 'sport_pending') {
      setPoolType('sport_pending');
    }
  }, [isSuperAdmin, poolType]);

  const assignDialogTitle = useMemo(() => {
    if (!assignModalEntry) return 'Atribuir House';
    const base = assignModalEntry.user?.fullName || assignModalEntry.user?.username || 'Utilizador';
    return `Atribuir House · ${base}`;
  }, [assignModalEntry]);

  const handleCopyEmail = useCallback(
    async (value?: string | null) => {
      if (!value) {
        toast({
          title: 'Sem email disponível',
          description: 'Esta entrada não tem email registado.',
          variant: 'destructive',
        });
        return;
      }
      try {
        await navigator.clipboard?.writeText(value);
        toast({
          title: 'Email copiado',
          description: value,
        });
      } catch (error) {
        console.error('clipboard error', error);
        toast({
          title: 'Não foi possível copiar',
          description: 'Copia manualmente: ' + value,
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('pt-PT');
    } catch {
      return value;
    }
  };

  const handleOpenAssign = (entry: PoolEntry) => {
    setAssignModalEntry(entry);
    setAssignSportId(entry.sportId ?? '');
    setAssignHouseId(entry.houseId ?? '');
    setAssignNote(entry.notes ?? '');
  };

  const handleOpenChangeSport = (entry: PoolEntry) => {
    setChangeSportEntry(entry);
    setChangeSportId(entry.sportId ?? '');
    setChangeSportNote(entry.notes ?? '');
  };

  useEffect(() => {
    if (!assignModalEntry || !assignSportId || assignHouseId) return;
    if (filteredHouses.length === 1) {
      setAssignHouseId(filteredHouses[0].id);
    }
  }, [assignModalEntry, assignSportId, assignHouseId, filteredHouses]);

  const handleAssign = async () => {
    if (!assignModalEntry) return;
    if (!assignSportId || !assignHouseId) {
      toast({
        title: 'Seleciona desporto e House',
        description: 'Escolhe o desporto e a House antes de atribuir.',
        variant: 'destructive',
      });
      return;
    }
    const token = getToken?.();
    if (!token) {
      toast({
        title: 'Token em falta',
        description: 'Inicia sessão novamente para continuar.',
        variant: 'destructive',
      });
      return;
    }
    setAssigning(true);
    try {
      const response = await fetch('/api/admin/sport-pools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryId: assignModalEntry.id,
          action: 'assign',
          sportId: assignSportId,
          houseId: assignHouseId,
          note: assignNote,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao atribuir House.');
      }
      toast({
        title: 'Utilizador atribuído',
        description: 'Atualizámos o desporto e a House deste utilizador.',
      });
      setAssignModalEntry(null);
      setAssignHouseId('');
      setAssignSportId('');
      setAssignNote('');
      void fetchEntries();
    } catch (err: any) {
      console.error('Failed to assign pool entry:', err);
      toast({
        title: 'Erro ao atribuir',
        description: err instanceof Error ? err.message : 'Não foi possível concluir a ação.',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleChangeSport = async () => {
    if (!changeSportEntry) return;
    if (!changeSportId) {
      toast({
        title: 'Seleciona o desporto',
        description: 'Escolhe o desporto antes de alterar.',
        variant: 'destructive',
      });
      return;
    }
    const token = getToken?.();
    if (!token) {
      toast({
        title: 'Token em falta',
        description: 'Inicia sessÇœo novamente para continuar.',
        variant: 'destructive',
      });
      return;
    }
    setChangingSport(true);
    try {
      const response = await fetch('/api/admin/sport-pools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryId: changeSportEntry.id,
          action: 'change_sport',
          sportId: changeSportId,
          note: changeSportNote,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao alterar desporto.');
      }
      toast({
        title: 'Desporto atualizado',
        description: 'AtualizÇ­mos o desporto deste utilizador.',
      });
      setChangeSportEntry(null);
      setChangeSportId('');
      setChangeSportNote('');
      void fetchEntries();
    } catch (err: any) {
      console.error('Failed to change sport:', err);
      toast({
        title: 'Erro ao alterar desporto',
        description: err instanceof Error ? err.message : 'NÇœo foi possÇðvel concluir a aÇõÇœo.',
        variant: 'destructive',
      });
    } finally {
      setChangingSport(false);
    }
  };

  const handleDismiss = async () => {
    if (!dismissEntry) return;
    const token = getToken?.();
    if (!token) {
      toast({
        title: 'Token em falta',
        description: 'Inicia sessão novamente para continuar.',
        variant: 'destructive',
      });
      return;
    }
    setDismissLoading(true);
    try {
      const response = await fetch('/api/admin/sport-pools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryId: dismissEntry.id,
          action: 'dismiss',
          note: dismissNote,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao arquivar entrada.');
      }
      toast({
        title: 'Entrada arquivada',
        description: 'Removemos esta conta da pool.',
      });
      setDismissEntry(null);
      setDismissNote('');
      void fetchEntries();
    } catch (err: any) {
      console.error('Failed to dismiss pool entry:', err);
      toast({
        title: 'Erro ao arquivar',
        description: err instanceof Error ? err.message : 'Não foi possível concluir a ação.',
        variant: 'destructive',
      });
    } finally {
      setDismissLoading(false);
    }
  };

  if (authLoading || !user || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>A carregar painel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#030d18] via-[#021523] to-[#031b27] p-6 shadow-[0_35px_90px_rgba(3,10,25,0.55)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">Governança · Houses</p>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Sport Pools — atribuição manual</h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              Gere contas que aguardam desporto ou House oficial. Estas pools garantem que nenhum utilizador fica parado:
              podes atribuir um desporto aleatório, encaminhar para a nova House ou arquivar pedidos inválidos.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <Shield className="h-5 w-5 text-cyan-300" />
            <span>Super Admins vêem tudo; Heads apenas os desportos que lideram e países sem House ativa.</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-[#03131d]">
          <CardContent className="flex items-center gap-3 p-5">
            <Inbox className="h-10 w-10 text-amber-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Pendentes</p>
              <p className="text-2xl font-semibold text-white">{totals.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#03131d]">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Atribuídos</p>
              <p className="text-2xl font-semibold text-white">{totals.assigned}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#03131d]">
          <CardContent className="flex items-center gap-3 p-5">
            <Slash className="h-10 w-10 text-slate-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Arquivados</p>
              <p className="text-2xl font-semibold text-white">{totals.dismissed}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-[#04131b]/80">
        <CardHeader className="space-y-5 border-b border-white/5 pb-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-xl text-white">Entradas na pool</CardTitle>
              <p className="text-sm text-slate-400 mt-1">{POOL_LABELS[poolType]}</p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Select
                value={poolType}
                onValueChange={(value) => setPoolType(value as PoolType)}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger className="w-full border-white/10 bg-[#020d15] text-left text-white md:w-60">
                  <SelectValue placeholder="Seleciona a pool" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#03131d] text-white">
                  <SelectItem value="no_sport" disabled={!isSuperAdmin}>
                    Pool sem desporto
                  </SelectItem>
                  <SelectItem value="sport_pending">A aguardar House</SelectItem>
                  <SelectItem value="suggestion" disabled={!isSuperAdmin}>
                    Sugestões
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PoolStatus)}>
                <SelectTrigger className="w-full border-white/10 bg-[#020d15] text-left text-white md:w-56">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#03131d] text-white">
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="assigned">Atribuídos</SelectItem>
                  <SelectItem value="dismissed">Arquivados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#020d15] px-3 py-2">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Procurar por nome ou email"
                className="border-none bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:ring-0"
              />
            </div>
            <Select value={sportFilter} onValueChange={(value) => setSportFilter(value)}>
              <SelectTrigger className="border-white/10 bg-[#020d15] text-left text-white">
                <SelectValue placeholder="Filtrar desporto" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#03131d] text-white">
                <SelectItem value="ALL">Todos os desportos</SelectItem>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={(value) => setCountryFilter(value)}>
              <SelectTrigger className="border-white/10 bg-[#020d15] text-left text-white">
                <SelectValue placeholder="Filtrar país" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#03131d] text-white">
                <SelectItem value="ALL">Todos os países</SelectItem>
                {availableCountries.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest' | 'status')}>
              <SelectTrigger className="border-white/10 bg-[#020d15] text-left text-white">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#03131d] text-white">
                <SelectItem value="newest">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
                <SelectItem value="status">Por estado</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleManualRefresh()}
                disabled={loading || refreshing}
                className="border-white/20 text-white hover:border-cyan-300/60 hover:text-cyan-200"
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExportCsv()}
                disabled={!filteredEntries.length}
                className="border-white/20 text-white hover:border-cyan-300/60 hover:text-cyan-200"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error ? <p className="text-sm text-amber-300">{error}</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>A carregar entradas...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#020d15] p-6 text-center text-sm text-slate-400">
              Nenhuma entrada para este filtro.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const userName =
                  entry.user?.fullName ||
                  entry.user?.username ||
                  entry.user?.email ||
                  'Utilizador';
                const userEmail = entry.user?.email || 'Sem email';
                const sportLabel =
                  entry.sport?.name ||
                  entry.suggestedSportName ||
                  'Sem desporto definido';
                return (
                  <div
                    key={entry.id}
                    ref={(node) => {
                      if (node) {
                        entryRefs.current.set(entry.id, node);
                      } else {
                        entryRefs.current.delete(entry.id);
                      }
                    }}
                    className="rounded-2xl border border-white/10 bg-[#020d15] p-5 text-sm text-slate-100"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{userName}</h3>
                          <Badge variant="outline" className={`border ${STATUS_BADGES[entry.status]}`}>
                            {STATUS_LABELS[entry.status]}
                          </Badge>
                          <Badge variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">
                            {sportLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{userEmail}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>Registo: {formatDate(entry.createdAt)}</span>
                          {entry.assignedAt ? <span>Atribu?do: {formatDate(entry.assignedAt)}</span> : null}
                          {entry.notifiedAt ? <span>Notificado: {formatDate(entry.notifiedAt)}</span> : null}
                          {entry.countryCode ? <span>Pa?s alvo: {entry.countryCode}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entry.status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-[#fdd87c] to-[#fcb045] text-[#1b1400]"
                              onClick={() => handleOpenAssign(entry)}
                              disabled={housesLoading || sportsLoading}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Atribuir House
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/30 text-white hover:border-cyan-300/60 hover:text-cyan-200"
                              onClick={() => handleOpenChangeSport(entry)}
                              disabled={sportsLoading}
                            >
                              Alterar desporto
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/30 text-white hover:border-amber-300/60 hover:text-amber-200"
                              onClick={() => {
                                setDismissEntry(entry);
                                setDismissNote('');
                              }}
                            >
                              <Slash className="mr-2 h-4 w-4" />
                              Arquivar
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:border-cyan-300/60 hover:text-cyan-200"
                          onClick={() => void handleCopyEmail(entry.user?.email ?? null)}
                          disabled={!entry.user?.email}
                        >
                          Copiar email
                        </Button>
                        {entry.user ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:border-cyan-300/60 hover:text-cyan-200"
                            asChild
                          >
                            <Link
                              href={
                                entry.user
                                  ? `/admin/users?prefill=${encodeURIComponent(
                                      entry.user.username ||
                                        entry.user.email ||
                                        entry.user.fullName ||
                                        '',
                                    )}`
                                  : '/admin/users'
                              }
                            >
                              Ver utilizador
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Pool</p>
                        <p className="text-sm text-white">{POOL_LABELS[entry.poolType]}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Notas</p>
                        <p className="text-sm text-slate-200">{entry.notes || 'Sem notas ainda.'}</p>
                      </div>
                        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Metadata</p>
                          <p className="text-xs text-slate-300 truncate">{JSON.stringify(entry.metadata)}</p>
                          {entry.metadata?.source ? (
                            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                              Origem: {String(entry.metadata.source)}
                            </p>
                          ) : null}
                        </div>
                      <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Contexto</p>
                        <p className="text-sm text-slate-200">
                          {entry.poolType === 'suggestion'
                            ? `Sugestão: ${entry.suggestedSportName ?? 'Novo desporto'}${
                                entry.suggestedCountryCode ? ` · ${entry.suggestedCountryCode}` : ''
                              }`
                            : entry.poolType === 'sport_pending'
                            ? `Sem House ativa · ${entry.countryCode ?? entry.user?.primaryCountryCode ?? 'Sem país'}`
                            : `Sem desporto definido · ${entry.countryCode ?? entry.user?.country ?? 'Sem país'}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(assignModalEntry)} onOpenChange={(open) => (!open ? setAssignModalEntry(null) : null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#04131b] text-white">
          <DialogHeader>
            <DialogTitle>{assignDialogTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Seleciona o desporto oficial e a House disponível para desbloquear o onboarding humano.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Desporto</p>
              <Select
                value={assignSportId}
                onValueChange={(value) => {
                  setAssignSportId(value);
                  setAssignHouseId('');
                }}
              >
                <SelectTrigger className="mt-2 border-white/10 bg-[#020d15] text-left text-white">
                  <SelectValue placeholder={sportsLoading ? 'A carregar...' : 'Escolhe o desporto'} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#03131d] text-white">
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">House disponível</p>
              <Select value={assignHouseId} onValueChange={(value) => setAssignHouseId(value)} disabled={!assignSportId}>
                <SelectTrigger className="mt-2 border-white/10 bg-[#020d15] text-left text-white">
                  <SelectValue placeholder={assignSportId ? 'Escolhe a House' : 'Escolhe o desporto primeiro'} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#03131d] text-white">
                  {filteredHouses.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      {assignSportId ? 'Sem Houses para este desporto.' : 'Seleciona um desporto primeiro.'}
                    </div>
                  ) : (
                    filteredHouses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.sport_name ?? 'House'} · {house.country_code}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Notas</p>
              <Textarea
                value={assignNote}
                onChange={(event) => setAssignNote(event.target.value)}
                rows={3}
                placeholder="Opcional: contexto adicional para esta atribuição."
                className="mt-2 border-white/10 bg-[#020d15]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssignModalEntry(null)} className="text-slate-200">
                Cancelar
              </Button>
              <Button onClick={handleAssign} disabled={assigning} className="bg-cyan-500 text-[#04131b] hover:bg-cyan-400">
                {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(changeSportEntry)}
        onOpenChange={(open) => (!open ? setChangeSportEntry(null) : null)}
      >
        <DialogContent className="max-w-xl border-white/10 bg-[#04131b] text-white">
          <DialogHeader>
            <DialogTitle>Alterar desporto do utilizador</DialogTitle>
            <DialogDescription className="text-slate-400">
              Atualiza o desporto associado a esta entrada da pool.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Novo desporto</p>
              <Select value={changeSportId} onValueChange={(value) => setChangeSportId(value)}>
                <SelectTrigger className="mt-2 border-white/10 bg-[#020d15] text-left text-white">
                  <SelectValue placeholder={sportsLoading ? 'A carregar...' : 'Escolhe o desporto'} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#03131d] text-white">
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Notas</p>
              <Textarea
                value={changeSportNote}
                onChange={(event) => setChangeSportNote(event.target.value)}
                rows={3}
                placeholder="Opcional: contexto para a alteraÇõÇœo."
                className="mt-2 border-white/10 bg-[#020d15]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setChangeSportEntry(null)}
                className="text-slate-200"
                disabled={changingSport}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleChangeSport}
                disabled={changingSport}
                className="bg-cyan-500 text-[#04131b] hover:bg-cyan-400"
              >
                {changingSport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dismissEntry)} onOpenChange={(open) => (!open ? setDismissEntry(null) : null)}>
        <DialogContent className="max-w-lg border-white/10 bg-[#04131b] text-white">
          <DialogHeader>
            <DialogTitle>Arquivar entrada</DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta conta deixará de aparecer na pool selecionada. Usa esta opção para spam, duplicados ou pedidos resolvidos por outra via.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Notas internas</p>
              <Textarea
                value={dismissNote}
                onChange={(event) => setDismissNote(event.target.value)}
                rows={4}
                placeholder="Explica porque arquivaste esta entrada."
                className="mt-2 border-white/10 bg-[#020d15]"
              />
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <AlertTriangle className="mt-1 h-4 w-4" />
              <p>Esta ação remove a entrada da pool. Podes reabri-la alterando o estado para pendente diretamente na base de dados.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDismissEntry(null)} className="text-slate-200">
                Cancelar
              </Button>
              <Button
                onClick={() => void handleDismiss()}
                disabled={dismissLoading}
                className="bg-amber-500/90 text-[#1b0f00] hover:bg-amber-400"
              >
                {dismissLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Slash className="mr-2 h-4 w-4" />}
                Arquivar entrada
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
