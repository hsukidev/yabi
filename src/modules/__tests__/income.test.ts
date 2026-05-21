import { describe, expect, it } from 'vitest';
import { Income } from '../income';
import { MuleBossSlate } from '../../data/muleBossSlate';
import { bosses } from '../../data/bosses';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const WILL = bosses.find((b) => b.family === 'will')!.id;
const BLACK_MAGE = bosses.find((b) => b.family === 'black-mage')!.id;
const HARD_LUCID = `${LUCID}:hard:weekly`;
const HARD_WILL = `${WILL}:hard:weekly`;
const BLACK_MAGE_EXTREME = `${BLACK_MAGE}:extreme:monthly`;

describe('Income.of', () => {
  it('delegates per-mule arithmetic to MuleBossSlate.totalCrystalValue', () => {
    const mule = { selectedBosses: [HARD_LUCID, HARD_WILL] };
    const expected = MuleBossSlate.from(mule.selectedBosses).totalCrystalValue();
    expect(Income.of(mule).raw).toBe(expected);
  });

  it('threads partySizes through to the slate (weekly Computed Value halves at party 2)', () => {
    // Hard Lucid weekly @ 504M, Hard Will weekly @ 621.81M at party 1.
    // At party 2 on both families, each Computed Value halves.
    const mule = {
      selectedBosses: [HARD_LUCID, HARD_WILL],
      partySizes: { lucid: 2, will: 2 },
    };
    const full = MuleBossSlate.from(mule.selectedBosses).totalCrystalValue();
    expect(Income.of(mule).raw).toBe(full / 2);
  });

  it('applies the Active-Flag Filter to a roster (excludes active===false only)', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID], active: true },
      { selectedBosses: [HARD_WILL], active: false },
      { selectedBosses: [HARD_WILL], active: undefined },
      { selectedBosses: [HARD_LUCID] },
    ];
    // active===false (HARD_WILL) excluded; the rest sum normally
    const expected =
      MuleBossSlate.from([HARD_LUCID]).totalCrystalValue() +
      MuleBossSlate.from([HARD_WILL]).totalCrystalValue() +
      MuleBossSlate.from([HARD_LUCID]).totalCrystalValue();
    expect(Income.of(mules).raw).toBe(expected);
  });

  it('returns raw 0 for an empty roster', () => {
    expect(Income.of([]).raw).toBe(0);
  });

  it('returns raw 0 for monthly Black Mage selections', () => {
    expect(Income.of({ selectedBosses: [BLACK_MAGE_EXTREME] }).raw).toBe(0);
  });

  it('rejects calling the constructor directly (compile-time only)', () => {
    // The private constructor is enforced by TS, not at runtime.
    // @ts-expect-error — private constructor should not be callable.
    const illegal = new Income(1);
    expect(illegal).toBeInstanceOf(Income);
  });

  describe('World Pricing — per-mule world group resolution', () => {
    it('defaults to Heroic prices when worldId is unset', () => {
      // No worldId on the source → Heroic prices (matches pre-World-Pricing).
      const mule = { selectedBosses: [HARD_LUCID] };
      expect(Income.of(mule).raw).toBe(504_000_000);
    });

    it('uses Heroic prices when the mule is on a Heroic world', () => {
      const mule = { selectedBosses: [HARD_LUCID], worldId: 'heroic-kronos' };
      expect(Income.of(mule).raw).toBe(504_000_000);
    });

    it('uses Interactive prices when the mule is on an Interactive world', () => {
      // Hard Lucid Interactive = 100.8M (Heroic 504M × 0.2).
      const mule = { selectedBosses: [HARD_LUCID], worldId: 'interactive-scania' };
      expect(Income.of(mule).raw).toBe(100_800_000);
    });

    it('defaults to Heroic when worldId is an unknown string (stale persistence)', () => {
      // Conservative fallback: an unrecognized worldId preserves today's number.
      const mule = { selectedBosses: [HARD_LUCID], worldId: 'some-dead-world' };
      expect(Income.of(mule).raw).toBe(504_000_000);
    });

    it('prices each source in a roster against its own world group', () => {
      const heroic = {
        selectedBosses: [HARD_LUCID],
        worldId: 'heroic-kronos',
      };
      const interactive = {
        selectedBosses: [HARD_LUCID],
        worldId: 'interactive-scania',
      };
      expect(Income.of([heroic, interactive]).raw).toBe(504_000_000 + 100_800_000);
    });
  });
});
