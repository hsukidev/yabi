/**
 * World ID map — owns the bidirectional translation between the SPA's
 * `WorldId` strings and the upstream Nexon API's `{ rebootIndex, worldID }`
 * tuple. Slice 2 covers the three Heroic worlds (Kronos, Hyperion, Solis);
 * Interactive worlds and Challenger Worlds are deliberately out of scope
 * (Challenger Worlds are split across both reboot-index buckets in a way
 * the slice-1/2 contract doesn't address — those mules continue to be
 * hand-edited).
 *
 * The numeric `worldID`s below were derived empirically by querying
 *
 *   https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na?type=overall
 *     &id=weekly&reboot_index=1&page_index=1&character_name=<known-on-world>
 *
 * for a known character on each world and recording the `worldID` field
 * the upstream returned. A typo here would silently misroute lookups, so
 * the round-trip + uniqueness invariants are pinned in the test file.
 */

export type HeroicWorldId = 'heroic-kronos' | 'heroic-hyperion' | 'heroic-solis';

export interface UpstreamWorldKey {
  /** `0` for Interactive worlds, `1` for Heroic / Reboot worlds. */
  rebootIndex: 0 | 1;
  /** Upstream's numeric world identifier inside the chosen reboot bucket. */
  worldID: number;
}

const HEROIC_MAP: Readonly<Record<HeroicWorldId, UpstreamWorldKey>> = {
  'heroic-kronos': { rebootIndex: 1, worldID: 45 },
  'heroic-hyperion': { rebootIndex: 1, worldID: 46 },
  'heroic-solis': { rebootIndex: 1, worldID: 47 },
};

export const HEROIC_WORLD_IDS: readonly HeroicWorldId[] = Object.keys(
  HEROIC_MAP,
) as HeroicWorldId[];

const HEROIC_WORLD_ID_SET: ReadonlySet<string> = new Set(HEROIC_WORLD_IDS);

export function isHeroicWorldId(value: unknown): value is HeroicWorldId {
  return typeof value === 'string' && HEROIC_WORLD_ID_SET.has(value);
}

export function toUpstreamKey(worldId: HeroicWorldId): UpstreamWorldKey {
  return HEROIC_MAP[worldId];
}

export function fromUpstreamKey(rebootIndex: number, worldID: number): HeroicWorldId | null {
  for (const id of HEROIC_WORLD_IDS) {
    const key = HEROIC_MAP[id];
    if (key.rebootIndex === rebootIndex && key.worldID === worldID) return id;
  }
  return null;
}
