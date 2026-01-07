'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';

import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { OnboardingPopup, type OnboardingPopupData } from '@/components/education/OnboardingPopup';
import type { HouseOnboardingSequence, OnboardingLogEntry, OnboardingTrigger } from '@/types/onboarding';
import { useOnboardingLogs } from '@/hooks/useOnboardingLogs';
import { useTermAgreement } from '@/hooks/useTermAgreement';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  RefreshCcw,
  MonitorPlay,
  Save,
  Copy,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const ACTION_LABELS: Record<'delivered' | 'primary' | 'secondary' | 'dismiss', { label: string }> = {
  delivered: { label: 'Entregues' },
  primary: { label: 'CTA principal' },
  secondary: { label: 'CTA secund?ria' },
  dismiss: { label: 'Fechados' },
};

const LOG_ACTION_FILTERS: Array<{ value: 'ALL' | 'delivered' | 'primary' | 'secondary' | 'dismiss'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'primary', label: 'CTA principal' },
  { value: 'secondary', label: 'CTA secundária' },
  { value: 'dismiss', label: 'Fechados' },
];

const TRIGGER_TYPE_OPTIONS = [
  { value: 'xp', label: 'XP milestone' },
  { value: 'content', label: 'Conteudo concluido' },
] as const;

const CONTENT_TRIGGER_TYPES = [
  { value: 'lesson', label: 'Licao / modulo' },
  { value: 'course', label: 'Curso' },
  { value: 'blog', label: 'Artigo do blog' },
] as const;

const DEFAULT_DRAFT: OnboardingPopupData = {
  id: 'draft-popup',
  house: 'House of Legacy',
  xpGate: 'XP 0',
  title: 'Novo pop-up personalizado',
  body: 'Utiliza este pop-up para reforçar o próximo passo da House. Mantém a linguagem clara, auditável e sem hype.',
  highlights: [
    '1 pop-up = 1 decisão útil.',
    'CTA principal deve apontar para um recurso oficial.',
  ],
  badgeLabel: 'Rascunho',
  primaryCta: { label: 'CTA principal', href: '/education/xp' },
  secondaryCta: { label: 'CTA secundária', href: '/education/houses' },
  trigger: { type: 'xp', value: 0, label: 'XP 0 - primeiro login' },
  status: 'draft',
};

const DEFAULT_ANALYTICS: HouseOnboardingSequence['analytics'] = {
  ctr: 0.65,
  completionRate: 0.8,
  manualApprovals: 0,
  blockedAttempts: 0,
};

const TERM_VALIDITY_DAYS = 90;
const RESPONSIBILITY_TERM = {
  intro:
    'Ao aceitar o papel de Head of House of Sport no ecossistema Legacy + Apertum, passas a representar os princípios fundadores sem hype ou abuso de autoridade.',
  commitments: [
    {
      title: '1. Interesse da House acima do interesse pessoal',
      notes: [
        'O papel do Head é orientar, esclarecer e proteger os membros.',
        'É proibido usar o cargo para pressão comercial, manipulação emocional ou promoção enganosa.',
      ],
    },
    {
      title: '2. Respeito pela autonomia dos utilizadores',
      notes: [
        'Ninguém é obrigado a seguir links, aderir a projetos ou contactar o Head diretamente.',
        'Toda a comunicação deixa claro que o contacto humano é opcional.',
      ],
    },
    {
      title: '3. Comunicação clara, verdadeira e responsável',
      notes: [
        'Sem promessas de rendimento ou garantias de resultado.',
        'Sem omitir riscos ou usar linguagem enganadora.',
      ],
    },
    {
      title: '4. Cumprimento dos limites operacionais da plataforma',
      notes: [
        'Respeito pelos limites de frequência, templates aprovados e auditoria contínua.',
        'Uso obrigatório dos mecanismos anti-spam e resposta a feedback oficial.',
      ],
    },
    {
      title: '5. Guardião da reputação Legacy + Apertum',
      notes: [
        'Qualquer abuso destrói a confiança dos utilizadores e a integridade do ecossistema.',
      ],
    },
    {
      title: '6. Avaliação contínua e consequências',
      notes: [
        'O desempenho pode ser avaliado a qualquer momento; reports de abuso podem remover o Head imediatamente.',
      ],
    },
  ],
  footer: 'Este compromisso é assumido de forma voluntária, consciente e alinhada com os valores do Legacy.',
};

type AdminOnboardingStatus =
  | 'PENDING_RESPONSE'
  | 'RESPONDED_WAITING'
  | 'FIRST_CONTACT_SCHEDULED'
  | 'FIRST_CONTACT_DONE'
  | 'ONBOARDING_LEGACY'
  | 'ONBOARDING_DAO1'
  | 'ONBOARDING_TELEGRAM';

const SUBMISSION_STATUS_LABELS: Record<AdminOnboardingStatus, string> = {
  PENDING_RESPONSE: 'Pendente',
  RESPONDED_WAITING: 'A aguardar resposta',
  FIRST_CONTACT_SCHEDULED: 'Primeiro contacto agendado',
  FIRST_CONTACT_DONE: 'Primeiro contacto feito',
  ONBOARDING_LEGACY: 'Onboarding Legacy',
  ONBOARDING_DAO1: 'Onboarding DAO1',
  ONBOARDING_TELEGRAM: 'Onboarding Telegram',
};

const SUBMISSION_STATUS_OPTIONS: { value: 'ALL' | AdminOnboardingStatus; label: string }[] = [
  { value: 'PENDING_RESPONSE', label: 'Pendentes' },
  { value: 'RESPONDED_WAITING', label: 'A aguardar' },
  { value: 'FIRST_CONTACT_SCHEDULED', label: '1.º contacto agendado' },
  { value: 'FIRST_CONTACT_DONE', label: '1.º contacto feito' },
  { value: 'ONBOARDING_LEGACY', label: 'Legacy' },
  { value: 'ONBOARDING_DAO1', label: 'DAO1' },
  { value: 'ONBOARDING_TELEGRAM', label: 'Telegram' },
  { value: 'ALL', label: 'Todos' },
];
const SUBMISSION_STATUS_CHOICES = SUBMISSION_STATUS_OPTIONS.filter(
  (option) => option.value !== 'ALL',
) as Array<{ value: AdminOnboardingStatus; label: string }>;
const POPUP_STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'ready', label: 'Pronto' },
  { value: 'published', label: 'Publicado' },
] as const;
const CTA_REGEX = /^(https?:\/\/|\/)/i;

