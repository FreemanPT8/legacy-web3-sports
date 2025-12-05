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

const THEME_STORAGE_KEY = 'legacy-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  const applyThemeToDocument = useCallback((next: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (next === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Carregar tema inicial (localStorage ou preferência do sistema)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(
        THEME_STORAGE_KEY,
      ) as Theme | null;

      let initialTheme: Theme = 'light';

      if (stored === 'light' || stored === 'dark') {
        initialTheme = stored;
      } else {
        const prefersDark = window.matchMedia?.(
          '(prefers-color-scheme: dark)',
        ).matches;
        initialTheme = prefersDark ? 'dark' : 'light';
      }

      setThemeState(initialTheme);
      applyThemeToDocument(initialTheme);
    } catch (error) {
      // Se algo falhar, fica em light
      setThemeState('light');
      applyThemeToDocument('light');
    }
  }, [applyThemeToDocument]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
      applyThemeToDocument(next);
    },
    [applyThemeToDocument],
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
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
