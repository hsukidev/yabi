import { Check } from 'lucide-react';

// Crystal-sprite colors (sampled from src/assets/): the Completion Check for
// each cadence is tinted to match its crystal so a glance at the Lv pill maps
// to the same colors as the roster's crystal tallies.
export const DAILY_CYAN = '#3fb6f5';
export const WEEKLY_PURPLE = '#a855f7';
export const BM_GOLD = '#f5b02e';

interface CompletionChecksProps {
  daily: boolean;
  weekly: boolean;
  bm: boolean;
  size?: number;
}

/**
 * Inline **Completion Checks** — one colored check per currently-valid
 * **Clear Mark**, rendered daily → weekly → BM. Each carries `role="img"`
 * plus an aria-label so it reads as a discrete status glyph. Renders nothing
 * when no mark is valid.
 */
export function CompletionChecks({ daily, weekly, bm, size = 12 }: CompletionChecksProps) {
  return (
    <>
      {daily && (
        <Check
          size={size}
          strokeWidth={3.5}
          color={DAILY_CYAN}
          role="img"
          aria-label="Daily complete"
        />
      )}
      {weekly && (
        <Check
          size={size}
          strokeWidth={3.5}
          color={WEEKLY_PURPLE}
          role="img"
          aria-label="Weekly complete"
        />
      )}
      {bm && (
        <Check size={size} strokeWidth={3.5} color={BM_GOLD} role="img" aria-label="BM complete" />
      )}
    </>
  );
}
