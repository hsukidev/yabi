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

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const HARD_LUCID_WEEKLY = `${LUCID}:hard:weekly`;

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

  // Mirrors Dashboard's `handleSetMark` (the roster kebabs' mark path).
  const onSetMark = useCallback((id: string, kind: ClearMarkKind, marked: boolean) => {
    setMule((prev) =>
      prev.id === id ? { ...prev, ...clearMarkUpdate(kind, marked, Date.now()) } : prev,
    );
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
            onToggleActive={noop}
            onSetMark={onSetMark}
            metrics={metrics}
          />
          <MuleListRow
            mule={mule}
            metrics={metrics}
            onClick={noop}
            onToggleActive={noop}
            onSetMark={onSetMark}
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
            onToggleActive={noop}
            onSetMark={noop}
            metrics={metrics}
          />
          <MuleListRow
            mule={mule}
            metrics={metrics}
            onClick={noop}
            onToggleActive={noop}
            onSetMark={noop}
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

async function openDrawerMenu() {
  const sheet = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
  const kebab = within(sheet).getByRole('button', { name: /mule actions/i });
  fireEvent.click(kebab);
  await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
}

const weeklyChecks = () => screen.queryAllByRole('img', { name: 'Weekly complete', hidden: true });

describe('Clear Marks — cross-surface sync (Card · Row · Drawer)', () => {
  it('a weekly mark set on the Drawer lights the Completion Check on all three surfaces at once', async () => {
    render(<AllSurfaces initial={makeMule('sync-1')} />);

    // Nothing marked yet — no Completion Check on any surface.
    expect(weeklyChecks()).toHaveLength(0);

    await openDrawerMenu();
    fireEvent.click(screen.getByText('Weekly Complete'));

    // One check per surface — Card Lv pill, List View row, Drawer header — all
    // derived from the same updated `mule`, no reload.
    await waitFor(() => expect(weeklyChecks()).toHaveLength(3));
  });

  it('clearing the mark on the Drawer removes the check from all three surfaces', async () => {
    render(<AllSurfaces initial={makeMule('sync-2')} />);

    await openDrawerMenu();
    fireEvent.click(screen.getByText('Weekly Complete'));
    await waitFor(() => expect(weeklyChecks()).toHaveLength(3));

    await openDrawerMenu();
    fireEvent.click(screen.getByText('Weekly Incomplete'));
    await waitFor(() => expect(weeklyChecks()).toHaveLength(0));
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

    expect(weeklyChecks()).toHaveLength(0);

    await chooseWeekly();

    // Card Lv pill · List View row · Drawer header — all from the same `mule`.
    await waitFor(() => expect(weeklyChecks()).toHaveLength(3));
  });

  it('re-choosing the same row toggles the mark back off across all surfaces', async () => {
    render(
      <AllSurfacesWithMarkAsMenu
        initial={makeMule('bulk-2', { selectedBosses: [HARD_LUCID_WEEKLY] })}
      />,
    );

    await chooseWeekly();
    await waitFor(() => expect(weeklyChecks()).toHaveLength(3));

    await chooseWeekly();
    await waitFor(() => expect(weeklyChecks()).toHaveLength(0));
  });
});
