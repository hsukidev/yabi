/**
 * World data module — the single source of truth for the World options the
 * header World Select offers.
 *
 * MapleStory GMS partitions worlds into two World Groups: Heroic (Kronos,
 * Hyperion, Solis, Challenger World (Heroic)) and Interactive (Scania, Bera,
 * Luna, Challenger World (Interactive)). Challenger World exists in both
 * groups and is disambiguated at the label level — `CW (Heroic)` /
 * `CW (Interactive)` — while its `WorldId` keeps the two entries distinct.
 *
 * See issue #194 §Approach for the locked shape.
 */

export type WorldGroup = 'Heroic' | 'Interactive';

export type WorldId =
  | 'heroic-kronos'
  | 'heroic-hyperion'
  | 'heroic-solis'
  | 'heroic-challenger'
  | 'interactive-scania'
  | 'interactive-bera'
  | 'interactive-luna'
  | 'interactive-challenger';

export interface World {
  id: WorldId;
  label: string;
  group: WorldGroup;
}

export const WORLDS: readonly World[] = [
  { id: 'heroic-kronos', label: 'Kronos', group: 'Heroic' },
  { id: 'heroic-hyperion', label: 'Hyperion', group: 'Heroic' },
  { id: 'heroic-solis', label: 'Solis', group: 'Heroic' },
  { id: 'heroic-challenger', label: 'CW (Heroic)', group: 'Heroic' },
  { id: 'interactive-scania', label: 'Scania', group: 'Interactive' },
  { id: 'interactive-bera', label: 'Bera', group: 'Interactive' },
  { id: 'interactive-luna', label: 'Luna', group: 'Interactive' },
  { id: 'interactive-challenger', label: 'CW (Interactive)', group: 'Interactive' },
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

/**
 * Challenger Worlds are explicitly excluded from character lookup —
 * the upstream rankings split them across both reboot-index buckets in
 * a way the slice-1 contract doesn't address, so CW mules continue to
 * be hand-edited.
 */
export function isChallengerWorld(worldId: string | null | undefined): boolean {
  return worldId === 'heroic-challenger' || worldId === 'interactive-challenger';
}
