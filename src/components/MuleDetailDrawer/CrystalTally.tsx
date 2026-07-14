import { memo } from 'react';
import weeklyCrystalPng from '../../assets/weekly-crystal.png';
import dailyCrystalPng from '../../assets/daily-crystal.png';
import monthlyCrystalPng from '../../assets/monthly-crystal.png';

interface CrystalTallyProps {
  weeklyCount: number;
  dailyCount: number;
  monthlyCount: number;
}

/**
 * Three crystal plates stacked vertically in the drawer header:
 *   Weekly ({n})
 *   ──────────────
 *   Daily  ({n})
 *   ──────────────
 *   Monthly ({n})
 *
 * A **read-only** counts display (#324) — the per-plate **Mark Toggles** were
 * retired when the **Mule Actions Menu** became the Drawer's sole Clear Mark
 * writer, so every plate now renders its plain crystal with no badge. Each
 * plate pairs an icon on a radial halo with a two-line readout — a
 * micro-tracked eyebrow label above a mono-numeric count. Empty plates fade to
 * muted; filled plates lift to the accent colour. Horizontal gradient hairlines
 * separate the rows. The weekly plate shows a bare count (no `/14` cap suffix)
 * so the tally reads as a tally, not a progress meter.
 *
 * The count span carries an `aria-label` so SR users get context without
 * reading the adjacent caption as label text.
 */
export const CrystalTally = memo(function CrystalTally({
  weeklyCount,
  dailyCount,
  monthlyCount,
}: CrystalTallyProps) {
  return (
    <div
      className="crystal-tally @max-[604.99px]/drawer:flex-row @max-[604.99px]/drawer:items-stretch @max-[604.99px]/drawer:min-w-0 @max-[604.99px]/drawer:px-1 @max-[604.99px]/drawer:py-2"
      role="group"
      aria-label="Crystal tally"
    >
      <CrystalCell
        kind="weekly"
        icon={weeklyCrystalPng}
        label="Weekly"
        count={weeklyCount}
        ariaLabel="Weekly boss selections"
      />
      <CrystalDivider />
      <CrystalCell
        kind="daily"
        icon={dailyCrystalPng}
        label="Daily"
        count={dailyCount}
        ariaLabel="Daily boss selections"
      />
      <CrystalDivider />
      <CrystalCell
        kind="monthly"
        icon={monthlyCrystalPng}
        label="Monthly"
        count={monthlyCount}
        ariaLabel="Monthly boss selections"
      />
    </div>
  );
});

interface CrystalCellProps {
  kind: 'weekly' | 'daily' | 'monthly';
  icon: string;
  label: string;
  count: number;
  ariaLabel: string;
}

function CrystalDivider() {
  return (
    <div
      className="crystal-tally__divider @max-[604.99px]/drawer:mx-0 @max-[604.99px]/drawer:my-0.5 @max-[604.99px]/drawer:h-auto @max-[604.99px]/drawer:w-px @max-[604.99px]/drawer:bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--border)_90%,transparent),transparent)]"
      aria-hidden
    />
  );
}

function CrystalCell({ kind, icon, label, count, ariaLabel }: CrystalCellProps) {
  const empty = count === 0;
  return (
    <div
      className={`crystal-tally__row @max-[604.99px]/drawer:flex-1 @max-[604.99px]/drawer:basis-0 @max-[604.99px]/drawer:justify-center @max-[604.99px]/drawer:gap-1.5 @max-[604.99px]/drawer:px-2 @max-[604.99px]/drawer:py-1 ${empty ? 'is-empty' : 'is-filled'}`}
      data-kind={kind}
    >
      <span className="crystal-tally__icon" aria-hidden>
        <img src={icon} alt="" draggable={false} className={`crystal-tally__crystal is-${kind}`} />
      </span>
      <div className="crystal-tally__readout">
        <span className="crystal-tally__label @max-[604.99px]/drawer:hidden">{label}</span>
        <span className="crystal-tally__count font-mono-nums" aria-label={ariaLabel}>
          {count}
        </span>
      </div>
    </div>
  );
}
