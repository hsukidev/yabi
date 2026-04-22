import weeklyCrystalPng from '../../assets/weekly-crystal.png';
import dailyCrystalPng from '../../assets/daily-crystal.png';
import monthlyCrystalPng from '../../assets/monthly-crystal.png';

interface CrystalTallyProps {
  weeklyCount: number;
  dailyCount: number;
  monthlyCount: number;
}

/** Weekly Crystal Cap reference — displayed, not enforced. */
const WEEKLY_CRYSTAL_CAP = 14;
/**
 * Monthly Crystal Cap — enforced to 1 by the Monthly Radio Mutex in
 * `MuleBossSlate.toggle` (Black Mage Hard ↔ Extreme), so the cap is also
 * the game-accurate ceiling: one Black Mage clear per month per mule.
 */
const MONTHLY_CRYSTAL_CAP = 1;

/**
 * Three crystal tiles arrayed horizontally in the drawer header:
 *   Weekly ({n}/14) | Daily ({n}) | Monthly ({n}/1)
 *
 * Each tile stacks an icon on a radial halo atop a mono-numeric count and
 * a micro-tracked caption. Empty tiles fade to muted; filled tiles lift to
 * the accent colour. Vertical gradient dividers separate the three columns.
 *
 * The count span carries an `aria-label` so SR users get context without
 * reading the adjacent caption as label text.
 */
export function CrystalTally({ weeklyCount, dailyCount, monthlyCount }: CrystalTallyProps) {
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
      <div className="crystal-tally__divider" aria-hidden />
      <CrystalCell
        kind="monthly"
        icon={monthlyCrystalPng}
        label="Monthly"
        count={monthlyCount}
        cap={MONTHLY_CRYSTAL_CAP}
        ariaLabel="Monthly boss selections"
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
        <span className="crystal-tally__count font-mono-nums" aria-label={ariaLabel}>
          {count}
          {cap !== undefined && <span className="crystal-tally__cap">/{cap}</span>}
        </span>
        <span className="crystal-tally__label">{label}</span>
      </div>
    </div>
  );
}
