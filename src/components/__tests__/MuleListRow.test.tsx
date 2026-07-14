import { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MuleListRow } from '../MuleListRow';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';
import { currentDailyStamp, currentWeeklyStamp, currentBmStamp } from '../../utils/cycle';
import { rosterRowMetrics, type RosterRowMetrics } from '../rosterRowMetrics';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
const HARD_LUCID = `${LUCID}:hard:weekly`;
const NORMAL_HILLA_DAILY = `${HILLA}:normal:daily`;

const baseMule: Mule = {
  id: 'row-mule-1',
  name: 'RowMule',
  level: 250,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

const baseMetrics: RosterRowMetrics = {
  weeklyCount: 8,
  dailyCount: 3,
  monthlyCount: 1,
  postCapMeso: 1_500_000_000,
  displayedWeeklyMeso: { meso: 1_500_000_000, source: 'contributed', muted: false },
  sharePct: 0.095,
  droppedKeys: new Map(),
};

interface RenderRowOpts {
  mule?: Partial<Mule>;
  metrics?: Partial<RosterRowMetrics>;
  onClick?: (id: string) => void;
  updateMule?: (id: string, patch: Partial<Mule>) => void;
  onDelete?: (id: string) => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function renderRow(opts: RenderRowOpts = {}) {
  const onClick = opts.onClick ?? vi.fn();
  const onToggleSelect = opts.onToggleSelect ?? vi.fn();
  const updateMule = opts.updateMule ?? vi.fn();
  const onDelete = opts.onDelete ?? vi.fn();
  const mule: Mule = { ...baseMule, ...opts.mule };
  const metrics: RosterRowMetrics = { ...baseMetrics, ...opts.metrics };
  return {
    ...render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={verticalListSortingStrategy}>
          <MuleListRow
            mule={mule}
            metrics={metrics}
            onClick={onClick}
            updateMule={updateMule}
            onDelete={onDelete}
            bulkMode={opts.bulkMode ?? false}
            selected={opts.selected ?? false}
            onToggleSelect={onToggleSelect}
          />
        </SortableContext>
      </DndContext>,
    ),
    onClick,
    onToggleSelect,
    updateMule,
    onDelete,
    mule,
  };
}

describe('MuleListRow — comfy spec', () => {
  it('renders the mule name', () => {
    renderRow();
    expect(screen.getByText('RowMule')).toBeTruthy();
  });

  it('renders the mule class label', () => {
    renderRow();
    expect(screen.getByText('Hero')).toBeTruthy();
  });

  it('renders Lv.N pill', () => {
    renderRow();
    expect(screen.getByText('Lv.250')).toBeTruthy();
  });

  it('renders the Weekly metric block labeled "Weekly count" with N/14', () => {
    renderRow();
    expect(screen.getByLabelText(/weekly count/i)).toBeTruthy();
    // The fraction may be split between accent + muted spans; assert against
    // the row's text content.
    const row = screen.getByTestId('mule-row-row-mule-1');
    expect(row.textContent).toMatch(/8\s*\/\s*14/);
  });

  it('renders the Daily metric block labeled "Daily count" with a bare N (no denominator)', () => {
    renderRow();
    expect(screen.getByLabelText(/daily count/i)).toBeTruthy();
    const row = screen.getByTestId('mule-row-row-mule-1');
    expect(row.textContent).toMatch(/3/);
    // A `3/7`-style daily fraction would imply a denominator we don't want.
    expect(row.textContent).not.toMatch(/3\s*\/\s*7/);
  });

  it('renders the Monthly metric block labeled "Monthly count" with a bare N (no denominator)', () => {
    renderRow();
    const monthly = screen.getByLabelText(/monthly count/i);
    expect(monthly.querySelector('img[src$="monthly-crystal.png"]')).toBeTruthy();
    expect(monthly.textContent).toBe('1');
    expect(monthly.textContent).not.toMatch(/1\s*\/\s*1/);
  });

  it('renders the slate weekly-basis Daily count used by the drawer header', () => {
    const mule: Mule = { ...baseMule, selectedBosses: [NORMAL_HILLA_DAILY] };
    const metrics = rosterRowMetrics(mule, undefined, 0);
    renderRow({ mule, metrics });
    expect(screen.getByLabelText(/daily count/i).textContent).toMatch(/7/);
    const row = screen.getByTestId('mule-row-row-mule-1');
    expect(row.textContent).not.toMatch(/7\s*\/\s*7/);
  });

  it('renders the Displayed Weekly Meso figure (abbreviated by default)', () => {
    renderRow();
    expect(screen.getByText('1.5B')).toBeTruthy();
  });

  it('renders a share-of-roster percentage', () => {
    renderRow();
    const row = screen.getByTestId('mule-row-row-mule-1');
    expect(row.textContent).toMatch(/9\.5%\s*SHARE/);
  });

  it('renders the CharacterAvatar (data-testid=card-avatar)', () => {
    renderRow();
    expect(screen.getByTestId('card-avatar')).toBeTruthy();
  });

  it('calls onClick(mule.id) when the row is clicked', () => {
    const { onClick } = renderRow();
    fireEvent.click(screen.getByText('RowMule'));
    expect(onClick).toHaveBeenCalledWith('row-mule-1');
  });

  it('renders an active mule without the inactive dim overlay', () => {
    const { container } = renderRow();
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.querySelector('[data-inactive-dim]')).toBeNull();
  });

  it('dims an inactive mule with the inactive dim overlay', () => {
    const { container } = renderRow({ mule: { active: false } });
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.querySelector('[data-inactive-dim]')).toBeTruthy();
  });
});

