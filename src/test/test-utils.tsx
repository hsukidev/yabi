import { type ReactElement } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from '@/context/ThemeProvider';
import { DensityProvider } from '@/context/DensityProvider';
import { WorldProvider } from '@/context/WorldProvider';
import { IncomeProvider } from '@/modules/income';
import { routeTree } from '@/routeTree.gen';
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

// Full-app render: mounts the real route tree (which carries its own provider
// shell via `__root.tsx`) at `initialPath`. The router is preloaded
// (`router.load()`) before mount so the matched route renders synchronously
// — without that, `<RouterProvider>` paints an empty pending state and tests
// that query the DOM right after render see nothing.
export async function renderApp({ initialPath = '/' }: { initialPath?: string } = {}) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  await router.load();
  return rtlRender(<RouterProvider router={router} />);
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
