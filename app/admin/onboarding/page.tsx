'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RefreshCcw, StickyNote, Clock } from 'lucide-react';

type OnboardingStatus =
  | 'PENDING_RESPONSE'
  | 'RESPONDED_WAITING'
  | 'FIRST_CONTACT_SCHEDULED'
  | 'FIRST_CONTACT_DONE'
  | 'ONBOARDING_LEGACY'
  | 'ONBOARDING_DAO1'
  | 'ONBOARDING_TELEGRAM';

interface OnboardingSubmission {
  id: string;
  sequence_number: number | null;
  email: string | null;
  full_name: string | null;
  country: string | null;
  sports_category: string | null;
  sports_category_code: string | null;
  sports_role: string | null;
  status: OnboardingStatus | null;
  created_at: string | null;
  assigned_to_user_id: string | null;
  assigned_to_username: string | null;
  assigned_to_full_name: string | null;
  user_id: string | null; // <- NOVO: ligação à conta LEGACY
  phone: string | null;
  telegram: string | null;
  organization: string | null;
  web3_experience: string | null;
  interests: string[] | null;
  message: string | null;
}

interface ApiListResponse {
  success: boolean;
  error?: string;
  submissions?: OnboardingSubmission[];
  total?: number;
  page?: number;
  pageSize?: number;
}

interface AssigneeUser {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member';
}

interface AssigneesResponse {
  success: boolean;
  error?: string;
  users?: AssigneeUser[];
}

// ---- Notas ----
interface NoteDTO {
  id: string;
  submission_id: string;
  author_user_id: string | null;
  note: string;
  created_at: string;
  author_full_name: string | null;
  author_username: string | null;
  author_email: string | null;
}

interface NotesGetResponse {
  success: boolean;
  notes?: NoteDTO[];
  error?: string;
}

interface NotesPostResponse {
  success: boolean;
  note?: NoteDTO;
  error?: string;
}

// ---- Histórico de estado ----
interface HistoryItemDTO {
  id: string;
  submission_id: string;
  old_status: OnboardingStatus | null;
  new_status: OnboardingStatus;
  created_at: string;
  changed_by_user_id: string | null;
  changed_by_full_name: string | null;
  changed_by_username: string | null;
  changed_by_email: string | null;
}

interface HistoryGetResponse {
  success: boolean;
  items?: HistoryItemDTO[];
  error?: string;
}

const STATUS_LABELS: Record<OnboardingStatus, string> = {
  PENDING_RESPONSE: 'Por abrir',
  RESPONDED_WAITING: 'Respondido e a aguardar',
  FIRST_CONTACT_SCHEDULED: '1.º contacto agendado',
  FIRST_CONTACT_DONE: '1.º contacto estabelecido',
  ONBOARDING_LEGACY: 'Onboarding LEGACY feito',
  ONBOARDING_DAO1: 'Onboarding DAO1 feito',
  ONBOARDING_TELEGRAM: 'Onboarding Grupo Telegram',
};

const STATUS_ORDER: OnboardingStatus[] = [
  'PENDING_RESPONSE',
  'RESPONDED_WAITING',
  'FIRST_CONTACT_SCHEDULED',
  'FIRST_CONTACT_DONE',
  'ONBOARDING_LEGACY',
  'ONBOARDING_DAO1',
  'ONBOARDING_TELEGRAM',
];

function formatStatus(status: OnboardingStatus | null): string {
  if (!status) return 'Por definir';
  return STATUS_LABELS[status] ?? status;
}

function statusBadgeClass(status: OnboardingStatus | null): string {
  if (!status || status === 'PENDING_RESPONSE') {
    return 'inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[11px] px-2.5 py-0.5 border border-amber-200';
  }
  if (
    status === 'FIRST_CONTACT_DONE' ||
    status === 'ONBOARDING_LEGACY' ||
    status === 'ONBOARDING_DAO1' ||
    status === 'ONBOARDING_TELEGRAM'
  ) {
    return 'inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 border border-emerald-200';
  }
  return 'inline-flex items-center rounded-full bg-blue-50 text-blue-700 text-[11px] px-2.5 py-0.5 border border-blue-200';
}

