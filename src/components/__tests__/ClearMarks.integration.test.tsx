import { describe, expect, it } from 'vitest';
import { useCallback, useEffect, useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { MuleCharacterCard } from '../MuleCharacterCard';
import { MuleListRow } from '../MuleListRow';
import { MuleDetailDrawer } from '../MuleDetailDrawer';
import { MarkAsMenu } from '../MarkAsMenu';
import { Toaster } from '../ui/sonner';
import { toast } from '../../lib/toast';
import { WorldIncome } from '../../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from '../rosterRowMetrics';
import {
  clearMarkUpdate,
  isMarkEligible,
  isMarkValid,
  type ClearMarkKind,
} from '../../utils/clearMark';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';

// A weekly Slate Key so the Drawer's weekly Mark Toggle is eligible (the tally
// hides the toggle on an empty slate — same predicate as Mark Invalidation).
const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;
const HARD_LUCID_WEEKLY = HARD_LUCID;

// End-to-end integration sweep for Clear Marks (issue #306): the merged slices
// meeting across surfaces. Per-surface behavior is covered in the
// MuleCharacterCard / MuleListRow / MuleDetailDrawer suites; this file proves
// the *seam* — a Clear Mark set on one surface is reflected on all three at
// once because every surface reads the same `mule` (no store, no event bus),
// and clearing it removes the Completion Check everywhere (PRD #300 AC #2).
//
// The Drawer is a modal Sheet, so with it open the background Card/Row are
// marked inert; `getAllByRole` skips inert nodes by default, hence the
// `{ hidden: true }` — the checks are rendered on every surface, just behind
// the modal's inert veil.

function makeMule(id: string, overrides: Partial<Mule> = {}): Mule {
  return {
    id,
    name: id,
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    active: true,
    ...overrides,
  };
}

function metricsFor(mule: Mule): RosterRowMetrics {
  const worldIncome = WorldIncome.of([mule]);
  return rosterRowMetrics(mule, worldIncome.perMule.get(mule.id), worldIncome.totalContributedMeso);
}

function AllSurfaces({ initial }: { initial: Mule }) {
  const [mule, setMule] = useState(initial);

  // Mirrors Dashboard's `updateMule` merge (the Drawer's mark path). The mark
  // patch carries no `selectedBosses`, so a plain merge is faithful.
  const onUpdate = useCallback((id: string, patch: Partial<Mule>) => {
    setMule((prev) => (prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const noop = useCallback(() => {}, []);
  const metrics = metricsFor(mule);

  return (
    <>
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard
            mule={mule}
            onClick={noop}
            updateMule={onUpdate}
            onDelete={noop}
            metrics={metrics}
          />
          <MuleListRow
            mule={mule}
            metrics={metrics}
            onClick={noop}
            updateMule={onUpdate}
            onDelete={noop}
          />
        </SortableContext>
      </DndContext>
      <MuleDetailDrawer
        mule={mule}
        metrics={metrics}
        open
        onClose={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />
    </>
  );
}

// The Bulk Action Bar's Mark As Menu writer, meeting the same three surfaces.
// A single selected mule stands in for the Bulk-Selected set; `onMarkAs`
// mirrors Dashboard's `handleBulkMarkAs` (directional converge across eligible
// selected mules; already-matching mules skip), proving the seam extends to
// the bulk writer, not just the drawer kebab.
function AllSurfacesWithMarkAsMenu({ initial }: { initial: Mule }) {
  const [mule, setMule] = useState(initial);

  const onUpdate = useCallback((id: string, patch: Partial<Mule>) => {
    setMule((prev) => (prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const noop = useCallback(() => {}, []);
  const metrics = metricsFor(mule);

  const eligibleCounts = {
    daily: isMarkEligible(metrics, 'daily') ? 1 : 0,
    weekly: isMarkEligible(metrics, 'weekly') ? 1 : 0,
    bm: isMarkEligible(metrics, 'bm') ? 1 : 0,
  };

  const onMarkAs = useCallback((kind: ClearMarkKind, complete: boolean) => {
    setMule((prev) => {
      const m = metricsFor(prev);
      if (!isMarkEligible(m, kind)) return prev;
      const now = Date.now();
      if (isMarkValid(prev, kind, now) === complete) return prev;
      return { ...prev, ...clearMarkUpdate(kind, complete, now) };
    });
  }, []);

  const onSetActive = useCallback((active: boolean) => {
    setMule((prev) => (prev.active === active ? prev : { ...prev, active }));
  }, []);

  return (
    <>
      <MarkAsMenu
        selectedCount={1}
        eligibleCounts={eligibleCounts}
        onMarkAs={onMarkAs}
        onSetActive={onSetActive}
      />
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard
            mule={mule}
            onClick={noop}
            updateMule={onUpdate}
            onDelete={noop}
            metrics={metrics}
          />
          <MuleListRow
            mule={mule}
            metrics={metrics}
            onClick={noop}
            updateMule={onUpdate}
            onDelete={noop}
          />
        </SortableContext>
      </DndContext>
      <MuleDetailDrawer
        mule={mule}
        metrics={metrics}
        open
        onClose={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />
    </>
  );
}

function drawerSheet() {
  return document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
}

// The Drawer's per-mule writes now ride the Mule Actions Menu kebab (#324) —
// its Mark Toggles were retired. Drive the weekly mark by opening the kebab and
// clicking its weekly row (Complete / Incomplete, worded as the action).
async function clickDrawerWeekly() {
  const kebab = within(drawerSheet()).getByRole('button', { name: /mule actions/i });
  fireEvent.click(kebab);
  const row = await screen.findByRole('menuitem', {
    name: /weekly (in)?complete/i,
    hidden: true,
  });
  fireEvent.click(row);
}

// The Drawer surface's mark state is now read via its restored read-only
// beside-name Completion Check img (#324), scoped to the sheet.
function drawerWeeklyCheck() {
  return within(drawerSheet()).queryByRole('img', { name: 'Weekly complete' });
}

// Card Lv pill + List View row = two roster Completion Check imgs when marked.
// The Drawer now contributes a third (its beside-name check), so filter it out
// to keep counting only the two roster surfaces. Both roster surfaces are inert
// behind the modal, hence `hidden: true`.
const weeklyRosterChecks = () =>
  screen
    .queryAllByRole('img', { name: 'Weekly complete', hidden: true })
    .filter((el) => !drawerSheet().contains(el));

describe('Clear Marks — cross-surface sync (Card · Row · Drawer)', () => {
  it('a weekly mark set on the Drawer kebab lights the roster checks and the drawer check', async () => {
    render(<AllSurfaces initial={makeMule('sync-1', { selectedBosses: [HARD_LUCID] })} />);

    // Nothing marked yet — no roster check, no drawer beside-name check.
    expect(weeklyRosterChecks()).toHaveLength(0);
    expect(drawerWeeklyCheck()).toBeNull();

    await clickDrawerWeekly();

    // Both roster surfaces (Card Lv pill + List View row) light their check and
    // the Drawer's beside-name check appears — all from the same updated `mule`.
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyCheck()).toBeTruthy();
  });

  it('clearing the mark on the Drawer kebab removes the roster checks and the drawer check', async () => {
    render(<AllSurfaces initial={makeMule('sync-2', { selectedBosses: [HARD_LUCID] })} />);

    await clickDrawerWeekly();
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));

    // The menu stays open after a selection (stay-open) with the row re-worded
    // in place as the inverse action — clear by clicking it directly, no
    // re-open.
    const row = await screen.findByRole('menuitem', {
      name: /weekly incomplete/i,
      hidden: true,
    });
    fireEvent.click(row);
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(0));
    expect(drawerWeeklyCheck()).toBeNull();
  });
});

describe('Clear Marks — Mark As Menu writer cross-surface sync', () => {
  // The Mark As Menu (and its portalled popup) sit outside the modal Drawer's
  // active layer, so they render behind its inert / aria-hidden veil. Drive
  // them by data-attribute off the document (bypassing the a11y-tree veil) and
  // with fireEvent (inert blocks user pointer interaction, not programmatic
  // events) — the menu's keyboard-reachability is covered in the RosterHeader
  // suite, which renders it outside any modal.
  // Rows are directional (Weekly Complete / Weekly Incomplete), mirroring the
  // Mule Actions Menu kebab's option set.
  function clickWeeklyRow(direction: 'complete' | 'incomplete') {
    fireEvent.click(
      document.querySelector(`[data-mark-as-row="weekly-${direction}"]`) as HTMLElement,
    );
  }

  async function chooseWeekly(direction: 'complete' | 'incomplete') {
    fireEvent.click(document.querySelector('[data-mark-as-trigger]') as HTMLElement);
    await waitFor(() =>
      expect(document.querySelector(`[data-mark-as-row="weekly-${direction}"]`)).toBeTruthy(),
    );
    clickWeeklyRow(direction);
  }

  it('a weekly mark applied via the Mark As Menu lights the check on all three surfaces', async () => {
    render(
      <AllSurfacesWithMarkAsMenu
        initial={makeMule('bulk-1', { selectedBosses: [HARD_LUCID_WEEKLY] })}
      />,
    );

    expect(weeklyRosterChecks()).toHaveLength(0);

    await chooseWeekly('complete');

    // Card Lv pill · List View row light up, and the Drawer's beside-name check
    // appears — all from the same `mule` (#324 restored the read-only drawer
    // check and made the Mule Actions Menu the drawer's sole writer).
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyCheck()).toBeTruthy();
  });

  it('choosing the Incomplete row clears the mark back off across all surfaces', async () => {
    render(
      <AllSurfacesWithMarkAsMenu
        initial={makeMule('bulk-2', { selectedBosses: [HARD_LUCID_WEEKLY] })}
      />,
    );

    await chooseWeekly('complete');
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyCheck()).toBeTruthy();

    // The Mark As Menu stays open after a selection — choose the inverse row
    // directly without re-clicking the trigger (which would just close it).
    clickWeeklyRow('incomplete');
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(0));
    expect(drawerWeeklyCheck()).toBeNull();
  });
});

// ── #325 Mule Actions Menu kebab — cross-surface sync ────────────────────────
//
// #324 landed the drawer consolidation; this sweep proves the kebab seam
// end-to-end. Every surface (Card, Row, Drawer) mounts the always-visible
// **Mule Actions Menu**, all threaded to the same `mule`. Driving the kebab on
// one surface must land the write on all three: a Clear Mark lights the
// **Completion Checks** everywhere, an Active flip dims the roster items and
// flips the **Active Status Chip**, and a Delete removes the mule from every
// surface with an undo toast that restores it.

function cardEl(id: string) {
  return document.querySelector(`[data-mule-card="${id}"]`) as HTMLElement;
}
function rowEl(id: string) {
  return document.querySelector(`[data-mule-row="${id}"]`) as HTMLElement;
}

// Open a surface's always-visible kebab. Roster surfaces sit behind the modal
// Drawer's inert veil, so query with `hidden` (a superset that also matches the
// non-inert Drawer trigger) and drive with fireEvent — inert blocks a user's
// pointer, not a programmatic event. The menu portals its rows to the body;
// they carry the same inert veil, hence `hidden` on the row query too.
function openKebab(container: HTMLElement) {
  const trigger = within(container).getByRole('button', { name: /mule actions/i, hidden: true });
  fireEvent.click(trigger);
}

async function clickMenuItem(name: RegExp) {
  const item = await screen.findByRole('menuitem', { name, hidden: true });
  fireEvent.click(item);
}

describe('Mule Actions Menu — Clear Mark cross-surface sync (Card kebab)', () => {
  it('a weekly mark set on the Card kebab lights both roster checks and the drawer check', async () => {
    render(<AllSurfaces initial={makeMule('kebab-mark-1', { selectedBosses: [HARD_LUCID] })} />);

    // The read-only Crystal Tally is a counts display, not a mark surface: the
    // weekly plate reads a bare `1` (one weekly Slate Key), never `1/14`, and
    // never changes as marks come and go.
    const weeklyTally = within(drawerSheet()).getByLabelText('Weekly boss selections');
    expect(weeklyTally.textContent).toBe('1');
    expect(weeklyTally.textContent).not.toContain('/14');

    expect(weeklyRosterChecks()).toHaveLength(0);
    expect(drawerWeeklyCheck()).toBeNull();

    openKebab(cardEl('kebab-mark-1'));
    await clickMenuItem(/weekly complete/i);

    // Card Lv pill + List View row light up, and the Drawer's beside-name check
    // appears — all from the same updated `mule`.
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyCheck()).toBeTruthy();

    // Tally count is unaffected by the mark — still a bare read-only `1`.
    expect(within(drawerSheet()).getByLabelText('Weekly boss selections').textContent).toBe('1');
  });

  it('clearing the mark on the Card kebab removes the checks on every surface', async () => {
    render(<AllSurfaces initial={makeMule('kebab-mark-2', { selectedBosses: [HARD_LUCID] })} />);

    openKebab(cardEl('kebab-mark-2'));
    await clickMenuItem(/weekly complete/i);
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));

    // The menu stays open after a selection (stay-open), its row re-worded in
    // place as the inverse action (Incomplete) — click it without re-opening.
    await clickMenuItem(/weekly incomplete/i);
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(0));
    expect(drawerWeeklyCheck()).toBeNull();
  });
});

