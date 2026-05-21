import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MuleListRow } from '../MuleListRow';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';
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
  postCapMeso: 1_500_000_000,
  sharePct: 0.095,
  droppedKeys: new Map(),
};

interface RenderRowOpts {
  mule?: Partial<Mule>;
  metrics?: Partial<RosterRowMetrics>;
  onClick?: (id: string) => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function renderRow(opts: RenderRowOpts = {}) {
  const onClick = opts.onClick ?? vi.fn();
  const onToggleSelect = opts.onToggleSelect ?? vi.fn();
  const mule: Mule = { ...baseMule, ...opts.mule };
  const metrics: RosterRowMetrics = { ...baseMetrics, ...opts.metrics };
  return {
    ...render(
      <DndContext>
        <SortableContext items={[mule.id]} strategy={verticalListSortingStrategy}>
          <MuleListRow
            mule={mule}
            metrics={metrics}
            postCapIncomeMeso={metrics.postCapMeso}
            onClick={onClick}
            bulkMode={opts.bulkMode ?? false}
            selected={opts.selected ?? false}
            onToggleSelect={onToggleSelect}
          />
        </SortableContext>
      </DndContext>,
    ),
    onClick,
    onToggleSelect,
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

  it('renders the slate weekly-basis Daily count used by the drawer header', () => {
    const mule: Mule = { ...baseMule, selectedBosses: [NORMAL_HILLA_DAILY] };
    const metrics = rosterRowMetrics(mule, undefined, 0);
    renderRow({ mule, metrics });
    expect(screen.getByLabelText(/daily count/i).textContent).toMatch(/7/);
    const row = screen.getByTestId('mule-row-row-mule-1');
    expect(row.textContent).not.toMatch(/7\s*\/\s*7/);
  });

  it('renders the post-cap income figure (abbreviated by default)', () => {
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

  it('renders an active mule at opacity 1 and inactive at 0.55', () => {
    const { container } = renderRow();
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.style.opacity).toBe('1');
  });

  it('renders an inactive mule at 0.55 opacity', () => {
    const { container } = renderRow({ mule: { active: false } });
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.style.opacity).toBe('0.55');
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
