/// <reference types="node" />
/**
 * Pins the roster layout contract:
 *   - Column staircase floor: 2 cols below 625px, 3+ cols at 625px and above
 *   - Aspect-ratio card identity (3:4) + 120px min-height floor on each card
 *   - <480px phone-mode rules: tight --card-pad and shrunk --roster-gap
 *
 * jsdom has no layout engine, so we follow the same approach as
 * RosterCardHeightParity.test.tsx: regex over `index.css` for media-query and
 * variable assertions, and inline-style checks for component-level contracts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { beforeEach } from 'vitest';
import { render, renderApp } from '../../test/test-utils';
import { MuleCharacterCard } from '../MuleCharacterCard';
import { AddCard } from '../AddCard';
import type { Mule } from '../../types';

const STORAGE_KEY = 'maplestory-mule-tracker';

function persistedRoot(mules: Mule[]) {
  return { schemaVersion: 2, mules };
}

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-density');
  localStorage.setItem('world', 'heroic-kronos');
});

const indexCssRaw = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');

let muleCounter = 0;
function makeMule(overrides: Partial<Mule> = {}): Mule {
  muleCounter += 1;
  return {
    id: `mule-${muleCounter}`,
    name: 'Mule',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    active: true,
    worldId: 'heroic-kronos',
    ...overrides,
  };
}

function renderMuleCard(mule: Mule = makeMule()) {
  return render(
    <DndContext>
      <SortableContext items={[mule.id]} strategy={rectSortingStrategy}>
        <MuleCharacterCard mule={mule} onClick={() => {}} onDelete={() => {}} />
      </SortableContext>
    </DndContext>,
  );
}

function rosterColsAt(scope: 'comfy' | 'compact'): number {
  // Match the ROOT (no media query) declaration of --roster-cols for the given
  // density scope. The root declaration is what applies at the smallest
  // viewports (anything not covered by min-width media queries).
  const re = new RegExp(
    String.raw`\[data-density=['"]${scope}['"]\]\s*\{[^}]*--roster-cols:\s*(\d+)`,
    'm',
  );
  const m = indexCssRaw.match(re);
  if (!m) throw new Error(`Could not find root --roster-cols for ${scope} in index.css`);
  return parseInt(m[1], 10);
}

function rosterColsInBreakpoint(minWidth: number, scope: 'comfy' | 'compact'): number {
  const block = indexCssRaw.match(
    new RegExp(String.raw`@media\s*\(min-width:\s*${minWidth}px\)\s*\{([\s\S]*?)\n\}`),
  );
  if (!block) throw new Error(`No @media (min-width: ${minWidth}px) block found in index.css`);
  const decl = block[1].match(
    new RegExp(String.raw`\[data-density=['"]${scope}['"]\]\s*\{[^}]*--roster-cols:\s*(\d+)`),
  );
  if (!decl) {
    throw new Error(
      `No --roster-cols declaration for ${scope} inside @media (min-width: ${minWidth}px)`,
    );
  }
  return parseInt(decl[1], 10);
}

describe('Roster layout contract — column staircase floor', () => {
  it('comfy density root declaration sets --roster-cols to 2 (phone floor below 625px)', async () => {
    expect(rosterColsAt('comfy')).toBe(2);
  });

  it('compact density root declaration sets --roster-cols to 2 (phone floor below 625px)', async () => {
    expect(rosterColsAt('compact')).toBe(2);
  });

  it('@media (min-width: 625px) bumps both densities to at least 3 cols', async () => {
    expect(rosterColsInBreakpoint(625, 'comfy')).toBeGreaterThanOrEqual(3);
    expect(rosterColsInBreakpoint(625, 'compact')).toBeGreaterThanOrEqual(3);
  });

  it('@media (min-width: 850px) bumps both densities to at least 4 cols (3→4 transition)', async () => {
    expect(rosterColsInBreakpoint(850, 'comfy')).toBeGreaterThanOrEqual(4);
    expect(rosterColsInBreakpoint(850, 'compact')).toBeGreaterThanOrEqual(4);
  });

  it('no breakpoint between 625px and 849px declares 4 cols (3→4 transition only happens at 850)', async () => {
    // Sweep all min-width media-query blocks; any block with min-width strictly
    // less than 850px must NOT declare --roster-cols: 4 (or higher) — that
    // would short-circuit the 850 transition.
    const blockRe = /@media\s*\(min-width:\s*(\d+)px\)\s*\{([\s\S]*?)\n\}/g;
    for (const m of indexCssRaw.matchAll(blockRe)) {
      const minWidth = parseInt(m[1], 10);
      if (minWidth < 850 && minWidth >= 625) {
        const decls = [...m[2].matchAll(/--roster-cols:\s*(\d+)/g)].map((d) => parseInt(d[1], 10));
        for (const cols of decls) {
          expect(cols).toBeLessThan(4);
        }
      }
    }
  });

  it('no --roster-cols declaration drops below 2 (phones still get at least 2 cards/row)', async () => {
    const allDecls = [...indexCssRaw.matchAll(/--roster-cols:\s*(\d+)/g)].map((m) =>
      parseInt(m[1], 10),
    );
    expect(allDecls.length).toBeGreaterThan(0);
    for (const n of allDecls) {
      expect(n).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Roster layout contract — card aspect ratio', () => {
  it('MuleCharacterCard panel declares aspect-ratio 3/4 (portrait card identity)', async () => {
    const { container } = renderMuleCard();
    const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
    expect(panel).toBeTruthy();
    // React maps `aspectRatio: '3/4'` onto the inline style as `3 / 4` (with
    // spaces) per CSS shorthand normalization. Accept either form.
    const aspect = panel.style.aspectRatio.replace(/\s+/g, '');
    expect(aspect).toBe('3/4');
  });
});

describe('Roster layout contract — card min-height floor', () => {
  it('MuleCharacterCard panel sets a 120px min-height floor (tappability guarantee at narrow widths)', async () => {
    const { container } = renderMuleCard();
    const panel = container.querySelector('[data-mule-card] .panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.style.minHeight).toBe('120px');
  });
});

describe('Roster layout contract — AddCard parity', () => {
  it('AddCard declares aspect-ratio 3/4 (matches MuleCharacterCard)', async () => {
    const { container } = render(<AddCard onClick={() => {}} />);
    const addCard = container.querySelector('[data-add-card]') as HTMLElement;
    expect(addCard).toBeTruthy();
    const aspect = addCard.style.aspectRatio.replace(/\s+/g, '');
    expect(aspect).toBe('3/4');
  });

  it('AddCard min-height matches MuleCharacterCard min-height exactly (height parity, no drift)', async () => {
    const { container: muleContainer } = renderMuleCard();
    const { container: addContainer } = render(<AddCard onClick={() => {}} />);
    const panel = muleContainer.querySelector('[data-mule-card] .panel') as HTMLElement;
    const addCard = addContainer.querySelector('[data-add-card]') as HTMLElement;
    expect(panel.style.minHeight).toBe(addCard.style.minHeight);
    // And the literal value matches the new 120px floor.
    expect(addCard.style.minHeight).toBe('120px');
  });
});

describe('Roster layout contract — INCOME label always visible', () => {
  it('renders the INCOME label as part of the card content (visible at every viewport)', async () => {
    const { container } = renderMuleCard();
    expect(container.textContent).toMatch(/INCOME/);
  });

  it('index.css does NOT hide the INCOME label at any viewport', async () => {
    // Belt-and-suspenders: scan the full CSS and assert no `display: none` rule
    // targets either the legacy data-income-label hook or any selector that
    // would scope to the INCOME row (no rule should be removing it anywhere).
    expect(indexCssRaw).not.toMatch(/data-income-label[^}]*display:\s*none/);
  });
});

describe('Roster layout contract — phone-mode grid gap override', () => {
  it('roster grid gap reads --roster-gap (so phone-mode CSS can override it)', async () => {
    seedMules([
      {
        id: 'm1',
        name: 'M',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-kronos',
      },
    ]);
    const { container } = await renderApp();
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
    expect(grid).toBeTruthy();
    // The grid's `gap` must reference the --roster-gap variable so the
    // <480px override can take effect. Either as inline style or as the
    // computed style (jsdom won't compute the var, but the source text wins).
    expect(grid.style.gap).toContain('var(--roster-gap');
  });

  it('--roster-gap default (root) is 16px and phone-mode (<480px) overrides it to 8px', async () => {
    // Root default — at any density scope or :root.
    const rootRe =
      /(?::root|html|body|\[data-density=['"](?:comfy|compact)['"]\])\s*\{[^}]*--roster-gap:\s*(\d+)px/;
    const rootMatch = indexCssRaw.match(rootRe);
    expect(rootMatch).not.toBeNull();
    expect(parseInt(rootMatch![1], 10)).toBe(16);

    // Phone-mode override.
    const phoneRe = /@media\s*\(max-width:\s*479(?:\.\d+)?px\)\s*\{[^]*?--roster-gap:\s*8px[^]*?\}/;
    expect(indexCssRaw).toMatch(phoneRe);
  });
});

describe('Roster layout contract — phone-mode card padding override', () => {
  it('index.css overrides --card-pad to 8px inside a <480px (max-width: 479px) media block', async () => {
    // The override must be inside a max-width: 479(.98)px @media block. We
    // tolerate the override sitting on either density selectors or a wider
    // scope, so we don't pin it to a specific selector — only that 8px
    // appears for --card-pad inside the phone-mode block.
    const phoneModeRe =
      /@media\s*\(max-width:\s*479(?:\.\d+)?px\)\s*\{[^]*?--card-pad:\s*8px[^]*?\}/;
    expect(indexCssRaw).toMatch(phoneModeRe);
  });

  it('the density-default --card-pad values are still 16px (comfy) / 12px (compact) in their root scopes', async () => {
    // The phone-mode override must not have replaced the desktop defaults —
    // they still apply at >=480px.
    const comfyRoot = indexCssRaw.match(
      /\[data-density=['"]comfy['"]\]\s*\{[^}]*--card-pad:\s*(\d+)px/,
    );
    const compactRoot = indexCssRaw.match(
      /\[data-density=['"]compact['"]\]\s*\{[^}]*--card-pad:\s*(\d+)px/,
    );
    expect(comfyRoot).not.toBeNull();
    expect(compactRoot).not.toBeNull();
    expect(parseInt(comfyRoot![1], 10)).toBe(16);
    expect(parseInt(compactRoot![1], 10)).toBe(12);
  });
});

describe('Roster layout contract — grid no longer pins height floor', () => {
  it('roster grid gridAutoRows is auto (height contract moved to the card itself)', async () => {
    seedMules([
      {
        id: 'm1',
        name: 'M',
        level: 200,
        muleClass: 'Hero',
        selectedBosses: [],
        active: true,
        worldId: 'heroic-kronos',
      },
    ]);
    const { container } = await renderApp();
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
    expect(grid).toBeTruthy();
    // The previous contract used minmax(var(--roster-card-min-height), auto)
    // to pin every row to the floor. With aspect-ratio + min-height on the
    // card itself, the grid no longer needs (or should) pin the row floor.
    // 'auto' is the default and means "size from contents" — rows match the
    // tallest card naturally.
    expect(['', 'auto']).toContain(grid.style.gridAutoRows);
  });
});