function validatePopup(popup: OnboardingPopupData): string | null {
  if (!popup.title?.trim()) return 'Título é obrigatório.';
  if (!popup.body?.trim()) return 'Mensagem é obrigatória.';
  if (popup.primaryCta) {
    if (!popup.primaryCta.label?.trim()) return 'CTA principal precisa de label.';
    if (!popup.primaryCta.href || !CTA_REGEX.test(popup.primaryCta.href)) {
      return 'CTA principal precisa de link começando por / ou http.';
    }
  }
  if (popup.secondaryCta) {
    if (!popup.secondaryCta.label?.trim()) return 'CTA secundária precisa de label.';
    if (!popup.secondaryCta.href || !CTA_REGEX.test(popup.secondaryCta.href)) {
      return 'CTA secundária precisa de link começando por / ou http.';
    }
  }
  if (!popup.status) return 'Define o estado do pop-up antes de guardar.';
  return null;
}

type SubmissionSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: AdminOnboardingStatus | null;
  created_at: string | null;
  assigned_to_full_name: string | null;
  assigned_to_username: string | null;
  sports_category: string | null;
  sequence_number: number | null;
};

type SubmissionNote = {
  id: string;
  submission_id: string;
  author_user_id: string | null;
  author_full_name: string | null;
  author_username: string | null;
  author_email: string | null;
  note: string;
  created_at: string;
};

