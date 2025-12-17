'use client';

import { useState } from 'react';

type TranslationResult = Record<string, string>;

export function useAutoTranslate() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = async (
    text: string,
    sourceLang: string,
    targetLangs: string[],
  ): Promise<TranslationResult> => {
    if (!text?.trim() || targetLangs.length === 0) {
      return {};
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLangs,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Translation failed');
      }

      return (data.translations || {}) as TranslationResult;
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    translate,
    isTranslating,
  };
}
