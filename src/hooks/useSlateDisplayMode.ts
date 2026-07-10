import { useCallback, useEffect, useState } from 'react';

/**
 * The **Slate Display Mode** — how the Drawer renders the open Mule's Boss
 * Slate. Exactly one of the Boss Matrix (`'matrix'`) or the Boss Card View
 * (`'cards'`).
 */
export type SlateDisplayMode = 'matrix' | 'cards';

/** localStorage key holding the persisted, user-global Slate Display Mode. */
const STORAGE_KEY = 'slate-display-mode';

function getInitialMode(): SlateDisplayMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'matrix' || stored === 'cards') return stored;
  } catch {
    // localStorage can throw in private-mode / sandboxed iframes — fall through.
  }
  return 'cards';
}

/**
 * Owns the **Slate Display Mode** — persisted per user in localStorage and
 * global across Mules (a single key, not keyed by mule), defaulting to the
 * Boss Card View for users without a stored preference. Mirrors the Roster
 * Display Mode persistence pattern (`DisplayProvider`), scoped to a hook
 * because only the Drawer reads it.
 *
 * `setMode` is `useCallback`-stable so passing it through the memoized
 * `MatrixToolbar` never busts its memo barrier — see CLAUDE.md
 * (drawer keystroke perf).
 */
export function useSlateDisplayMode(): {
  mode: SlateDisplayMode;
  setMode: (mode: SlateDisplayMode) => void;
} {
  const [mode, setModeState] = useState<SlateDisplayMode>(getInitialMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore write failures (private mode / sandboxed iframes).
    }
  }, [mode]);

  const setMode = useCallback((next: SlateDisplayMode) => setModeState(next), []);

  return { mode, setMode };
}
