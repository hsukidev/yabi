import { describe, expect, it } from 'vitest';
import { MuleBossSlate } from '../muleBossSlate';
import type { UserPreset } from '../userPresets';
import { PRESET_FAMILIES, presetEntryKey } from '../bossPresets';
import { getBossByFamily } from '../bosses';

/**
 * Boundary tests for `MuleBossSlate.matchedUserPreset` (issue #258).
 *
 * Slate-level absorption of the **User Preset Match** rule: returns the
 * first **User Preset** whose `slateKeys` set-equal the receiver's keys,
 * AND whose per-family party sizes match the caller-supplied `partySizes`.
 * Slate stays party-size-agnostic; the caller threads its **Mule's**
 * `partySizes` in.
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
const NORMAL_LUCID = buildKey(LUCID_BOSS.id, 'normal', 'weekly');

const HORNTAIL_BOSS = getBossByFamily('horntail')!;
const HORNTAIL_DAILY = buildKey(HORNTAIL_BOSS.id, 'chaos', 'daily');

const BLACK_MAGE_BOSS = getBossByFamily('black-mage')!;
const BLACK_MAGE_EXTREME = buildKey(BLACK_MAGE_BOSS.id, 'extreme', 'monthly');

const CRA_KEYS = PRESET_FAMILIES.CRA.map((entry) => presetEntryKey(entry)!);

describe('MuleBossSlate.matchedUserPreset', () => {
  it('returns the first preset whose slateKeys equal the slate as a set', () => {
    const slate = MuleBossSlate.from([HARD_LUCID, HORNTAIL_DAILY]);
    const a = preset('a', 'A', [HARD_LUCID, HORNTAIL_DAILY]);
    const b = preset('b', 'B', [HARD_LUCID]);
    expect(slate.matchedUserPreset([a, b], {})).toBe(a);
  });

  it('matches order-insensitively against the snapshot', () => {
    const slate = MuleBossSlate.from([HARD_LUCID, HORNTAIL_DAILY]);
    const a = preset('a', 'A', [HORNTAIL_DAILY, HARD_LUCID]);
    expect(slate.matchedUserPreset([a], {})).toBe(a);
  });

  it('returns null when the snapshot is missing a key the slate has', () => {
    const slate = MuleBossSlate.from([HARD_LUCID, HORNTAIL_DAILY]);
    const a = preset('a', 'A', [HARD_LUCID]);
    expect(slate.matchedUserPreset([a], {})).toBeNull();
  });

  it('returns null when the slate is missing a key the snapshot has', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', [HARD_LUCID, HORNTAIL_DAILY]);
    expect(slate.matchedUserPreset([a], {})).toBeNull();
  });

  it('matches an empty slate against an empty snapshot', () => {
    const slate = MuleBossSlate.from([]);
    const a = preset('a', 'A', []);
    expect(slate.matchedUserPreset([a], {})).toBe(a);
  });

  it('returns null on an empty slate when every snapshot has keys', () => {
    const slate = MuleBossSlate.from([]);
    const a = preset('a', 'A', [HARD_LUCID]);
    expect(slate.matchedUserPreset([a], {})).toBeNull();
  });

  it('returns null on an empty snapshots array', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    expect(slate.matchedUserPreset([], {})).toBeNull();
  });

  it('returns null on a non-empty slate when the only snapshot is empty', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', []);
    expect(slate.matchedUserPreset([a], {})).toBeNull();
  });

  it('selects the first matching snapshot from a list', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', [NORMAL_LUCID]);
    const b = preset('b', 'B', [HARD_LUCID]);
    const c = preset('c', 'C', [HARD_LUCID]);
    expect(slate.matchedUserPreset([a, b, c], {})).toBe(b);
  });

  it('returns null when slate keys match but party sizes differ', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', [HARD_LUCID], { lucid: 3 });
    expect(slate.matchedUserPreset([a], { lucid: 1 })).toBeNull();
  });

  it('matches when snapshot has explicit 1 and current is absent (default-aware ?? 1)', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', [HARD_LUCID], { lucid: 1 });
    expect(slate.matchedUserPreset([a], {})).toBe(a);
  });

  it('returns null when snapshot has an explicit non-default party size and current is absent', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', [HARD_LUCID], { lucid: 3 });
    expect(slate.matchedUserPreset([a], {})).toBeNull();
  });

  it('ignores extraneous current.partySizes for families not in the snapshot', () => {
    const slate = MuleBossSlate.from([HARD_LUCID]);
    const a = preset('a', 'A', [HARD_LUCID], { lucid: 2 });
    expect(slate.matchedUserPreset([a], { lucid: 2, residual: 6 })).toBe(a);
  });

  it('returns null when any snapshot family party size mismatches', () => {
    const slate = MuleBossSlate.from(CRA_KEYS);
    const a = preset('a', 'A', CRA_KEYS, { magnus: 2, vellum: 6 });
    expect(slate.matchedUserPreset([a], { magnus: 2, vellum: 1 })).toBeNull();
  });

  it('matches CRA-equal slate against a CRA-keyed snapshot with default partySizes', () => {
    const slate = MuleBossSlate.from(CRA_KEYS);
    const a = preset('a', 'A', CRA_KEYS);
    expect(slate.matchedUserPreset([a], {})).toBe(a);
  });

  it('matches a monthly Black Mage snapshot including Black Mage party size', () => {
    const slate = MuleBossSlate.from([HARD_LUCID, BLACK_MAGE_EXTREME]);
    const a = preset('a', 'Monthly BM', [BLACK_MAGE_EXTREME, HARD_LUCID], {
      'black-mage': 6,
    });
    expect(slate.matchedUserPreset([a], { 'black-mage': 6 })).toBe(a);
  });

  it('returns null when monthly Black Mage keys match but Black Mage party size differs', () => {
    const slate = MuleBossSlate.from([BLACK_MAGE_EXTREME]);
    const a = preset('a', 'Monthly BM', [BLACK_MAGE_EXTREME], { 'black-mage': 6 });
    expect(slate.matchedUserPreset([a], { 'black-mage': 5 })).toBeNull();
  });
});
