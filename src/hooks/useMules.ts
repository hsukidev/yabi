import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Mule } from '../types';
import { validateBossSelection } from '../data/bossSelection';

const STORAGE_KEY = 'maplestory-mule-tracker';
const FALLBACK_KEY = 'maplestory-mule-tracker-fallback';

function validateMule(raw: unknown): Mule | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string') return null;
  if (typeof obj.name !== 'string') return null;
  if (typeof obj.level !== 'number') return null;
  if (typeof obj.muleClass !== 'string') return null;
  if (!Array.isArray(obj.selectedBosses)) return null;
  return {
    id: obj.id,
    name: obj.name,
    level: obj.level,
    muleClass: obj.muleClass,
    selectedBosses: validateBossSelection(obj.selectedBosses as string[]),
  };
}

export function useMules() {
  const saveMules = useCallback((mules: Mule[]): void => {
    const serialized = JSON.stringify(mules);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      try {
        sessionStorage.setItem(FALLBACK_KEY, serialized);
      } catch {
        // Both storages failed; data persists in React state only
      }
    }
  }, []);

  function loadMules(): Mule[] {
    try {
      let data = localStorage.getItem(STORAGE_KEY);
      if (data === null) {
        data = sessionStorage.getItem(FALLBACK_KEY);
      }
      if (data) {
        const parsed: unknown = JSON.parse(data);
        if (!Array.isArray(parsed)) {
          return [];
        }
        const validated = parsed.map(validateMule);
        const validMules = validated.filter((m): m is Mule => m !== null);
        return validMules;
      }
    } catch {
      // fall through
    }
    return [];
  }

  const [mules, setMules] = useState<Mule[]>(loadMules);

  useEffect(() => {
    saveMules(mules);
  }, [mules, saveMules]);

  const addMule = useCallback(() => {
    const newMule: Mule = {
      id: uuidv4(),
      name: '',
      level: 0,
      muleClass: '',
      selectedBosses: [],
    };
    setMules((prev) => [newMule, ...prev]);
    return newMule.id;
  }, []);

  const updateMule = useCallback(
    (id: string, updates: Partial<Omit<Mule, 'id'>>) => {
      setMules((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const merged = { ...m, ...updates };
          if (updates.selectedBosses) {
            merged.selectedBosses = validateBossSelection(
              updates.selectedBosses,
            );
          }
          return merged;
        }),
      );
    },
    [],
  );

  const deleteMule = useCallback((id: string) => {
    setMules((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const reorderMules = useCallback(
    (oldIndex: number, newIndex: number) => {
      setMules((prev) => {
        const result = Array.from(prev);
        const [removed] = result.splice(oldIndex, 1);
        result.splice(newIndex, 0, removed);
        return result;
      });
    },
    [],
  );

  return { mules, addMule, updateMule, deleteMule, reorderMules };
}