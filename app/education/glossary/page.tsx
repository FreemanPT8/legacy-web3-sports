'use client';

import { useEffect, useMemo, useState } from 'react';
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
} from '@/types/glossary';
import { Loader2, Plus, RefreshCcw, Search, ShieldAlert, Trash2 } from 'lucide-react';

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
  const { user, loading: authLoading, getToken } = useAuth();
  const { language } = useLanguage();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    letter: 'all',
    search: '',
    language: 'pt' as GlossaryLanguage,
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

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const buildAuthHeaders = () => {
    const token = getToken?.();
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  useEffect(() => {
    if (!user) return;
    const fetchTerms = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pagination.page));
        params.set('pageSize', '500');
        params.set('language', filters.language);
        if (filters.search.trim()) {
          params.set('search', filters.search.trim());
        }
        if (filters.letter !== 'all') {
          params.set('letter', filters.letter);
        }
        if (isAdmin && filters.status) {
          params.set('status', filters.status);
        }
        const res = await fetch(`/api/glossary?${params.toString()}`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Falhou o carregamento.');
        }
        setTerms(data.terms || []);
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
    filters.language,
    filters.search,
    filters.letter,
    filters.status,
    isAdmin,
    refreshKey,
  ]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    terms.forEach((term) => {
      const displayValue =
        term[`term_${filters.language}` as const] ||
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
          a[`term_${filters.language}` as const] ||
          a.term_pt ||
          a.term_en ||
          a.term_es ||
          '';
        const textB =
          b[`term_${filters.language}` as const] ||
          b.term_pt ||
          b.term_en ||
          b.term_es ||
          '';
        return textA.localeCompare(textB, undefined, { sensitivity: 'base' });
      }),
    })).filter((group) => group.items.length > 0);
  }, [terms, filters.language]);

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
    const payload = {
      slug: formState.slug || undefined,
      term: formState.term,
      definition: formState.definition,
      example: formState.example,
      tags: formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: formState.status,
    };
    try {
      const res = await fetch(
        editingTerm ? `/api/glossary/${editingTerm.id}` : '/api/glossary',
        {
          method: editingTerm ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildAuthHeaders(),
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
      const res = await fetch(`/api/glossary/${editingTerm.id}`, {
        method: 'DELETE',
        headers: {
          ...buildAuthHeaders(),
        },
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
    const key = `definition_${filters.language}` as keyof GlossaryTerm;
    return (
      (term[key] as string | undefined) ||
      term.definition_pt ||
      term.definition_en ||
      term.definition_es ||
      'Sem definição disponível.'
    );
  };

  const renderTermTitle = (term: GlossaryTerm) => {
    const key = `term_${filters.language}` as keyof GlossaryTerm;
    return (
      (term[key] as string | undefined) ||
      term.term_pt ||
      term.term_en ||
      term.term_es ||
      term.slug
    );
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
              <div className="flex flex-wrap gap-3">
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'border-white/10 bg-white/5 text-white hover:bg-white/10',
                      filters.language === 'pt' && 'border-[#fdd87c] text-[#fdd87c]',
                    )}
                    onClick={() => setFilters((prev) => ({ ...prev, language: 'pt' }))}
                  >
                    PT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'border-white/10 bg-white/5 text-white hover:bg-white/10',
                      filters.language === 'en' && 'border-[#fdd87c] text-[#fdd87c]',
                    )}
                    onClick={() => setFilters((prev) => ({ ...prev, language: 'en' }))}
                  >
                    EN
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'border-white/10 bg-white/5 text-white hover:bg-white/10',
                      filters.language === 'es' && 'border-[#fdd87c] text-[#fdd87c]',
                    )}
                    onClick={() => setFilters((prev) => ({ ...prev, language: 'es' }))}
                  >
                    ES
                  </Button>
                </div>
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
                            <CardTitle className="text-xl text-white">
                              {renderTermTitle(term)}
                            </CardTitle>
                            <CardDescription className="text-slate-300">
                              /{term.slug}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isAdmin && <StatusBadge status={term.status} />}
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
                          <p className="text-sm text-slate-200">
                            {renderDefinition(term)}
                          </p>
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
                          <Tabs defaultValue={filters.language} className="pt-2">
                            <TabsList className="bg-white/5">
                              {LANGUAGES.map((lang) => (
                                <TabsTrigger key={lang} value={lang}>
                                  {lang.toUpperCase()}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                            {LANGUAGES.map((lang) => {
                              const defKey = `definition_${lang}` as keyof GlossaryTerm;
                              const exKey = `example_${lang}` as keyof GlossaryTerm;
                              return (
                                <TabsContent
                                  key={lang}
                                  value={lang}
                                  className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3"
                                >
                                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                                    Definição
                                  </p>
                                  <p className="text-sm text-white">
                                    {(term[defKey] as string) ||
                                      'Sem definição nesta língua.'}
                                  </p>
                                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                                    Exemplo
                                  </p>
                                  <p className="text-sm text-slate-200">
                                    {(term[exKey] as string) ||
                                      'Sem exemplo nesta língua.'}
                                  </p>
                                </TabsContent>
                              );
                            })}
                          </Tabs>
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
