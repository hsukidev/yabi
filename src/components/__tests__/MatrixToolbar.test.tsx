import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';

import { MatrixToolbar } from '../MatrixToolbar';

const noop = () => {};

function renderToolbar(overrides: Partial<Parameters<typeof MatrixToolbar>[0]> = {}) {
  const props = {
    filter: 'All' as const,
    onFilterChange: vi.fn(),
    activePill: null as Parameters<typeof MatrixToolbar>[0]['activePill'],
    onApplyPreset: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<MatrixToolbar {...props} />),
    props,
  };
}

describe('MatrixToolbar', () => {
  it('renders three cadence buttons labelled All, Weekly, Daily', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^weekly$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^daily$/i })).toBeTruthy();
  });

  it('wraps the cadence buttons in a .d-c-toggle container', () => {
    const { container } = renderToolbar();
    const toggle = container.querySelector('.d-c-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle?.querySelectorAll('button')).toHaveLength(3);
  });

  it('applies the .on class to the active cadence button (All by default)', () => {
    renderToolbar({ filter: 'All' });
    const allBtn = screen.getByRole('button', { name: /^all$/i });
    const weeklyBtn = screen.getByRole('button', { name: /^weekly$/i });
    const dailyBtn = screen.getByRole('button', { name: /^daily$/i });
    expect(allBtn.classList.contains('on')).toBe(true);
    expect(weeklyBtn.classList.contains('on')).toBe(false);
    expect(dailyBtn.classList.contains('on')).toBe(false);
  });

  it('moves the .on class when filter=Weekly', () => {
    renderToolbar({ filter: 'Weekly' });
    expect(screen.getByRole('button', { name: /^weekly$/i }).classList.contains('on')).toBe(true);
    expect(screen.getByRole('button', { name: /^all$/i }).classList.contains('on')).toBe(false);
  });

  it('moves the .on class when filter=Daily', () => {
    renderToolbar({ filter: 'Daily' });
    expect(screen.getByRole('button', { name: /^daily$/i }).classList.contains('on')).toBe(true);
  });

  it('calls onFilterChange with "Weekly" when the Weekly button is clicked', () => {
    const onFilterChange = vi.fn();
    renderToolbar({ onFilterChange });
    fireEvent.click(screen.getByRole('button', { name: /^weekly$/i }));
    expect(onFilterChange).toHaveBeenCalledWith('Weekly');
  });

  it('calls onFilterChange with "Daily" when the Daily button is clicked', () => {
    const onFilterChange = vi.fn();
    renderToolbar({ onFilterChange });
    fireEvent.click(screen.getByRole('button', { name: /^daily$/i }));
    expect(onFilterChange).toHaveBeenCalledWith('Daily');
  });

  it('calls onFilterChange with "All" when the All button is clicked', () => {
    const onFilterChange = vi.fn();
    renderToolbar({ filter: 'Weekly', onFilterChange });
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(onFilterChange).toHaveBeenCalledWith('All');
  });

  it('renders a calendar SVG inside the Weekly button', () => {
    renderToolbar();
    const weeklyBtn = screen.getByRole('button', { name: /^weekly$/i });
    const svg = weeklyBtn.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.querySelector('rect')).toBeTruthy();
    expect(svg?.querySelectorAll('line').length).toBeGreaterThanOrEqual(3);
  });

  it('renders a clock SVG inside the Daily button', () => {
    renderToolbar();
    const dailyBtn = screen.getByRole('button', { name: /^daily$/i });
    const svg = dailyBtn.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.querySelector('circle')).toBeTruthy();
    expect(svg?.querySelector('polyline')).toBeTruthy();
  });

  it('does not render an icon inside the All button', () => {
    renderToolbar();
    const allBtn = screen.getByRole('button', { name: /^all$/i });
    expect(allBtn.querySelector('svg')).toBeNull();
  });

  it('accepts the preset / reset props without crashing', () => {
    renderToolbar({
      activePill: 'CRA',
      onApplyPreset: noop,
      onReset: noop,
    });
    expect(screen.getByRole('button', { name: /^all$/i })).toBeTruthy();
  });

  describe('weekly count display (moved to CrystalTally)', () => {
    it('no longer renders a weekly-selections readout inside the toolbar', () => {
      renderToolbar();
      expect(screen.queryByLabelText(/weekly boss selections/i)).toBeNull();
    });

    it('no longer renders a .d-toolbar-crystal image in the toolbar', () => {
      const { container } = renderToolbar();
      expect(container.querySelector('.d-toolbar-crystal')).toBeNull();
    });
  });

  describe('Reset button', () => {
    it('renders a button labelled "Reset"', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /^reset$/i })).toBeTruthy();
    });

    it('calls onReset when clicked', () => {
      const onReset = vi.fn();
      renderToolbar({ onReset });
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('renders no icon (flat text button)', () => {
      renderToolbar();
      const resetBtn = screen.getByRole('button', { name: /^reset$/i });
      expect(resetBtn.querySelector('svg')).toBeNull();
    });
  });

  describe('toolbar separator', () => {
    it('keeps a .d-toolbar-sep between the cadence filter and the preset pills', () => {
      const { container } = renderToolbar();
      const sep = container.querySelector('.d-toolbar-sep');
      expect(sep).toBeTruthy();
    });
  });

  describe('Boss Presets segmented control', () => {
    it('renders CRA, LOMIEN, CTENE buttons after the Cadence Filter', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /^cra$/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^lomien$/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^ctene$/i })).toBeTruthy();
    });

    it('wraps the preset buttons in their own .d-c-toggle container', () => {
      const { container } = renderToolbar();
      const groups = container.querySelectorAll('.d-c-toggle');
      expect(groups.length).toBeGreaterThanOrEqual(2);
      const presetGroup = Array.from(groups).find((g) => {
        const names = Array.from(g.querySelectorAll('button')).map((b) => b.textContent?.trim());
        return names.includes('CRA');
      });
      expect(presetGroup).toBeTruthy();
      const buttonNames = Array.from(presetGroup!.querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(buttonNames).toEqual(['CRA', 'LOMIEN', 'CTENE', 'CUSTOM']);
    });

    it('separates the preset control from the cadence filter with a .d-toolbar-sep', () => {
      const { container } = renderToolbar();
      const sep = container.querySelector('.d-toolbar-sep');
      expect(sep).toBeTruthy();
    });

    it('renders the Cadence Filter before the Boss Presets in document order', () => {
      renderToolbar();
      const allBtn = screen.getByRole('button', { name: /^all$/i });
      const craBtn = screen.getByRole('button', { name: /^cra$/i });
      const position = allBtn.compareDocumentPosition(craBtn);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('applies the .on class to the single active pill only', () => {
      renderToolbar({ activePill: 'CRA' });
      expect(screen.getByRole('button', { name: /^cra$/i }).classList.contains('on')).toBe(true);
      expect(screen.getByRole('button', { name: /^lomien$/i }).classList.contains('on')).toBe(
        false,
      );
      expect(screen.getByRole('button', { name: /^ctene$/i }).classList.contains('on')).toBe(false);
    });

    it('lights LOMIEN when activePill === "LOMIEN"', () => {
      renderToolbar({ activePill: 'LOMIEN' });
      expect(screen.getByRole('button', { name: /^lomien$/i }).classList.contains('on')).toBe(true);
      expect(screen.getByRole('button', { name: /^cra$/i }).classList.contains('on')).toBe(false);
    });

    it('lights CTENE when activePill === "CTENE"', () => {
      renderToolbar({ activePill: 'CTENE' });
      expect(screen.getByRole('button', { name: /^ctene$/i }).classList.contains('on')).toBe(true);
    });

    it('lights no pills when activePill is null', () => {
      renderToolbar({ activePill: null });
      expect(screen.getByRole('button', { name: /^cra$/i }).classList.contains('on')).toBe(false);
      expect(screen.getByRole('button', { name: /^lomien$/i }).classList.contains('on')).toBe(
        false,
      );
      expect(screen.getByRole('button', { name: /^ctene$/i }).classList.contains('on')).toBe(false);
    });

    it('calls onApplyPreset with "CRA" when CRA is clicked', () => {
      const onApplyPreset = vi.fn();
      renderToolbar({ onApplyPreset });
      fireEvent.click(screen.getByRole('button', { name: /^cra$/i }));
      expect(onApplyPreset).toHaveBeenCalledWith('CRA');
    });

    it('calls onApplyPreset with "LOMIEN" when LOMIEN is clicked', () => {
      const onApplyPreset = vi.fn();
      renderToolbar({ onApplyPreset });
      fireEvent.click(screen.getByRole('button', { name: /^lomien$/i }));
      expect(onApplyPreset).toHaveBeenCalledWith('LOMIEN');
    });

    it('calls onApplyPreset with "CTENE" when CTENE is clicked', () => {
      const onApplyPreset = vi.fn();
      renderToolbar({ onApplyPreset });
      fireEvent.click(screen.getByRole('button', { name: /^ctene$/i }));
      expect(onApplyPreset).toHaveBeenCalledWith('CTENE');
    });

    it('renders LOMIEN between CRA and CTENE', () => {
      renderToolbar();
      const craBtn = screen.getByRole('button', { name: /^cra$/i });
      const lomienBtn = screen.getByRole('button', { name: /^lomien$/i });
      const cteneBtn = screen.getByRole('button', { name: /^ctene$/i });
      expect(
        craBtn.compareDocumentPosition(lomienBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        lomienBtn.compareDocumentPosition(cteneBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('preset buttons render no SVG icons', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /^cra$/i }).querySelector('svg')).toBeNull();
      expect(screen.getByRole('button', { name: /^lomien$/i }).querySelector('svg')).toBeNull();
      expect(screen.getByRole('button', { name: /^ctene$/i }).querySelector('svg')).toBeNull();
      expect(screen.getByRole('button', { name: /^custom$/i }).querySelector('svg')).toBeNull();
    });

    describe('Custom Preset pill', () => {
      it('renders a CUSTOM button positioned last (after CTENE)', () => {
        renderToolbar();
        const cteneBtn = screen.getByRole('button', { name: /^ctene$/i });
        const customBtn = screen.getByRole('button', { name: /^custom$/i });
        expect(customBtn).toBeTruthy();
        expect(
          cteneBtn.compareDocumentPosition(customBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      });

      it('lights CUSTOM when activePill === "CUSTOM"', () => {
        renderToolbar({ activePill: 'CUSTOM' });
        expect(screen.getByRole('button', { name: /^custom$/i }).classList.contains('on')).toBe(
          true,
        );
        expect(screen.getByRole('button', { name: /^cra$/i }).classList.contains('on')).toBe(false);
        expect(screen.getByRole('button', { name: /^lomien$/i }).classList.contains('on')).toBe(
          false,
        );
        expect(screen.getByRole('button', { name: /^ctene$/i }).classList.contains('on')).toBe(
          false,
        );
      });

      it('CUSTOM is not lit when another pill is active', () => {
        renderToolbar({ activePill: 'CRA' });
        expect(screen.getByRole('button', { name: /^custom$/i }).classList.contains('on')).toBe(
          false,
        );
      });

      it('calls onApplyPreset with "CUSTOM" when CUSTOM is clicked', () => {
        const onApplyPreset = vi.fn();
        renderToolbar({ onApplyPreset });
        fireEvent.click(screen.getByRole('button', { name: /^custom$/i }));
        expect(onApplyPreset).toHaveBeenCalledWith('CUSTOM');
      });

      it('CUSTOM pill shares the canonical-pill segmented-control group', () => {
        const { container } = renderToolbar();
        const groups = container.querySelectorAll('.d-c-toggle');
        const presetGroup = Array.from(groups).find((g) => {
          const names = Array.from(g.querySelectorAll('button')).map((b) => b.textContent?.trim());
          return names.includes('CUSTOM');
        });
        expect(presetGroup).toBeTruthy();
        const buttonNames = Array.from(presetGroup!.querySelectorAll('button')).map((b) =>
          b.textContent?.trim(),
        );
        // Same shape + same active/inactive treatment as canonical pills.
        expect(buttonNames).toEqual(['CRA', 'LOMIEN', 'CTENE', 'CUSTOM']);
      });
    });
  });
});
