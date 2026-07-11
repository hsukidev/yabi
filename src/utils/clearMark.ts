// Clear Mark write + validity helpers, one layer above the pure Cycle Clock
// math in `cycle.ts`. A **Clear Mark** stores only its **Cycle Stamp** on the
// `Mule`; setting one writes the current stamp, clearing one sets the field
// back to `undefined`. Marks ride the existing `updateMule` path (see the
// Dashboard's mark handler) and die with the mule.

import type { Mule } from '../types';
import {
  currentBmStamp,
  currentDailyStamp,
  currentWeeklyStamp,
  isBmMarkValid,
  isDailyMarkValid,
  isWeeklyMarkValid,
} from './cycle';

/** The three Clear Mark cadences. */
export type ClearMarkKind = 'daily' | 'weekly' | 'bm';

/** The `Mule` field each kind's Cycle Stamp lives in. */
const FIELD: Record<ClearMarkKind, 'dailyClearMark' | 'weeklyClearMark' | 'bmClearMark'> = {
  daily: 'dailyClearMark',
  weekly: 'weeklyClearMark',
  bm: 'bmClearMark',
};

/** Whether a mule's Clear Mark of `kind` is valid for the cycle at `nowMs`. */
export function isMarkValid(mule: Mule, kind: ClearMarkKind, nowMs: number): boolean {
  switch (kind) {
    case 'daily':
      return isDailyMarkValid(mule.dailyClearMark, nowMs);
    case 'weekly':
      return isWeeklyMarkValid(mule.weeklyClearMark, nowMs);
    case 'bm':
      return isBmMarkValid(mule.bmClearMark, nowMs);
  }
}

/**
 * The `updateMule` patch that sets (`marked === true`, stamping the current
 * cycle at `nowMs`) or clears (`marked === false`, back to `undefined`) a
 * mule's Clear Mark of `kind`.
 */
export function clearMarkUpdate(
  kind: ClearMarkKind,
  marked: boolean,
  nowMs: number,
): Partial<Mule> {
  if (!marked) return { [FIELD[kind]]: undefined };
  const stamp =
    kind === 'daily'
      ? currentDailyStamp(nowMs)
      : kind === 'weekly'
        ? currentWeeklyStamp(nowMs)
        : currentBmStamp(nowMs);
  return { [FIELD[kind]]: stamp };
}
