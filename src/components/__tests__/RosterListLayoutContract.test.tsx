/// <reference types="node" />
/**
 * Pins the row-grain layout contract for the List view:
 *   - `[data-density='comfy']` defines `--row-pad: 14px 18px`, `--row-avatar: 44px`,
 *     `--row-gap: 10px`.
 *   - `[data-density='compact']` defines `--row-pad: 8px 14px`, `--row-avatar: 36px`,
 *     `--row-gap: 6px`.
 *   - The MuleListRow style references all three CSS vars by name, so the
 *     density-scope rules are what actually drive the visual difference.
 *
 * jsdom has no layout engine — we follow the same approach as
 * RosterLayoutContract: regex over `index.css` for the variable assertions and
 * inline-style checks on the rendered row.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '../../test/test-utils';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MuleListRow } from '../MuleListRow';
import type { Mule } from '../../types';
import type { RosterRowMetrics } from '../rosterRowMetrics';

const indexCssRaw = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');

const baseMule: Mule = {
  id: 'contract-mule',
  name: 'C',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

const baseMetrics: RosterRowMetrics = {
  weeklyCount: 0,
  dailyCount: 0,
  monthlyCount: 0,
  postCapMeso: 0,
  displayedWeeklyMeso: { meso: 0, source: 'contributed', muted: true },
  sharePct: 0,
  droppedKeys: new Map(),
};

function rowVarFor(scope: 'comfy' | 'compact', name: string): string {
  // First match wins; the desktop density block appears before the <768px
  // override block in index.css, so this resolves to the desktop value.
  const re = new RegExp(
    String.raw`\[data-density=['"]${scope}['"]\]\s*\{[^}]*?--${name}:\s*([^;]+);`,
    'm',
  );
  const m = indexCssRaw.match(re);
  if (!m) throw new Error(`Could not find --${name} for ${scope} in index.css`);
  return m[1].trim();
}

// Below 768px the Density Toggle is hidden, so Comfy's row dimensions tighten
// here to keep List view scannable on phone/tablet.
function mobileComfyVarFor(name: string): string {
  const re = new RegExp(
    String.raw`@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\[data-density=['"]comfy['"]\]\s*\{[^}]*?--${name}:\s*([^;]+);`,
    'm',
  );
  const m = indexCssRaw.match(re);
  if (!m) throw new Error(`Could not find --${name} in <768px comfy override`);
  return m[1].trim();
}

describe('Roster list layout contract — density tightens row vars', () => {
  it('comfy declares --row-pad: 14px 22px', () => {
    expect(rowVarFor('comfy', 'row-pad')).toBe('14px 22px');
  });

  it('compact declares --row-pad: 5px 14px', () => {
    expect(rowVarFor('compact', 'row-pad')).toBe('5px 14px');
  });

  it('comfy declares --row-avatar: 64px', () => {
    expect(rowVarFor('comfy', 'row-avatar')).toBe('64px');
  });

  it('compact declares --row-avatar: 48px', () => {
    expect(rowVarFor('compact', 'row-avatar')).toBe('48px');
  });

  it('comfy declares --row-gap: 14px', () => {
    expect(rowVarFor('comfy', 'row-gap')).toBe('14px');
  });

  it('compact declares --row-gap: 8px', () => {
    expect(rowVarFor('compact', 'row-gap')).toBe('8px');
  });

  it('comfy declares --row-vgap: 12px', () => {
    expect(rowVarFor('comfy', 'row-vgap')).toBe('12px');
  });

  it('compact declares --row-vgap: 8px', () => {
    expect(rowVarFor('compact', 'row-vgap')).toBe('8px');
  });

  it('comfy declares --row-identity-gap: 2px', () => {
    expect(rowVarFor('comfy', 'row-identity-gap')).toBe('2px');
  });

  it('compact declares --row-identity-gap: 0px', () => {
    expect(rowVarFor('compact', 'row-identity-gap')).toBe('0px');
  });

  it('comfy declares --row-metric-row-gap: 14px', () => {
    expect(rowVarFor('comfy', 'row-metric-row-gap')).toBe('14px');
  });

  it('compact declares --row-metric-row-gap: 12px', () => {
    expect(rowVarFor('compact', 'row-metric-row-gap')).toBe('12px');
  });

  it('comfy declares --row-income-w: 130px', () => {
    expect(rowVarFor('comfy', 'row-income-w')).toBe('130px');
  });

  it('compact declares --row-income-w: 110px', () => {
    expect(rowVarFor('compact', 'row-income-w')).toBe('110px');
  });
});

describe('Roster list layout contract — <768px Comfy override', () => {
  it('comfy below 768px declares --row-pad: 8px 16px', () => {
    expect(mobileComfyVarFor('row-pad')).toBe('8px 16px');
  });

  it('comfy below 768px declares --row-avatar: 56px', () => {
    expect(mobileComfyVarFor('row-avatar')).toBe('56px');
  });

  it('comfy below 768px declares --row-gap: 10px', () => {
    expect(mobileComfyVarFor('row-gap')).toBe('10px');
  });

  it('comfy below 768px declares --row-vgap: 8px', () => {
    expect(mobileComfyVarFor('row-vgap')).toBe('8px');
  });
});

describe('MuleListRow inline styles reference the density-scoped row vars', () => {
  it('row padding uses var(--row-pad)', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={[baseMule.id]} strategy={verticalListSortingStrategy}>
          <MuleListRow mule={baseMule} metrics={baseMetrics} onClick={() => {}} />
        </SortableContext>
      </DndContext>,
    );
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    // jsdom preserves the inline style as-written.
    expect(row.style.padding).toContain('var(--row-pad');
  });

  it('row gap uses var(--row-gap)', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={[baseMule.id]} strategy={verticalListSortingStrategy}>
          <MuleListRow mule={baseMule} metrics={baseMetrics} onClick={() => {}} />
        </SortableContext>
      </DndContext>,
    );
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.style.gap).toContain('var(--row-gap');
  });

  it('row grid template references var(--row-avatar) for the avatar column', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={[baseMule.id]} strategy={verticalListSortingStrategy}>
          <MuleListRow mule={baseMule} metrics={baseMetrics} onClick={() => {}} />
        </SortableContext>
      </DndContext>,
    );
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.style.gridTemplateColumns).toContain('var(--row-avatar');
  });

  it('row grid template uses var(--row-handle) for the leading drag-handle column', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={[baseMule.id]} strategy={verticalListSortingStrategy}>
          <MuleListRow mule={baseMule} metrics={baseMetrics} onClick={() => {}} />
        </SortableContext>
      </DndContext>,
    );
    const row = container.querySelector('[data-mule-row]') as HTMLElement;
    expect(row.style.gridTemplateColumns).toContain('var(--row-handle');
  });
});

describe('Roster list layout contract — drag handle column width by density', () => {
  it('comfy declares --row-handle: 24px (the full-row-height drag handle column)', () => {
    expect(rowVarFor('comfy', 'row-handle')).toBe('24px');
  });

  it('compact declares --row-handle: 24px', () => {
    expect(rowVarFor('compact', 'row-handle')).toBe('24px');
  });

  it('comfy declares --row-handle-icon: 18px (the GripVertical glyph size)', () => {
    expect(rowVarFor('comfy', 'row-handle-icon')).toBe('18px');
  });

  it('compact declares --row-handle-icon: 16px', () => {
    expect(rowVarFor('compact', 'row-handle-icon')).toBe('16px');
  });
});
