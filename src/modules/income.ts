import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';

/**
 * An **Income Source** — anything whose **Raw Income** is the cadence-weighted
 * sum of its **Slate Keys**. Today that's a **Mule** (`active` is the
 * **Active Flag**), but the interface is deliberately narrower than `Mule` so
 * non-mule sources (e.g. a hypothetical linked character) can slot in without
 * churn.
 */
export interface IncomeSource {
  selectedBosses: string[];
  active?: boolean;
  partySizes?: Record<string, number>;
  /**
   * Optional **World Id** assignment for the source. Resolved to a
   * **World Group** via `findWorld`; unset or unrecognized values fall back
   * to `'Heroic'` so mules predating the World Select feature keep their
   * pre-World-Pricing numbers.
   */
  worldId?: string;
}

/**
 * Immutable **Potential Income** value — per-mule or across a roster. Construct
 * only via `Income.of`; the constructor is private on purpose. Meso display
 * formatting stays at the render boundary.
 */
export class Income {
  readonly raw: number;

  private constructor(raw: number) {
    this.raw = raw;
  }

  /**
   * Aggregate one or more **Income Sources** into an `Income`.
   *
   * - Per-mule arithmetic is delegated to
   *   `MuleBossSlate.from(source.selectedBosses).totalCrystalValue`; this
   *   module owns aggregation, not crystal summation.
   * - For a roster, the **Active-Flag Filter** excludes sources with
   *   `active === false` and includes `active === true` / `active === undefined`.
   */
  static of(source: IncomeSource | IncomeSource[]): Income {
    const sources = Array.isArray(source) ? source : [source];
    let raw = 0;
    for (const s of sources) {
      if (s.active === false) continue;
      const worldGroup = resolveWorldGroup(s.worldId);
      raw += MuleBossSlate.from(s.selectedBosses, worldGroup).totalCrystalValue(s.partySizes);
    }
    return new Income(raw);
  }
}
