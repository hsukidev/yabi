import { type ReactElement } from 'react';
import { act, render as rtlRender, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from '@/context/ThemeProvider';
import { DensityProvider } from '@/context/DensityProvider';
import { DisplayProvider } from '@/context/DisplayProvider';
import { WorldProvider } from '@/context/WorldProvider';
import { routeTree } from '@/routeTree.gen';
import type { WorldId } from '@/data/worlds';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  defaultTheme?: 'dark' | 'light';
  defaultWorld?: WorldId | null;
  defaultDisplay?: 'cards' | 'list';
}

export function render(
  ui: ReactElement,
  { defaultTheme = 'dark', defaultWorld, defaultDisplay, ...options }: CustomRenderOptions = {},
) {
  // The DisplayProvider reads `localStorage['display']` at mount time, so the
  // simplest way to honor `defaultDisplay` from a test is to seed the storage
  // before the provider mounts. Tests that care about display state already
  // clear localStorage in beforeEach, so this won't leak across cases.
  if (defaultDisplay) {
    try {
      localStorage.setItem('display', defaultDisplay);
    } catch {
      // ignore; matches the provider's defensive try/catch around storage
    }
  }
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider defaultTheme={defaultTheme}>
        <DensityProvider>
          <DisplayProvider>
            <WorldProvider defaultWorld={defaultWorld}>{children}</WorldProvider>
          </DisplayProvider>
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
//
// Both load + mount run inside `act(async)` so the router's post-mount state
// machine (Transitioner, MatchImpl, etc.) flushes its scheduled updates
// before we return — otherwise those updates land outside any act() scope
// and produce noisy warnings, and (on flaky timing) a hung first test.
export async function renderApp({ initialPath = '/' }: { initialPath?: string } = {}) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  let result!: ReturnType<typeof rtlRender>;
  await act(async () => {
    await router.load();
    result = rtlRender(<RouterProvider router={router} />);
  });
  return result;
}

export { act, screen, fireEvent, waitFor, within } from '@testing-library/react';

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
