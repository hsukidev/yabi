import { type ReactElement } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@/context/ThemeProvider';
import { DensityProvider } from '@/context/DensityProvider';
import { WorldProvider } from '@/context/WorldProvider';
import { IncomeProvider } from '@/modules/income';
import type { WorldId } from '@/data/worlds';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  defaultTheme?: 'dark' | 'light';
  defaultAbbreviated?: boolean;
  defaultWorld?: WorldId | null;
}

export function render(
  ui: ReactElement,
  {
    defaultTheme = 'dark',
    defaultAbbreviated = true,
    defaultWorld,
    ...options
  }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider defaultTheme={defaultTheme}>
        <DensityProvider>
          <WorldProvider defaultWorld={defaultWorld}>
            <IncomeProvider defaultAbbreviated={defaultAbbreviated}>{children}</IncomeProvider>
          </WorldProvider>
        </DensityProvider>
      </ThemeProvider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export { screen, fireEvent, waitFor, within, act } from '@testing-library/react';

// Test helper: install a window.matchMedia mock whose `matches` is decided by
// `predicate`. Pair with `restoreMatchMedia()` in afterEach to drop back to
// jsdom's default (matchMedia missing → useMatchMedia returns false).
export function mockMatchMedia(predicate: (query: string) => boolean) {
  const mock = vi.fn().mockImplementation((query: string) => ({
    matches: predicate(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: mock,
  });
}

export function restoreMatchMedia() {
  // @ts-expect-error - drop back to jsdom default
  delete window.matchMedia;
}
