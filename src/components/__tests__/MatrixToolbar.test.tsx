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
    weeklyCount: 0,
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

  it('accepts the unused preset / count / reset props without crashing', () => {
    renderToolbar({
      activePill: 'CRA',
      onApplyPreset: noop,
      weeklyCount: 5,
      onReset: noop,
    });
    expect(screen.getByRole('button', { name: /^all$/i })).toBeTruthy();
  });

  describe('weekly count display', () => {
    it('renders "{weeklyCount}/14" with the Weekly-selections aria-label', () => {
      renderToolbar({ weeklyCount: 5 });
      const count = screen.getByLabelText(/weekly boss selections/i);
      expect(count.textContent).toBe('5/14');
    });

    it('shows "0/14" when weeklyCount is 0', () => {
      renderToolbar({ weeklyCount: 0 });
      const count = screen.getByLabelText(/weekly boss selections/i);
      expect(count.textContent).toBe('0/14');
    });

    it('does not clamp and can display values greater than 14', () => {
      renderToolbar({ weeklyCount: 16 });
      const count = screen.getByLabelText(/weekly boss selections/i);
      expect(count.textContent).toBe('16/14');
    });

    it('uses var(--muted-foreground) color when weeklyCount is 0', () => {
      renderToolbar({ weeklyCount: 0 });
      const count = screen.getByLabelText(/weekly boss selections/i) as HTMLElement;
      expect(count.style.color).toContain('var(--muted-foreground)');
    });

    it('uses var(--accent) color when weeklyCount > 0', () => {
      renderToolbar({ weeklyCount: 1 });
      const count = screen.getByLabelText(/weekly boss selections/i) as HTMLElement;
      expect(count.style.color).toContain('var(--accent)');
    });

    it('uses JetBrains Mono at 11px for the count text', () => {
      renderToolbar({ weeklyCount: 3 });
      const count = screen.getByLabelText(/weekly boss selections/i) as HTMLElement;
      const hasMonoClass = count.classList.contains('font-mono-nums');
      const hasMonoInline = /JetBrains Mono/i.test(count.style.fontFamily ?? '');
      expect(hasMonoClass || hasMonoInline).toBe(true);
      expect(count.style.fontSize).toBe('11px');
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
    it('renders a .d-toolbar-sep element between the count and the reset button', () => {
      const { container } = renderToolbar();
      const seps = container.querySelectorAll('.d-toolbar-sep');
      expect(seps.length).toBeGreaterThanOrEqual(1);
      const count = screen.getByLabelText(/weekly boss selections/i);
      const resetBtn = screen.getByRole('button', { name: /^reset$/i });
      const sep = Array.from(seps).find((s) => {
        const countVsSep = count.compareDocumentPosition(s);
        const sepVsReset = s.compareDocumentPosition(resetBtn);
        return (
          (countVsSep & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
          (sepVsReset & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        );
      });
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
      expect(buttonNames).toEqual(['CRA', 'LOMIEN', 'CTENE']);
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
    });
  });
});
