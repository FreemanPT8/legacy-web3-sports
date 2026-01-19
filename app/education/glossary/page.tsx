'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { GlossaryRichText } from '@/components/glossary/GlossaryRichText';
import type {
  GlossaryLanguage,
  GlossaryStatus,
  GlossaryTerm,
  GlossaryTermCompletion,
} from '@/types/glossary';
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Timer,
  Trash2,
  X,
} from 'lucide-react';

type TermFormState = {
  slug: string;
  tags: string;
  term: Record<GlossaryLanguage, string>;
  definition: Record<GlossaryLanguage, string>;
  example: Record<GlossaryLanguage, string>;
  status: GlossaryStatus;
};

const LANGUAGES: GlossaryLanguage[] = ['pt', 'en', 'es'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const PROGRESS_SECONDS = 30;
const TERMS_PER_PAGE = 19;
const XP_REWARD = 2;
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeRichText = (content: string): string => {
  if (!content) return '';
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (HTML_TAG_REGEX.test(trimmed)) {
    return trimmed;
  }
  const escaped = escapeHtml(trimmed).replace(/\n/g, '<br />');
  return `<p>${escaped}</p>`;
};

const defaultFormState = (): TermFormState => ({
  slug: '',
  tags: '',
  status: 'published',
  term: {
    pt: '',
    en: '',
    es: '',
  },
  definition: {
    pt: '',
    en: '',
    es: '',
  },
  example: {
    pt: '',
    en: '',
    es: '',
  },
});

type PaginationMeta = {
  page: number;
  totalPages: number;
  total: number;
};

type UILocaleStrings = {
  hero: {
    tagline: string;
    title: string;
    description: string;
    membersOnly: string;
    newConcept: string;
  };
  searchPlaceholder: string;
  filters: {
    lettersAll: string;
    statusLabel: string;
    statusOptions: {
      all: string;
      published: string;
      draft: string;
      review: string;
    };
  };
  stats: {
    label: string;
    description: string;
  };
  messages: {
    loading: string;
    empty: string;
  };
  badges: {
    xpComplete: string;
  };
  buttons: {
    edit: string;
    preview: string;
    prevPage: string;
    nextPage: string;
    tryAgain: string;
    cancel: string;
    delete: string;
    save: string;
  };
  preview: {
    tagline: string;
    example: string;
    progressTitle: string;
    close: string;
  };
  progress: {
    xpAwarded: (xp: number) => string;
    alreadyRegistered: string;
    completed: string;
    completedWithXp: string;
    draft: string;
    timerHint: (seconds: number, xp: number) => string;
    secondsRemaining: (seconds: number) => string;
    finishing: string;
    awarding: string;
  };
  form: {
    editTitle: string;
    newTitle: string;
    slugLabel: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    statusLabel: string;
    statusOptions: {
      draft: string;
      review: string;
      published: string;
    };
    termLabel: string;
    definitionLabel: string;
    exampleLabel: string;
    optionalTag: string;
  };
  errors: {
    sessionExpired: string;
    registerXP: string;
    progressGeneral: string;
    fetchFailed: string;
    loadTerms: string;
    fillTermDefinition: (lang: GlossaryLanguage) => string;
    saveFailed: string;
    saveRequestFailed: string;
    deleteFailed: string;
    deleteError: string;
  };
  general: {
    noDefinition: string;
  };
  pagination: {
    label: (page: number, total: number) => string;
    prev: string;
    next: string;
  };
};

const STATUS_LABELS: Record<GlossaryStatus, Record<GlossaryLanguage, string>> = {
  published: {
    pt: 'Publicado',
    en: 'Published',
    es: 'Publicado',
  },
  draft: {
    pt: 'Rascunho',
    en: 'Draft',
    es: 'Borrador',
  },
  review: {
    pt: 'Em revisão',
    en: 'In review',
    es: 'En revisión',
  },
};

const UI_TEXT: Record<GlossaryLanguage, UILocaleStrings> = {
  pt: {
    hero: {
      tagline: 'Academia Web3',
      title: 'Glossário Legacy',
      description:
        'Consulta as definições chave da Academia Web3, em três línguas, e reforça os teus conhecimentos durante as aulas ou leitura de artigos.',
      membersOnly: 'Exclusivo para membros registados',
      newConcept: 'Novo conceito',
    },
    searchPlaceholder: 'Procurar por termo ou definição',
    filters: {
      lettersAll: 'Todos',
      statusLabel: 'Estado:',
      statusOptions: {
        all: 'Todos',
        published: 'Publicados',
        draft: 'Rascunhos',
        review: 'Em revisão',
      },
    },
    stats: {
      label: 'Conceitos',
      description:
        'Termos curados pela equipa Legacy com suporte integral PT/EN/ES.',
    },
    messages: {
      loading: 'A carregar termos...',
      empty: 'Nenhum termo encontrado com os filtros atuais.',
    },
    badges: {
      xpComplete: 'XP registado',
    },
    buttons: {
      edit: 'Editar',
      preview: 'Ver definição',
      prevPage: 'Página anterior',
      nextPage: 'Próxima página',
      tryAgain: 'Tentar novamente',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      save: 'Guardar termo',
    },
    preview: {
      tagline: 'Glossário Legacy',
      example: 'Exemplo',
      progressTitle: 'Progresso de leitura',
      close: 'Fechar',
    },
    progress: {
      xpAwarded: (xp) => `${xp} XP registados!`,
      alreadyRegistered: 'Leitura já registada.',
      completed: 'Leitura concluída.',
      completedWithXp: 'Leitura concluída e XP registado.',
      draft: 'Este termo está em rascunho. XP indisponível.',
      timerHint: (seconds, xp) =>
        `Mantém o conceito aberto por ${seconds} segundos para registar os ${xp} XP`,
      secondsRemaining: (seconds) => `Faltam ${seconds}s`,
      finishing: 'A concluir...',
      awarding: '• a atribuir XP',
    },
    form: {
      editTitle: 'Editar conceito',
      newTitle: 'Novo conceito',
      slugLabel: 'Slug',
      tagsLabel: 'Tags (separadas por vírgulas)',
      tagsPlaceholder: 'web3, tokenomics',
      statusLabel: 'Estado',
      statusOptions: {
        draft: 'Rascunho',
        review: 'Em revisão',
        published: 'Publicado',
      },
      termLabel: 'Termo',
      definitionLabel: 'Definição',
      exampleLabel: 'Exemplo',
      optionalTag: '(opcional)',
    },
    errors: {
      sessionExpired: 'Sessão expirada. Volta a iniciar sessão.',
      registerXP: 'Não foi possível registar o XP.',
      progressGeneral: 'Não foi possível registar o XP. Tenta novamente.',
      fetchFailed: 'Falhou o carregamento.',
      loadTerms: 'Erro a carregar termos.',
      fillTermDefinition: (lang) =>
        `Preenche termo e definição em ${lang.toUpperCase()} antes de guardar.`,
      saveFailed: 'Erro ao guardar termo.',
      saveRequestFailed: 'Falha ao guardar termo.',
      deleteFailed: 'Falha ao eliminar termo.',
      deleteError: 'Erro ao eliminar termo.',
    },
    general: {
      noDefinition: 'Sem definição disponível.',
    },
    pagination: {
      label: (page, total) => `Página ${page} de ${total}`,
      prev: 'Página anterior',
      next: 'Próxima página',
    },
  },
  en: {
    hero: {
      tagline: 'Web3 Academy',
      title: 'Legacy Glossary',
      description:
        'Browse the key definitions from the Web3 Academy, available in three languages, and reinforce your knowledge while watching lessons or reading articles.',
      membersOnly: 'Exclusive for registered members',
      newConcept: 'New concept',
    },
    searchPlaceholder: 'Search by term or definition',
    filters: {
      lettersAll: 'All',
      statusLabel: 'Status:',
      statusOptions: {
        all: 'All',
        published: 'Published',
        draft: 'Drafts',
        review: 'In review',
      },
    },
    stats: {
      label: 'Concepts',
      description:
        'Terms curated by the Legacy team with full PT/EN/ES support.',
    },
    messages: {
      loading: 'Loading terms...',
      empty: 'No terms found with the current filters.',
    },
    badges: {
      xpComplete: 'XP recorded',
    },
    buttons: {
      edit: 'Edit',
      preview: 'View definition',
      prevPage: 'Previous page',
      nextPage: 'Next page',
      tryAgain: 'Try again',
      cancel: 'Cancel',
      delete: 'Delete',
      save: 'Save term',
    },
    preview: {
      tagline: 'Legacy Glossary',
      example: 'Example',
      progressTitle: 'Reading progress',
      close: 'Close',
    },
    progress: {
      xpAwarded: (xp) => `${xp} XP recorded!`,
      alreadyRegistered: 'Reading already recorded.',
      completed: 'Reading completed.',
      completedWithXp: 'Reading completed and XP recorded.',
      draft: 'This term is in draft. XP unavailable.',
      timerHint: (seconds, xp) =>
        `Keep the concept open for ${seconds} seconds to register the ${xp} XP`,
      secondsRemaining: (seconds) => `${seconds}s left`,
      finishing: 'Finishing...',
      awarding: '• awarding XP',
    },
    form: {
      editTitle: 'Edit concept',
      newTitle: 'New concept',
      slugLabel: 'Slug',
      tagsLabel: 'Tags (separated by commas)',
      tagsPlaceholder: 'web3, tokenomics',
      statusLabel: 'Status',
      statusOptions: {
        draft: 'Draft',
        review: 'In review',
        published: 'Published',
      },
      termLabel: 'Term',
      definitionLabel: 'Definition',
      exampleLabel: 'Example',
      optionalTag: '(optional)',
    },
    errors: {
      sessionExpired: 'Session expired. Please sign in again.',
      registerXP: 'Could not register XP.',
      progressGeneral: 'Could not register XP. Please try again.',
      fetchFailed: 'Loading failed.',
      loadTerms: 'Error loading terms.',
      fillTermDefinition: (lang) =>
        `Fill in the term and definition in ${lang.toUpperCase()} before saving.`,
      saveFailed: 'Error saving term.',
      saveRequestFailed: 'Failed to save term.',
      deleteFailed: 'Failed to delete term.',
      deleteError: 'Error deleting term.',
    },
    general: {
      noDefinition: 'No definition available.',
    },
    pagination: {
      label: (page, total) => `Page ${page} of ${total}`,
      prev: 'Previous page',
      next: 'Next page',
    },
  },
  es: {
    hero: {
      tagline: 'Academia Web3',
      title: 'Glosario Legacy',
      description:
        'Consulta las definiciones clave de la Academia Web3, disponibles en tres idiomas, y refuerza tu conocimiento durante clases o artículos.',
      membersOnly: 'Exclusivo para miembros registrados',
      newConcept: 'Nuevo concepto',
    },
    searchPlaceholder: 'Buscar por término o definición',
    filters: {
      lettersAll: 'Todos',
      statusLabel: 'Estado:',
      statusOptions: {
        all: 'Todos',
        published: 'Publicados',
        draft: 'Borradores',
        review: 'En revisión',
      },
    },
    stats: {
      label: 'Conceptos',
      description:
        'Términos seleccionados por el equipo Legacy con soporte completo PT/EN/ES.',
    },
    messages: {
      loading: 'Cargando términos...',
      empty: 'Ningún término encontrado con los filtros actuales.',
    },
    badges: {
      xpComplete: 'XP registrado',
    },
    buttons: {
      edit: 'Editar',
      preview: 'Ver definición',
      prevPage: 'Página anterior',
      nextPage: 'Siguiente página',
      tryAgain: 'Reintentar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      save: 'Guardar término',
    },
    preview: {
      tagline: 'Glosario Legacy',
      example: 'Ejemplo',
      progressTitle: 'Progreso de lectura',
      close: 'Cerrar',
    },
    progress: {
      xpAwarded: (xp) => `¡${xp} XP registrados!`,
      alreadyRegistered: 'Lectura ya registrada.',
      completed: 'Lectura completada.',
      completedWithXp: 'Lectura completada y XP registrado.',
      draft: 'Este término está en borrador. XP no disponible.',
      timerHint: (seconds, xp) =>
        `Mantén el concepto abierto durante ${seconds} segundos para registrar los ${xp} XP`,
      secondsRemaining: (seconds) => `Quedan ${seconds}s`,
      finishing: 'Finalizando...',
      awarding: '• asignando XP',
    },
    form: {
      editTitle: 'Editar concepto',
      newTitle: 'Nuevo concepto',
      slugLabel: 'Slug',
      tagsLabel: 'Etiquetas (separadas por comas)',
      tagsPlaceholder: 'web3, tokenomics',
      statusLabel: 'Estado',
      statusOptions: {
        draft: 'Borrador',
        review: 'En revisión',
        published: 'Publicado',
      },
      termLabel: 'Término',
      definitionLabel: 'Definición',
      exampleLabel: 'Ejemplo',
      optionalTag: '(opcional)',
    },
    errors: {
      sessionExpired: 'Sesión expirada. Vuelve a iniciar sesión.',
      registerXP: 'No fue posible registrar el XP.',
      progressGeneral: 'No fue posible registrar el XP. Inténtalo de nuevo.',
      fetchFailed: 'Falló la carga.',
      loadTerms: 'Error al cargar términos.',
      fillTermDefinition: (lang) =>
        `Completa el término y la definición en ${lang.toUpperCase()} antes de guardar.`,
      saveFailed: 'Error al guardar el término.',
      saveRequestFailed: 'Fallo al guardar el término.',
      deleteFailed: 'Fallo al eliminar el término.',
      deleteError: 'Error al eliminar el término.',
    },
    general: {
      noDefinition: 'Sin definición disponible.',
    },
    pagination: {
      label: (page, total) => `Página ${page} de ${total}`,
      prev: 'Página anterior',
      next: 'Siguiente página',
    },
  },
};

export default function GlossaryPage() {
  const router = useRouter();
  const { user, loading: authLoading, getToken, refreshUser } = useAuth();
  const { language } = useLanguage();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    letter: 'all',
    search: '',
    status: 'published' as GlossaryStatus | 'all',
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formState, setFormState] = useState<TermFormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<GlossaryLanguage>('pt');
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewTerm, setPreviewTerm] = useState<GlossaryTerm | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [completedTerms, setCompletedTerms] = useState<Record<string, GlossaryTermCompletion>>({});
  const activeTermCompletion = previewTerm
    ? completedTerms[previewTerm.id]
    : undefined;
  const [progressSeconds, setProgressSeconds] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [awardingXp, setAwardingXp] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const buildAuthHeaders = (): HeadersInit | undefined => {
    const token = getToken?.();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };

  const persistUserXP = useCallback(
    (newTotal?: number) => {
      if (typeof newTotal !== 'number' || Number.isNaN(newTotal)) return;
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem('user');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        parsed.xp_total = newTotal;
        localStorage.setItem('user', JSON.stringify(parsed));
        refreshUser?.();
      } catch (err) {
        console.error('Failed to persist XP locally:', err);
      }
    },
    [refreshUser],
  );

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => {
      const totalPages = prev.totalPages || 1;
      const nextPage = Math.max(1, Math.min(newPage, totalPages));
      if (nextPage === prev.page) return prev;
      return {
        ...prev,
        page: nextPage,
      };
    });
  }, []);

  const activeLanguage: GlossaryLanguage = useMemo(() => {
    if (LANGUAGES.includes(language as GlossaryLanguage)) {
      return language as GlossaryLanguage;
    }
    return 'pt';
  }, [language]);
  const copy = UI_TEXT[activeLanguage];

  const registerCompletion = useCallback(
    async (termId: string) => {
      const token = getToken?.();
      if (!termId || !token) {
        setProgressError(copy.errors.sessionExpired);
        return;
      }

      setAwardingXp(true);
      setProgressError(null);

      try {
        const res = await fetch(`/api/glossary/${termId}/read`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || copy.errors.registerXP);
        }

        if (!data?.alreadyCompleted) {
          persistUserXP(data?.newTotal);
          setProgressMessage(copy.progress.xpAwarded(XP_REWARD));
        } else {
          setProgressMessage(copy.progress.alreadyRegistered);
        }

        const completionAt =
          data?.completion?.completedAt ?? new Date().toISOString();

        setCompletedTerms((prev) => ({
          ...prev,
          [termId]: { termId, completedAt: completionAt },
        }));
        setProgressError(null);
      } catch (err) {
        console.error('Glossary progress registration failed:', err);
        setProgressError(
          err instanceof Error ? err.message : copy.errors.progressGeneral,
        );
      } finally {
        setAwardingXp(false);
      }
    },
    [copy, getToken, persistUserXP],
  );

  useEffect(() => {
    if (!user) return;
    const fetchTerms = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pagination.page));
        params.set('pageSize', String(TERMS_PER_PAGE));
        params.set('language', activeLanguage);
        if (filters.search.trim()) {
          params.set('search', filters.search.trim());
        }
        if (filters.letter !== 'all') {
          params.set('letter', filters.letter);
        }
        if (isAdmin && filters.status) {
          params.set('status', filters.status);
        }
        const token = getToken?.();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await fetch(`/api/glossary?${params.toString()}`, {
          credentials: 'include',
          headers,
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || copy.errors.fetchFailed);
        }
        setTerms(data.terms || []);
        if (Array.isArray(data.completedTerms)) {
          const normalized = (data.completedTerms as Array<{
            termId?: string;
            completedAt?: string;
          }>).reduce<Record<string, GlossaryTermCompletion>>((acc, entry) => {
            if (entry?.termId) {
              acc[entry.termId] = {
                termId: entry.termId,
                completedAt: entry.completedAt ?? '',
              };
            }
            return acc;
          }, {});
          setCompletedTerms(normalized);
        } else {
          setCompletedTerms({});
        }
        if (data.pagination) {
          setPagination({
            ...data.pagination,
            totalPages:
              data.pagination.totalPages && data.pagination.totalPages > 0
                ? data.pagination.totalPages
                : Math.max(
                    1,
                    Math.ceil(
                      (data.pagination.total ?? data.terms?.length ?? 0) /
                        TERMS_PER_PAGE,
                    ),
                  ),
          });
        } else {
          const currentTotal = data.terms?.length ?? 0;
          setPagination((prev) => ({
            ...prev,
            total: currentTotal,
            totalPages: Math.max(1, Math.ceil(currentTotal / TERMS_PER_PAGE)),
          }));
        }
      } catch (err) {
        console.error('Glossary load error:', err);
        setError(
          err instanceof Error ? err.message : copy.errors.loadTerms,
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, [
    user,
    pagination.page,
    filters.search,
    filters.letter,
    filters.status,
    isAdmin,
    refreshKey,
    activeLanguage,
    copy,
    getToken,
  ]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    terms.forEach((term) => {
      const displayValue =
        term[`term_${activeLanguage}` as const] ||
        term.term_pt ||
        term.term_en ||
        term.term_es ||
        term.slug;
      const letter = displayValue
        ? displayValue.charAt(0).toUpperCase()
        : '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    });
    return LETTERS.map((letter) => ({
      letter,
      items: (groups[letter] || []).sort((a, b) => {
        const textA =
          a[`term_${activeLanguage}` as const] ||
          a.term_pt ||
          a.term_en ||
          a.term_es ||
          '';
        const textB =
          b[`term_${activeLanguage}` as const] ||
          b.term_pt ||
          b.term_en ||
          b.term_es ||
          '';
        return textA.localeCompare(textB, undefined, {
          sensitivity: 'base',
        });
      }),
    })).filter((group) => group.items.length > 0);
  }, [terms, activeLanguage]);

  const handleOpenCreate = () => {
    setEditingTerm(null);
    setFormState(defaultFormState());
    setActiveTab('pt');
    setSheetOpen(true);
  };

  const handleOpenEdit = (term: GlossaryTerm) => {
    setEditingTerm(term);
    setFormState({
      slug: term.slug,
      tags: (term.tags || []).join(', '),
      status: term.status,
      term: {
        pt: term.term_pt || '',
        en: term.term_en || '',
        es: term.term_es || '',
      },
      definition: {
        pt: term.definition_pt || '',
        en: term.definition_en || '',
        es: term.definition_es || '',
      },
      example: {
        pt: term.example_pt || '',
        en: term.example_en || '',
        es: term.example_es || '',
      },
    });
    setActiveTab('pt');
    setSheetOpen(true);
  };

  const handleFormChange = (
    section: 'term' | 'definition' | 'example' | 'meta',
    langOrField: GlossaryLanguage | 'slug' | 'tags' | 'status',
    value: string,
  ) => {
    setFormState((prev) => {
      if (section === 'meta') {
        return {
          ...prev,
          [langOrField]: value,
        } as TermFormState;
      }
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [langOrField]: value,
        },
      };
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    for (const lang of LANGUAGES) {
      const termValue = formState.term[lang]?.trim();
      const defValue = formState.definition[lang]?.trim();
      if (!termValue || !defValue) {
        setSaving(false);
        setError(copy.errors.fillTermDefinition(lang));
        return;
      }
    }

    const payload = {
      slug: formState.slug || undefined,
      term: LANGUAGES.reduce<Record<GlossaryLanguage, string>>(
        (acc, lang) => {
          acc[lang] = formState.term[lang].trim();
          return acc;
        },
        { pt: '', en: '', es: '' },
      ),
      definition: LANGUAGES.reduce<Record<GlossaryLanguage, string>>(
        (acc, lang) => {
          acc[lang] = formState.definition[lang].trim();
          return acc;
        },
        { pt: '', en: '', es: '' },
      ),
      example: LANGUAGES.reduce<Record<GlossaryLanguage, string>>(
        (acc, lang) => {
          acc[lang] = formState.example[lang]?.trim() || '';
          return acc;
        },
        { pt: '', en: '', es: '' },
      ),
      tags: formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: formState.status,
    };
    try {
      const authHeaders = buildAuthHeaders();
      const res = await fetch(
        editingTerm ? `/api/glossary/${editingTerm.id}` : '/api/glossary',
        {
          method: editingTerm ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeaders || {}),
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || copy.errors.saveFailed);
      }
      setSheetOpen(false);
      setFormState(defaultFormState());
      setEditingTerm(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Glossary save error:', err);
      setError(
        err instanceof Error ? err.message : copy.errors.saveRequestFailed,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTerm) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const authHeaders = buildAuthHeaders();
      const res = await fetch(`/api/glossary/${editingTerm.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders ? { ...authHeaders } : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || copy.errors.deleteFailed);
      }
      setSheetOpen(false);
      setTerms((prev) => prev.filter((item) => item.id !== editingTerm.id));
      setEditingTerm(null);
      setFormState(defaultFormState());
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Glossary delete error:', err);
      setError(err instanceof Error ? err.message : copy.errors.deleteError);
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderDefinition = (term: GlossaryTerm) => {
    const key = `definition_${activeLanguage}` as keyof GlossaryTerm;
    return (
      (term[key] as string | undefined) ||
      term.definition_pt ||
      term.definition_en ||
      term.definition_es ||
      copy.general.noDefinition
    );
  };

  const renderTermTitle = (term: GlossaryTerm) => {
    const key = `term_${activeLanguage}` as keyof GlossaryTerm;
    return (
      (term[key] as string | undefined) ||
      term.term_pt ||
      term.term_en ||
      term.term_es ||
      term.slug
    );
  };

  const renderExample = (term: GlossaryTerm) => {
    const key = `example_${activeLanguage}` as keyof GlossaryTerm;
    return (
      (term[key] as string | undefined) ||
      term.example_pt ||
      term.example_en ||
      term.example_es ||
      ''
    );
  };

  const handlePreviewOpen = (term: GlossaryTerm) => {
    setProgressSeconds(0);
    setProgressMessage(null);
    setProgressError(null);
    setPreviewTerm(term);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    clearProgressTimer();
    setPreviewOpen(false);
    setPreviewTerm(null);
    setProgressSeconds(0);
    setProgressMessage(null);
    setProgressError(null);
  };

  const StatusBadge = ({ status }: { status: GlossaryStatus }) => {
    const colorMap: Record<GlossaryStatus, string> = {
      published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      draft: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
      review: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    };
    return (
      <Badge
        variant="outline"
        className={cn('text-xs uppercase tracking-wide', colorMap[status])}
      >
        {STATUS_LABELS[status]?.[activeLanguage] ?? status}
      </Badge>
    );
  };

  useEffect(() => {
    if (previewOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewOpen]);

  useEffect(() => {
    clearProgressTimer();
    setProgressError(null);
    setAwardingXp(false);

    if (!previewOpen || !previewTerm || !user) {
      setProgressSeconds(0);
      setProgressMessage(null);
      return;
    }

    if (previewTerm.status !== 'published') {
      setProgressSeconds(PROGRESS_SECONDS);
      setProgressMessage(copy.progress.draft);
      return;
    }

    if (activeTermCompletion) {
      setProgressSeconds(PROGRESS_SECONDS);
      setProgressMessage((prev) => prev ?? copy.progress.completed);
      return;
    }

    setProgressSeconds(0);
    setProgressMessage(null);
    const currentTermId = previewTerm.id;
    progressTimerRef.current = setInterval(() => {
      setProgressSeconds((prev) => {
        const next = Math.min(PROGRESS_SECONDS, prev + 1);
        if (next >= PROGRESS_SECONDS) {
          clearProgressTimer();
          void registerCompletion(currentTermId);
        }
        return next;
      });
    }, 1000);

    return () => clearProgressTimer();
  }, [
    activeTermCompletion,
    copy.progress.completed,
    copy.progress.draft,
    previewOpen,
    previewTerm,
    previewTerm?.id,
    previewTerm?.status,
    registerCompletion,
    user,
    user?.id,
  ]);

  const previewDefinitionHtml = previewTerm
    ? normalizeRichText(renderDefinition(previewTerm))
    : '';
  const previewExampleHtml = previewTerm
    ? normalizeRichText(renderExample(previewTerm))
    : '';
  const progressPercent = Math.min(
    100,
    (progressSeconds / PROGRESS_SECONDS) * 100,
  );
  const remainingSeconds = Math.max(0, PROGRESS_SECONDS - progressSeconds);

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#000c12] via-[#031828] to-[#001E2B] py-16 shadow-2xl">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#fdd87c]/20 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-[#5af3ff]/20 blur-3xl" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6">
            <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
              {copy.hero.tagline}
            </p>
            <h1 className="text-4xl font-semibold text-[#fdd87c] md:text-5xl">
              {copy.hero.title}
            </h1>
            <p className="max-w-3xl text-lg text-slate-100">
              {copy.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-slate-200">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                {copy.hero.membersOnly}
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  className="rounded-full border border-white/20 bg-[#05212b] text-white hover:bg-[#073247]"
                  onClick={handleOpenCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {copy.hero.newConcept}
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="col-span-2 space-y-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={copy.searchPlaceholder}
                  value={filters.search}
                  onChange={(event) => {
                    const { value } = event.target;
                    setFilters((prev) => ({
                      ...prev,
                      search: value,
                    }));
                    handlePageChange(1);
                  }}
                  className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <Button
                  size="sm"
                  variant={filters.letter === 'all' ? 'default' : 'outline'}
                  className={cn(
                    'rounded-full border border-white/10 bg-white/5 hover:bg-white/10',
                    filters.letter === 'all' && 'bg-[#fdd87c] text-[#00131d]',
                  )}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, letter: 'all' }));
                    handlePageChange(1);
                  }}
                >
                  {copy.filters.lettersAll}
                </Button>
                {LETTERS.map((letter) => (
                  <Button
                    key={letter}
                    size="sm"
                    variant={filters.letter === letter ? 'default' : 'outline'}
                    className={cn(
                      'rounded-full border border-white/10 bg-white/5 hover:bg-white/10',
                      filters.letter === letter && 'bg-[#fdd87c] text-[#00131d]',
                    )}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, letter }));
                      handlePageChange(1);
                    }}
                  >
                    {letter}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                    {copy.stats.label}
                  </p>
                  <p className="text-3xl font-semibold text-white">
                    {pagination.total}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-300 hover:text-white"
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-300">
                {copy.stats.description}
              </p>
              {isAdmin && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{copy.filters.statusLabel}</span>
                  <select
                    className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-white"
                    value={filters.status}
                    onChange={(event) => {
                      setFilters((prev) => ({
                        ...prev,
                        status: event.target.value as GlossaryStatus | 'all',
                      }));
                      handlePageChange(1);
                    }}
                  >
                    <option value="all">{copy.filters.statusOptions.all}</option>
                    <option value="published">{copy.filters.statusOptions.published}</option>
                    <option value="draft">{copy.filters.statusOptions.draft}</option>
                    <option value="review">{copy.filters.statusOptions.review}</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-300" />
              {copy.messages.loading}
            </div>
          ) : groupedTerms.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
              {copy.messages.empty}
            </div>
          ) : (
            <div className="space-y-10">
              {groupedTerms.map((group) => (
                <div key={group.letter} id={`letter-${group.letter}`}>
                  <div className="mb-4 flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-[#fdd87c]">
                      {group.letter}
                    </h2>
                    <Separator className="flex-1 bg-white/10" />
                  </div>
                  <div className="flex flex-col gap-4">
                    {group.items.map((term) => {
                      const canEditTerm = Boolean(user?.id) && term.created_by === user?.id;

                      return (
                        <Card
                          key={term.id}
                          className="w-full border border-white/10 bg-[#02131d] text-white transition hover:border-white/30"
                        >
                          <CardHeader className="space-y-3 px-5 pb-2 pt-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewOpen(term)}
                                  className="text-left text-lg font-semibold text-white transition hover:text-[#fdd87c]"
                                >
                                  {renderTermTitle(term)}
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">

                                {completedTerms[term.id] && (

                                  <Badge className="flex items-center gap-1 border border-emerald-400/40 bg-emerald-400/10 text-emerald-100">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {copy.badges.xpComplete}
                                  </Badge>
                                )}
                                {canEditTerm && <StatusBadge status={term.status} />}

                                <Button
                                  size="icon"
                                  className="h-9 w-9 rounded-full bg-gradient-to-r from-[#fdd87c] via-[#ffd37b] to-[#f7b733] text-[#04121c] shadow-[0_0_18px_rgba(253,216,124,0.25)] transition hover:from-[#ffe5aa] hover:to-[#ffc85c]"
                                  onClick={() => handlePreviewOpen(term)}
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                  <span className="sr-only">{copy.buttons.preview}</span>
                                </Button>
                                {canEditTerm && (
                                  <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(term)}>
                                    {copy.buttons.edit}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          {term.tags?.length ? (
                            <CardContent className="px-5 pb-4 pt-0">
                              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                {term.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="border-white/10 bg-white/5 text-slate-200"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && groupedTerms.length > 0 && pagination.totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-slate-100">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:border-[#fdd87c] hover:text-[#fdd87c]"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                {copy.pagination.prev}
              </Button>
              <p className="text-sm text-slate-300">
                {copy.pagination.label(pagination.page, pagination.totalPages)}
              </p>
              <Button
                className="bg-[#fdd87c] text-[#04121c] hover:bg-[#ffe5aa]"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                {copy.pagination.next}
              </Button>
            </div>
          )}
        </section>
      </main>
      <Footer />

      {previewOpen && previewTerm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#fdd87c]/40 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#021c27] p-8 text-white shadow-[0_35px_80px_rgba(0,0,0,0.65)]">
            <button
              type="button"
              onClick={closePreview}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:border-[#fdd87c] hover:text-[#fdd87c]"
              aria-label={copy.preview.close}
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
              {copy.preview.tagline}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#fdd87c]">
              {renderTermTitle(previewTerm)}
            </h2>
            <p className="text-sm text-slate-300">/{previewTerm.slug}</p>

            <div className="mt-6 space-y-4">
              {previewDefinitionHtml ? (
                <GlossaryRichText
                  html={previewDefinitionHtml}
                  className="glossary-definition prose prose-invert prose-sm max-w-none text-white"
                />
              ) : (
                <p className="text-lg leading-relaxed text-white">
                  {copy.general.noDefinition}
                </p>
              )}
              {previewExampleHtml && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                    {copy.preview.example}
                  </p>
                  <GlossaryRichText
                    html={previewExampleHtml}
                    className="glossary-example prose prose-invert prose-sm max-w-none text-slate-200"
                  />
                </div>
              )}
              <div className="rounded-2xl border border-white/10 bg-[#031723]/70 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-cyan-300">
                  <span className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    {copy.preview.progressTitle}
                  </span>
                  <span className="flex items-center gap-1 text-[#fdd87c]">
                    <Award className="h-4 w-4" />
                    +{XP_REWARD} XP
                  </span>
                </div>
                {previewTerm.status !== 'published' ? (
                  <p className="mt-3 text-sm text-amber-200">
                    {progressMessage || copy.progress.draft}
                  </p>
                ) : activeTermCompletion ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    {progressMessage || copy.progress.completedWithXp}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
                      <span>
                        {remainingSeconds > 0
                          ? copy.progress.secondsRemaining(remainingSeconds)
                          : copy.progress.finishing}
                      </span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {copy.progress.timerHint(PROGRESS_SECONDS, XP_REWARD)}{' '}
                      {awardingXp && copy.progress.awarding}
                    </p>
                  </>
                )}
                {progressError && (
                  <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                    <p className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      {progressError}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 w-full border border-rose-400/50 bg-transparent text-rose-100 hover:bg-rose-500/20"
                      onClick={() => previewTerm && void registerCompletion(previewTerm.id)}
                      disabled={awardingXp}
                    >
                      {copy.buttons.tryAgain}
                    </Button>
                  </div>
                )}
              </div>
              {previewTerm.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {previewTerm.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-white/10 bg-white/10 text-slate-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Dialog open={sheetOpen} onOpenChange={(open) => (!open ? setSheetOpen(false) : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border border-white/10 bg-[#02131d] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#fdd87c]">
              {editingTerm ? copy.form.editTitle : copy.form.newTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-slate-400">{copy.form.slugLabel}</label>
                <Input
                  value={formState.slug}
                  onChange={(event) =>
                    handleFormChange('meta', 'slug', event.target.value)
                  }
                  placeholder="blockchain-basics"
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">{copy.form.tagsLabel}</label>
                <Input
                  value={formState.tags}
                  onChange={(event) =>
                    handleFormChange('meta', 'tags', event.target.value)
                  }
                  placeholder={copy.form.tagsPlaceholder}
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400">{copy.form.statusLabel}</label>
              <select
                value={formState.status}
                onChange={(event) =>
                  handleFormChange(
                    'meta',
                    'status',
                    event.target.value as GlossaryStatus,
                  )
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                <option value="draft">{copy.form.statusOptions.draft}</option>
                <option value="review">{copy.form.statusOptions.review}</option>
                <option value="published">{copy.form.statusOptions.published}</option>
              </select>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GlossaryLanguage)}>
              <TabsList className="bg-white/5">
                {LANGUAGES.map((lang) => (
                  <TabsTrigger key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LANGUAGES.map((lang) => (
                <TabsContent key={lang} value={lang} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <label className="text-xs uppercase text-slate-400">
                      {copy.form.termLabel} ({lang.toUpperCase()})
                    </label>
                    <Input
                      value={formState.term[lang]}
                      onChange={(event) =>
                        handleFormChange('term', lang, event.target.value)
                      }
                      className="border-white/10 bg-[#041926] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-400">
                      {copy.form.definitionLabel} ({lang.toUpperCase()})
                    </label>
                    <RichTextEditor
                      id={`definition-${lang}`}
                      value={formState.definition[lang]}
                      onChange={(value) =>
                        handleFormChange('definition', lang, value)
                      }
                      placeholder={`${copy.form.definitionLabel} (${lang.toUpperCase()})`}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-400">
                      {copy.form.exampleLabel} ({lang.toUpperCase()}) {copy.form.optionalTag}
                    </label>
                    <RichTextEditor
                      id={`example-${lang}`}
                      value={formState.example[lang]}
                      onChange={(value) =>
                        handleFormChange('example', lang, value)
                      }
                      placeholder={`${copy.form.exampleLabel} (${lang.toUpperCase()})`}
                      minRows={4}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {editingTerm ? (
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Trash2 className="h-4 w-4" />
                {copy.buttons.delete}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                {copy.buttons.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {copy.buttons.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