function accountBadgeClass(hasAccount: boolean): string {
  if (hasAccount) {
    return 'inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 border border-emerald-200';
  }
  return 'inline-flex items-center rounded-full bg-gray-100 text-gray-600 text-[11px] px-2.5 py-0.5 border border-gray-200';
}

export default function AdminOnboardingPage() {
  const { user, getToken } = useAuth();

  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    OnboardingStatus | 'ALL' | undefined
  >('ALL');
  const [sportFilter, setSportFilter] = useState<string | 'ALL' | undefined>(
    'ALL'
  );
  const [responsibleFilter, setResponsibleFilter] = useState<'ALL' | 'MINE'>(
    'ALL'
  );

  // detalhes
  const [selected, setSelected] = useState<OnboardingSubmission | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  // lista de possíveis responsáveis (Super Admin + Admin)
  const [assignees, setAssignees] = useState<AssigneeUser[]>([]);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);
  const [assigneesLoading, setAssigneesLoading] = useState(false);

  // Notas internas
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Histórico de estado
  const [history, setHistory] = useState<HistoryItemDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin';

  const distinctSports = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      if (s.sports_category_code) {
        set.add(s.sports_category_code);
      } else if (s.sports_category) {
        set.add(s.sports_category);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  async function loadSubmissions() {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      if (!token) {
        setError('No authentication token provided');
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();

      if (statusFilter && statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      if (sportFilter && sportFilter !== 'ALL') {
        params.set('sport_code', sportFilter);
      }
      if (responsibleFilter === 'MINE') {
        params.set('assigned_to', 'me');
      }

      const query = params.toString();
      const url = query
        ? `/api/admin/onboarding?${query}`
        : '/api/admin/onboarding';

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiListResponse = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load submissions');
        setSubmissions([]);
        setLoading(false);
        return;
      }

      setSubmissions(data.submissions || []);
    } catch (e: any) {
      console.error('Error loading onboarding submissions:', e);
      setError(e?.message || 'Network error while loading submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignees() {
    // Só faz sentido para Super Admin
    if (!isSuperAdmin) return;
    if (assigneesLoading || assignees.length > 0) return;

    setAssigneesLoading(true);
    setAssigneesError(null);

    try {
      const token = getToken();
      if (!token) {
        setAssigneesError('No authentication token');
        setAssigneesLoading(false);
        return;
      }

      const res = await fetch('/api/admin/onboarding/assignees', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: AssigneesResponse = await res.json();

      if (!data.success) {
        setAssigneesError(data.error || 'Failed to load assignees');
        setAssignees([]);
        setAssigneesLoading(false);
        return;
      }

      setAssignees(data.users || []);
    } catch (err: any) {
      console.error('Error loading assignees:', err);
      setAssigneesError(
        err?.message || 'Network error while loading assignees'
      );
      setAssignees([]);
    } finally {
      setAssigneesLoading(false);
    }
  }

  // ---- Notas ----
  async function loadNotes(submissionId: string) {
    setNotesLoading(true);
    setNotesError(null);

    try {
      const token = getToken();
      if (!token) {
        setNotesError('Missing auth token');
        setNotesLoading(false);
        return;
      }

      const res = await fetch(
        `/api/admin/onboarding/notes?submissionId=${submissionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: NotesGetResponse = await res.json();
      if (!data.success) {
        setNotesError(data.error || 'Falha ao carregar notas');
        setNotes([]);
      } else {
        setNotes(data.notes || []);
      }
    } catch (err: any) {
      console.error('Error loading notes:', err);
      setNotesError(err?.message || 'Erro de rede ao carregar notas');
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleAddNote() {
    if (!selected) return;
    if (!newNote.trim()) return;

    try {
      setSavingNote(true);
      const token = getToken();
      if (!token) {
        alert('Missing auth token');
        return;
      }

      const res = await fetch('/api/admin/onboarding/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionId: selected.id,
          note: newNote,
        }),
      });

      const data: NotesPostResponse = await res.json();
      if (!data.success || !data.note) {
        alert(data.error || 'Falha ao guardar nota');
        return;
      }

      setNotes((prev) => [...prev, data.note!]);
      setNewNote('');
    } finally {
      setSavingNote(false);
    }
  }

  // ---- Histórico ----
  async function loadHistory(submissionId: string) {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const token = getToken();
      if (!token) {
        setHistoryError('Missing auth token');
        setHistoryLoading(false);
        return;
      }

      const res = await fetch(
        `/api/admin/onboarding/history?submissionId=${submissionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: HistoryGetResponse = await res.json();
      if (!data.success) {
        setHistoryError(data.error || 'Falha ao carregar histórico');
        setHistory([]);
      } else {
        setHistory(data.items || []);
      }
    } catch (err: any) {
      console.error('Error loading history:', err);
      setHistoryError(err?.message || 'Erro de rede ao carregar histórico');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSubmissions = useMemo(() => {
    let list = [...submissions];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((s) => {
        const name = (s.full_name || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const country = (s.country || '').toLowerCase();
        const sport = (s.sports_category || '').toLowerCase();
        const code = (s.sports_category_code || '').toLowerCase();
        const seq = s.sequence_number ? String(s.sequence_number) : '';
        return (
          name.includes(term) ||
          email.includes(term) ||
          country.includes(term) ||
          sport.includes(term) ||
          code.includes(term) ||
          seq.includes(term)
        );
      });
    }

    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (sportFilter && sportFilter !== 'ALL') {
      list = list.filter((s) => {
        return (
          s.sports_category_code === sportFilter ||
          (!s.sports_category_code && s.sports_category === sportFilter)
        );
      });
    }

    if (responsibleFilter === 'MINE' && user) {
      list = list.filter((s) => s.assigned_to_user_id === user.id);
    }

    // ordenar por sequence_number asc como padrão
    list.sort((a, b) => {
      const aSeq = a.sequence_number ?? 0;
      const bSeq = b.sequence_number ?? 0;
      return aSeq - bSeq;
    });

    return list;
  }, [submissions, search, statusFilter, sportFilter, responsibleFilter, user]);

  const canEditStatus =
    !!selected &&
    !!user &&
    (user.role === 'Super Admin' ||
      (user.role === 'Admin' &&
        selected.assigned_to_user_id === user.id));

  const handleRowClick = (s: OnboardingSubmission) => {
    setSelected(s);
    if (isSuperAdmin) {
      void loadAssignees();
    }
    void loadNotes(s.id);
    void loadHistory(s.id);
  };

  async function handleChangeStatus(newStatus: OnboardingStatus) {
    if (!selected) return;
    if (!canEditStatus) return;

    try {
      setUpdatingStatus(true);
      const token = getToken();
      if (!token) {
        alert('Missing auth token');
        return;
      }

      const res = await fetch('/api/admin/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionId: selected.id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Falha ao atualizar estado');
        return;
      }

      // atualizar state local sem refetch total
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected.id ? { ...s, status: newStatus } : s
        )
      );
      setSelected((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );

      // recarregar histórico para mostrar nova entrada
      void loadHistory(selected.id);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAssignToMe() {
    if (!selected || !user) return;

    try {
      setUpdatingAssignee(true);
      const token = getToken();
      if (!token) {
        alert('Missing auth token');
        return;
      }

      const res = await fetch('/api/admin/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionId: selected.id,
          assignToMe: true,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Falha ao atribuir submissão');
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected.id
            ? {
                ...s,
                assigned_to_user_id: user.id,
                assigned_to_full_name: (user as any).full_name || null,
                assigned_to_username: (user as any).username || null,
              }
            : s
        )
      );
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              assigned_to_user_id: user.id,
              assigned_to_full_name: (user as any).full_name || null,
              assigned_to_username: (user as any).username || null,
            }
          : prev
      );
    } finally {
      setUpdatingAssignee(false);
    }
  }

  async function handleAssignToUser(targetUserId: string | '') {
    if (!selected) return;
    if (!isSuperAdmin) return;

    try {
      setUpdatingAssignee(true);
      const token = getToken();
      if (!token) {
        alert('Missing auth token');
        return;
      }

      const res = await fetch('/api/admin/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionId: selected.id,
          assignToUserId: targetUserId || null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Falha ao atualizar responsável');
        return;
      }

      const selectedUser =
        assignees.find((u) => u.id === targetUserId) || null;

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected.id
            ? {
                ...s,
                assigned_to_user_id: targetUserId || null,
                assigned_to_full_name: selectedUser
                  ? selectedUser.full_name
                  : null,
                assigned_to_username: selectedUser
                  ? selectedUser.username
                  : null,
              }
            : s
        )
      );

      setSelected((prev) =>
        prev
          ? {
              ...prev,
              assigned_to_user_id: targetUserId || null,
              assigned_to_full_name: selectedUser
                ? selectedUser.full_name
                : null,
              assigned_to_username: selectedUser
                ? selectedUser.username
                : null,
            }
          : prev
      );
    } finally {
      setUpdatingAssignee(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Onboarding Submissions
              </h1>
              <p className="text-sm text-gray-600 max-w-xl">
                Caixa de entrada de formulários de onboarding. Aqui
                consegues ver o estado, desporto, país, conta criada e responsável
                por cada submissão.
              </p>
            </div>

            <button
              type="button"
              onClick={loadSubmissions}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </button>
          </div>

          {/* FILTROS */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Filtros</h2>
              <p className="text-[11px] text-gray-400">
                {filteredSubmissions.length} submissão(ões)
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              {/* Pesquisa livre */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Pesquisa
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome, email, desporto, país…"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Estado
                </label>
                <select
                  value={statusFilter ?? 'ALL'}
                  onChange={(e) =>
                    setStatusFilter(
                      (e.target.value as OnboardingStatus | 'ALL') || 'ALL'
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os estados</option>
                  {STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>
                      {formatStatus(st)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desporto */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Desporto
                </label>
                <select
                  value={sportFilter ?? 'ALL'}
                  onChange={(e) =>
                    setSportFilter((e.target.value as string) || 'ALL'
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os desportos</option>
                  {distinctSports.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsável */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Responsável
                </label>
                <select
                  value={responsibleFilter}
                  onChange={(e) =>
                    setResponsibleFilter(e.target.value as 'ALL' | 'MINE')
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Todas as submissões</option>
                  <option value="MINE">Só as minhas</option>
                </select>
                <p className="text-[10px] text-gray-400">
                  &quot;Só as minhas&quot; mostra submissões onde és o responsável
                  atribuído.
                </p>
              </div>
            </div>
          </section>

          {/* LISTA + DETALHE */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Lista de submissões
                </h2>
                <p className="text-[11px] text-gray-500">
                  Cada submissão tem um número sequencial global para
                  referência.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {!error && filteredSubmissions.length === 0 && !loading && (
              <p className="text-xs text-gray-500">
                Não há submissões de onboarding com estes filtros.
              </p>
            )}

            {loading && (
              <p className="text-xs text-gray-500">A carregar submissões…</p>
            )}

            {!loading && filteredSubmissions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-t border-gray-100">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Nome</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">País</th>
                      <th className="py-2 pr-3">Desporto</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Conta</th>
                      <th className="py-2 pr-3">Responsável</th>
                      <th className="py-2 pr-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((s) => {
                      const hasAccount = !!s.user_id;
                      return (
                        <tr
                          key={s.id}
                          className={`border-t border-gray-100 hover:bg-gray-50/60 cursor-pointer ${
                            selected?.id === s.id ? 'bg-gray-50' : ''
                          }`}
                          onClick={() => handleRowClick(s)}
                        >
                          <td className="py-2 pr-3 text-[11px] text-gray-500">
                            {s.sequence_number ?? '—'}
                          </td>
                          <td className="py-2 pr-3">
                            <div className="text-xs font-medium text-gray-900">
                              {s.full_name || '—'}
                            </div>
                            {s.sports_role && (
                              <div className="text-[11px] text-gray-400">
                                {s.sports_role}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-700">
                            {s.email || '—'}
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-700">
                            {s.country || '—'}
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-700">
                            {s.sports_category_code ||
                              s.sports_category ||
                              '—'}
                          </td>
                          <td className="py-2 pr-3">
                            <span className={statusBadgeClass(s.status)}>
                              {formatStatus(s.status)}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <span className={accountBadgeClass(hasAccount)}>
                              {hasAccount ? 'Conta criada' : 'Sem conta'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-xs text-gray-700">
                            {s.assigned_to_full_name ||
                              s.assigned_to_username ||
                              '—'}
                          </td>
                          <td className="py-2 pr-3 text-[11px] text-gray-500">
                            {s.created_at
                              ? new Date(s.created_at).toLocaleString('pt-PT')
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Painel de detalhes */}
            {selected && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Submissão #{selected.sequence_number || '—'} —{' '}
                      {selected.full_name || 'Sem nome'}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Criada em{' '}
                      {selected.created_at
                        ? new Date(
                            selected.created_at
                          ).toLocaleString('pt-PT')
                        : '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">
                        Estado:{' '}
                      </span>
                      <span className={statusBadgeClass(selected.status)}>
                        {formatStatus(selected.status)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Conta:{' '}
                      </span>
                      <span
                        className={accountBadgeClass(!!selected.user_id)}
                      >
                        {selected.user_id ? 'Conta criada' : 'Sem conta'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Responsável:{' '}
                      </span>
                      <span className="text-gray-800">
                        {selected.assigned_to_full_name ||
                          selected.assigned_to_username ||
                          '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contactos / Desporto / Web3 */}
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-gray-700">
                      Contactos
                    </div>
                    <p>
                      <span className="font-medium">Email:</span>{' '}
                      {selected.email || '—'}
                    </p>
                    <p>
                      <span className="font-medium">Telefone:</span>{' '}
                      {selected.phone || '—'}
                    </p>
                    <p>
                      <span className="font-medium">Telegram:</span>{' '}
                      {selected.telegram || '—'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-gray-700">
                      Desporto & Papel
                    </div>
                    <p>
                      <span className="font-medium">Desporto:</span>{' '}
                      {selected.sports_category_code ||
                        selected.sports_category ||
                        '—'}
                    </p>
                    <p>
                      <span className="font-medium">
                        Papel no desporto:
                      </span>{' '}
                      {selected.sports_role || '—'}
                    </p>
                    <p>
                      <span className="font-medium">
                        Organização / Clube:
                      </span>{' '}
                      {selected.organization || '—'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-gray-700">
                      Web3 & Interesses
                    </div>
                    <p>
                      <span className="font-medium">
                        Experiência Web3:
                      </span>{' '}
                      {selected.web3_experience || '—'}
                    </p>
                    <p>
                      <span className="font-medium">
                        Áreas de interesse:
                      </span>{' '}
                      {selected.interests && selected.interests.length > 0
                        ? selected.interests.join(', ')
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Mensagem */}
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] font-semibold text-gray-700">
                    Mensagem
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white p-3 text-gray-800 whitespace-pre-wrap">
                    {selected.message || '—'}
                  </div>
                </div>

                {/* Notas internas */}
                <div className="border-t border-gray-200 pt-3 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-gray-500" />
                    <h4 className="font-semibold text-gray-800">
                      Notas internas
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      placeholder="Adicionar nota interna (visível apenas para a equipa LEGACY)…"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAddNote}
                        disabled={savingNote || !newNote.trim()}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {savingNote ? 'A guardar…' : 'Guardar nota'}
                      </button>
                      {notesLoading && (
                        <span className="text-[11px] text-gray-400">
                          A carregar notas…
                        </span>
                      )}
                      {notesError && (
                        <span className="text-[11px] text-red-500">
                          {notesError}
                        </span>
                      )}
                    </div>
                  </div>

                  {notes.length > 0 ? (
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <div
                          key={n.id}
                          className="rounded-md border border-gray-200 bg-white px-3 py-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[11px] font-medium text-gray-800">
                              {n.author_full_name ||
                                n.author_username ||
                                n.author_email ||
                                'Utilizador'}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(
                                n.created_at
                              ).toLocaleString('pt-PT')}
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-700 whitespace-pre-wrap">
                            {n.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !notesLoading &&
                    !notesError && (
                      <p className="text-[11px] text-gray-400">
                        Ainda não existem notas internas para esta submissão.
                      </p>
                    )
                  )}
                </div>

                {/* Histórico de estado */}
                <div className="border-t border-gray-200 pt-3 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <h4 className="font-semibold text-gray-800">
                      Histórico de estado
                    </h4>
                  </div>

                  {historyLoading && (
                    <p className="text-[11px] text-gray-400">
                      A carregar histórico…
                    </p>
                  )}
                  {historyError && (
                    <p className="text-[11px] text-red-500">{historyError}</p>
                  )}
                  {!historyLoading && !historyError && history.length === 0 && (
                    <p className="text-[11px] text-gray-400">
                      Ainda não há alterações de estado registadas.
                    </p>
                  )}

                  {history.length > 0 && (
                    <ol className="space-y-2">
                      {history.map((h) => (
                        <li
                          key={h.id}
                          className="flex items-start gap-2 text-[11px]"
                        >
                          <div className="mt-[3px] h-2 w-2 rounded-full bg-blue-500" />
                          <div>
                            <div className="font-medium text-gray-800">
                              {formatStatus(h.old_status)} →{' '}
                              {formatStatus(h.new_status)}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {new Date(
                                h.created_at
                              ).toLocaleString('pt-PT')}{' '}
                              —{' '}
                              {h.changed_by_full_name ||
                                h.changed_by_username ||
                                h.changed_by_email ||
                                'Utilizador'}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Gestão de responsável & estado */}
                <div className="border-t border-gray-200 pt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  {/* Responsável */}
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="font-semibold text-gray-800">
                      Responsável pelo onboarding
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={handleAssignToMe}
                        disabled={updatingAssignee || !user}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {updatingAssignee ? 'A atribuir…' : 'Atribuir a mim'}
                      </button>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-500">
                            ou escolher:
                          </span>
                          <select
                            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={selected.assigned_to_user_id || ''}
                            onChange={(e) =>
                              handleAssignToUser(e.target.value)
                            }
                            onFocus={() => {
                              if (assignees.length === 0) {
                                void loadAssignees();
                              }
                            }}
                            disabled={updatingAssignee}
                          >
                            <option value="">
                              Sem responsável definido
                            </option>
                            {assignees.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name ||
                                  u.username ||
                                  u.email}{' '}
                                ({u.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {assigneesError && isSuperAdmin && (
                        <span className="text-[11px] text-red-500">
                          {assigneesError}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Super Admin pode atribuir a qualquer Admin / Super
                      Admin. Admin pode atribuir a si próprio.
                    </p>
                  </div>

                  {/* Estado */}
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="font-semibold text-gray-800">
                      Estado do processo
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={selected.status || 'PENDING_RESPONSE'}
                        onChange={(e) =>
                          handleChangeStatus(
                            e.target.value as OnboardingStatus
                          )
                        }
                        disabled={!canEditStatus || updatingStatus}
                      >
                        {STATUS_ORDER.map((st) => (
                          <option key={st} value={st}>
                            {formatStatus(st)}
                          </option>
                        ))}
                      </select>
                      {!canEditStatus && (
                        <span className="text-[10px] text-gray-400">
                          Só o responsável (Admin) ou um Super Admin pode
                          alterar o estado.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