describe('MuleListRow — drag handle', () => {
  const HANDLE = /drag to reorder/i;

  it('renders the drag handle as a focusable button in non-bulk mode', () => {
    renderRow();
    const handle = screen.getByRole('button', { name: HANDLE });
    expect(handle.tagName.toLowerCase()).toBe('button');
  });

  it('clicking the drag handle does not invoke the row onClick', () => {
    const onClick = vi.fn();
    renderRow({ onClick });
    fireEvent.click(screen.getByRole('button', { name: HANDLE }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('the dnd-kit sortable activator is the handle, not the row body', () => {
    const { container } = renderRow();
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    const handle = screen.getByRole('button', { name: HANDLE });
    expect(row.getAttribute('aria-roledescription')).toBeNull();
    expect(handle.getAttribute('aria-roledescription')).toBe('sortable');
  });

  it('the row body keeps role=button and tabIndex=0 so keyboard Enter/Space still activates the drawer', () => {
    const { container } = renderRow();
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.getAttribute('role')).toBe('button');
    expect(row.getAttribute('tabindex')).toBe('0');
  });

  it('Enter on the row body fires onClick (drawer-open path is keyboard-accessible)', () => {
    const onClick = vi.fn();
    const { container } = renderRow({ onClick });
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith('row-mule-1');
  });

  it('the drag handle stretches to fill its grid cell so the hit zone matches the column', () => {
    renderRow();
    const handle = screen.getByRole('button', { name: HANDLE });
    expect(handle.style.width).toBe('100%');
    expect(handle.style.height).toBe('100%');
  });
});

describe('MuleListRow — bulk mode', () => {
  it('replaces the drag handle with a destructive checkbox when bulkMode = true', () => {
    const { container } = renderRow({ bulkMode: true });
    const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute('aria-hidden')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /drag to reorder/i })).toBeNull();
  });

  it('selected row picks up destructive border + soft destructive bg', () => {
    const { container } = renderRow({ bulkMode: true, selected: true });
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    const compound = row.style.borderColor + row.style.background;
    expect(compound).toMatch(/destructive/);
  });

  it('clicking the row in bulk mode fires onToggleSelect (not onClick)', () => {
    const onClick = vi.fn();
    const onToggleSelect = vi.fn();
    renderRow({ bulkMode: true, onClick, onToggleSelect });
    fireEvent.click(screen.getByText('RowMule'));
    expect(onToggleSelect).toHaveBeenCalledWith('row-mule-1');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('selected row shows the check icon inside the indicator', () => {
    const { container } = renderRow({ bulkMode: true, selected: true });
    const indicator = container.querySelector('[data-selection-indicator]') as HTMLElement;
    expect(indicator.querySelector('svg')).toBeTruthy();
  });
});

describe('MuleListRow — inline Completion Checks', () => {
  const NOW = Date.UTC(2026, 6, 11, 12, 0, 0); // 2026-07-11 12:00 UTC

  it('renders no checks when the mule has no valid marks', () => {
    renderRow();
    expect(screen.queryByRole('img', { name: /complete/i })).toBeNull();
  });

  it('renders all three checks in daily → weekly → BM order when all marks are valid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      renderRow({
        mule: {
          dailyClearMark: currentDailyStamp(NOW),
          weeklyClearMark: currentWeeklyStamp(NOW),
          bmClearMark: currentBmStamp(NOW),
        },
      });
      const checks = screen.getAllByRole('img', { name: /complete/i });
      expect(checks.map((c) => c.getAttribute('aria-label'))).toEqual([
        'Daily complete',
        'Weekly complete',
        'BM complete',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders the checks inside the Lv.X pill (identity cluster), mirroring the Card', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const { container } = renderRow({ mule: { dailyClearMark: currentDailyStamp(NOW) } });
      const pill = container.querySelector('[data-row-level]') as HTMLElement;
      expect(pill.textContent).toMatch(/Lv\./);
      const check = screen.getByRole('img', { name: 'Daily complete' });
      expect(pill.contains(check)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not render a check for a stale (past-cycle) mark', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      renderRow({ mule: { dailyClearMark: '2026-07-10' } });
      expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('expires a check live at the cycle boundary with no reload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      renderRow({ mule: { dailyClearMark: currentDailyStamp(NOW) } });
      expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1000);
      });

      expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides checks in bulk mode', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      renderRow({ mule: { dailyClearMark: currentDailyStamp(NOW) }, bulkMode: true });
      expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('MuleListRow — notes indicator', () => {
  const ICON = /show character notes/i;

  it('does not render the notes icon when notes are empty', () => {
    renderRow({ mule: { notes: undefined } });
    expect(screen.queryByRole('button', { name: ICON })).toBeNull();
  });

  it('does not render the notes icon when notes are whitespace-only', () => {
    renderRow({ mule: { notes: '  \n\t ' } });
    expect(screen.queryByRole('button', { name: ICON })).toBeNull();
  });

  it('renders the notes icon next to the name when notes are non-empty', () => {
    renderRow({ mule: { notes: 'main mule, owes legion levels' } });
    const icon = screen.getByRole('button', { name: ICON });
    expect(icon).toBeTruthy();
  });

  it('does not render the notes icon in bulk mode', () => {
    renderRow({ mule: { notes: 'note' }, bulkMode: true });
    expect(screen.queryByRole('button', { name: ICON })).toBeNull();
  });

  it('clicking the notes icon does not invoke the row onClick', () => {
    const onClick = vi.fn();
    renderRow({ mule: { notes: 'note' }, onClick });
    fireEvent.click(screen.getByRole('button', { name: ICON }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('MuleListRow — Mule Actions Menu (kebab)', () => {
  const getKebab = () => screen.getByRole('button', { name: /mule actions/i });
  const openMenu = async () => {
    fireEvent.click(getKebab());
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  };
  // All three cadences eligible by default via the metric counts.
  const ELIGIBLE = { weeklyCount: 5, dailyCount: 5, monthlyCount: 5 };

  it('renders an always-visible kebab with an accessible label on the row', () => {
    renderRow();
    expect(getKebab()).toBeTruthy();
    expect(getKebab().tagName).toBe('BUTTON');
  });

  it('is not rendered in bulk mode', () => {
    renderRow({ bulkMode: true });
    expect(screen.queryByRole('button', { name: /mule actions/i })).toBeNull();
  });

  describe('row wording (action, inverse of current state)', () => {
    it('reads "Set Inactive" for an active mule and flips it inactive', async () => {
      const { updateMule } = renderRow({ mule: { active: true } });
      await openMenu();
      expect(screen.queryByText('Set Active')).toBeNull();
      fireEvent.click(screen.getByText('Set Inactive'));
      expect(updateMule).toHaveBeenCalledWith('row-mule-1', { active: false });
    });

    it('reads "Set Active" for an inactive mule and flips it active', async () => {
      const { updateMule } = renderRow({ mule: { active: false } });
      await openMenu();
      fireEvent.click(screen.getByText('Set Active'));
      expect(updateMule).toHaveBeenCalledWith('row-mule-1', { active: true });
    });

    it('reads "Daily Complete" / stamps the daily mark when daily-eligible', async () => {
      const { updateMule } = renderRow({ metrics: ELIGIBLE });
      await openMenu();
      fireEvent.click(screen.getByText('Daily Complete'));
      expect(updateMule).toHaveBeenCalledWith(
        'row-mule-1',
        expect.objectContaining({ dailyClearMark: expect.any(String) }),
      );
    });

    it('reads "Weekly Incomplete" when marked and clears the weekly mark', async () => {
      const { updateMule } = renderRow({
        metrics: ELIGIBLE,
        mule: { weeklyClearMark: currentWeeklyStamp(Date.now()) },
      });
      await openMenu();
      fireEvent.click(screen.getByText('Weekly Incomplete'));
      expect(updateMule).toHaveBeenCalledWith('row-mule-1', { weeklyClearMark: undefined });
    });

    it('reads "BM Complete" / stamps the BM mark when BM-eligible', async () => {
      const { updateMule } = renderRow({ metrics: ELIGIBLE });
      await openMenu();
      fireEvent.click(screen.getByText('BM Complete'));
      expect(updateMule).toHaveBeenCalledWith(
        'row-mule-1',
        expect.objectContaining({ bmClearMark: expect.any(String) }),
      );
    });
  });

  describe('cadence-based row hiding (canonical Mark-eligibility)', () => {
    it('hides the Daily row when the mule has zero daily keys', async () => {
      renderRow({ metrics: { weeklyCount: 5, dailyCount: 0, monthlyCount: 5 } });
      await openMenu();
      expect(screen.queryByText('Daily Complete')).toBeNull();
      // A weekly key keeps the mule weekly-eligible.
      expect(screen.getByText('Weekly Complete')).toBeTruthy();
    });

    it('hides the BM row when the mule has zero monthly keys', async () => {
      renderRow({ metrics: { weeklyCount: 5, dailyCount: 5, monthlyCount: 0 } });
      await openMenu();
      expect(screen.queryByText('BM Complete')).toBeNull();
    });

    it('hides every cadence row on a boss-less mule (only Set Active/Inactive + Delete)', async () => {
      renderRow({ metrics: { weeklyCount: 0, dailyCount: 0, monthlyCount: 0 } });
      await openMenu();
      expect(screen.queryByText('Weekly Complete')).toBeNull();
      expect(screen.queryByText('Daily Complete')).toBeNull();
      expect(screen.queryByText('BM Complete')).toBeNull();
      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(2); // Set Inactive + Delete
    });
  });

  describe('Delete (instant, no confirmation)', () => {
    it('fires onDelete immediately with no confirmation prompt', async () => {
      const { onDelete, onClick } = renderRow();
      await openMenu();
      expect(screen.queryByText('Delete?')).toBeNull();
      fireEvent.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalledWith('row-mule-1');
      expect(screen.queryByText('Delete?')).toBeNull();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('activation swallowing (drawer / drag)', () => {
    // Render the row inside an ancestor carrying React (synthetic) handlers —
    // the same layer the row's own click-to-open and dnd-kit drag listeners
    // live on. The menu's guard `stopPropagation` stops the synthetic bubble,
    // so a guarded event reaches neither the row body nor these spies.
    function renderGuarded(overrides: Partial<Mule> = {}) {
      const onAncestorPointerDown = vi.fn();
      const onAncestorClick = vi.fn();
      const onClick = vi.fn();
      const mule: Mule = { ...baseMule, ...overrides };
      render(
        <div onPointerDown={onAncestorPointerDown} onClick={onAncestorClick}>
          <DndContext>
            <SortableContext items={[mule.id]} strategy={verticalListSortingStrategy}>
              <MuleListRow
                mule={mule}
                metrics={baseMetrics}
                onClick={onClick}
                updateMule={vi.fn()}
                onDelete={vi.fn()}
                onToggleSelect={vi.fn()}
              />
            </SortableContext>
          </DndContext>
        </div>,
      );
      return { onAncestorPointerDown, onAncestorClick, onClick };
    }

    it('opening the kebab never opens the drawer', async () => {
      const { onClick } = renderRow();
      await openMenu();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('selecting a menu item never opens the drawer', async () => {
      const { onClick } = renderRow({ metrics: ELIGIBLE });
      await openMenu();
      fireEvent.click(screen.getByText('Weekly Complete'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('swallows pointerdown so a dnd-kit drag never starts from the kebab', () => {
      const { onAncestorPointerDown, onClick } = renderGuarded();
      fireEvent.pointerDown(getKebab());
      expect(onAncestorPointerDown).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('swallows a click on the kebab so it never reaches the row body', () => {
      const { onAncestorClick, onClick } = renderGuarded();
      fireEvent.click(getKebab());
      expect(onAncestorClick).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('live reflection on the row (write-through updateMule)', () => {
    // A stateful row whose `updateMule` merges the patch back into the rendered
    // mule — proves a kebab write reflects immediately in the row's own Lv-pill
    // Completion Checks and dim overlay (not just that the writer was called).
    function StatefulRow({ initial }: { initial: Mule }) {
      const [mule, setMule] = useState(initial);
      const updateMule = useCallback((id: string, patch: Partial<Mule>) => {
        setMule((prev) => (prev.id === id ? { ...prev, ...patch } : prev));
      }, []);
      return (
        <DndContext>
          <SortableContext items={[mule.id]} strategy={verticalListSortingStrategy}>
            <MuleListRow
              mule={mule}
              metrics={{ ...baseMetrics, weeklyCount: 5, dailyCount: 5, monthlyCount: 5 }}
              onClick={vi.fn()}
              updateMule={updateMule}
              onDelete={vi.fn()}
            />
          </SortableContext>
        </DndContext>
      );
    }

    const openStateful = async () => {
      fireEvent.click(screen.getByRole('button', { name: /mule actions/i }));
      await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    };

    it('flipping active on adds/removes the inactive dim overlay live', async () => {
      const { container } = render(<StatefulRow initial={{ ...baseMule, active: false }} />);
      const row = container.querySelector('[data-mule-row]') as HTMLElement;
      expect(row.querySelector('[data-inactive-dim]')).toBeTruthy();
      await openStateful();
      fireEvent.click(screen.getByText('Set Active'));
      expect(row.querySelector('[data-inactive-dim]')).toBeNull();
    });

    it('marking daily complete shows the daily Completion Check in the Lv pill live', async () => {
      render(<StatefulRow initial={{ ...baseMule }} />);
      expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
      await openStateful();
      fireEvent.click(screen.getByText('Daily Complete'));
      expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();
    });
  });
});

describe('MuleListRow — metric labels', () => {
  it('eyebrow icons/labels are tagged with [data-row-eyebrow] so the <480px media rule can hide them', () => {
    const { container } = renderRow();
    expect(container.querySelectorAll('[data-row-eyebrow]').length).toBeGreaterThanOrEqual(3);
  });
});

describe('MuleListRow — dropped-cap indicator', () => {
  const ICON = /show bosses dropped to cap/i;

  it('does not render the icon when droppedKeys is empty', () => {
    renderRow();
    expect(screen.queryByRole('button', { name: ICON })).toBeNull();
  });

  it('renders the icon when droppedKeys has entries', () => {
    const droppedKeys = new Map([[HARD_LUCID, 1]]);
    renderRow({ metrics: { droppedKeys } });
    expect(screen.getByRole('button', { name: ICON })).toBeTruthy();
  });

  it('does not render the icon in bulk mode regardless of droppedKeys', () => {
    const droppedKeys = new Map([[HARD_LUCID, 1]]);
    renderRow({ metrics: { droppedKeys }, bulkMode: true });
    expect(screen.queryByRole('button', { name: ICON })).toBeNull();
  });

  it('clicking the dropped-cap icon does not invoke the row onClick', () => {
    const onClick = vi.fn();
    const droppedKeys = new Map([[HARD_LUCID, 1]]);
    renderRow({ metrics: { droppedKeys }, onClick });
    fireEvent.click(screen.getByRole('button', { name: ICON }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
