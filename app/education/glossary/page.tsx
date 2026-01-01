'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type {
  GlossaryLanguage,
  GlossaryStatus,
  GlossaryTerm,
  GlossaryTermCompletion,
} from '@/types/glossary';
import {
  AlertCircle,
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

  const registerCompletion = useCallback(
    async (termId: string) => {
      const token = getToken?.();
      if (!termId || !token) {
        setProgressError('Sessão expirada. Volta a iniciar sessão.');
        return;
      }

      setAwardingXp(true);
      setProgressError(null);

      try {
        const res = await fetch(`/api/glossary/${termId}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Não foi possível registar o XP.');
        }

        if (!data?.alreadyCompleted) {
          persistUserXP(data?.newTotal);
          setProgressMessage('2 XP registados!');
        } else {
          setProgressMessage('Leitura já registada.');
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
          err instanceof Error
            ? err.message
            : 'Não foi possível registar o XP. Tenta novamente.',
        );
      } finally {
        setAwardingXp(false);
      }
    },
    [getToken, persistUserXP],
  );

  const activeLanguage: GlossaryLanguage = useMemo(() => {
    if (LANGUAGES.includes(language as GlossaryLanguage)) {
      return language as GlossaryLanguage;
    }
    return 'pt';
  }, [language]);

  useEffect(() => {
    if (!user) return;
    const fetchTerms = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pagination.page));
        params.set('pageSize', '500');
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
          headers,
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Falhou o carregamento.');
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
          setPagination(data.pagination);
        } else {
          setPagination((prev) => ({
            ...prev,
            total: data.terms?.length ?? 0,
            totalPages: 1,
          }));
        }
      } catch (err) {
        console.error('Glossary load error:', err);
        setError(
          err instanceof Error ? err.message : 'Erro a carregar termos.',
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
        setError(
          `Preenche termo e definição em ${lang.toUpperCase()} antes de guardar.`,
        );
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
          headers: {
            'Content-Type': 'application/json',
            ...(authHeaders || {}),
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Erro ao guardar termo.');
      }
      setSheetOpen(false);
      setFormState(defaultFormState());
      setEditingTerm(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Glossary save error:', err);
      setError(
        err instanceof Error ? err.message : 'Falha ao guardar termo.',
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
        headers: authHeaders ? { ...authHeaders } : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Falha ao eliminar termo.');
      }
      setSheetOpen(false);
      setTerms((prev) => prev.filter((item) => item.id !== editingTerm.id));
      setEditingTerm(null);
      setFormState(defaultFormState());
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Glossary delete error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao eliminar termo.');
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
      'Sem definição disponível.'
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
        {status}
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
      setProgressMessage('Este termo está em rascunho. XP indisponível.');
      return;
    }

    if (activeTermCompletion) {
      setProgressSeconds(PROGRESS_SECONDS);
      setProgressMessage((prev) => prev ?? 'Leitura concluída.');
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
    previewOpen,
    previewTerm,
    previewTerm?.id,
    previewTerm?.status,
    user,
    user?.id,
    activeTermCompletion,
    registerCompletion,
  ]);

  const previewExample = previewTerm ? renderExample(previewTerm) : '';
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
              Academia Web3
            </p>
            <h1 className="text-4xl font-semibold text-[#fdd87c] md:text-5xl">
              Glossário Legacy
            </h1>
            <p className="max-w-3xl text-lg text-slate-100">
              Consulta as definições chave da Academia Web3, em três línguas, e reforça os teus conhecimentos durante as aulas ou leitura de artigos.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-slate-200">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                Exclusivo para membros registados
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  className="rounded-full border border-white/20 bg-[#05212b] text-white hover:bg-[#073247]"
                  onClick={handleOpenCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo conceito
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
                  placeholder="Procurar por termo ou definição"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
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
                  onClick={() => setFilters((prev) => ({ ...prev, letter: 'all' }))}
                >
                  Todos
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
                    onClick={() => setFilters((prev) => ({ ...prev, letter }))}
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
                    Conceitos
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
                Termos curados pela equipa Legacy com suporte integral PT/EN/ES.
              </p>
              {isAdmin && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Estado:</span>
                  <select
                    className="rounded-full border border-white/20 bg-transparent px-3 py-1 text-white"
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: event.target.value as GlossaryStatus | 'all',
                      }))
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="published">Publicados</option>
                    <option value="draft">Rascunhos</option>
                    <option value="review">Em revisão</option>
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
              A carregar termos...
            </div>
          ) : groupedTerms.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
              Nenhum termo encontrado com os filtros atuais.
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
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.items.map((term) => (
                      <Card
                        key={term.id}
                        className="border border-white/10 bg-[#02131d] text-white transition hover:border-white/30"
                      >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0">
                          <div>
                            <button
                              type="button"
                              onClick={() => handlePreviewOpen(term)}
                              className="text-left text-xl font-semibold text-white transition hover:text-[#fdd87c]"
                            >
                              {renderTermTitle(term)}
                            </button>
                            <CardDescription className="text-slate-300">
                              /{term.slug}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isAdmin && <StatusBadge status={term.status} />}
                            {completedTerms[term.id] && (
                              <Badge className="flex items-center gap-1 border border-emerald-400/40 bg-emerald-400/10 text-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                XP registado
                              </Badge>
                            )}
                            {isAdmin && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenEdit(term)}
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                            {term.tags?.length ? (
                              term.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="border-white/10 bg-white/5 text-slate-200"
                                >
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-500">Sem tags</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            className="rounded-full border-white/20 text-white hover:border-[#fdd87c] hover:text-[#fdd87c]"
                            onClick={() => handlePreviewOpen(term)}
                          >
                            Ver definição
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
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
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">
              Glossário Legacy
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#fdd87c]">
              {renderTermTitle(previewTerm)}
            </h2>
            <p className="text-sm text-slate-300">/{previewTerm.slug}</p>

            <div className="mt-6 space-y-4">
              <p className="whitespace-pre-line text-lg leading-relaxed text-white">
                {renderDefinition(previewTerm)}
              </p>
              {previewExample && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                    Exemplo
                  </p>
                  <p className="whitespace-pre-line text-slate-200">
                    {previewExample}
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-white/10 bg-[#031723]/70 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-cyan-300">
                  <span className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Progress Reading
                  </span>
                  <span className="flex items-center gap-1 text-[#fdd87c]">
                    <Award className="h-4 w-4" />
                    +2 XP
                  </span>
                </div>
                {previewTerm.status !== 'published' ? (
                  <p className="mt-3 text-sm text-amber-200">
                    {progressMessage || 'Este termo está em rascunho. XP indisponível.'}
                  </p>
                ) : activeTermCompletion ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    {progressMessage || 'Leitura concluída e XP registado.'}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
                      <span>
                        {remainingSeconds > 0
                          ? `Faltam ${remainingSeconds}s`
                          : 'A concluir...'}
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
                      Mantém o conceito aberto por 30 segundos para registar os 2 XP{' '}
                      {awardingXp && '• a atribuir XP'}
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
                      Tentar novamente
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
              {editingTerm ? 'Editar conceito' : 'Novo conceito'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-slate-400">Slug</label>
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
                <label className="text-xs uppercase text-slate-400">Tags (separadas por vírgulas)</label>
                <Input
                  value={formState.tags}
                  onChange={(event) =>
                    handleFormChange('meta', 'tags', event.target.value)
                  }
                  placeholder="web3, tokenomics"
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase text-slate-400">Estado</label>
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
                <option value="draft">Rascunho</option>
                <option value="review">Em revisão</option>
                <option value="published">Publicado</option>
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
                      Termo ({lang.toUpperCase()})
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
                      Definição ({lang.toUpperCase()})
                    </label>
                    <Textarea
                      value={formState.definition[lang]}
                      rows={4}
                      onChange={(event) =>
                        handleFormChange('definition', lang, event.target.value)
                      }
                      className="border-white/10 bg-[#041926] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-400">
                      Exemplo ({lang.toUpperCase()}) (opcional)
                    </label>
                    <Textarea
                      value={formState.example[lang]}
                      rows={3}
                      onChange={(event) =>
                        handleFormChange('example', lang, event.target.value)
                      }
                      className="border-white/10 bg-[#041926] text-white"
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
                Eliminar
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar termo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
