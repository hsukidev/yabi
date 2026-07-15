import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  mockMatchMedia,
  restoreMatchMedia,
} from '../../test/test-utils';
import { RosterHeader } from '../RosterHeader';
import type { WorldId } from '../../data/worlds';

const mockCoarsePointer = () => mockMatchMedia((q) => q.includes('pointer: coarse'));

function renderHeader(
  overrides: Partial<Parameters<typeof RosterHeader>[0]> = {},
  { defaultWorld }: { defaultWorld?: WorldId | null } = {},
) {
  const props = {
    muleCount: 3,
    bulkMode: false,
    selectedCount: 0,
    allSelected: false,
    markEligibleCounts: { daily: 0, weekly: 0, bm: 0 },
    onEnterBulk: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onMarkAs: vi.fn(),
    onSetActive: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<RosterHeader {...props} />, { defaultWorld }),
    props,
  };
}

describe('RosterHeader', () => {
  describe('default state', () => {
    it('renders the Roster heading', () => {
      renderHeader();
      expect(screen.getByRole('heading', { name: /roster/i })).toBeTruthy();
    });

    it('renders the Select Button (visible at every breakpoint)', () => {
      renderHeader();
      const btn = screen.getByRole('button', { name: /bulk select mode/i });
      expect(btn).toBeTruthy();
      expect(btn.textContent).toMatch(/select/i);
      // Should not carry a responsive-hidden class like hidden/sm:hidden
      expect(btn.className).not.toMatch(/\bhidden\b/);
    });

    it('calls onEnterBulk when the Select Button is clicked', () => {
      const { props } = renderHeader();
      fireEvent.click(screen.getByRole('button', { name: /bulk select mode/i }));
      expect(props.onEnterBulk).toHaveBeenCalled();
    });

    it('does not render the Select Button when there are no mules', () => {
      renderHeader({ muleCount: 0 });
      expect(screen.queryByRole('button', { name: /bulk select mode/i })).toBeNull();
    });

    it('renders the Select Button after the DensityToggle', () => {
      renderHeader();
      const densityToggle = screen.getByTestId('density-toggle');
      const selectBtn = screen.getByRole('button', { name: /bulk select mode/i });
      expect(
        densityToggle.compareDocumentPosition(selectBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(densityToggle.parentElement).toBe(selectBtn.parentElement);
    });

    it('does not render the Bulk Action Bar in default state', () => {
      const { container } = renderHeader();
      expect(container.querySelector('[data-bulk-action-bar]')).toBeNull();
      expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
    });

    it('renders the DisplayToggle immediately to the left of the DensityToggle', () => {
      renderHeader();
      const displayToggle = screen.getByTestId('display-toggle');
      const densityToggle = screen.getByTestId('density-toggle');
      expect(
        displayToggle.compareDocumentPosition(densityToggle) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      // Adjacent: same parent + display sits one slot before density
      expect(displayToggle.parentElement).toBe(densityToggle.parentElement);
      const siblings = Array.from(displayToggle.parentElement!.children);
      expect(siblings.indexOf(densityToggle) - siblings.indexOf(displayToggle)).toBe(1);
    });
  });

  describe('WorldSelect integration', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('renders the WorldSelect placeholder (Select world) when no world is selected', () => {
      renderHeader({}, { defaultWorld: null });
      const triggers = screen.getAllByText(/select world/i);
      expect(triggers.length).toBeGreaterThan(0);
    });

    it('renders the selected world label in the trigger when a world is pre-selected', () => {
      renderHeader({}, { defaultWorld: 'heroic-kronos' });
      expect(screen.getByText('Kronos')).toBeTruthy();
    });

    it('renders the WorldSelect trigger with aria-label="Select world"', () => {
      renderHeader({}, { defaultWorld: null });
      expect(screen.getByLabelText('Select world')).toBeTruthy();
    });

    it('places the WorldSelect between the Roster heading and the DensityToggle', () => {
      renderHeader({}, { defaultWorld: null });
      const heading = screen.getByRole('heading', { name: /roster/i });
      const trigger = screen.getByLabelText('Select world');
      const densityToggle = screen.getByTestId('density-toggle');
      expect(heading.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(
        trigger.compareDocumentPosition(densityToggle) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('opens the panel with two groups (HEROIC and INTERACTIVE) when the trigger is clicked', async () => {
      renderHeader({}, { defaultWorld: null });
      fireEvent.click(screen.getByLabelText('Select world'));

      await waitFor(() => {
        expect(screen.getByText('HEROIC')).toBeTruthy();
        expect(screen.getByText('INTERACTIVE')).toBeTruthy();
      });

      const heroic = screen.getByText('HEROIC');
      const interactive = screen.getByText('INTERACTIVE');
      expect(heroic.compareDocumentPosition(interactive) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it('renders all six worlds grouped correctly when the panel is open', async () => {
      renderHeader({}, { defaultWorld: null });
      fireEvent.click(screen.getByLabelText('Select world'));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Kronos' })).toBeTruthy();
      });

      expect(screen.getByRole('option', { name: 'Kronos' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Hyperion' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Solis' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Scania' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Bera' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Luna' })).toBeTruthy();
    });

    it('selecting an option updates the trigger label', async () => {
      renderHeader({}, { defaultWorld: null });
      fireEvent.click(screen.getByLabelText('Select world'));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Hyperion' })).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('option', { name: 'Hyperion' }));

      await waitFor(() => {
        expect(screen.getByText('Hyperion')).toBeTruthy();
      });
    });

    it('persists the selection across renders when defaultWorld is supplied', () => {
      renderHeader({}, { defaultWorld: 'interactive-bera' });
      expect(screen.getByText('Bera')).toBeTruthy();
    });

    it('shows a check indicator next to the selected row when the panel reopens', async () => {
      renderHeader({}, { defaultWorld: 'heroic-hyperion' });
      fireEvent.click(screen.getByLabelText('Select world'));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /Hyperion/ })).toBeTruthy();
      });

      const selectedOption = screen.getByRole('option', { name: /Hyperion/ });
      expect(selectedOption.getAttribute('data-selected')).not.toBeNull();
      expect(within(selectedOption).getByTestId('world-select-check')).toBeTruthy();
    });

    it('hides the WorldSelect chip in bulk mode', () => {
      renderHeader({ bulkMode: true }, { defaultWorld: 'heroic-kronos' });
      expect(screen.queryByLabelText('Select world')).toBeNull();
    });
  });

  describe('Bulk Action Bar', () => {
    it('applies the bulk-slide entrance animation to the bar wrapper', () => {
      const { container } = renderHeader({ bulkMode: true });
      const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
      expect(bar).toBeTruthy();
      const animation = bar.style.animation || getComputedStyle(bar).animation;
      expect(animation).toContain('bulk-slide');
    });

    it('renders a static accent dot (no bulk-pulse animation)', () => {
      const { container } = renderHeader({ bulkMode: true });
      const dot = container.querySelector('[data-bulk-accent-dot]') as HTMLElement;
      expect(dot).toBeTruthy();
      const animation = dot.style.animation || '';
      expect(animation).not.toContain('bulk-pulse');
      // Accent chrome, not destructive red.
      expect(dot.style.background).toContain('accent');
      expect(dot.style.background.toLowerCase()).not.toContain('#e05040');
    });

    it('renders the N SELECTED pill in accent chrome (no #e05040)', () => {
      const { container } = renderHeader({ bulkMode: true, selectedCount: 0 });
      const pill = container.querySelector('[data-bulk-selection-pill]') as HTMLElement;
      expect(pill).toBeTruthy();
      expect(pill.textContent).toMatch(/0\s*SELECTED/i);
      expect(pill.style.color).toContain('accent');
      expect(pill.style.background.toLowerCase()).not.toContain('#e05040');
    });

    it('shows the N SELECTED pill at all screen sizes (no responsive-hidden class)', () => {
      const { container } = renderHeader({ bulkMode: true, selectedCount: 5 });
      const pill = container.querySelector('[data-bulk-selection-pill]') as HTMLElement;
      expect(pill.textContent).toMatch(/5\s*SELECTED/i);
      expect(pill.className).not.toContain('hidden');
    });

    it('does not render the default Roster heading in bulk mode', () => {
      renderHeader({ bulkMode: true });
      expect(screen.queryByRole('heading', { name: /roster/i })).toBeNull();
    });

    describe('Select all / Clear selection link', () => {
      it('reads "Select all" and calls onSelectAll when not all selected', () => {
        const { props } = renderHeader({ bulkMode: true, allSelected: false });
        const link = screen.getByRole('button', { name: /select all/i });
        fireEvent.click(link);
        expect(props.onSelectAll).toHaveBeenCalled();
        expect(props.onClearSelection).not.toHaveBeenCalled();
      });

      it('flips to "Clear selection" and calls onClearSelection when all selected', () => {
        const { props } = renderHeader({
          bulkMode: true,
          allSelected: true,
          selectedCount: 3,
        });
        expect(screen.queryByRole('button', { name: /select all/i })).toBeNull();
        const link = screen.getByRole('button', { name: /clear selection/i });
        fireEvent.click(link);
        expect(props.onClearSelection).toHaveBeenCalled();
        expect(props.onSelectAll).not.toHaveBeenCalled();
      });
    });

    describe('Delete + inline confirm (pointer)', () => {
      it('renders a disabled Delete at 0 selected', () => {
        renderHeader({ bulkMode: true, selectedCount: 0 });
        const btn = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
      });

      it('renders an enabled Delete when N > 0', () => {
        renderHeader({ bulkMode: true, selectedCount: 3 });
        const btn = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement;
        expect(btn.disabled).toBe(false);
      });

      it('clicking Delete swaps the right cluster to "Delete N? [Yes] [Cancel]" in place', () => {
        const { container } = renderHeader({ bulkMode: true, selectedCount: 3 });
        fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
        // Confirm cluster replaces the Delete trigger.
        expect(screen.getByText(/delete 3\?/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /^yes$/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /^delete$/i })).toBeNull();
        // Still inside the same bar — no bar-wide takeover.
        const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
        expect(within(bar).getByText(/delete 3\?/i)).toBeTruthy();
      });

      it('only Yes is destructive-styled in the confirm', () => {
        renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
        const yes = screen.getByRole('button', { name: /^yes$/i });
        const cancel = screen.getByRole('button', { name: /^cancel$/i });
        expect(yes.className).toMatch(/text-destructive/);
        expect(cancel.className).not.toMatch(/text-destructive/);
      });

      it('clicking Yes calls onDelete', () => {
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
        fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
        expect(props.onDelete).toHaveBeenCalled();
      });

      it('confirm Cancel backs out to the Delete cluster without exiting the mode', () => {
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
        fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(props.onCancel).not.toHaveBeenCalled();
        // Delete trigger is back.
        expect(screen.getByRole('button', { name: /^delete$/i })).toBeTruthy();
        expect(screen.queryByText(/delete 2\?/i)).toBeNull();
      });

      it('the bar Cancel (not confirming) calls onCancel to exit the mode', () => {
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(props.onCancel).toHaveBeenCalled();
      });
    });

    describe('on touch devices', () => {
      afterEach(restoreMatchMedia);

      // The pill is portaled into document.body (to escape an ancestor
      // transform that would re-anchor position:fixed), so query it from the
      // document instead of the test container.
      const queryPill = () =>
        document.body.querySelector('[data-bulk-delete-pill]') as HTMLElement | null;

      it('hides Delete in the toolbar (moved to the Delete Pill)', () => {
        mockCoarsePointer();
        const { container } = renderHeader({ bulkMode: true, selectedCount: 2 });
        const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
        expect(within(bar).queryByRole('button', { name: /^delete/i })).toBeNull();
        expect(queryPill()).toBeTruthy();
      });

      it('keeps the mode-exit Cancel in the toolbar and calls onCancel', () => {
        mockCoarsePointer();
        const { container, props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
        const cancel = within(bar).getByRole('button', { name: /^cancel$/i });
        fireEvent.click(cancel);
        expect(props.onCancel).toHaveBeenCalled();
      });

      it('Delete Pill reads "Delete N" when count > 0', () => {
        mockCoarsePointer();
        renderHeader({ bulkMode: true, selectedCount: 3 });
        const btn = within(queryPill()!).getByRole('button') as HTMLButtonElement;
        expect(btn.textContent?.trim()).toBe('Delete 3');
      });

      it('does not render the Delete Pill at count 0', () => {
        mockCoarsePointer();
        renderHeader({ bulkMode: true, selectedCount: 0 });
        expect(queryPill()).toBeNull();
      });

      it('tapping the pill morphs it into its own "Delete N? [Yes] [Cancel]" confirm', () => {
        mockCoarsePointer();
        renderHeader({ bulkMode: true, selectedCount: 3 });
        fireEvent.click(within(queryPill()!).getByRole('button'));
        const pill = queryPill()!;
        expect(within(pill).getByText(/delete 3\?/i)).toBeTruthy();
        const yes = within(pill).getByRole('button', { name: /^yes$/i });
        const cancel = within(pill).getByRole('button', { name: /^cancel$/i });
        expect(yes.className).toMatch(/text-destructive/);
        expect(cancel.className).not.toMatch(/text-destructive/);
      });

      it('tapping Yes in the pill confirm calls onDelete', () => {
        mockCoarsePointer();
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(within(queryPill()!).getByRole('button'));
        fireEvent.click(within(queryPill()!).getByRole('button', { name: /^yes$/i }));
        expect(props.onDelete).toHaveBeenCalled();
      });
    });

    it('does not render the Delete Pill on non-touch (default jsdom)', () => {
      renderHeader({ bulkMode: true, selectedCount: 2 });
      expect(document.body.querySelector('[data-bulk-delete-pill]')).toBeNull();
    });

    describe('Mark As Menu', () => {
      const openMenu = () => {
        fireEvent.click(screen.getByRole('button', { name: /mark as/i }));
      };

      it('renders the Mark as trigger in the bar', () => {
        renderHeader({ bulkMode: true, selectedCount: 2 });
        expect(screen.getByRole('button', { name: /mark as/i })).toBeTruthy();
      });

      it('disables the trigger at 0 selected', () => {
        renderHeader({ bulkMode: true, selectedCount: 0 });
        const trigger = screen.getByRole('button', { name: /mark as/i }) as HTMLButtonElement;
        expect(trigger.disabled).toBe(true);
      });

      it('enables the trigger when N > 0', () => {
        renderHeader({ bulkMode: true, selectedCount: 2 });
        const trigger = screen.getByRole('button', { name: /mark as/i }) as HTMLButtonElement;
        expect(trigger.disabled).toBe(false);
      });

      it('does not render a separate Active trigger (merged into Mark as)', () => {
        renderHeader({ bulkMode: true, selectedCount: 2 });
        expect(screen.queryByRole('button', { name: /set active flag/i })).toBeNull();
      });

      it('opens to the kebab option set minus Delete', async () => {
        renderHeader({
          bulkMode: true,
          selectedCount: 5,
          markEligibleCounts: { daily: 2, weekly: 5, bm: 1 },
        });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        for (const name of [
          /^active$/i,
          /^inactive$/i,
          /daily complete/i,
          /daily incomplete/i,
          /weekly complete/i,
          /weekly incomplete/i,
          /bm complete/i,
          /bm incomplete/i,
        ]) {
          expect(screen.getByRole('menuitem', { name })).toBeTruthy();
        }
        expect(screen.queryByRole('menuitem', { name: /delete/i })).toBeNull();
      });

      it('Active converges the selection to active (onSetActive(true))', async () => {
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        fireEvent.click(screen.getByRole('menuitem', { name: /^active$/i }));
        expect(props.onSetActive).toHaveBeenCalledWith(true);
      });

      it('Inactive converges the selection to inactive (onSetActive(false))', async () => {
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        fireEvent.click(screen.getByRole('menuitem', { name: /^inactive$/i }));
        expect(props.onSetActive).toHaveBeenCalledWith(false);
      });

      it('renders cadence rows without eligible-count trailers', async () => {
        renderHeader({
          bulkMode: true,
          selectedCount: 5,
          markEligibleCounts: { daily: 2, weekly: 5, bm: 1 },
        });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        for (const name of [
          /daily complete/i,
          /daily incomplete/i,
          /weekly complete/i,
          /weekly incomplete/i,
          /bm complete/i,
          /bm incomplete/i,
        ]) {
          expect(screen.getByRole('menuitem', { name }).textContent).not.toMatch(/\d/);
        }
      });

      it('disables both of a cadence pair at zero eligible', async () => {
        renderHeader({
          bulkMode: true,
          selectedCount: 5,
          markEligibleCounts: { daily: 0, weekly: 5, bm: 0 },
        });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        for (const name of [
          /daily complete/i,
          /daily incomplete/i,
          /bm complete/i,
          /bm incomplete/i,
        ]) {
          expect(
            screen.getByRole('menuitem', { name }).getAttribute('data-disabled'),
          ).not.toBeNull();
        }
        expect(
          screen.getByRole('menuitem', { name: /weekly complete/i }).getAttribute('data-disabled'),
        ).toBeNull();
      });

      it('calls onMarkAs with the cadence and direction when a row is chosen', async () => {
        const { props } = renderHeader({
          bulkMode: true,
          selectedCount: 5,
          markEligibleCounts: { daily: 2, weekly: 5, bm: 1 },
        });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        fireEvent.click(screen.getByRole('menuitem', { name: /weekly complete/i }));
        expect(props.onMarkAs).toHaveBeenCalledWith('weekly', true);
        fireEvent.click(screen.getByRole('menuitem', { name: /weekly incomplete/i }));
        expect(props.onMarkAs).toHaveBeenCalledWith('weekly', false);
      });

      it('keeps the menu open after choosing a row (stay-open, closes on dismiss only)', async () => {
        const { props } = renderHeader({
          bulkMode: true,
          selectedCount: 5,
          markEligibleCounts: { daily: 2, weekly: 5, bm: 1 },
        });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        fireEvent.click(screen.getByRole('menuitem', { name: /daily complete/i }));
        expect(props.onMarkAs).toHaveBeenCalledWith('daily', true);
        // Still open — a second action can be applied in the same visit.
        expect(screen.getByRole('menu')).toBeTruthy();
        fireEvent.click(screen.getByRole('menuitem', { name: /^inactive$/i }));
        expect(props.onSetActive).toHaveBeenCalledWith(false);
        expect(screen.getByRole('menu')).toBeTruthy();
      });

      it('applying an action never exits the mode (no onCancel)', async () => {
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        openMenu();
        await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
        fireEvent.click(screen.getByRole('menuitem', { name: /^active$/i }));
        expect(props.onCancel).not.toHaveBeenCalled();
      });

      it('stays in the bar on touch (available on all pointer types)', () => {
        mockCoarsePointer();
        try {
          const { container } = renderHeader({ bulkMode: true, selectedCount: 2 });
          const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
          expect(within(bar).getByRole('button', { name: /mark as/i })).toBeTruthy();
        } finally {
          restoreMatchMedia();
        }
      });

      it('unmounts while the inline Delete confirm is up and returns on its Cancel', () => {
        renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
        expect(screen.queryByRole('button', { name: /mark as/i })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(screen.getByRole('button', { name: /mark as/i })).toBeTruthy();
      });

      it('unmounts during the Delete Pill confirm on touch', () => {
        mockCoarsePointer();
        try {
          renderHeader({ bulkMode: true, selectedCount: 2 });
          const pill = document.body.querySelector('[data-bulk-delete-pill]') as HTMLElement;
          fireEvent.click(within(pill).getByRole('button'));
          expect(screen.queryByRole('button', { name: /mark as/i })).toBeNull();
          // Backing out of the pill confirm restores the menu.
          fireEvent.click(within(pill).getByRole('button', { name: /^cancel$/i }));
          expect(screen.getByRole('button', { name: /mark as/i })).toBeTruthy();
        } finally {
          restoreMatchMedia();
        }
      });
    });
  });
});
