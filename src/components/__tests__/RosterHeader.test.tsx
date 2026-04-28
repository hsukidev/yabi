import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  within,
  mockMatchMedia,
  restoreMatchMedia,
} from '../../test/test-utils';
import { DensityProvider } from '../../context/DensityProvider';
import { RosterHeader } from '../RosterHeader';

const mockCoarsePointer = () => mockMatchMedia((q) => q.includes('pointer: coarse'));

function renderHeader(overrides: Partial<Parameters<typeof RosterHeader>[0]> = {}) {
  const props = {
    muleCount: 3,
    bulkMode: false,
    selectedCount: 0,
    onEnterBulk: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return {
    ...render(
      <DensityProvider>
        <RosterHeader {...props} />
      </DensityProvider>,
    ),
    props,
  };
}

describe('RosterHeader', () => {
  describe('default state', () => {
    it('renders the Roster heading', () => {
      renderHeader();
      expect(screen.getByRole('heading', { name: /roster/i })).toBeTruthy();
    });

    it('renders the Bulk Trash Icon button (visible at every breakpoint)', () => {
      renderHeader();
      const btn = screen.getByRole('button', { name: /bulk.*delete|delete.*mode|bulk.*trash/i });
      expect(btn).toBeTruthy();
      // Should not carry a responsive-hidden class like hidden/sm:hidden
      expect(btn.className).not.toMatch(/\bhidden\b/);
    });

    it('calls onEnterBulk when the Bulk Trash Icon is clicked', () => {
      const { props } = renderHeader();
      const btn = screen.getByRole('button', { name: /bulk.*delete|delete.*mode|bulk.*trash/i });
      fireEvent.click(btn);
      expect(props.onEnterBulk).toHaveBeenCalled();
    });

    it('does not render the Bulk Trash Icon when there are no mules', () => {
      renderHeader({ muleCount: 0 });
      expect(
        screen.queryByRole('button', { name: /bulk.*delete|delete.*mode|bulk.*trash/i }),
      ).toBeNull();
    });

    it('does not render the Bulk Action Bar in default state', () => {
      renderHeader();
      expect(screen.queryByText(/select or drag to delete/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
    });
  });

  describe('bulk state', () => {
    it('renders the bulk title "Select or drag to delete"', () => {
      renderHeader({ bulkMode: true });
      expect(screen.getByText(/select or drag to delete/i)).toBeTruthy();
    });

    it('renders the Bulk Selection Pill with 0 SELECTED when no cards marked', () => {
      renderHeader({ bulkMode: true, selectedCount: 0 });
      expect(screen.getByText(/0\s*SELECTED/i)).toBeTruthy();
    });

    it('updates the Bulk Selection Pill to reflect the selected count', () => {
      renderHeader({ bulkMode: true, selectedCount: 5 });
      expect(screen.getByText(/5\s*SELECTED/i)).toBeTruthy();
    });

    it('renders a Bulk Pulse Dot using the bulk-pulse animation', () => {
      const { container } = renderHeader({ bulkMode: true });
      const dot = container.querySelector('[data-bulk-pulse-dot]') as HTMLElement;
      expect(dot).toBeTruthy();
      // bulk-pulse keyframe is configured via inline animation or class
      const animation = dot.style.animation || getComputedStyle(dot).animation;
      expect(animation).toContain('bulk-pulse');
    });

    it('applies the bulk-slide animation to the Bulk Action Bar wrapper', () => {
      const { container } = renderHeader({ bulkMode: true });
      const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
      expect(bar).toBeTruthy();
      const animation = bar.style.animation || getComputedStyle(bar).animation;
      expect(animation).toContain('bulk-slide');
    });

    it('renders a Bulk Cancel button', () => {
      renderHeader({ bulkMode: true });
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy();
    });

    it('calls onCancel when Bulk Cancel is clicked', () => {
      const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(props.onCancel).toHaveBeenCalled();
    });

    it('renders a disabled Bulk Confirm reading "Delete" at 0 selected', () => {
      renderHeader({ bulkMode: true, selectedCount: 0 });
      const btn = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('renders an enabled Bulk Confirm reading "Delete" when N > 0', () => {
      renderHeader({ bulkMode: true, selectedCount: 3 });
      const btn = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('calls onDelete when Bulk Confirm is clicked with a selection', () => {
      const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
      expect(props.onDelete).toHaveBeenCalled();
    });

    it('does not render a count inside the Delete button', () => {
      renderHeader({ bulkMode: true, selectedCount: 3 });
      const btn = screen.getByRole('button', { name: /^delete$/i }) as HTMLButtonElement;
      expect(btn.textContent?.trim()).toBe('Delete');
    });

    it('hides "Select or drag to delete" text on small screens via max-[524.99px]:hidden', () => {
      const { container } = renderHeader({ bulkMode: true });
      const textSpan = Array.from(container.querySelectorAll('span')).find(
        (el) => el.textContent?.trim() === 'Select or drag to delete',
      );
      expect(textSpan).toBeTruthy();
      expect(textSpan!.className).toContain('max-[524.99px]:hidden');
    });

    it('shows the Bulk Selection Pill at all screen sizes (no responsive-hidden class)', () => {
      const { container } = renderHeader({ bulkMode: true });
      const pill = container.querySelector('[data-bulk-selection-pill]') as HTMLElement;
      expect(pill).toBeTruthy();
      expect(pill.className).not.toContain('hidden');
    });

    it('does not render the default Roster heading in bulk mode', () => {
      renderHeader({ bulkMode: true });
      expect(screen.queryByRole('heading', { name: /roster/i })).toBeNull();
    });

    it('does not render the Bulk Trash Icon in bulk mode', () => {
      renderHeader({ bulkMode: true });
      expect(screen.queryByRole('button', { name: /bulk.*trash/i })).toBeNull();
    });

    it('uses the --destructive token for the pulse dot background (no #e05040)', () => {
      const { container } = renderHeader({ bulkMode: true });
      const dot = container.querySelector('[data-bulk-pulse-dot]') as HTMLElement;
      expect(dot.style.background.toLowerCase()).not.toContain('#e05040');
      expect(dot.style.background).toContain('destructive');
    });

    describe('on touch devices', () => {
      afterEach(restoreMatchMedia);

      // The pill is portaled into document.body (to escape an ancestor
      // transform that would re-anchor position:fixed), so query it from the
      // document instead of the test container.
      const queryPill = () =>
        document.body.querySelector('[data-bulk-delete-pill]') as HTMLElement | null;

      it('moves Delete out of the action bar into a floating pill', () => {
        mockCoarsePointer();
        const { container } = renderHeader({ bulkMode: true, selectedCount: 2 });
        const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
        expect(within(bar).queryByRole('button', { name: /^delete/i })).toBeNull();
        expect(queryPill()).toBeTruthy();
      });

      it('floating pill reads "Delete N" when count > 0', () => {
        mockCoarsePointer();
        renderHeader({ bulkMode: true, selectedCount: 3 });
        const btn = within(queryPill()!).getByRole('button') as HTMLButtonElement;
        expect(btn.textContent?.trim()).toBe('Delete 3');
        expect(btn.disabled).toBe(false);
      });

      it('does not render the pill at count 0 (in-bar chip and text remain the only affordances)', () => {
        mockCoarsePointer();
        renderHeader({ bulkMode: true, selectedCount: 0 });
        expect(queryPill()).toBeNull();
      });

      it('clicking the floating pill calls onDelete', () => {
        mockCoarsePointer();
        const { props } = renderHeader({ bulkMode: true, selectedCount: 2 });
        fireEvent.click(within(queryPill()!).getByRole('button'));
        expect(props.onDelete).toHaveBeenCalled();
      });

      // The instructional text + count-chip swap roles on touch: at narrow
      // widths the chip hides (count is on the floating pill instead) and the
      // text remains visible.
      it('shows the instructional text at every width (no max-[524.99px]:hidden)', () => {
        mockCoarsePointer();
        const { container } = renderHeader({ bulkMode: true });
        const textSpan = Array.from(container.querySelectorAll('span')).find(
          (el) => el.textContent?.trim() === 'Select or drag to delete',
        );
        expect(textSpan).toBeTruthy();
        expect(textSpan!.className).not.toContain('max-[524.99px]:hidden');
      });

      it('hides the count chip at narrow widths via max-[524.99px]:hidden', () => {
        mockCoarsePointer();
        const { container } = renderHeader({ bulkMode: true, selectedCount: 4 });
        const chip = container.querySelector('[data-bulk-selection-pill]') as HTMLElement;
        expect(chip).toBeTruthy();
        expect(chip.className).toContain('max-[524.99px]:hidden');
      });
    });

    it('does not render the floating Delete pill on non-touch (default jsdom)', () => {
      renderHeader({ bulkMode: true, selectedCount: 2 });
      expect(document.body.querySelector('[data-bulk-delete-pill]')).toBeNull();
    });
  });
});
