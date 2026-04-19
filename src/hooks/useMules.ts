import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import type { BossTier, Mule } from '../types';
import { getBossById } from '../data/bosses';
import { makeKey, validateBossSelection } from '../data/bossSelection';

const STORAGE_KEY = 'maplestory-mule-tracker';
const FALLBACK_KEY = 'maplestory-mule-tracker-fallback';
const CURRENT_SCHEMA_VERSION = 4;

const LEGACY_ID_PREFIX = /^(extreme|hard|chaos|normal|easy)-/;

/** A stored id looks legacy if it matches <tier>-<family> or lacks a colon entirely. */
function isLegacyId(id: string): boolean {
  return LEGACY_ID_PREFIX.test(id) || !id.includes(':');
}

function readPartySizes(raw: unknown): Record<string, number> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, number> = {};
  for (const [family, n] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof n === 'number' && Number.isFinite(n)) out[family] = n;
  }
  return out;
}

/**
 * Upgrade a single v2 `<uuid>:<tier>` selection key to the v3
 * `<uuid>:<tier>:<cadence>` shape by resolving cadence from the boss data.
 * Returns null for unresolvable entries (unknown boss or tier no longer
 * offered) — the loader drops those silently.
 */
function upgradeV2Key(key: string): string | null {
  const colon = key.lastIndexOf(':');
  if (colon < 0) return null;
  const bossId = key.slice(0, colon);
  const tier = key.slice(colon + 1) as BossTier;
  const boss = getBossById(bossId);
  if (!boss) return null;
  const diff = boss.difficulty.find((d) => d.tier === tier);
  if (!diff) return null;
  return makeKey(bossId, tier, diff.cadence);
}

type LoadMode = 'wipe' | 'upgradeV2' | 'asIs';

function validateMule(raw: unknown, mode: LoadMode): Mule | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string') return null;
  if (typeof obj.name !== 'string') return null;
  if (typeof obj.level !== 'number') return null;
  if (typeof obj.muleClass !== 'string') return null;
  if (!Array.isArray(obj.selectedBosses)) return null;

  const rawSelected = obj.selectedBosses as string[];
  const wipe = mode === 'wipe' && rawSelected.some(isLegacyId);

  let selectedBosses: string[];
  if (wipe) {
    selectedBosses = [];
  } else if (mode === 'upgradeV2') {
    // In-place upgrade of v2 `<uuid>:<tier>` keys. Unresolvable entries drop.
    const upgraded: string[] = [];
    for (const key of rawSelected) {
      const next = upgradeV2Key(key);
      if (next !== null) upgraded.push(next);
    }
    selectedBosses = validateBossSelection(upgraded);
  } else {
    selectedBosses = validateBossSelection(rawSelected);
  }

  return {
    id: obj.id,
    name: obj.name,
    level: obj.level,
    muleClass: obj.muleClass,
    selectedBosses,
    partySizes: wipe ? {} : readPartySizes(obj.partySizes),
    // `active` lands in schemaVersion 4. Absent or non-boolean → default to
    // `true` so pre-v4 payloads (and new mules added this slice) behave
    // identically to the current app.
    active: typeof obj.active === 'boolean' ? obj.active : true,
  };
}

/** The persisted root shape after slice 1B. */
interface PersistedRoot {
  schemaVersion: number;
  mules: Mule[];
}

/**
 * Parse a persisted payload into { mules, mode }. Mode controls migration:
 *  - 'wipe': pre-1B array shape / unknown `schemaVersion` → drop legacy selections.
 *  - 'upgradeV2': `schemaVersion === 2` → upgrade `<uuid>:<tier>` keys to
 *    `<uuid>:<tier>:<cadence>` in place (slice 2, v2 → v3).
 *  - 'asIs': `schemaVersion === 3` or `4` → keys already in the current shape.
 *    v3 payloads just need `active` defaulted in `validateMule`; v4 already
 *    carries it. Both are non-destructive.
 */
function parsePayload(raw: string): { mules: unknown[]; mode: LoadMode } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Pre-1B shape — root is bare array; always migrate.
      return { mules: parsed, mode: 'wipe' };
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const root = parsed as Partial<PersistedRoot>;
      if (Array.isArray(root.mules)) {
        const mode: LoadMode =
          root.schemaVersion === 4 || root.schemaVersion === 3
            ? 'asIs'
            : root.schemaVersion === 2
              ? 'upgradeV2'
              : 'wipe';
        return { mules: root.mules, mode };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function useMules() {
  const saveMules = useCallback((mules: Mule[]): void => {
    const root: PersistedRoot = { schemaVersion: CURRENT_SCHEMA_VERSION, mules };
    const serialized = JSON.stringify(root);
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
      if (data === null) return [];
      const payload = parsePayload(data);
      if (!payload) return [];
      const validated = payload.mules.map((m) => validateMule(m, payload.mode));
      return validated.filter((m): m is Mule => m !== null);
    } catch {
      return [];
    }
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
      partySizes: {},
      // Slice 3: new mules land inactive so brand-new cards match the design's
      // dim empty-slot treatment. The user flips the Active Toggle in the
      // drawer to opt in to KPI + weekly-income contribution.
      active: false,
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
            merged.selectedBosses = validateBossSelection(updates.selectedBosses);
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

  const reorderMules = useCallback((oldIndex: number, newIndex: number) => {
    setMules((prev) => arrayMove(prev, oldIndex, newIndex));
  }, []);

  return { mules, addMule, updateMule, deleteMule, reorderMules };
}
