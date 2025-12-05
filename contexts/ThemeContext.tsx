'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, internalSetTheme] = useState<Theme>('dark');

  /**
   * Aplica/remover a classe .dark no <html>
   */
  const applyThemeToDocument = useCallback((nextTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  /**
   * Na montagem:
   * - tenta ler o tema do localStorage
   * - se não existir, força 'dark'
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        internalSetTheme(stored);
        applyThemeToDocument(stored);
        return;
      }
    } catch {
      // ignora erros de acesso ao localStorage
    }

    internalSetTheme('dark');
    applyThemeToDocument('dark');
  }, [applyThemeToDocument]);

  /**
   * Setter exposto no contexto (recebe só 'light' | 'dark')
   */
  const setTheme = useCallback(
    (next: Theme) => {
      internalSetTheme(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', next);
      }
      applyThemeToDocument(next);
    },
    [applyThemeToDocument],
  );

  /**
   * Toggle clássico (aqui podemos usar a função prev => ...)
   * sem chocar com o tipo exposto no contexto.
   */
  const toggleTheme = useCallback(() => {
    internalSetTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', next);
      }
      applyThemeToDocument(next);
      return next;
    });
  }, [applyThemeToDocument]);

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
