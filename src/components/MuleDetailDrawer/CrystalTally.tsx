import weeklyCrystalPng from '../../assets/weekly-crystal.png';
import dailyCrystalPng from '../../assets/daily-crystal.png';

interface CrystalTallyProps {
  weeklyCount: number;
  dailyCount: number;
}

/** Weekly Crystal Cap reference — displayed, not enforced. */
const WEEKLY_CRYSTAL_CAP = 14;

/**
 * Two stacked crystal readouts for the drawer header:
 *  - Weekly: `{count}/14`, colored by fill state.
 *  - Daily: bare `{count}` (no cap; game has no enforced daily limit).
 *
 * The count span carries an `aria-label` so SR users get context without
 * reading the adjacent "WEEKLY" / "DAILY" caption as label text.
 */
export function CrystalTally({ weeklyCount, dailyCount }: CrystalTallyProps) {
  return (
    <div className="crystal-tally" role="group" aria-label="Crystal tally">
      <CrystalRow
        kind="weekly"
        icon={weeklyCrystalPng}
        label="Weekly"
        count={weeklyCount}
        cap={WEEKLY_CRYSTAL_CAP}
        ariaLabel="Weekly boss selections"
      />
      <div className="crystal-tally__divider" aria-hidden />
      <CrystalRow
        kind="daily"
        icon={dailyCrystalPng}
        label="Daily"
        count={dailyCount}
        ariaLabel="Daily boss selections"
      />
    </div>
  );
}

interface CrystalRowProps {
  kind: 'weekly' | 'daily';
  icon: string;
  label: string;
  count: number;
  cap?: number;
  ariaLabel: string;
}

function CrystalRow({ kind, icon, label, count, cap, ariaLabel }: CrystalRowProps) {
  const empty = count === 0;
  return (
    <div className={`crystal-tally__row ${empty ? 'is-empty' : 'is-filled'}`} data-kind={kind}>
      <span className="crystal-tally__icon" aria-hidden>
        <img src={icon} alt="" draggable={false} className={`crystal-tally__crystal is-${kind}`} />
      </span>
      <div className="crystal-tally__readout">
        <span className="crystal-tally__count font-mono-nums" aria-label={ariaLabel}>
          {count}
          {cap !== undefined && <span className="crystal-tally__cap">/{cap}</span>}
        </span>
        <span className="crystal-tally__label">{label}</span>
      </div>
    </div>
  );
}
