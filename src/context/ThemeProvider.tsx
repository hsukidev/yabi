import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPreference(): Theme | null {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  } catch {
    // matchMedia not available
  }
  return null;
}

function getInitialTheme(fallback: Theme): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return getSystemPreference() ?? fallback;
}

let swapTimer: number | undefined;

function applyTheme(theme: Theme) {
  // Drive a unified 220ms ease-out cross-fade across every element during the
  // swap via data-theme-swap (see index.css). The attribute stays set through
  // the transition window so the browser can animate between the old and new
  // token values; without the window, the class change would snap instantly.
  const root = document.documentElement;
  if (swapTimer !== undefined) window.clearTimeout(swapTimer);
  root.setAttribute('data-theme-swap', '');
  if (theme === 'dark') {
    root.classList.add('dark');
    document.body.classList.remove('light');
  } else {
    root.classList.remove('dark');
    document.body.classList.add('light');
  }
  void root.offsetHeight;
  swapTimer = window.setTimeout(() => {
    root.removeAttribute('data-theme-swap');
    swapTimer = undefined;
  }, 240);
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme(defaultTheme));

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = setThemeState;

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
