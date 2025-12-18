'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Language } from '@/lib/i18n';
import type { LanguageMeta } from '@/lib/language';
import { LANGUAGE_META_MAP } from '@/lib/language';

type TranslationContext = 'blog' | 'lesson';

interface TranslationFallbackDialogProps {
  open: boolean;
  context: TranslationContext;
  currentLanguage: Language;
  availableLanguages: LanguageMeta[];
  onSelectLanguage: (language: Language) => void;
  onBack: () => void;
  onClose: () => void;
}

const CONTEXT_COPY: Record<
  TranslationContext,
  { title: string; description: string; primary: string }
> = {
  blog: {
    title: 'Tradução indisponível',
    description:
      'Este artigo ainda não foi traduzido para a língua selecionada. Podes continuá-lo noutra língua já disponível.',
    primary: 'Voltar ao blog',
  },
  lesson: {
    title: 'Tradução indisponível',
    description:
      'Esta lição ainda não foi traduzida para a língua selecionada. Escolhe outra tradução disponível ou volta para os cursos.',
    primary: 'Voltar aos cursos',
  },
};

export function TranslationFallbackDialog({
  open,
  context,
  currentLanguage,
  availableLanguages,
  onSelectLanguage,
  onBack,
  onClose,
}: TranslationFallbackDialogProps) {
  const copy = CONTEXT_COPY[context];
  const currentLanguageName =
    LANGUAGE_META_MAP[
      (currentLanguage as keyof typeof LANGUAGE_META_MAP) ?? 'pt'
    ]?.name || currentLanguage.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="bg-[#000c12] border border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-300">
            O conteúdo não está disponível em{' '}
            <span className="font-semibold text-white">{currentLanguageName}</span>.
            {availableLanguages.length > 0
              ? ' Escolhe uma das línguas já traduzidas ou volta atrás.'
              : ''}
          </DialogDescription>
        </DialogHeader>

        {availableLanguages.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-300">
              Disponível nestas línguas:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableLanguages.map((lang) => (
                <Button
                  key={lang.code}
                  variant="outline"
                  className="border-white/20 bg-[#05212b] text-white hover:border-cyan-300 hover:text-cyan-200"
                  onClick={() => onSelectLanguage(lang.code as Language)}
                >
                  <span aria-hidden className="mr-2 text-lg leading-none">
                    {lang.flag}
                  </span>
                  {lang.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white"
            onClick={onBack}
          >
            {copy.primary}
          </Button>
          <Button
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={onClose}
          >
            Continuar nesta língua
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
