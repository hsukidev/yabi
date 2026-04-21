import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import App from '../App';
import type { Mule } from '../types';

const STORAGE_KEY = 'maplestory-mule-tracker';

// Seven mules give us enough runway for revert-on-backtrack and cross-start tests.
// PRD walkthrough uses A,B,C,D,E,F,G with S=start in the middle (index 3 = D).
const testMules: Mule[] = [
  { id: 'mule-a', name: 'Alpha', level: 200, muleClass: 'Hero', selectedBosses: [], active: true },
  {
    id: 'mule-b',
    name: 'Beta',
    level: 180,
    muleClass: 'Paladin',
    selectedBosses: [],
    active: true,
  },
  {
    id: 'mule-c',
    name: 'Gamma',
    level: 160,
    muleClass: 'Dark Knight',
    selectedBosses: [],
    active: true,
  },
  {
    id: 'mule-d',
    name: 'Delta',
    level: 170,
    muleClass: 'Bishop',
    selectedBosses: [],
    active: true,
  },
  {
    id: 'mule-e',
    name: 'Epsilon',
    level: 190,
    muleClass: 'Shadower',
    selectedBosses: [],
    active: true,
  },
  {
    id: 'mule-f',
    name: 'Zeta',
    level: 150,
    muleClass: 'Night Lord',
    selectedBosses: [],
    active: true,
  },
  {
    id: 'mule-g',
    name: 'Eta',
    level: 140,
    muleClass: 'Mercedes',
    selectedBosses: [],
    active: true,
  },
];

function persistedRoot(mules: Mule[]) {
  return { schemaVersion: 2, mules };
}

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)));
}

function resetTestEnvironment() {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
}

/**
 * Hit-test mock: each card owns a 200px-wide slot at `i*220`. Any x inside
 * a slot returns the corresponding `[data-mule-card]` element. Outside all
 * slots returns the document body. This drives `document.elementFromPoint`
 * during pointermove.
 */
function mockElementFromPoint(container: HTMLElement, mules: Mule[]) {
  const orig = document.elementFromPoint;
  document.elementFromPoint = ((x: number) => {
    for (let i = 0; i < mules.length; i += 1) {
      const lo = i * 220;
      const hi = lo + 200;
      if (x >= lo && x < hi) {
        const card = container.querySelector(
          `[data-mule-card="${mules[i].id}"]`,
        ) as HTMLElement | null;
        return card ?? null;
      }
    }
    return document.body;
  }) as typeof document.elementFromPoint;
  return () => {
    document.elementFromPoint = orig;
  };
}

function enterBulk() {
  fireEvent.click(screen.getByRole('button', { name: /bulk.*delete|bulk.*trash/i }));
}

function getCardWrapper(container: HTMLElement, id: string): HTMLElement {
  return container.querySelector(`[data-mule-card="${id}"]`) as HTMLElement;
}

function isCardSelected(container: HTMLElement, id: string): boolean {
  const panel = container.querySelector(`[data-mule-card="${id}"] .panel`) as HTMLElement;
  return panel.getAttribute('aria-pressed') === 'true';
}

function centerXFor(idx: number): number {
  return idx * 220 + 100;
}

function pointerDown(el: Element, x: number, y: number) {
  fireEvent.pointerDown(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    button: 0,
    isPrimary: true,
    bubbles: true,
  });
}

function pointerMove(el: Element | Document, x: number, y: number) {
  fireEvent.pointerMove(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    bubbles: true,
  });
}

function pointerUp(el: Element | Document, x: number, y: number) {
  fireEvent.pointerUp(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    bubbles: true,
  });
}

function pointerCancel(el: Element | Document, x: number, y: number) {
  fireEvent.pointerCancel(el, {
    pointerId: 1,
    clientX: x,
    clientY: y,
    isPrimary: true,
    bubbles: true,
  });
}

