import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';
import { ResetCountdown } from './ResetCountdown';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg, var(--background))',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="container mx-auto max-w-352 px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'var(--accent-raw, var(--accent))',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--bg, var(--background))',
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              M
            </div>
            <span
              style={{
                color: 'var(--text, var(--foreground))',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                fontSize: 15,
              }}
            >
              Mule
              <span style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}>.Income</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResetCountdown />
            <button
              onClick={toggleTheme}
              className="flex size-8  items-center justify-center rounded-md transition-colors cursor-pointer"
              style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
