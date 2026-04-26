/// <reference types="node" />
/**
 * Integration-level parity tests for the roster card height contract.
 *
 * The card-level contract (aspect-ratio: 3/4 + min-height: 120px on both
 * MuleCharacterCard and AddCard) is pinned in RosterLayoutContract.test.tsx.
 * This file exercises the same contract through App-level scenarios that
 * historically caused drift:
 *   1. AddCard wrapping alone to a new row at the comfy/compact density
 *      boundaries still carries the contract.
 *   2. CSS grid's default `align-items: stretch` is not overridden, so a
 *      tall in-row card (e.g., a wrapping long mule name) pulls every other
 *      card in that row — including AddCard — to the same height.
 *   3. An empty roster still renders AddCard with the contract intact.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '../../test/test-utils';
import App from '../../App';
import type { Mule } from '../../types';

const STORAGE_KEY = 'maplestory-mule-tracker';

function persistedRoot(mules: Mule[]) {
  return { schemaVersion: 2, mules };
}

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)));
}

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

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-density');
  localStorage.setItem('world', 'heroic-kronos');
});

describe('Roster card height parity (integration)', () => {
  it('AddCard carries aspect-ratio: 3/4 and min-height: 120px when wrapping alone in comfy', () => {
    // 3 cols at every viewport (comfy default) → 3 mules + AddCard means
    // AddCard wraps to a new row alone. The card-level contract is what now
    // guarantees the wrapping row's height, since gridAutoRows no longer pins
    // a floor.
    const mules = Array.from({ length: 3 }, (_, i) => makeMule({ id: `mule-${i}`, name: `M${i}` }));
    seedMules(mules);
    const { container } = render(<App />);
    const addCard = container.querySelector('[data-add-card]') as HTMLElement;
    expect(addCard).toBeTruthy();
    expect(addCard.style.minHeight).toBe('120px');
    expect(addCard.style.aspectRatio.replace(/\s+/g, '')).toBe('3/4');
  });

  it('AddCard contract holds at the compact-density boundary (4 cols, AddCard wraps alone)', () => {
    document.documentElement.setAttribute('data-density', 'compact');
    // jsdom defaults to a 1024px viewport — that puts compact at 5 cols.
    // Seed enough mules to ensure AddCard wraps alone regardless of which
    // step in the staircase resolves; 8 mules is a safe upper bound for
    // every compact column count.
    const mules = Array.from({ length: 8 }, (_, i) => makeMule({ id: `mule-${i}`, name: `M${i}` }));
    seedMules(mules);
    const { container } = render(<App />);
    const addCard = container.querySelector('[data-add-card]') as HTMLElement;
    expect(addCard.style.minHeight).toBe('120px');
    expect(addCard.style.aspectRatio.replace(/\s+/g, '')).toBe('3/4');
  });

  it('roster grid does not override align-items (in-row stretch carries non-uniform-content parity)', () => {
    // Within a row, CSS grid's default stretch alignment pulls every cell
    // (including AddCard) to the tallest in-row card. We rely on that
    // default — opting out of stretch would break in-row parity when one
    // card grows from a wrapping long name.
    const mules = [
      makeMule({ id: 'short', name: 'A' }),
      makeMule({ id: 'long', name: 'A'.repeat(80), muleClass: '' }),
    ];
    seedMules(mules);
    const { container } = render(<App />);
    const grid = container.querySelector('[data-drag-boundary] .grid') as HTMLElement;
    expect(grid.style.alignItems === '' || grid.style.alignItems === 'stretch').toBe(true);
  });

  it('empty roster still renders AddCard with the full contract (aspect-ratio + min-height)', () => {
    // No seeded mules → roster contains only the AddCard. The contract must
    // come from AddCard itself, not from the surrounding grid.
    const { container } = render(<App />);
    const addCard = container.querySelector('[data-add-card]') as HTMLElement;
    expect(addCard).toBeTruthy();
    expect(addCard.style.minHeight).toBe('120px');
    expect(addCard.style.aspectRatio.replace(/\s+/g, '')).toBe('3/4');
  });
});
