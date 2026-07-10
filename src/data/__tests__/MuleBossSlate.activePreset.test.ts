import { describe, expect, it } from 'vitest';
import { MuleBossSlate } from '../muleBossSlate';
import type { UserPreset } from '../userPresets';
import { PRESET_FAMILIES, presetEntryKey } from '../bossPresets';
import { getBossByFamily } from '../bosses';

/**
 * Unit tests for `MuleBossSlate.activePreset` — the **Active Preset**
 * priority ladder (CONTEXT.md), previously inlined in the Drawer:
 *
 *  1. **User Preset Match** → `{ activePreset: 'CUSTOM', matchedUserPreset }`
 *  2. empty slate → `{ activePreset: null, matchedUserPreset: null }`
 *  3. **Full-Slate Equality** with a Canonical → that Canonical
 *  4. any keys at all → `{ activePreset: 'CUSTOM', matchedUserPreset: null }`
 *
 * The empty check sits AFTER the User Preset Match so an empty saved
 * preset can still match an empty slate.
 */

function preset(
  id: string,
  name: string,
  slateKeys: readonly string[],
  partySizes: Record<string, number> = {},
): UserPreset {
  return { id, name, slateKeys, partySizes };
}

function buildKey(bossId: string, tier: string, cadence: string): string {
  return `${bossId}:${tier}:${cadence}`;
}

const LUCID_BOSS = getBossByFamily('lucid')!;
const HARD_LUCID = buildKey(LUCID_BOSS.id, 'hard', 'weekly');

const HORNTAIL_BOSS = getBossByFamily('horntail')!;
const HORNTAIL_DAILY = buildKey(HORNTAIL_BOSS.id, 'chaos', 'daily');

const CRA_KEYS = PRESET_FAMILIES.CRA.map((entry) => presetEntryKey(entry)!);

describe('MuleBossSlate.activePreset', () => {
  it('prioritises a User Preset Match over a Canonical match', () => {
    const slate = MuleBossSlate.from(CRA_KEYS);
    const saved = preset('a', 'My CRA', CRA_KEYS);
    expect(slate.activePreset([saved], {})).toEqual({
      activePreset: 'CUSTOM',
      matchedUserPreset: saved,
    });
  });

  it('matches an empty saved preset against an empty slate (empty check sits after User Preset Match)', () => {
    const slate = MuleBossSlate.from([]);
    const saved = preset('a', 'Blank', []);
    expect(slate.activePreset([saved], {})).toEqual({
      activePreset: 'CUSTOM',
      matchedUserPreset: saved,
    });
  });

  it('returns no active preset on an empty slate with no matching User Preset', () => {
    const slate = MuleBossSlate.from([]);
    const saved = preset('a', 'A', [HARD_LUCID]);
    expect(slate.activePreset([saved], {})).toEqual({
      activePreset: null,
      matchedUserPreset: null,
    });
  });

  it('returns the matched Canonical when no User Preset matches', () => {
    const slate = MuleBossSlate.from(CRA_KEYS);
    expect(slate.activePreset([], {})).toEqual({
      activePreset: 'CRA',
      matchedUserPreset: null,
    });
  });

  it('falls through to CUSTOM with no matched row for a non-empty, non-canonical slate', () => {
    const slate = MuleBossSlate.from([HARD_LUCID, HORNTAIL_DAILY]);
    expect(slate.activePreset([], {})).toEqual({
      activePreset: 'CUSTOM',
      matchedUserPreset: null,
    });
  });

  it('rejects a User Preset whose party sizes differ, falling back down the ladder', () => {
    const slate = MuleBossSlate.from(CRA_KEYS);
    const saved = preset('a', 'CRA duo', CRA_KEYS, { lucid: 2 });
    // Party sizes differ (mule is solo) → no User Preset Match → Canonical wins.
    expect(slate.activePreset([saved], {})).toEqual({
      activePreset: 'CRA',
      matchedUserPreset: null,
    });
  });
});
