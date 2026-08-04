import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'bidzo-theme';

// Light mode is fully built (theme, persistence, Settings page) but held back
// while the light palette itself still needs polish across older components
// that use hardcoded colors instead of theme tokens. Flip this to true (and
// bring back the Settings entry point in Profile.jsx + the /settings route
// in App.jsx) to re-enable it later -- nothing else needs to change.
export const LIGHT_MODE_ENABLED = false;

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function effectiveOf(theme) {
  if (!LIGHT_MODE_ENABLED) return 'dark';
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
}

function applyEffective(effective) {
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (!LIGHT_MODE_ENABLED) return 'dark';
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    applyEffective(effectiveOf(theme));
    if (!LIGHT_MODE_ENABLED) return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Follow OS changes live while "system" is selected.
  useEffect(() => {
    if (!LIGHT_MODE_ENABLED || theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyEffective(effectiveOf('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!LIGHT_MODE_ENABLED) return;
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme: effectiveOf(theme) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
