import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'localfix-theme';

// Resolve the effective (light/dark) theme from a stored preference that may be
// 'system'. When 'system', we follow the OS color-scheme preference.
const resolveTheme = (stored) => {
  if (!stored) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (stored === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return stored;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored || 'system';
  });

  // `resolvedTheme` is always 'light' | 'dark' — what the UI actually applies.
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(localStorage.getItem(THEME_STORAGE_KEY)));

  useEffect(() => {
    const next = resolveTheme(theme);
    setResolvedTheme(next);
    const root = document.documentElement;
    if (next === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Keep the applied theme in sync if the OS preference changes while on 'system'.
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const next = e.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      const root = document.documentElement;
      if (next === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
