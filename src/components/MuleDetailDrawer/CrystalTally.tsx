import { memo } from 'react';
import { Check } from 'lucide-react';
import weeklyCrystalPng from '../../assets/weekly-crystal.png';
import dailyCrystalPng from '../../assets/daily-crystal.png';
import monthlyCrystalPng from '../../assets/monthly-crystal.png';
import { WEEKLY_CRYSTAL_CAP } from '../../data/muleBossSlate';
import type { ClearMarkKind } from '../../utils/clearMark';

interface CrystalTallyProps {
  weeklyCount: number;
  dailyCount: number;
  monthlyCount: number;
  /**
   * Live **Clear Mark** validity per cadence — drives each **Mark Toggle**'s
   * pressed state and its set/clear direction. Optional so the tally can be
   * rendered read-only (no Mark Toggles) where no writer is wired.
   */
  weeklyMarked?: boolean;
  dailyMarked?: boolean;
  bmMarked?: boolean;
  /**
   * Identity-stable Clear Mark writer. When omitted the plates render their
   * plain crystal with no Mark Toggle badge (read-only tally). See CLAUDE.md
   * (drawer keystroke perf) — the drawer closes the mule id into this so the
   * tally's prop shape stays counts + three booleans + one stable handler.
   */
  onSetMark?: (kind: ClearMarkKind, marked: boolean) => void;
}

/**
 * Three crystal plates stacked vertically in the drawer header:
 *   Weekly ({n}/14)
 *   ──────────────
 *   Daily  ({n})
 *   ──────────────
 *   Monthly ({n})
 *
 * Each plate pairs an icon on a radial halo with a two-line readout — a
 * micro-tracked eyebrow label above a mono-numeric count. Empty plates
 * fade to muted; filled plates lift to the accent colour. Horizontal
 * gradient hairlines separate the rows.
 *
 * Every eligible plate carries a **Mark Toggle** — a ~16px circular badge
 * overlapping the crystal art's bottom-right corner (a real `<button>` with
 * `aria-pressed`) that sets/clears that cadence's **Clear Mark** through the
 * `onSetMark` writer. Eligibility mirrors **Mark Invalidation**: daily needs
 * ≥1 daily key, weekly ≥1 weekly-or-daily key, BM ≥1 Monthly Cadence key.
 * Ineligible plates (or a read-only tally with no `onSetMark`) render the
 * plain icon — no badge, not clickable.
 *
 * The count span carries an `aria-label` so SR users get context without
 * reading the adjacent caption as label text.
 */
export const CrystalTally = memo(function CrystalTally({
  weeklyCount,
  dailyCount,
  monthlyCount,
  weeklyMarked = false,
  dailyMarked = false,
  bmMarked = false,
  onSetMark,
}: CrystalTallyProps) {
  // Mark eligibility mirrors Mark Invalidation (see `useMules` merge): a plate
  // shows its Mark Toggle only while the slate carries a key that keeps the
  // mark valid. Weekly rides on either weekly OR daily keys.
  const dailyEligible = dailyCount > 0;
  const weeklyEligible = weeklyCount > 0 || dailyCount > 0;
  const bmEligible = monthlyCount > 0;

  return (
    <div
      className="crystal-tally @max-[604.99px]/drawer:flex-row @max-[604.99px]/drawer:items-stretch @max-[604.99px]/drawer:min-w-0 @max-[604.99px]/drawer:px-1 @max-[604.99px]/drawer:py-2"
      role="group"
      aria-label="Crystal tally"
    >
      <CrystalCell
        kind="weekly"
        markKind="weekly"
        markLabel="Weekly"
        icon={weeklyCrystalPng}
        label="Weekly"
        count={weeklyCount}
        cap={WEEKLY_CRYSTAL_CAP}
        ariaLabel="Weekly boss selections"
        marked={weeklyMarked}
        eligible={weeklyEligible}
        onSetMark={onSetMark}
      />
      <CrystalDivider />
      <CrystalCell
        kind="daily"
        markKind="daily"
        markLabel="Daily"
        icon={dailyCrystalPng}
        label="Daily"
        count={dailyCount}
        ariaLabel="Daily boss selections"
        marked={dailyMarked}
        eligible={dailyEligible}
        onSetMark={onSetMark}
      />
      <CrystalDivider />
      <CrystalCell
        kind="monthly"
        markKind="bm"
        markLabel="BM"
        icon={monthlyCrystalPng}
        label="Monthly"
        count={monthlyCount}
        ariaLabel="Monthly boss selections"
        marked={bmMarked}
        eligible={bmEligible}
        onSetMark={onSetMark}
      />
    </div>
  );
});

interface CrystalCellProps {
  kind: 'weekly' | 'daily' | 'monthly';
  markKind: ClearMarkKind;
  markLabel: string;
  icon: string;
  label: string;
  count: number;
  cap?: number;
  ariaLabel: string;
  marked: boolean;
  eligible: boolean;
  onSetMark?: (kind: ClearMarkKind, marked: boolean) => void;
}

function CrystalDivider() {
  return (
    <div
      className="crystal-tally__divider @max-[604.99px]/drawer:mx-0 @max-[604.99px]/drawer:my-0.5 @max-[604.99px]/drawer:h-auto @max-[604.99px]/drawer:w-px @max-[604.99px]/drawer:bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--border)_90%,transparent),transparent)]"
      aria-hidden
    />
  );
}

function CrystalCell({
  kind,
  markKind,
  markLabel,
  icon,
  label,
  count,
  cap,
  ariaLabel,
  marked,
  eligible,
  onSetMark,
}: CrystalCellProps) {
  const empty = count === 0;
  const showToggle = eligible && onSetMark !== undefined;
  return (
    <div
      className={`crystal-tally__row @max-[604.99px]/drawer:flex-1 @max-[604.99px]/drawer:basis-0 @max-[604.99px]/drawer:justify-center @max-[604.99px]/drawer:gap-1.5 @max-[604.99px]/drawer:px-2 @max-[604.99px]/drawer:py-1 ${empty ? 'is-empty' : 'is-filled'}`}
      data-kind={kind}
    >
      <span className="crystal-tally__icon" aria-hidden={!showToggle}>
        <img src={icon} alt="" draggable={false} className={`crystal-tally__crystal is-${kind}`} />
        {showToggle && (
          <button
            type="button"
            className="crystal-tally__mark"
            data-kind={kind}
            aria-pressed={marked}
            aria-label={
              marked
                ? `${markLabel} complete — click to unmark`
                : `${markLabel} incomplete — click to mark complete`
            }
            onClick={() => onSetMark?.(markKind, !marked)}
          >
            <Check size={10} strokeWidth={3.5} aria-hidden />
          </button>
        )}
      </span>
      <div className="crystal-tally__readout">
        <span className="crystal-tally__label @max-[604.99px]/drawer:hidden">{label}</span>
        <span className="crystal-tally__count font-mono-nums" aria-label={ariaLabel}>
          {count}
          {cap !== undefined && <span className="crystal-tally__cap">/{cap}</span>}
        </span>
      </div>
    </div>
  );
}
