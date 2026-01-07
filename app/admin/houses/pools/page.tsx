'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Shield,
  Inbox,
  UserPlus,
  Slash,
  CheckCircle2,
  AlertTriangle,
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
  const { toast } = useToast();
  const { user, loading: authLoading, getToken } = useAuth();

  const [poolType, setPoolType] = useState<PoolType>('no_sport');
  const [statusFilter, setStatusFilter] = useState<PoolStatus>('pending');
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

  const [dismissEntry, setDismissEntry] = useState<PoolEntry | null>(null);
  const [dismissNote, setDismissNote] = useState('');
  const [dismissLoading, setDismissLoading] = useState(false);

  const isAuthorized =
    !!user && (user.role === 'Admin' || user.role === 'Super Admin');

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

  const filteredHouses = useMemo(() => {
    if (!assignSportId) return [];
    return houses.filter((house) => house.sport_id === assignSportId);
  }, [houses, assignSportId]);

  const assignDialogTitle = useMemo(() => {
    if (!assignModalEntry) return 'Atribuir House';
    const base = assignModalEntry.user?.fullName || assignModalEntry.user?.username || 'Utilizador';
    return `Atribuir House · ${base}`;
  }, [assignModalEntry]);

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
            <span>Visível apenas para Admins / Super Admins.</span>
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
        <CardHeader className="space-y-4 border-b border-white/5 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-xl text-white">Entradas na pool</CardTitle>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Select value={poolType} onValueChange={(value) => setPoolType(value as PoolType)}>
                <SelectTrigger className="w-full border-white/10 bg-[#020d15] text-left text-white md:w-60">
                  <SelectValue placeholder="Seleciona a pool" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#03131d] text-white">
                  <SelectItem value="no_sport">Pool sem desporto</SelectItem>
                  <SelectItem value="sport_pending">A aguardar House</SelectItem>
                  <SelectItem value="suggestion">Sugestões</SelectItem>
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
          <p className="text-sm text-slate-400">{POOL_LABELS[poolType]}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error ? <p className="text-sm text-amber-300">{error}</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>A carregar entradas...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#020d15] p-6 text-center text-sm text-slate-400">
              Nenhuma entrada para este filtro.
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
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
                          {entry.assignedAt ? <span>Atribuído: {formatDate(entry.assignedAt)}</span> : null}
                          {entry.countryCode ? <span>País alvo: {entry.countryCode}</span> : null}
                        </div>
                      </div>
                      {entry.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
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
                            className="border-white/30 text-white hover:border-amber-300/60 hover:text-amber-200"
                            onClick={() => {
                              setDismissEntry(entry);
                              setDismissNote('');
                            }}
                          >
                            <Slash className="mr-2 h-4 w-4" />
                            Arquivar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
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
