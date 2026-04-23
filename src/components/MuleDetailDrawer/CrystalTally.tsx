import weeklyCrystalPng from '../../assets/weekly-crystal.png';
import dailyCrystalPng from '../../assets/daily-crystal.png';
import { WEEKLY_CRYSTAL_CAP } from '../../data/muleBossSlate';

interface CrystalTallyProps {
  weeklyCount: number;
  dailyCount: number;
  monthlyCount: number;
}

/**
 * Two crystal plates stacked vertically in the drawer header:
 *   Weekly ({n}/14)
 *   ──────────────
 *   Daily  ({n})
 *
 * Each plate pairs an icon on a radial halo with a two-line readout — a
 * micro-tracked eyebrow label above a mono-numeric count. Empty plates
 * fade to muted; filled plates lift to the accent colour. Horizontal
 * gradient hairlines separate the rows.
 *
 * The count span carries an `aria-label` so SR users get context without
 * reading the adjacent caption as label text.
 */
export function CrystalTally({ weeklyCount, dailyCount }: CrystalTallyProps) {
  return (
    <div className="crystal-tally" role="group" aria-label="Crystal tally">
      <CrystalCell
        kind="weekly"
        icon={weeklyCrystalPng}
        label="Weekly"
        count={weeklyCount}
        cap={WEEKLY_CRYSTAL_CAP}
        ariaLabel="Weekly boss selections"
      />
      <div className="crystal-tally__divider" aria-hidden />
      <CrystalCell
        kind="daily"
        icon={dailyCrystalPng}
        label="Daily"
        count={dailyCount}
        ariaLabel="Daily boss selections"
      />
    </div>
  );
}

interface CrystalCellProps {
  kind: 'weekly' | 'daily' | 'monthly';
  icon: string;
  label: string;
  count: number;
  cap?: number;
  ariaLabel: string;
}

function CrystalCell({ kind, icon, label, count, cap, ariaLabel }: CrystalCellProps) {
  const empty = count === 0;
  return (
    <div className={`crystal-tally__row ${empty ? 'is-empty' : 'is-filled'}`} data-kind={kind}>
      <span className="crystal-tally__icon" aria-hidden>
        <img src={icon} alt="" draggable={false} className={`crystal-tally__crystal is-${kind}`} />
      </span>
      <div className="crystal-tally__readout">
        <span className="crystal-tally__label">{label}</span>
        <span className="crystal-tally__count font-mono-nums" aria-label={ariaLabel}>
          {count}
          {cap !== undefined && <span className="crystal-tally__cap">/{cap}</span>}
        </span>
      </div>
    </div>
  );
}
