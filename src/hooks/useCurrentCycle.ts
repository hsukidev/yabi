import { useEffect, useState } from 'react';
import { nextWeeklyResetUtc } from '../utils/resetCountdown';
import { nextMonthlyResetUtc, nextUtcMidnight } from '../utils/cycle';

/**
 * Shared **Cycle Clock**: returns `now` (ms) and re-renders every consumer
 * when `now` crosses any Clear Mark cycle boundary — UTC midnight (daily),
 * Thursday 00:00 UTC (weekly **Reset Anchor**), or the 1st of the month 00:00
 * UTC (BM). All three boundaries are UTC midnights, so the soonest one is
 * always the next UTC midnight; scheduling a single timeout to the nearest of
 * the three (`Math.min`) covers all of them and stays correct even if that
 * assumption ever changes.
 *
 * Coarse by design: one timeout that re-arms at each boundary, not a 1s tick.
 * Consumers pair the returned `now` with the pure predicates in
 * `utils/cycle.ts` (`isDailyMarkValid`, etc.) to derive current mark validity
 * with no persisted last-seen cycle and no rollover writes.
 */
export function useCurrentCycle(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const current = Date.now();
      const nextBoundary = Math.min(
        nextUtcMidnight(current),
        nextWeeklyResetUtc(current),
        nextMonthlyResetUtc(current),
      );
      // `nextBoundary` is strictly-future, so `delay` is ≥ 1ms — no zero-delay
      // spin. Guard against a clock that has already crossed anyway.
      const delay = Math.max(0, nextBoundary - current);
      timeoutId = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, []);

  return now;
}
