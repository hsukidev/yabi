import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { findWorld, isWorldId, type World, type WorldId } from '@/data/worlds';

interface WorldContextValue {
  world: World | null;
  setWorld: (id: WorldId) => void;
}

const WorldContext = createContext<WorldContextValue | undefined>(undefined);

const STORAGE_KEY = 'world';

function readStoredWorldId(): WorldId | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isWorldId(stored)) return stored;
  } catch {
    // localStorage can throw in private-mode / sandboxed iframes — fall through.
  }
  return null;
}

interface WorldProviderProps {
  children: ReactNode;
  /**
   * Test-only override. When supplied, skips the localStorage read and seeds
   * the provider with this value (including `null` for an explicit "no
   * world" state). Matches `ThemeProvider`'s `defaultTheme` pattern.
   */
  defaultWorld?: WorldId | null;
}

export function WorldProvider({ children, defaultWorld }: WorldProviderProps) {
  const [worldId, setWorldId] = useState<WorldId | null>(() => {
    if (defaultWorld !== undefined) return defaultWorld;
    return readStoredWorldId();
  });

  useEffect(() => {
    try {
      if (worldId === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, worldId);
      }
    } catch {
      // localStorage can throw in private-mode / sandboxed iframes — ignore.
    }
  }, [worldId]);

  const setWorld = (id: WorldId) => setWorldId(id);

  return (
    <WorldContext.Provider value={{ world: findWorld(worldId), setWorld }}>
      {children}
    </WorldContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorld() {
  const context = useContext(WorldContext);
  if (!context) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return context;
}
