import { useCallback, useState } from 'react';
import { releases } from '../data/changelog';
import { STORAGE_KEY as MULE_STORAGE_KEY } from '../persistence/muleStorage';

export const SEEN_KEY = 'lastSeenChangelog';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, sandboxed iframe) — banner state
    // remains in React only; the catch-up will retry on next mount.
  }
}

export interface ChangelogNotification {
  visible: boolean;
  markSeen: () => void;
}

export function useChangelogNotification(): ChangelogNotification {
  const latest = releases[0]?.version ?? null;

  const [lastSeen, setLastSeen] = useState<string | null>(() => {
    const stored = readStored(SEEN_KEY);
    if (stored !== null) return stored;
    if (latest === null) return null;
    const isPreExisting = readStored(MULE_STORAGE_KEY) !== null;
    if (isPreExisting) return null;
    writeStored(SEEN_KEY, latest);
    return latest;
  });

  const visible = latest !== null && lastSeen !== latest;

  const markSeen = useCallback(() => {
    if (latest === null) return;
    setLastSeen((prev) => {
      if (prev === latest) return prev;
      writeStored(SEEN_KEY, latest);
      return latest;
    });
  }, [latest]);

  return { visible, markSeen };
}
