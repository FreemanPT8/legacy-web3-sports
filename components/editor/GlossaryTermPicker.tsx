'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GlossaryLanguage, GlossaryTerm } from '@/types/glossary';
import { Loader2, Search } from 'lucide-react';

type Mode = 'select' | 'create';

const languages: GlossaryLanguage[] = ['pt', 'en', 'es'];

interface GlossaryTermPickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (slug: string, label?: string) => void;
  selection?: string;
}

const emptyTranslations = () =>
  languages.reduce<Record<GlossaryLanguage, string>>((acc, lang) => {
    acc[lang] = '';
    return acc;
  }, {} as Record<GlossaryLanguage, string>);

export function GlossaryTermPicker({
  open,
  onClose,
  onInsert,
  selection,
}: GlossaryTermPickerProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [termValues, setTermValues] = useState(emptyTranslations);
  const [definitionValues, setDefinitionValues] = useState(emptyTranslations);
  const [exampleValues, setExampleValues] = useState(emptyTranslations);

  const fetchTerms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/glossary?page=1&pageSize=200&status=all&language=pt`,
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Falha ao carregar glossário.');
      }
      setTerms(data.terms || []);
    } catch (err) {
      console.error('Failed to load glossary terms:', err);
      setError(
        err instanceof Error ? err.message : 'Falha ao carregar glossário.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTerms();
    } else {
      setMode('select');
      setSearch('');
      setTermValues(emptyTranslations);
      setDefinitionValues(emptyTranslations);
      setExampleValues(emptyTranslations);
      setError(null);
    }
  }, [open]);

  const filteredTerms = useMemo(() => {
    if (!search.trim()) return terms;
    const needle = search.toLowerCase();
    return terms.filter((term) => {
      return (
        term.slug.toLowerCase().includes(needle) ||
        term.term_pt?.toLowerCase().includes(needle) ||
        term.term_en?.toLowerCase().includes(needle) ||
        term.term_es?.toLowerCase().includes(needle)
      );
    });
  }, [terms, search]);

  const handleInsertTerm = (term: GlossaryTerm) => {
    const label =
      selection?.trim() ||
      term.term_pt ||
      term.term_en ||
      term.term_es ||
      term.slug;
    onInsert(term.slug, label);
    onClose();
  };

  const handleCreateTerm = async () => {
    if (creating) return;
    setError(null);

    for (const lang of languages) {
      if (!termValues[lang]?.trim() || !definitionValues[lang]?.trim()) {
        setError('Todos os campos de termo e definição são obrigatórios.');
        return;
      }
    }

    setCreating(true);
    try {
      const payload = {
        term: termValues,
        definition: definitionValues,
        example: exampleValues,
        status: 'published',
      };
      const res = await fetch('/api/glossary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.term) {
        throw new Error(data?.error || 'Falha ao criar termo.');
      }
      setTerms((prev) => [data.term as GlossaryTerm, ...prev]);
      onInsert(
        data.term.slug,
        selection?.trim() || data.term.term_pt || data.term.slug,
      );
      onClose();
    } catch (err) {
      console.error('Failed to create glossary term:', err);
      setError(err instanceof Error ? err.message : 'Falha ao criar termo.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Glossário Legacy</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={mode === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('select')}
            >
              Procurar termo
            </Button>
            <Button
              variant={mode === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('create')}
            >
              Novo termo
            </Button>
          </div>
          {selection && (
            <div className="text-xs text-muted-foreground">
              Texto seleccionado: <span className="font-semibold">{selection}</span>
            </div>
          )}
        </div>

        {mode === 'select' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar termo ou slug"
                className="pl-8"
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                A carregar termos...
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : filteredTerms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum termo encontrado. Experimenta outra pesquisa ou cria um novo termo.
              </p>
            ) : (
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {filteredTerms.map((term) => (
                  <div
                    key={term.id}
                    className="rounded-lg border border-white/10 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {term.term_pt || term.term_en || term.term_es || term.slug}
                        </p>
                        <p className="text-xs text-muted-foreground">/{term.slug}</p>
                      </div>
                      <Button size="sm" onClick={() => handleInsertTerm(term)}>
                        Inserir
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {term.definition_pt?.slice(0, 140) || 'Sem definição PT.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="pt">
              <TabsList>
                {languages.map((lang) => (
                  <TabsTrigger key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
              {languages.map((lang) => (
                <TabsContent
                  key={lang}
                  value={lang}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Termo ({lang.toUpperCase()})
                    </label>
                    <Input
                      value={termValues[lang]}
                      onChange={(event) =>
                        setTermValues((prev) => ({
                          ...prev,
                          [lang]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Definição ({lang.toUpperCase()})
                    </label>
                    <Textarea
                      rows={3}
                      value={definitionValues[lang]}
                      onChange={(event) =>
                        setDefinitionValues((prev) => ({
                          ...prev,
                          [lang]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Exemplo ({lang.toUpperCase()}) (opcional)
                    </label>
                    <Textarea
                      rows={2}
                      value={exampleValues[lang]}
                      onChange={(event) =>
                        setExampleValues((prev) => ({
                          ...prev,
                          [lang]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setMode('select')}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTerm} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar termo e inserir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
