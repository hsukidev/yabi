import { describe, expect, it } from 'vitest';
import { useCallback, useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { MuleCharacterCard } from '../MuleCharacterCard';
import { MuleListRow } from '../MuleListRow';
import { MuleDetailDrawer } from '../MuleDetailDrawer';
import { MarkAsMenu } from '../MarkAsMenu';
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
          <MuleListRow mule={mule} metrics={metrics} onClick={noop} />
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
// mirrors Dashboard's `handleBulkMarkAs` (per-mule toggle across eligible
// selected mules), proving the seam extends to the bulk writer, not just the
// drawer kebab.
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

  const onMarkAs = useCallback((kind: ClearMarkKind) => {
    setMule((prev) => {
      const m = metricsFor(prev);
      if (!isMarkEligible(m, kind)) return prev;
      const now = Date.now();
      return { ...prev, ...clearMarkUpdate(kind, !isMarkValid(prev, kind, now), now) };
    });
  }, []);

  return (
    <>
      <MarkAsMenu selectedCount={1} eligibleCounts={eligibleCounts} onMarkAs={onMarkAs} />
      <DndContext>
        <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
          <MuleCharacterCard
            mule={mule}
            onClick={noop}
            updateMule={onUpdate}
            onDelete={noop}
            metrics={metrics}
          />
          <MuleListRow mule={mule} metrics={metrics} onClick={noop} />
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

// The Drawer's beside-name Completion Check is gone (#316) — mark state lives
// on the tally's Mark Toggle. So the Drawer surface is read via the toggle's
// aria-pressed, and the roster surfaces via their Completion Check imgs.
function drawerWeeklyToggle() {
  const sheet = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
  return within(sheet).getByRole('button', { name: /weekly (in)?complete/i });
}

// Card Lv pill + List View row = two roster Completion Check imgs when marked
// (the Drawer no longer contributes an img). Both background surfaces are inert
// behind the modal, hence `hidden: true`.
const weeklyRosterChecks = () =>
  screen.queryAllByRole('img', { name: 'Weekly complete', hidden: true });

describe('Clear Marks — cross-surface sync (Card · Row · Drawer)', () => {
  it('a weekly mark set on the Drawer Mark Toggle lights the roster checks and presses the toggle', async () => {
    render(<AllSurfaces initial={makeMule('sync-1', { selectedBosses: [HARD_LUCID] })} />);

    // Nothing marked yet — no roster check, toggle un-pressed.
    expect(weeklyRosterChecks()).toHaveLength(0);
    expect(drawerWeeklyToggle().getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(drawerWeeklyToggle());

    // Both roster surfaces (Card Lv pill + List View row) light their check and
    // the Drawer toggle flips to pressed — all from the same updated `mule`.
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyToggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('clearing the mark on the Drawer Mark Toggle removes the roster checks and un-presses the toggle', async () => {
    render(<AllSurfaces initial={makeMule('sync-2', { selectedBosses: [HARD_LUCID] })} />);

    fireEvent.click(drawerWeeklyToggle());
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));

    fireEvent.click(drawerWeeklyToggle());
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(0));
    expect(drawerWeeklyToggle().getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Clear Marks — Mark As Menu writer cross-surface sync', () => {
  // The Mark As Menu (and its portalled popup) sit outside the modal Drawer's
  // active layer, so they render behind its inert / aria-hidden veil. Drive
  // them by data-attribute off the document (bypassing the a11y-tree veil) and
  // with fireEvent (inert blocks user pointer interaction, not programmatic
  // events) — the menu's keyboard-reachability is covered in the RosterHeader
  // suite, which renders it outside any modal.
  async function chooseWeekly() {
    fireEvent.click(document.querySelector('[data-mark-as-trigger]') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-mark-as-row="weekly"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-mark-as-row="weekly"]') as HTMLElement);
  }

  it('a weekly mark applied via the Mark As Menu lights the check on all three surfaces', async () => {
    render(
      <AllSurfacesWithMarkAsMenu
        initial={makeMule('bulk-1', { selectedBosses: [HARD_LUCID_WEEKLY] })}
      />,
    );

    expect(weeklyRosterChecks()).toHaveLength(0);

    await chooseWeekly();

    // Card Lv pill · List View row light up, and the Drawer's tally toggle
    // presses — all from the same `mule` (#316 replaced the Drawer's
    // beside-name check with the tally Mark Toggle).
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyToggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('re-choosing the same row toggles the mark back off across all surfaces', async () => {
    render(
      <AllSurfacesWithMarkAsMenu
        initial={makeMule('bulk-2', { selectedBosses: [HARD_LUCID_WEEKLY] })}
      />,
    );

    await chooseWeekly();
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(2));
    expect(drawerWeeklyToggle().getAttribute('aria-pressed')).toBe('true');

    await chooseWeekly();
    await waitFor(() => expect(weeklyRosterChecks()).toHaveLength(0));
    expect(drawerWeeklyToggle().getAttribute('aria-pressed')).toBe('false');
  });
});