describe('useBulkDragPaint (drag-to-select gesture)', () => {
  let restoreHitTest: (() => void) | null = null;

  beforeEach(() => {
    resetTestEnvironment();
  });

  afterEach(() => {
    if (restoreHitTest) {
      restoreHitTest();
      restoreHitTest = null;
    }
  });

  it('zero-move single-click preserved: pointerdown → pointerup on a card toggles selection', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    const cardA = getCardWrapper(container, 'mule-a');
    const x = centerXFor(0);
    const y = 150;

    pointerDown(cardA, x, y);
    pointerUp(cardA, x, y);
    // Simulate the browser's synthetic trailing click (zero-move path).
    fireEvent.click(cardA.querySelector('.panel') as HTMLElement);

    expect(isCardSelected(container, 'mule-a')).toBe(true);
    expect(isCardSelected(container, 'mule-b')).toBe(false);
    expect(screen.getByText(/1\s*SELECTED/i)).toBeTruthy();
  });

  it('forward paint (add): drag from unmarked S across two later cards marks all three', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    const cardA = getCardWrapper(container, 'mule-a');
    pointerDown(cardA, centerXFor(0), 150);
    pointerMove(document, centerXFor(1), 150);
    pointerMove(document, centerXFor(2), 150);
    pointerUp(document, centerXFor(2), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(true);
    expect(isCardSelected(container, 'mule-b')).toBe(true);
    expect(isCardSelected(container, 'mule-c')).toBe(true);
    expect(isCardSelected(container, 'mule-d')).toBe(false);
    expect(isCardSelected(container, 'mule-e')).toBe(false);
  });

  it('forward paint (remove): drag from marked S across two later marked cards unmarks all three', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    // Pre-mark three cards via clicks (zero-move path).
    fireEvent.click(container.querySelector('[data-mule-card="mule-a"] .panel') as HTMLElement);
    fireEvent.click(container.querySelector('[data-mule-card="mule-b"] .panel') as HTMLElement);
    fireEvent.click(container.querySelector('[data-mule-card="mule-c"] .panel') as HTMLElement);
    expect(isCardSelected(container, 'mule-a')).toBe(true);
    expect(isCardSelected(container, 'mule-b')).toBe(true);
    expect(isCardSelected(container, 'mule-c')).toBe(true);

    const cardA = getCardWrapper(container, 'mule-a');
    pointerDown(cardA, centerXFor(0), 150);
    pointerMove(document, centerXFor(1), 150);
    pointerMove(document, centerXFor(2), 150);
    pointerUp(document, centerXFor(2), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(false);
    expect(isCardSelected(container, 'mule-b')).toBe(false);
    expect(isCardSelected(container, 'mule-c')).toBe(false);
  });

  it('revert on backtrack: forward across E,F,G then back to S leaves only S marked', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    const cardA = getCardWrapper(container, 'mule-a');
    pointerDown(cardA, centerXFor(0), 150);
    // Forward across mule-b, mule-c, mule-d.
    pointerMove(document, centerXFor(1), 150);
    pointerMove(document, centerXFor(2), 150);
    pointerMove(document, centerXFor(3), 150);
    // Backtrack to S.
    pointerMove(document, centerXFor(0), 150);
    pointerUp(document, centerXFor(0), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(true);
    expect(isCardSelected(container, 'mule-b')).toBe(false);
    expect(isCardSelected(container, 'mule-c')).toBe(false);
    expect(isCardSelected(container, 'mule-d')).toBe(false);
  });

  it('cross the start: start=D, forward to F, back past D to B → B,C,D marked; E,F reverted (5-card range [B..D])', () => {
    // PRD walkthrough: roster A,B,C,D,E,F,G. Start S=D (index 3). Drag right
    // to F (index 5): range [D..F] brushes E, F. Drag left past D to B (index
    // 1): new range [B..D] brushes B, C; E, F revert to Original Snapshot
    // (unmarked). Final marked set = {B, C, D}; D is still marked as start.
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    const cardD = getCardWrapper(container, 'mule-d');
    pointerDown(cardD, centerXFor(3), 150);
    pointerMove(document, centerXFor(4), 150); // E
    pointerMove(document, centerXFor(5), 150); // F
    pointerMove(document, centerXFor(2), 150); // back across start to C
    pointerMove(document, centerXFor(1), 150); // B — range = [1, 3] = B,C,D
    pointerUp(document, centerXFor(1), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(false);
    expect(isCardSelected(container, 'mule-b')).toBe(true);
    expect(isCardSelected(container, 'mule-c')).toBe(true);
    expect(isCardSelected(container, 'mule-d')).toBe(true);
    // E and F were brushed then reverted when the range crossed the start.
    expect(isCardSelected(container, 'mule-e')).toBe(false);
    expect(isCardSelected(container, 'mule-f')).toBe(false);
    expect(isCardSelected(container, 'mule-g')).toBe(false);
  });

  it('preserve pre-existing selection on revert: pre-marked X entering then leaving range restores to marked', () => {
    // Pre-mark mule-c. Drag from unmarked mule-a forward to mule-d, then back to mule-a.
    // At pointerup, the final range is [0, 0] = just A. But mule-c was pre-marked,
    // so reverting it should leave it marked (not unmarked).
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    // Pre-mark mule-c via single click.
    fireEvent.click(container.querySelector('[data-mule-card="mule-c"] .panel') as HTMLElement);
    expect(isCardSelected(container, 'mule-c')).toBe(true);

    const cardA = getCardWrapper(container, 'mule-a');
    pointerDown(cardA, centerXFor(0), 150);
    pointerMove(document, centerXFor(1), 150); // B
    pointerMove(document, centerXFor(2), 150); // C (already marked)
    pointerMove(document, centerXFor(3), 150); // D
    pointerMove(document, centerXFor(0), 150); // back to A — range = [0,0]
    pointerUp(document, centerXFor(0), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(true);
    expect(isCardSelected(container, 'mule-b')).toBe(false);
    // Pre-existing selection restored — not reset to unmarked.
    expect(isCardSelected(container, 'mule-c')).toBe(true);
    expect(isCardSelected(container, 'mule-d')).toBe(false);
  });

  it('synthetic click suppression: after an engaged drag, the trailing click on Start Card does not double-toggle', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    const cardA = getCardWrapper(container, 'mule-a');
    const panelA = cardA.querySelector('.panel') as HTMLElement;

    pointerDown(cardA, centerXFor(0), 150);
    pointerMove(document, centerXFor(0) + 10, 150); // engage
    pointerUp(document, centerXFor(0) + 10, 150);

    expect(isCardSelected(container, 'mule-a')).toBe(true);

    // Browser fires the trailing synthetic click AFTER pointerup. Our hook
    // must swallow this click or the panel's onClick handler would toggle A
    // back to unmarked.
    fireEvent.click(panelA);

    expect(isCardSelected(container, 'mule-a')).toBe(true);
  });

  it('pointerdown outside any card is a no-op; subsequent pointermove/pointerup leave state unchanged', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    const boundary = container.querySelector('[data-drag-boundary]') as HTMLElement;
    // Start pointerdown on the boundary padding (not on a card).
    pointerDown(boundary, 2000, 150); // far past any card slot
    pointerMove(document, centerXFor(0), 150);
    pointerMove(document, centerXFor(1), 150);
    pointerUp(document, centerXFor(1), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(false);
    expect(isCardSelected(container, 'mule-b')).toBe(false);
    expect(isCardSelected(container, 'mule-c')).toBe(false);
  });

  it('pointercancel mid-drag reverts every Mule to its Original Snapshot', () => {
    seedMules(testMules);
    const { container } = render(<App />);
    enterBulk();
    restoreHitTest = mockElementFromPoint(container, testMules);

    // Pre-mark mule-d so we can verify it's restored (not just reset to unmarked).
    fireEvent.click(container.querySelector('[data-mule-card="mule-d"] .panel') as HTMLElement);
    expect(isCardSelected(container, 'mule-d')).toBe(true);

    const cardA = getCardWrapper(container, 'mule-a');
    pointerDown(cardA, centerXFor(0), 150);
    pointerMove(document, centerXFor(1), 150); // B brushed
    pointerMove(document, centerXFor(2), 150); // C brushed
    pointerMove(document, centerXFor(3), 150); // D hit by brush=add → no-op but in range
    // Mid-gesture cancel.
    pointerCancel(document, centerXFor(3), 150);

    expect(isCardSelected(container, 'mule-a')).toBe(false); // original: unmarked
    expect(isCardSelected(container, 'mule-b')).toBe(false); // original: unmarked
    expect(isCardSelected(container, 'mule-c')).toBe(false); // original: unmarked
    expect(isCardSelected(container, 'mule-d')).toBe(true); // original: marked
    expect(isCardSelected(container, 'mule-e')).toBe(false); // never touched
  });
});
