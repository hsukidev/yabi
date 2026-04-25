/**
 * World ID map — owns the bidirectional translation between the SPA's
 * `WorldId` strings and the upstream Nexon API's `{ rebootIndex, worldID }`
 * tuple. Slice 3 covers all six non-CW worlds: Heroic (Kronos, Hyperion,
 * Solis) at `rebootIndex=1` and Interactive (Bera, Scania, Luna) at
 * `rebootIndex=0`. Challenger Worlds remain out of scope — they are split
 * across both reboot-index buckets in a way the slice contract doesn't
 * address, so CW mules continue to be hand-edited.
 *
 * The numeric `worldID`s below were derived empirically by querying
 *
 *   https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na?type=overall
 *     &id=weekly&reboot_index=<0|1>&page_index=1&character_name=<known>
 *
 * for a known character on each world and recording the `worldID` field
 * the upstream returned. The Heroic and Interactive buckets are separate
 * namespaces (different `rebootIndex` values), so numeric ids may overlap
 * across buckets — uniqueness is only required within a bucket. A typo
 * here would silently misroute lookups, so the round-trip + uniqueness
 * invariants are pinned in the test file.
 */

export type HeroicWorldId = 'heroic-kronos' | 'heroic-hyperion' | 'heroic-solis';
export type InteractiveWorldId = 'interactive-bera' | 'interactive-scania' | 'interactive-luna';
export type SupportedWorldId = HeroicWorldId | InteractiveWorldId;

export interface UpstreamWorldKey {
  /** `0` for Interactive worlds, `1` for Heroic / Reboot worlds. */
  rebootIndex: 0 | 1;
  /** Upstream's numeric world identifier inside the chosen reboot bucket. */
  worldID: number;
}

const WORLD_MAP: Readonly<Record<SupportedWorldId, UpstreamWorldKey>> = {
  'heroic-kronos': { rebootIndex: 1, worldID: 45 },
  'heroic-hyperion': { rebootIndex: 1, worldID: 46 },
  'heroic-solis': { rebootIndex: 1, worldID: 47 },
  'interactive-scania': { rebootIndex: 0, worldID: 0 },
  'interactive-bera': { rebootIndex: 0, worldID: 1 },
  'interactive-luna': { rebootIndex: 0, worldID: 19 },
};

export const SUPPORTED_WORLD_IDS: readonly SupportedWorldId[] = Object.keys(
  WORLD_MAP,
) as SupportedWorldId[];

const SUPPORTED_WORLD_ID_SET: ReadonlySet<string> = new Set(SUPPORTED_WORLD_IDS);

export function isSupportedWorldId(value: unknown): value is SupportedWorldId {
  return typeof value === 'string' && SUPPORTED_WORLD_ID_SET.has(value);
}

export function toUpstreamKey(worldId: SupportedWorldId): UpstreamWorldKey {
  return WORLD_MAP[worldId];
}

export function fromUpstreamKey(rebootIndex: number, worldID: number): SupportedWorldId | null {
  for (const id of SUPPORTED_WORLD_IDS) {
    const key = WORLD_MAP[id];
    if (key.rebootIndex === rebootIndex && key.worldID === worldID) return id;
  }
  return null;
}