export default function AdminOnboardingPage() {
  const [houseKey, setHouseKey] = useState('LEGACY');
  const [draft, setDraft] = useState<OnboardingPopupData>(DEFAULT_DRAFT);
  const [highlightsInput, setHighlightsInput] = useState(DEFAULT_DRAFT.highlights?.join('\n') ?? '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [houseSequence, setHouseSequence] = useState<HouseOnboardingSequence | null>(null);
  const [sequenceDraft, setSequenceDraft] = useState<OnboardingPopupData[]>([DEFAULT_DRAFT]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const {
    acceptedAt,
    loading: termLoading,
    accept,
    isAccepted,
    error: termError,
    saving: termSaving,
    requiresRenewal,
  } =
    useTermAgreement(houseKey);
  const { user, getToken } = useAuth();
  const [headHouseOptions, setHeadHouseOptions] = useState<{ key: string; label: string }[]>([]);
  const [housesLoading, setHousesLoading] = useState(false);
  const [housesError, setHousesError] = useState<string | null>(null);
  const now = Date.now();
  const termExpiration = acceptedAt ? acceptedAt + TERM_VALIDITY_DAYS * 24 * 60 * 60 * 1000 : null;
  const termExpired = termExpiration ? termExpiration < now : true;
  const termActive = isAccepted && !termExpired;
  const editingDisabled = !termActive;
  const [logActionFilter, setLogActionFilter] = useState<'ALL' | 'delivered' | 'primary' | 'secondary' | 'dismiss'>('ALL');
  const [logUserQuery, setLogUserQuery] = useState('');
  const normalizedLogUserId = useMemo(() => (logUserQuery.trim() ? logUserQuery.trim() : null), [logUserQuery]);
  const getLogsToken = useCallback(() => getToken?.() ?? null, [getToken]);
  const { logs: liveLogs, loading: logsLoading, error: logsError, refresh: refreshLogs } = useOnboardingLogs({
    house: houseKey || null,
    userId: normalizedLogUserId,
    getAuthToken: getLogsToken,
  });
  const logTotals = useMemo(() => {
    return liveLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<OnboardingLogEntry['action'], number>);
  }, [liveLogs]);
  const latestLogs = useMemo(() => liveLogs.slice(0, 10), [liveLogs]);
  const filteredLogs = useMemo(
    () => (logActionFilter === 'ALL' ? latestLogs : latestLogs.filter((log) => log.action === logActionFilter)),
    [latestLogs, logActionFilter],
  );
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'ALL' | AdminOnboardingStatus>('PENDING_RESPONSE');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [assigningSubmissionId, setAssigningSubmissionId] = useState<string | null>(null);
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<string | null>(null);
  const [notesModalSubmission, setNotesModalSubmission] = useState<SubmissionSummary | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notes, setNotes] = useState<SubmissionNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [analyticsOverride, setAnalyticsOverride] = useState<HouseOnboardingSequence['analytics'] | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsReloadKey, setAnalyticsReloadKey] = useState(0);
  const [inspectorUserId, setInspectorUserId] = useState('');
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const [inspectorResult, setInspectorResult] = useState<{
    user: string;
    house: string | null;
    queue: OnboardingPopupData[];
    signature: string | null;
    updatedAt: number | null;
  } | null>(null);
  const unassignedSubmissions = useMemo(
    () => submissions.filter((submission) => !submission.assigned_to_full_name && !submission.assigned_to_username).length,
    [submissions],
  );
  const filteredSubmissions = useMemo(() => {
    const query = submissionSearch.trim().toLowerCase();
    if (!query) return submissions;
    return submissions.filter((submission) => {
      const haystack = [
        submission.full_name || '',
        submission.email || '',
        submission.sports_category || '',
        submission.sequence_number ? `#${submission.sequence_number}` : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [submissionSearch, submissions]);
  const fetchSubmissions = useCallback(async () => {
    const token = getToken?.();
    if (!token) {
      setSubmissionsError('Precisas de sessão ativa para consultar submissões.');
      setSubmissions([]);
      return;
    }
    try {
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      const params = new URLSearchParams();
      params.set('pageSize', '6');
      if (houseKey) params.set('sport', houseKey);
      if (submissionStatusFilter !== 'ALL') params.set('status', submissionStatusFilter);
      const query = params.toString();
      const response = await fetch(`/api/admin/onboarding?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = (await response.json()) as
        | { success: true; submissions?: any[] }
        | { success: false; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.success ? 'Failed to load submissions' : data.error || 'Failed to load submissions');
      }
      const payload = (data.submissions ?? []) as any[];
      setSubmissions(
        payload.map(
          (item): SubmissionSummary => ({
            id: item.id,
            full_name: item.full_name ?? null,
            email: item.email ?? null,
            status: (item.status ?? null) as AdminOnboardingStatus | null,
            created_at: item.created_at ?? null,
            assigned_to_full_name: item.assigned_to_full_name ?? null,
            assigned_to_username: item.assigned_to_username ?? null,
            sports_category: item.sports_category ?? null,
            sequence_number: item.sequence_number ?? null,
          }),
        ),
      );
    } catch (error) {
      console.error('[admin/onboarding] Failed to load submissions', error);
      setSubmissionsError('Falha ao carregar submissões.');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [getToken, houseKey, submissionStatusFilter]);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  const handleAssignSubmission = useCallback(
    async (submissionId: string) => {
      const token = getToken?.();
      if (!token) {
        setSubmissionsError('Precisas de sessão ativa para assumir uma submissão.');
        return;
      }
      try {
        setAssigningSubmissionId(submissionId);
        setSubmissionsError(null);
        const response = await fetch('/api/admin/onboarding', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ submissionId, assignToMe: true }),
        });
        const data = (await response.json()) as { success: boolean; error?: string };
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to assign submission');
        }
        await fetchSubmissions();
      } catch (error) {
        console.error('[admin/onboarding] Failed to assign submission', error);
        setSubmissionsError('Falha ao assumir submissão.');
      } finally {
        setAssigningSubmissionId(null);
      }
    },
    [fetchSubmissions, getToken],
  );
  const handleUpdateSubmissionStatus = useCallback(
    async (submissionId: string, status: AdminOnboardingStatus) => {
      const token = getToken?.();
      if (!token) {
        setSubmissionsError('Precisas de sessão ativa para atualizar o estado.');
        return;
      }
      try {
        setUpdatingSubmissionId(submissionId);
        const response = await fetch('/api/admin/onboarding', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ submissionId, status }),
        });
        const data = (await response.json()) as { success: boolean; error?: string };
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update submission status');
        }
        await fetchSubmissions();
      } catch (error) {
        console.error('[admin/onboarding] Failed to update status', error);
        setSubmissionsError('Falha ao atualizar o estado.');
      } finally {
        setUpdatingSubmissionId(null);
      }
    },
    [fetchSubmissions, getToken],
  );

  const fetchSubmissionNotes = useCallback(
    async (submissionId: string) => {
      const token = getToken?.();
      if (!token) {
        setNotesError('Sessão necessária para carregar notas.');
        return;
      }
      try {
        setNotesLoading(true);
        setNotesError(null);
        const response = await fetch(`/api/admin/onboarding/notes?submissionId=${submissionId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = (await response.json()) as
          | { success: true; notes?: SubmissionNote[] }
          | { success: false; error?: string };
        if (!response.ok || !data.success) {
          throw new Error(data.success ? 'Failed to load notes' : data.error || 'Failed to load notes');
        }
        setNotes(data.notes ?? []);
      } catch (error) {
        console.error('[admin/onboarding] Failed to load notes', error);
        setNotesError('Falha ao carregar notas.');
      } finally {
        setNotesLoading(false);
      }
    },
    [getToken],
  );

  const handleOpenNotesModal = useCallback(
    async (submission: SubmissionSummary) => {
      setNotesModalSubmission(submission);
      setNewNote('');
      await fetchSubmissionNotes(submission.id);
    },
    [fetchSubmissionNotes],
  );

  const handleSaveNote = useCallback(async () => {
    if (!notesModalSubmission || !newNote.trim()) return;
    const token = getToken?.();
    if (!token) {
      setNotesError('Sessão necessária para adicionar notas.');
      return;
    }
    try {
      setNotesLoading(true);
      setNotesError(null);
      const response = await fetch('/api/admin/onboarding/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submissionId: notesModalSubmission.id, note: newNote.trim() }),
      });
      const data = (await response.json()) as { success: boolean; note?: SubmissionNote; error?: string };
      if (!response.ok || !data.success || !data.note) {
        throw new Error(data.error || 'Failed to save note');
      }
      setNotes((prev) => [...prev, data.note!]);
      setNewNote('');
    } catch (error) {
      console.error('[admin/onboarding] Failed to save note', error);
      setNotesError('Não foi possível guardar a nota.');
    } finally {
      setNotesLoading(false);
    }
  }, [getToken, newNote, notesModalSubmission]);

  const handleCloseNotesModal = useCallback(() => {
    setNotesModalSubmission(null);
    setNotes([]);
    setNotesError(null);
    setNewNote('');
  }, []);

  const normalizeTrigger = useCallback((popup: OnboardingPopupData): OnboardingPopupData => {
    if (popup.trigger) {
      if (popup.trigger.type === 'xp') {
        const safeValue = Number.isFinite(popup.trigger.value) ? popup.trigger.value : 0;
        return {
          ...popup,
          trigger: { ...popup.trigger, value: safeValue, label: popup.trigger.label ?? popup.xpGate ?? `XP ${safeValue}` },
          status: popup.status ?? 'draft',
        };
      }
      return {
        ...popup,
        trigger: {
          ...popup.trigger,
          contentType: popup.trigger.contentType ?? 'lesson',
          contentId: popup.trigger.contentId ?? '',
          contentTitle: popup.trigger.contentTitle ?? '',
        },
        status: popup.status ?? 'draft',
      };
    }
    const fallbackValue =
      typeof popup.xpGate === 'string'
        ? Number.parseInt(popup.xpGate.replace(/[^0-9]/g, ''), 10) || 0
        : 0;
    return {
      ...popup,
      trigger: { type: 'xp', value: fallbackValue, label: popup.xpGate },
      status: popup.status ?? 'draft',
    };
  }, []);

  const resolvedDraft = useMemo<OnboardingPopupData>(() => {
    const highlights =
      highlightsInput
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean) ?? [];
    return {
      ...draft,
      house: draft.house || houseKey,
      highlights,
    };
  }, [draft, highlightsInput, houseKey]);

  const triggerType = draft.trigger?.type ?? 'xp';
  const xpTriggerValue = draft.trigger?.type === 'xp' ? draft.trigger.value ?? 0 : 0;
  const triggerLabelValue = draft.trigger?.label ?? '';
  const contentTrigger = draft.trigger?.type === 'content' ? draft.trigger : null;
  const analyticsSource = analyticsOverride ? 'live' : houseSequence?.analytics ? 'sequence' : 'fallback';
  const analyticsData = analyticsOverride ?? houseSequence?.analytics ?? DEFAULT_ANALYTICS;
  const fmtPercent = (value?: number) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : '--');
  const fmtNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '--');
  const analyticsCards = [
    {
      label: 'CTR global',
      value: fmtPercent(analyticsData.ctr),
      hint: 'Cliques médios por pop-up entregue.',
    },
    {
      label: 'Conclusão checklist',
      value: fmtPercent(analyticsData.completionRate),
      hint: 'Percentagem de membros que concluem os 3 passos.',
    },
    {
      label: 'Pedidos DAO1/Manual',
      value: fmtNumber(analyticsData.manualApprovals),
      hint: 'Entradas que pediram contacto humano ou aprovações.',
    },
    {
      label: 'Tentativas bloqueadas',
      value: fmtNumber(analyticsData.blockedAttempts),
      hint: 'Pop-ups travados pelo motor.',
    },
  ];
  const analyticsBadgeClass =
    analyticsSource === 'live'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
      : analyticsSource === 'sequence'
      ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
      : 'border-amber-400/40 bg-amber-500/10 text-amber-100';

  useEffect(() => {
    if (!user) {
      setHeadHouseOptions([]);
      return;
    }
    let active = true;
    const loadHeadHouses = async () => {
      try {
        setHousesLoading(true);
        setHousesError(null);
        const response = await fetch('/api/sports/houses?locale=en', { cache: 'no-store' });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load houses');
        }
        const options =
          (data.houses ?? [])
            .filter((house: any) => house?.head?.user_id === user.id)
            .map((house: any) => {
              const key = (house?.sport?.code || house?.name || house?.id || 'LEGACY').toString().toUpperCase();
              const label = house?.name || `House · ${house?.sport?.code ?? 'Sport'}`;
              return { key, label };
            }) ?? [];
        setHeadHouseOptions(options);
      } catch (error) {
        if (!active) return;
        console.error('[admin/onboarding] failed to load houses', error);
        setHeadHouseOptions([]);
        setHousesError('Falha ao carregar Houses atribuídas.');
      } finally {
        if (active) setHousesLoading(false);
      }
    };
    void loadHeadHouses();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!headHouseOptions.length) return;
    if (!headHouseOptions.some((option) => option.key === houseKey)) {
      setHouseKey(headHouseOptions[0].key);
    }
  }, [headHouseOptions, houseKey]);

  useEffect(() => {
    if (!houseKey) return;
    let active = true;
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        const response = await fetch(`/api/onboarding/analytics?house=${encodeURIComponent(houseKey)}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load analytics');
        }
        setAnalyticsOverride((data.analytics as HouseOnboardingSequence['analytics']) ?? null);
      } catch (error) {
        if (!active) return;
        console.error('[admin/onboarding] analytics fetch failed', error);
        setAnalyticsOverride(null);
        setAnalyticsError('Falha ao carregar métricas.');
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
    return () => {
      active = false;
    };
  }, [houseKey, analyticsReloadKey]);

  const handleLoadHouse = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/onboarding/house?house=${encodeURIComponent(houseKey)}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to sync');
      const normalizedSequence = {
        ...data.sequence,
        popups: data.sequence.popups.map((popup: OnboardingPopupData) => normalizeTrigger(popup)),
      };
      const popup = normalizedSequence.popups[0] ?? normalizeTrigger(DEFAULT_DRAFT);
      setHouseSequence(normalizedSequence);
      setSequenceDraft(normalizedSequence.popups);
      setSelectedIndex(normalizedSequence.popups.length ? 0 : null);
      setDraft(popup);
      setHighlightsInput((popup.highlights ?? []).join('\n'));
      setStatus('Sequencia importada de ' + data.sequence.house + '.');
    } catch (error) {
      console.error('[admin/onboarding] sync failed', error);
      setHouseSequence(null);
      setSequenceDraft([]);
      setSelectedIndex(null);
      setDraft(DEFAULT_DRAFT);
      setHighlightsInput(DEFAULT_DRAFT.highlights?.join('\n') ?? '');
      setStatus('Falha ao sincronizar. Mantém o rascunho atual.');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = useCallback(() => {
    setAnalyticsReloadKey((key) => key + 1);
  }, []);

  const handleInspectQueue = useCallback(async () => {
    const target = inspectorUserId.trim();
    if (!target) {
      setInspectorError('Introduz um user_id válido.');
      setInspectorResult(null);
      return;
    }
    const token = getToken?.();
    if (!token) {
      setInspectorError('Precisas de sessão ativa para consultar filas.');
      setInspectorResult(null);
      return;
    }
    try {
      setInspectorLoading(true);
      setInspectorError(null);
      const response = await fetch(
        `/api/onboarding/queue?house=${encodeURIComponent(houseKey)}&user=${encodeURIComponent(target)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        },
      );
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to inspect queue');
      }
      setInspectorResult({
        user: data.user || target,
        house: data.house || houseKey,
        queue: (data.queue as OnboardingPopupData[]) ?? [],
        signature: (data.signature as string | null) ?? null,
        updatedAt: typeof data.updatedAt === 'string' ? Date.parse(data.updatedAt) : data.updatedAt ?? null,
      });
    } catch (error) {
      console.error('[admin/onboarding] queue inspector failed', error);
      setInspectorResult(null);
      setInspectorError('Falha ao carregar a fila do membro.');
    } finally {
      setInspectorLoading(false);
    }
  }, [getToken, houseKey, inspectorUserId]);

  const handleDraftChange = (field: keyof OnboardingPopupData, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCtaChange = (key: 'primaryCta' | 'secondaryCta', field: 'label' | 'href', value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { label: '', href: '' }),
        [field]: value,
      },
    }));
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    const normalizedDraft = normalizeTrigger(resolvedDraft);
    const validationMessage = validatePopup(normalizedDraft);
    if (validationMessage) {
      setStatus(validationMessage);
      return;
    }
    const token = getToken?.();
    if (!token) {
      setStatus('Precisas de sessão ativa para guardar a sequência.');
      return;
    }
    const nextSequence = [...sequenceDraft];
    let targetIndex = typeof selectedIndex === 'number' ? selectedIndex : -1;
    if (targetIndex < 0 || targetIndex >= nextSequence.length) {
      nextSequence.push(normalizedDraft);
      targetIndex = nextSequence.length - 1;
      setSelectedIndex(targetIndex);
    } else {
      nextSequence[targetIndex] = normalizedDraft;
    }
    const normalizedSequence = nextSequence.map((popup) => normalizeTrigger(popup));
    const fallbackHouse = normalizedDraft.house || houseSequence?.house || houseKey || 'LEGACY';
    const sequencePayload: HouseOnboardingSequence = {
      house: fallbackHouse,
      sport: houseSequence?.sport || 'Multisport',
      head: houseSequence?.head || `Head of ${fallbackHouse}`,
      analytics: houseSequence?.analytics || DEFAULT_ANALYTICS,
      popups: normalizedSequence,
    };
    setSequenceDraft(normalizedSequence);
    try {
      setSaving(true);
      setStatus('A guardar sequência...');
      const response = await fetch('/api/onboarding/house', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sequence: sequencePayload }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to persist sequence');
      }
      setHouseSequence(sequencePayload);
      setStatus('Sequência sincronizada com o mock do Painel Admin.');
    } catch (error) {
      console.error('[admin/onboarding] save failed', error);
      setStatus('Falha ao guardar sequência. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPopup = (popup: OnboardingPopupData, index: number) => {
    const normalized = normalizeTrigger(popup);
    setDraft(normalized);
    setHighlightsInput((normalized.highlights ?? []).join('\n'));
    setSelectedIndex(index);
    setStatus('Pop-up ' + normalized.title + ' selecionado para edicao.');
  };

  const handleDuplicatePopup = (index: number) => {
    setSequenceDraft((prev) => {
      const copy = [...prev];
      const base = copy[index];
      if (!base) return prev;
      const duplicated: OnboardingPopupData = normalizeTrigger({
        ...base,
        id: base.id + '-copy-' + Date.now(),
        title: base.title + ' (copia)',
      });
      copy.splice(index + 1, 0, duplicated);
      setSelectedIndex(index + 1);
      setDraft(duplicated);
      setHighlightsInput((duplicated.highlights ?? []).join('\n'));
      setStatus('Pop-up duplicado (não persistido).');
      return copy;
    });
  };

  const handleAddPopup = () => {
    const baseHouse = houseSequence?.house || draft.house || houseKey || 'LEGACY';
    const freshPopup: OnboardingPopupData = normalizeTrigger({
      ...DEFAULT_DRAFT,
      id: `popup-${baseHouse}-${Date.now()}`,
      house: baseHouse,
      xpGate: 'XP 0',
      trigger: { type: 'xp', value: 0, label: 'XP 0 - primeiro login' },
      title: 'Novo pop-up personalizado',
      badgeLabel: 'Rascunho',
    });
    setSequenceDraft((prev) => [...prev, freshPopup]);
    setDraft(freshPopup);
    setHighlightsInput((freshPopup.highlights ?? []).join('\n'));
    setSelectedIndex(null);
    setStatus('Novo pop-up adicionado. Guarda para sincronizar com a House.');
  };

  const handleRemovePopup = (index: number) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Remover este pop-up da sequência? Ainda não será apagado na House até guardares.');
      if (!confirmed) return;
    }
    setSequenceDraft((prev) => {
      if (!prev[index]) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      const nextSelection = copy.length ? Math.min(index, copy.length - 1) : null;
      if (nextSelection === null) {
        const fallback = normalizeTrigger({
          ...DEFAULT_DRAFT,
          id: `popup-${(houseSequence?.house || houseKey || 'LEGACY')}-${Date.now()}`,
          house: houseSequence?.house || houseKey || 'LEGACY',
        });
        setDraft(fallback);
        setHighlightsInput((fallback.highlights ?? []).join('\n'));
        setSelectedIndex(null);
      } else {
        const nextPopup = normalizeTrigger(copy[nextSelection]);
        setDraft(nextPopup);
        setHighlightsInput((nextPopup.highlights ?? []).join('\n'));
        setSelectedIndex(nextSelection);
      }
      setStatus(`Pop-up ${removed?.title ?? removed?.id ?? ''} removido da sequência local.`);
      return copy;
    });
  };

  const handlePopupStatusChange = (index: number, status: OnboardingPopupData['status']) => {
    setSequenceDraft((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      copy[index] = { ...copy[index], status };
      if (selectedIndex === index) {
        setDraft(copy[index]);
      }
      return copy;
    });
  };

  const handleMovePopup = (index: number, direction: 'up' | 'down') => {
    setSequenceDraft((prev) => {
      const copy = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      setStatus('Ordem atualizada (não persistido).');
      setSelectedIndex((current) => {
        if (current === index) return newIndex;
        if (current === newIndex) return index;
        return current;
      });
      return copy;
    });
  };

  const handleTriggerTypeChange = (type: 'xp' | 'content') => {
    setDraft((prev) => {
      if (type === 'xp') {
        const nextValue =
          prev.trigger?.type === 'xp' && Number.isFinite(prev.trigger.value) ? prev.trigger.value : 0;
        return {
          ...prev,
          trigger: { type: 'xp', value: nextValue, label: prev.trigger?.label },
        };
      }
      const prevContent = prev.trigger?.type === 'content' ? prev.trigger : undefined;
      return {
        ...prev,
        trigger: {
          type: 'content',
          contentType: prevContent?.contentType ?? 'lesson',
          contentId: prevContent?.contentId ?? '',
          contentTitle: prevContent?.contentTitle ?? '',
          label: prev.trigger?.label,
        },
      };
    });
  };

  const handleTriggerLabelChange = (label: string) => {
    setDraft((prev) => {
      if (!prev.trigger) {
        return { ...prev, trigger: { type: 'xp', value: 0, label } };
      }
      return {
        ...prev,
        trigger: { ...prev.trigger, label },
      };
    });
  };

  const handleTriggerValueChange = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    setDraft((prev) => {
      if (prev.trigger?.type === 'xp') {
        return { ...prev, trigger: { ...prev.trigger, value: safeValue } };
      }
      return { ...prev, trigger: { type: 'xp', value: safeValue, label: prev.trigger?.label } };
    });
  };

  const handleContentTriggerChange = (key: 'contentType' | 'contentId' | 'contentTitle', value: string) => {
    setDraft((prev) => {
      const base: Extract<OnboardingTrigger, { type: 'content' }> =
        prev.trigger?.type === 'content'
          ? prev.trigger
          : { type: 'content', contentType: 'lesson', contentId: '', contentTitle: '', label: prev.trigger?.label };
      if (key === 'contentType') {
        return {
          ...prev,
          trigger: { ...base, contentType: value as Extract<OnboardingTrigger, { type: 'content' }>['contentType'] },
        };
      }
      if (key === 'contentId') {
        return {
          ...prev,
          trigger: { ...base, contentId: value },
        };
      }
      return {
        ...prev,
        trigger: { ...base, contentTitle: value },
      };
    });
  };

  const complianceChecklist = useMemo(
    () => [
      {
        label: 'Termo aceito nos últimos 90 dias',
        ok: termActive,
        hint: termActive ? 'Validação em vigor.' : 'Renova para voltar a editar.',
      },
      {
        label: 'Sem leads por atribuir',
        ok: unassignedSubmissions === 0,
        hint:
          unassignedSubmissions === 0
            ? 'Todas as submissões têm responsável.'
            : `${unassignedSubmissions} lead(s) sem responsável.`,
      },
      {
        label: 'Limites oficiais comunicados',
        ok: true,
        hint: '1 pop-up/dia · 3/semana (revisto semanalmente).',
      },
    ],
    [termActive, unassignedSubmissions],
  );

  const formatSubmissionDate = useCallback((timestamp: string | null) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleString('pt-PT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#010913] text-white">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-cyan-300">Admin · Onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fdd87c]">Painel — Pop-ups personalizados</h1>
          <p className="mt-2 text-sm text-slate-300">
            Sincroniza as sequências por House, ajusta copy/CTAs e pré-visualiza com o mesmo modal usado pelos membros.
          </p>
        </div>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-3 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Termo de Responsabilidade</p>
            <p className="text-lg font-semibold text-white">Heads confirmam que seguem o Termo antes de editar pop-ups.</p>
            <p className="text-sm text-slate-300">
              Sem aceitação ativa (&le; {TERM_VALIDITY_DAYS} dias), o painel permanece em modo de leitura.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {acceptedAt ? (
                <span className={cn('text-xs', termExpired ? 'text-amber-200' : 'text-emerald-300')}>
                  {termExpired
                    ? `Expirou em ${new Date(termExpiration!).toLocaleDateString()}`
                    : `Aceite em ${new Date(acceptedAt).toLocaleString()}`}
                </span>
              ) : (
                <span className="text-xs text-amber-200">Ainda não aceitaste o Termo.</span>
              )}
              <Button
                size="sm"
                onClick={() => void accept()}
                disabled={termLoading || termSaving || termActive}
                className="bg-emerald-500/20 text-emerald-100"
              >
                {termLoading || termSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A validar...
                  </>
                ) : termActive ? (
                  'Termo ativo'
                ) : (
                  'Aceitar / renovar Termo'
                )}
              </Button>
            </div>
            {termError ? <p className="text-xs text-amber-300">{termError}</p> : null}
            {requiresRenewal && !termError ? (
              <p className="text-xs text-amber-300">O termo expirou. Renova antes de editar.</p>
            ) : null}
            <ScrollArea className="max-h-72 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="space-y-4 text-sm text-slate-200">
                <p>{RESPONSIBILITY_TERM.intro}</p>
                {RESPONSIBILITY_TERM.commitments.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="font-semibold text-white">{section.title}</p>
                    <ul className="list-disc space-y-1 pl-4 text-slate-300">
                      {section.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-xs text-slate-400">{RESPONSIBILITY_TERM.footer}</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Centro de Conformidade</p>
              <h2 className="text-xl font-semibold text-white">Checklist operacional</h2>
              <p className="text-xs text-slate-500">
                Baseado no plano oficial de onboarding escalável. Atualiza semanalmente para manter o estatuto de Head.
              </p>
            </div>
            <div className="space-y-3">
              {complianceChecklist.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3 text-sm',
                    item.ok
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-amber-400/30 bg-amber-400/5',
                  )}
                >
                  <div className="mt-0.5">
                    {item.ok ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-slate-300">{item.hint}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
                <Link href="/docs/onboarding-personalizado" target="_blank" rel="noreferrer">
                  Ver guia oficial
                </Link>
              </Button>
              <span className="text-xs text-slate-400">
                Última verificação: {new Date().toLocaleDateString('pt-PT')} · Leads sem dono:{' '}
                {unassignedSubmissions}
              </span>
            </div>
          </CardContent>
        </Card>
        <div className={cn('flex flex-col gap-6', editingDisabled && 'pointer-events-none opacity-40')}>
        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">House</label>
                {headHouseOptions.length ? (
                  <Select value={houseKey} onValueChange={(value) => setHouseKey(value)}>
                    <SelectTrigger className="border-white/10 bg-[#010913]" disabled={housesLoading}>
                      <SelectValue placeholder={housesLoading ? 'A carregar Houses...' : 'Escolhe a House'} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#010913] text-white">
                      {headHouseOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={houseKey}
                    onChange={(event) => setHouseKey(event.target.value.toUpperCase())}
                    className="border-white/10 bg-[#010913]"
                  />
                )}
                {housesError ? (
                  <p className="text-xs text-amber-300">{housesError}</p>
                ) : headHouseOptions.length ? (
                  <p className="text-xs text-slate-400">Chave interna usada para sequências: {houseKey}</p>
                ) : (
                  <p className="text-xs text-slate-400">Sem House atribuída? Introduz o código manualmente.</p>
                )}
              </div>
              <Button onClick={handleLoadHouse} disabled={loading} className="bg-cyan-500/20 text-cyan-100">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sync
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Sincronizar demo
                  </>
                )}
              </Button>
            </div>
            {status ? <p className="text-sm text-emerald-200">{status}</p> : null}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inspector</p>
              <h2 className="text-xl font-semibold text-white">Fila de um membro</h2>
              <p className="text-xs text-slate-500">
                Consulta a fila guardada para qualquer utilizador desta House introduzindo o respetivo <code className="text-slate-200">user_id</code>.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500">user_id alvo</label>
                <Input
                  value={inspectorUserId}
                  onChange={(event) => setInspectorUserId(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="mt-2 border-white/10 bg-[#010913] text-white placeholder:text-slate-600"
                />
              </div>
              <Button
                onClick={() => void handleInspectQueue()}
                disabled={inspectorLoading || !inspectorUserId.trim()}
                className="bg-cyan-500/20 text-cyan-100"
              >
                {inspectorLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A consultar...
                  </>
                ) : (
                  'Consultar fila'
                )}
              </Button>
            </div>
            {inspectorError ? <p className="text-sm text-amber-300">{inspectorError}</p> : null}
            {inspectorResult ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Utilizador</p>
                    <p className="break-all text-sm font-mono text-slate-100">{inspectorResult.user}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">House</p>
                    <p className="text-sm font-semibold text-white">{inspectorResult.house || houseKey}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Itens na fila</p>
                    <p className="text-2xl font-semibold text-white">{inspectorResult.queue.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Última atualização</p>
                    <p className="text-sm text-slate-100">
                      {inspectorResult.updatedAt ? new Date(inspectorResult.updatedAt).toLocaleString('pt-PT') : '--'}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#000c12]/30 p-3 text-xs text-slate-400">
                  Assinatura: {inspectorResult.signature ? inspectorResult.signature : '—'}
                </div>
                {inspectorResult.queue.length ? (
                  <div className="space-y-2">
                    {inspectorResult.queue.map((popup) => (
                      <div key={popup.id} className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                        <p className="text-sm font-semibold text-white">{popup.title}</p>
                        <p className="text-xs text-slate-400">{popup.trigger?.label || popup.xpGate || 'XP 0'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Sem pop-ups pendentes para este utilizador.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sem dados carregados. Introduz um user_id e consulta a fila.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {houseSequence ? `${houseSequence.house} · ${houseSequence.sport}` : 'Sequência carregada'}
                </p>
                <h2 className="text-xl font-semibold text-white">
                  {houseSequence ? 'Pop-ups da House' : 'Pop-ups (demo)'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-400">
                  {sequenceDraft.length} {sequenceDraft.length === 1 ? 'mensagem' : 'mensagens'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddPopup}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="mr-1 h-4 w-4" /> Novo pop-up
                </Button>
              </div>
            </div>

            {sequenceDraft.length ? (
              <div className="space-y-3">
                {sequenceDraft.map((popup, index) => (
                  <div
                    key={popup.id}
                    className={cn(
                      'rounded-2xl border border-white/10 bg-[#000c12]/40 p-4',
                      selectedIndex === index && 'border-cyan-400/60 bg-[#001d2a]',
                    )}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">{popup.xpGate ?? 'XP —'}</p>
                        <p className="text-lg font-semibold text-white">{popup.title}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-white/20',
                            popup.status === 'published'
                              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                              : popup.status === 'ready'
                              ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
                              : 'border-amber-400/60 bg-amber-500/10 text-amber-100',
                          )}
                        >
                          {popup.status
                            ? POPUP_STATUS_OPTIONS.find((option) => option.value === popup.status)?.label
                            : 'Rascunho'}
                        </Badge>
                        <Select
                          value={(popup.status ?? 'draft') as 'draft' | 'ready' | 'published'}
                          onValueChange={(value) => handlePopupStatusChange(index, value as OnboardingPopupData['status'])}
                        >
                          <SelectTrigger className="w-36 border-white/10 bg-[#010913] text-white">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#010913] text-white">
                            {POPUP_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleMovePopup(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="mr-1 h-4 w-4" /> Up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMovePopup(index, 'down')}
                        disabled={index === sequenceDraft.length - 1}
                      >
                        <ArrowDown className="mr-1 h-4 w-4" /> Down
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicatePopup(index)}>
                        <Copy className="mr-1 h-4 w-4" /> Duplicar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(selectedIndex === index && 'border-cyan-400/70 bg-cyan-500/10 text-cyan-100')}
                        onClick={() => handleSelectPopup(popup, index)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-400/50 text-red-200 hover:bg-red-500/10"
                        onClick={() => handleRemovePopup(index)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Remover
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-slate-300 line-clamp-2">{popup.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#000c12]/30 p-6 text-sm text-slate-300">
                Ainda não tens pop-ups para esta House. Usa “Novo pop-up” para começar a planear a sequência oficial.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Logs & Analytics</p>
                <h2 className="text-xl font-semibold text-white">Últimas ações</h2>
                <p className="text-xs text-slate-500">
                  Filtrado para House <span className="font-semibold text-slate-200">{houseKey || 'LEGACY'}</span>
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={logActionFilter} onValueChange={(value) => setLogActionFilter(value as typeof logActionFilter)}>
                    <SelectTrigger className="w-full border-white/10 bg-[#010913] text-white sm:w-48">
                      <SelectValue placeholder="Filtrar ações" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#010913] text-white">
                      {LOG_ACTION_FILTERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={logUserQuery}
                    onChange={(event) => setLogUserQuery(event.target.value)}
                    placeholder="Filtrar por user_id"
                    className="border-white/10 bg-[#010913] text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={refreshLogs} className="border-white/20 text-white hover:bg-white/10">
                    <RefreshCcw className="mr-1 h-4 w-4" /> Atualizar
                  </Button>
                  <span className="text-xs text-slate-400">
                    {logsLoading ? 'A carregar...' : `${filteredLogs.length}/${liveLogs.length}`}
                  </span>
                </div>
              </div>
            </div>

            {logsError ? <p className="text-sm text-amber-300">{logsError}</p> : null}

            <div className="grid gap-3 sm:grid-cols-4">
              {(['delivered','primary','secondary','dismiss'] as Array<keyof typeof ACTION_LABELS>).map((key) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{ACTION_LABELS[key].label}</p>
                  <p className="text-2xl font-semibold text-white">{logTotals[key] ?? 0}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#000c12]/40 px-4 py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-white">{ACTION_LABELS[log.action].label}</p>
                      <p className="text-xs text-slate-400">Popup: {log.popupId}</p>
                      {log.userId ? <p className="text-[11px] text-slate-500">User: {log.userId}</p> : null}
                    </div>
                    <span className="text-xs text-slate-300">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  {logActionFilter === 'ALL' ? 'Sem eventos registados.' : 'Sem eventos para este filtro.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Métricas da House</p>
                <h2 className="text-xl font-semibold text-white">Performance dos pop-ups</h2>
                <p className="text-xs text-slate-500">
                  Baseado no histórico real desta House. Útil para ajustar triggers e copy.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('border-white/20 bg-[#000c12]/40 text-white')}>
                  {houseSequence ? houseSequence.house : 'Demo'}
                </Badge>
                <Badge variant="outline" className={cn('bg-[#000c12]/40 text-white', analyticsBadgeClass)}>
                  {analyticsSource === 'live'
                    ? 'Live'
                    : analyticsSource === 'sequence'
                    ? 'Painel'
                    : 'Demo'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshAnalytics}
                  disabled={analyticsLoading}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {analyticsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Recarregar métricas
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analyticsCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                  <p className="text-2xl font-semibold text-white">{card.value}</p>
                  <p className="text-xs text-slate-400">{card.hint}</p>
                </div>
              ))}
            </div>
            {analyticsError ? (
              <p className="text-xs text-amber-300">{analyticsError}</p>
            ) : analyticsSource === 'fallback' ? (
              <p className="text-xs text-slate-400">
                Sem dados reais ainda — a usar métricas demo do template fundacional.
              </p>
            ) : analyticsSource === 'sequence' ? (
              <p className="text-xs text-slate-400">
                A mostrar métricas guardadas com a sequência (sem recomputar logs recentes).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Submissões</p>
                <h2 className="text-xl font-semibold text-white">Funil desta House</h2>
                <p className="text-xs text-slate-500">
                  Mostra os pedidos mais recentes associados a <span className="font-semibold text-white">{houseKey}</span>.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:w-72">
                <label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Estado</label>
                <Select
                  value={submissionStatusFilter}
                  onValueChange={(value) => setSubmissionStatusFilter(value as 'ALL' | AdminOnboardingStatus)}
                >
                  <SelectTrigger className="border-white/10 bg-[#010913] text-white">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#010913] text-white">
                    {SUBMISSION_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={submissionSearch}
                  onChange={(event) => setSubmissionSearch(event.target.value)}
                  placeholder="Pesquisar por nome, email ou desporto"
                  className="border-white/10 bg-[#010913] text-white placeholder:text-slate-500"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchSubmissions()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Atualizar
                </Button>
              </div>
            </div>
            {submissionsError ? <p className="text-sm text-amber-300">{submissionsError}</p> : null}
            <div className="space-y-3">
              {submissionsLoading ? (
                <p className="text-sm text-slate-400">A carregar submissões...</p>
              ) : filteredSubmissions.length ? (
                filteredSubmissions.map((submission) => {
                  const statusLabel = submission.status ? SUBMISSION_STATUS_LABELS[submission.status] : 'Sem estado';
                  const assignedLabel =
                    submission.assigned_to_full_name ??
                    submission.assigned_to_username ??
                    'Sem responsável atribuído';
                  const isAssignedToMe = Boolean(
                    submission.assigned_to_username &&
                      user?.username &&
                      submission.assigned_to_username === user.username,
                  );
                  return (
                    <div
                      key={submission.id}
                      className="rounded-2xl border border-white/10 bg-[#000c12]/40 p-4 text-sm text-slate-200"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-white">
                            {submission.full_name ?? 'Sem nome'}{' '}
                            {submission.sequence_number ? (
                              <span className="text-xs text-slate-500">#{submission.sequence_number}</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-400">{submission.email ?? 'Sem email registado'}</p>
                          <p className="text-xs text-slate-400">{submission.sports_category ?? 'Sem desporto'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-cyan-400/40 bg-cyan-500/10 text-cyan-100">
                            {statusLabel}
                          </Badge>
                          <span className="text-xs text-slate-400">{formatSubmissionDate(submission.created_at)}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                          <p className="text-xs text-slate-400">Responsável: {assignedLabel}</p>
                          <div className="flex flex-col gap-1 md:w-60">
                            <label className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Atualizar estado</label>
                            <Select
                              value={(submission.status ?? 'PENDING_RESPONSE') as AdminOnboardingStatus}
                              onValueChange={(value) =>
                                handleUpdateSubmissionStatus(submission.id, value as AdminOnboardingStatus)
                              }
                              disabled={updatingSubmissionId === submission.id}
                            >
                              <SelectTrigger className="border-white/10 bg-[#010913] text-white">
                                <SelectValue placeholder="Estado" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#010913] text-white">
                                {SUBMISSION_STATUS_CHOICES.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleAssignSubmission(submission.id)}
                            disabled={assigningSubmissionId === submission.id || isAssignedToMe}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            {assigningSubmissionId === submission.id ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> A assumir...
                              </>
                            ) : isAssignedToMe ? (
                              'És o responsável'
                            ) : (
                              'Assumir lead'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleOpenNotesModal(submission)}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <MessageSquare className="mr-1 h-4 w-4" /> Notas
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">Sem submissões para este filtro.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#04131b]/80">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">House label</label>
                <Input
                  value={draft.house}
                  onChange={(event) => handleDraftChange('house', event.target.value)}
                  className="mt-2 border-white/10 bg-[#010913]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Trigger (texto visivel)</label>
                <Input
                  value={draft.xpGate ?? ''}
                  onChange={(event) => handleDraftChange('xpGate', event.target.value)}
                  className="mt-2 border-white/10 bg-[#010913]"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Trigger real (motor)</p>
              <p className="text-xs text-slate-400">Define se este pop-up depende de XP ou de conteudo concluido.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRIGGER_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTriggerTypeChange(option.value)}
                    className={cn(
                      'border-white/20 text-white hover:bg-white/10',
                      triggerType === option.value && 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100',
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Label interno</label>
                  <Input
                    value={triggerLabelValue}
                    onChange={(event) => handleTriggerLabelChange(event.target.value)}
                    placeholder="XP 0 - primeiro login"
                    className="mt-2 border-white/10 bg-[#010913]"
                  />
                </div>
                {triggerType === 'xp' ? (
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Valor minimo de XP</label>
                    <Input
                      type="number"
                      value={xpTriggerValue}
                      onChange={(event) => handleTriggerValueChange(Number(event.target.value) || 0)}
                      className="mt-2 border-white/10 bg-[#010913]"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Tipo de conteudo</label>
                      <select
                        value={contentTrigger?.contentType ?? 'lesson'}
                        onChange={(event) => handleContentTriggerChange('contentType', event.target.value)}
                        className="mt-2 w-full rounded-md border border-white/10 bg-[#010913] px-3 py-2 text-sm text-white"
                      >
                        {CONTENT_TRIGGER_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">ID ou slug oficial</label>
                      <Input
                        value={contentTrigger?.contentId ?? ''}
                        onChange={(event) => handleContentTriggerChange('contentId', event.target.value)}
                        placeholder="/blog/dao1 ou lesson-id"
                        className="mt-2 border-white/10 bg-[#010913]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Nome visivel</label>
                      <Input
                        value={contentTrigger?.contentTitle ?? ''}
                        onChange={(event) => handleContentTriggerChange('contentTitle', event.target.value)}
                        placeholder="DAO1 briefing ou Licao #3"
                        className="mt-2 border-white/10 bg-[#010913]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>


            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Título</label>
              <Input
                value={draft.title}
                onChange={(event) => handleDraftChange('title', event.target.value)}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Mensagem</label>
              <Textarea
                value={draft.body}
                onChange={(event) => handleDraftChange('body', event.target.value)}
                rows={4}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Highlights (1 por linha)</label>
              <Textarea
                value={highlightsInput}
                onChange={(event) => setHighlightsInput(event.target.value)}
                rows={4}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Badge opcional</label>
              <Input
                value={draft.badgeLabel ?? ''}
                onChange={(event) => handleDraftChange('badgeLabel', event.target.value)}
                className="mt-2 border-white/10 bg-[#010913]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CTA principal</p>
                <Input
                  value={draft.primaryCta?.label ?? ''}
                  placeholder="Label"
                  onChange={(event) => handleCtaChange('primaryCta', 'label', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
                <Input
                  value={draft.primaryCta?.href ?? ''}
                  placeholder="/education/xp"
                  onChange={(event) => handleCtaChange('primaryCta', 'href', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CTA secundária</p>
                <Input
                  value={draft.secondaryCta?.label ?? ''}
                  placeholder="Label"
                  onChange={(event) => handleCtaChange('secondaryCta', 'label', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
                <Input
                  value={draft.secondaryCta?.href ?? ''}
                  placeholder="/education/houses"
                  onChange={(event) => handleCtaChange('secondaryCta', 'href', event.target.value)}
                  className="border-white/10 bg-[#010913]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="bg-gradient-to-r from-[#fdd87c] to-[#fcb045] text-[#1e1500]" onClick={handlePreview}>
                <MonitorPlay className="mr-2 h-4 w-4" /> Pré-visualizar pop-up
              </Button>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A guardar...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar & sincronizar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        </div>

        {!isAccepted ? (
          <p className="text-sm text-amber-300">Aceita o Termo para editar e publicar pop-ups.</p>
        ) : null}

      </main>

      <Footer />

      {previewOpen ? (
        <OnboardingPopup
          data={resolvedDraft}
          open
          lockSeconds={3}
          onClose={() => setPreviewOpen(false)}
          onAction={({ action }) => {
            if (action !== 'dismiss') {
              setStatus(`Simulaste ação: ${action}.`);
            }
          }}
        />
      ) : null}
      <Dialog open={Boolean(notesModalSubmission)} onOpenChange={(open) => (!open ? handleCloseNotesModal() : null)}>
        <DialogContent className="max-w-xl border-white/10 bg-[#010913] text-white">
          <DialogHeader>
            <DialogTitle>Notas da submissão</DialogTitle>
            <DialogDescription className="text-slate-400">
              {notesModalSubmission
                ? `${notesModalSubmission.full_name ?? 'Sem nome'} · ${notesModalSubmission.email ?? 'Sem email'}`
                : 'Seleciona uma submissão para ver notas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {notesError ? <p className="text-xs text-amber-300">{notesError}</p> : null}
            <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
              {notesLoading ? (
                <p className="text-sm text-slate-400">A carregar notas...</p>
              ) : notes.length ? (
                notes.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="whitespace-pre-line text-slate-100">{note.note}</p>
                    <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-400">
                      <span>
                        Autor:{' '}
                        {note.author_full_name ||
                          note.author_username ||
                          note.author_email ||
                          'Utilizador removido'}
                      </span>
                      <span>{new Date(note.created_at).toLocaleString('pt-PT')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sem notas guardadas.</p>
              )}
            </div>
            {notesModalSubmission ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicionar nova nota..."
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  rows={3}
                  className="border-white/10 bg-[#030a12]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={handleCloseNotesModal} className="text-slate-300">
                    Fechar
                  </Button>
                  <Button onClick={() => void handleSaveNote()} disabled={notesLoading || !newNote.trim()}>
                    {notesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar nota
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