describe('Mule Actions Menu — Active Flag cross-surface sync', () => {
  function statusChip() {
    return within(drawerSheet()).getByTestId('active-status-chip');
  }
  const roleDim = (id: string) => ({
    card: cardEl(id).querySelector('[data-inactive-dim]'),
    row: rowEl(id).querySelector('[data-inactive-dim]'),
  });

  it('a Set Inactive flip on the Card kebab dims both roster items and flips the drawer status chip', async () => {
    render(<AllSurfaces initial={makeMule('active-1', { active: true })} />);

    // Active: no dim overlay on either roster item, chip reads Active.
    expect(roleDim('active-1').card).toBeNull();
    expect(roleDim('active-1').row).toBeNull();
    expect(statusChip().getAttribute('aria-label')).toBe('Active');

    openKebab(cardEl('active-1'));
    await clickMenuItem(/set inactive/i);

    // Both roster items paint their dim overlay and the read-only chip flips.
    await waitFor(() => expect(roleDim('active-1').card).not.toBeNull());
    expect(roleDim('active-1').row).not.toBeNull();
    expect(statusChip().getAttribute('aria-label')).toBe('Inactive');
  });

  it('a Set Active flip on the Drawer kebab un-dims both roster items and flips the chip back', async () => {
    render(<AllSurfaces initial={makeMule('active-2', { active: false })} />);

    // Inactive: both roster items dimmed, chip reads Inactive.
    expect(roleDim('active-2').card).not.toBeNull();
    expect(roleDim('active-2').row).not.toBeNull();
    expect(statusChip().getAttribute('aria-label')).toBe('Inactive');

    openKebab(drawerSheet());
    await clickMenuItem(/set active/i);

    await waitFor(() => expect(statusChip().getAttribute('aria-label')).toBe('Active'));
    expect(roleDim('active-2').card).toBeNull();
    expect(roleDim('active-2').row).toBeNull();
  });
});

