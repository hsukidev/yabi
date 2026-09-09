/**
 * World data module — the single source of truth for the World options the
 * header World Select offers.
 *
 * MapleStory GMS partitions worlds into two World Groups: Heroic (Kronos,
 * Hyperion, Solis) and Interactive (Scania, Bera, Luna).
 *
 * See issue #194 §Approach for the locked shape.
 */

import type { Mule } from '../types';

export type WorldGroup = 'Heroic' | 'Interactive';
export type Region = 'NA' | 'EU';

export type WorldId =
  | 'heroic-kronos'
  | 'heroic-hyperion'
  | 'heroic-solis'
  | 'interactive-scania'
  | 'interactive-bera'
  | 'interactive-luna';

export interface World {
  id: WorldId;
  label: string;
  group: WorldGroup;
  region: Region;
}

export const WORLDS: readonly World[] = [
  { id: 'heroic-kronos', label: 'Kronos', group: 'Heroic', region: 'NA' },
  { id: 'heroic-hyperion', label: 'Hyperion', group: 'Heroic', region: 'NA' },
  { id: 'heroic-solis', label: 'Solis', group: 'Heroic', region: 'EU' },
  { id: 'interactive-scania', label: 'Scania', group: 'Interactive', region: 'NA' },
  { id: 'interactive-bera', label: 'Bera', group: 'Interactive', region: 'NA' },
  { id: 'interactive-luna', label: 'Luna', group: 'Interactive', region: 'EU' },
];

export const WORLD_IDS: ReadonlySet<WorldId> = new Set(WORLDS.map((w) => w.id));

const worldById = new Map<WorldId, World>(WORLDS.map((w) => [w.id, w]));

/**
 * Returns the `World` matching the supplied id, or `null` for any value that
 * is not one of the six canonical `WorldId`s. Accepts `null`, empty strings,
 * and arbitrary user-supplied strings (e.g. a stale localStorage payload)
 * without throwing — the caller is expected to surface the placeholder state.
 */
export function findWorld(id: string | null): World | null {
  if (!id) return null;
  return worldById.get(id as WorldId) ?? null;
}

/** Narrows an unknown value to `WorldId` against the canonical set. */
export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && WORLD_IDS.has(value as WorldId);
}

/**
 * Fallback **World Group** when a source has no `worldId` (or an
 * unrecognized one). Heroic preserves pre-World-Pricing numbers: the app
 * behaved Heroic-only before World Pricing shipped, so mules predating the
 * World Select feature keep identical income until the user assigns a
 * world explicitly.
 */
export const FALLBACK_WORLD_GROUP: WorldGroup = 'Heroic';

/**
 * Resolve any `worldId` value — valid `WorldId`, stale string, `null`, or
 * `undefined` — to its **World Group**. Unset / unrecognized values fall
 * back to `FALLBACK_WORLD_GROUP`.
 */
export function resolveWorldGroup(worldId: string | null | undefined): WorldGroup {
  return findWorld(worldId ?? null)?.group ?? FALLBACK_WORLD_GROUP;
}

/** Resolve a Mule World Id to its profile-service region. Legacy values are NA. */
export function resolveRegion(worldId: string | null | undefined): Region {
  return findWorld(worldId ?? null)?.region ?? 'NA';
}

/**
 * **World Lens** predicate — scopes a `Mule[]` to the **Selected World**.
 *
 * Pure, React-agnostic, so it can be reused outside components (export
 * scripts, the Cloudflare Worker) without dragging in `useWorld`.
 *
 * Returns `[]` when `world` is `null` (placeholder state — nothing is in
 * scope). Otherwise keeps mules whose `worldId` matches `world.id`; mules
 * with a missing or non-matching `worldId` are excluded.
 */
export function lensMules(mules: Mule[], world: World | null): Mule[] {
  if (world === null) return [];
  return mules.filter((m) => m.worldId === world.id);
}
