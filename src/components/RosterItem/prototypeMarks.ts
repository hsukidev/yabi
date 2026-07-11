/**
 * PROTOTYPE — throwaway in-memory marks store shared by the remaining
 * marking-surface prototypes (List View row + Drawer in
 * `MarkingSurfacesPrototype.tsx`, KPI readout in `KpiReadoutPrototype.tsx`,
 * and the drawer's PROTOTYPE preview sections). Extracted out of the old
 * `CardMenuPrototype.tsx` when the Character Card slice (#302) shipped its
 * real, persisted marks — those prototypes still ride this throwaway store
 * until their own slices land.
 *
 * Marks are in-memory only — refresh wipes them. Dev builds only. This file
 * intentionally exports no React components so `react-refresh` stays quiet;
 * the shared prototype menu/check components live in `PrototypeMarkMenu.tsx`.
 */
import { useSyncExternalStore } from 'react';

// Sampled from the crystal PNGs in src/assets/
export const WEEKLY_PURPLE = '#a855f7';
export const BM_GOLD = '#f5b02e';
export const DAILY_CYAN = '#3fb6f5';

export interface Marks {
  daily: boolean;
  weekly: boolean;
  bm: boolean;
}

const NO_MARKS: Marks = { daily: false, weekly: false, bm: false };
const marksById = new Map<string, Marks>();
const storeListeners = new Set<() => void>();
let marksVersion = 0;

export function toggleMark(id: string, key: keyof Marks) {
  const prev = marksById.get(id) ?? NO_MARKS;
  marksById.set(id, { ...prev, [key]: !prev[key] });
  marksVersion++;
  storeListeners.forEach((l) => l());
}

export function useMarks(id: string): Marks {
  return useSyncExternalStore(
    (cb) => {
      storeListeners.add(cb);
      return () => storeListeners.delete(cb);
    },
    () => marksById.get(id) ?? NO_MARKS,
  );
}

export function getMarks(id: string): Marks {
  return marksById.get(id) ?? NO_MARKS;
}

// Whole-store subscription for aggregate consumers (KPI readout prototype):
// bumps on every toggle; recompute aggregates keyed on this version.
export function useMarksVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      storeListeners.add(cb);
      return () => storeListeners.delete(cb);
    },
    () => marksVersion,
  );
}

// Roster items are click-to-open AND drag surfaces — swallow every
// activation path (same guard rationale as RosterActiveSwitch).
function stopAll(e: React.SyntheticEvent) {
  e.stopPropagation();
}
export const guardProps = {
  onClick: stopAll,
  onPointerDown: stopAll,
  onKeyDown: stopAll,
  onTouchStart: stopAll,
};
