import type { BossTier, Mule } from '../types';
import { getBossById } from '../data/bosses';
import { MuleBossSlate } from '../data/muleBossSlate';

/**
 * Pure migration module for the **Persisted Root**. Owns the **Schema
 * Lineage** (v1 → v4), **Load Mode** dispatch, `upgradeV2Key` cadence
 * resolution, `validateMule`, and the **Active Default**. No React, no
 * `window`, no `localStorage` — driven entirely by the raw string (or
 * `null`) read out of a `StoragePort`. Corrupt JSON or `null` input
 * returns `[]` (a **Wipe**).
 */

export const CURRENT_SCHEMA_VERSION = 4;

/**
 * Which migration path a given **Persisted Root** follows:
 *
 * - `wipe` — pre-1B bare array, unknown `schemaVersion`, or the payload is
 *   tagged with a recognised version but the parser chose to fail-safe.
 *   Legacy selection-key entries have their `selectedBosses` (and
 *   `partySizes`) cleared to `[]` / `{}`.
 * - `upgradeV2` — `schemaVersion === 2`. Each `<uuid>:<tier>` key is
 *   resolved against the boss catalog and rewritten as
 *   `<uuid>:<tier>:<cadence>`. Unresolvable entries drop silently.
 * - `asIs` — `schemaVersion === 3 || 4`. Keys are already in the native
 *   shape; `validateMule` still routes them through
 *   `MuleBossSlate.from(...)` to enforce the **Selection Invariant** and
 *   prune unknown / Legacy Slate Keys.
 */
export type LoadMode = 'wipe' | 'upgradeV2' | 'asIs';

const LEGACY_ID_PREFIX = /^(extreme|hard|chaos|normal|easy)-/;

/** A stored id looks legacy if it matches `<tier>-<family>` or lacks a colon. */
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
 * Upgrade a single v2 `<uuid>:<tier>` **Slate Key** to the v3
 * `<uuid>:<tier>:<cadence>` shape by resolving the **Boss Cadence** from
 * the catalog. Returns `null` for unresolvable entries (unknown boss or
 * tier no longer offered); the migrator drops those silently.
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
  // v3/v4 selection-key shape: `<uuid>:<tier>:<cadence>`. Built inline so
  // this module doesn't reach into the slate module's private helpers —
  // the key flows through `MuleBossSlate.from` immediately afterwards,
  // which enforces the Selection Invariant.
  return `${bossId}:${tier}:${diff.cadence}`;
}

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
    selectedBosses = [...MuleBossSlate.from(upgraded).keys];
  } else {
    selectedBosses = [...MuleBossSlate.from(rawSelected).keys];
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
 * Parse a persisted payload into `{ mules, mode }`. Returns `null` when
 * the JSON is unusable (parse error or not a recognized shape). Mode
 * controls downstream migration:
 *
 *  - `wipe` — pre-1B array shape / unknown `schemaVersion` → drop legacy
 *    selections.
 *  - `upgradeV2` — `schemaVersion === 2` → rewrite `<uuid>:<tier>` keys
 *    to `<uuid>:<tier>:<cadence>` in place.
 *  - `asIs` — `schemaVersion === 3 || 4` → keys already in native shape;
 *    v3 gets the **Active Default** applied inside `validateMule`.
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

/**
 * Pure entry point: turn a raw persisted string (or `null`) into a
 * validated `Mule[]`. Any failure — `null` input, corrupt JSON,
 * unrecognised shape — collapses to `[]` (a **Wipe**). Every caller
 * reaches the migration pipeline through this function so the
 * **Schema Lineage** is owned in one place.
 */
export function muleMigrate(raw: string | null): Mule[] {
  if (raw === null) return [];
  const payload = parsePayload(raw);
  if (!payload) return [];
  const validated = payload.mules.map((m) => validateMule(m, payload.mode));
  return validated.filter((m): m is Mule => m !== null);
}