// Delete + undo needs a harness that actually drops the mule from state and
// fires the real undo toast — mirroring the Dashboard's `useMuleActions`
// deleteMule (snapshot → remove → toast.success with an Undo action that
// restores the snapshot). A real <Toaster> is mounted so Undo is clickable.
function AllSurfacesDeletable({ initial }: { initial: Mule }) {
  const [mule, setMule] = useState<Mule | null>(initial);

  // Route the live mule through a ref so `onDelete` can read it without listing
  // it in deps (keeps the callback identity-stable, as the real hook does).
  const muleRef = useRef(mule);
  useEffect(() => {
    muleRef.current = mule;
  }, [mule]);

  const onUpdate = useCallback((id: string, patch: Partial<Mule>) => {
    setMule((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const onDelete = useCallback((id: string) => {
    const snapshot = muleRef.current;
    if (!snapshot || snapshot.id !== id) return;
    setMule(null);
    toast.success('Successfully deleted', {
      description: `${snapshot.name.trim() || 'Mule'} removed from roster`,
      action: { label: 'Undo', onClick: () => setMule(snapshot) },
    });
  }, []);

  const noop = useCallback(() => {}, []);

  return (
    <>
      <Toaster />
      {mule && (
        <>
          <DndContext>
            <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
              <MuleCharacterCard
                mule={mule}
                onClick={noop}
                updateMule={onUpdate}
                onDelete={onDelete}
                metrics={metricsFor(mule)}
              />
              <MuleListRow
                mule={mule}
                metrics={metricsFor(mule)}
                onClick={noop}
                updateMule={onUpdate}
                onDelete={onDelete}
              />
            </SortableContext>
          </DndContext>
          <MuleDetailDrawer
            mule={mule}
            metrics={metricsFor(mule)}
            open
            onClose={noop}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </>
      )}
    </>
  );
}

describe('Mule Actions Menu — Delete + undo cross-surface sync', () => {
  it('a Delete on the Card kebab removes the mule from every surface, then Undo restores it everywhere', async () => {
    render(<AllSurfacesDeletable initial={makeMule('del-1', { name: 'Doomed' })} />);

    // Present on all three surfaces to start.
    expect(cardEl('del-1')).not.toBeNull();
    expect(rowEl('del-1')).not.toBeNull();
    expect(drawerSheet()).not.toBeNull();

    openKebab(cardEl('del-1'));
    await clickMenuItem(/^delete$/i);

    // Gone from Card, Row, and Drawer at once (they all read the one `mule`).
    await waitFor(() => expect(cardEl('del-1')).toBeNull());
    expect(rowEl('del-1')).toBeNull();
    expect(drawerSheet()).toBeNull();

    // The undo toast is the sole recovery path — click it.
    const undo = await screen.findByRole('button', { name: /undo/i });
    fireEvent.click(undo);

    // Restored on every surface.
    await waitFor(() => expect(cardEl('del-1')).not.toBeNull());
    expect(rowEl('del-1')).not.toBeNull();
    expect(drawerSheet()).not.toBeNull();
  });
});
