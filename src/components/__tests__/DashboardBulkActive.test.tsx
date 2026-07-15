/// <reference types="node" />
/**
 * Integration coverage for the Bulk Action Bar's **Set Active / Set Inactive**
 * actions (#319). Drives the real Dashboard: enter Bulk Select Mode, select
 * the whole roster, and apply a directional Active Flag action. Each action
 * converges every Bulk-Selected Mule to the chosen state (mixed selections
 * included); already-matching mules no-op. Selection and mode persist after
 * applying.
 *
 * Active state is observed through the `[data-inactive-dim]` overlay, which a
 * roster card renders only while its Active Flag is off.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderApp, screen, fireEvent, waitFor, within } from '../../test/test-utils';
import type { Mule } from '../../types';

const STORAGE_KEY = 'maplestory-mule-tracker';

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2, mules }));
}

let muleCounter = 0;
function makeMule(overrides: Partial<Mule> = {}): Mule {
  muleCounter += 1;
  return {
    id: `mule-${muleCounter}`,
    name: `Mule${muleCounter}`,
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
  document.documentElement.removeAttribute('data-display');
  localStorage.setItem('world', 'heroic-kronos');
});

const inactiveCardCount = (root: HTMLElement) =>
  root.querySelectorAll('[data-mule-card] [data-inactive-dim]').length;

async function enterBulkAndSelectAll() {
  fireEvent.click(screen.getByRole('button', { name: /bulk select mode/i }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /select all/i })).toBeTruthy();
  });
  fireEvent.click(screen.getByRole('button', { name: /select all/i }));
}

// Set Active / Set Inactive live inside the Mark As Menu (merged with the
// cadence mark actions; the standalone Active dropdown was retired).
async function applyActiveAction(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: /mark as/i }));
  await waitFor(() => {
    expect(screen.getByRole('menuitem', { name })).toBeTruthy();
  });
  fireEvent.click(screen.getByRole('menuitem', { name }));
}

describe('Bulk Action Bar — Set Active / Set Inactive', () => {
  it('Set Inactive converges a mixed selection to inactive (matching mules no-op)', async () => {
    // Two active, one already inactive — the mixed case the action must converge.
    seedMules([
      makeMule({ id: 'a', active: true }),
      makeMule({ id: 'b', active: true }),
      makeMule({ id: 'c', active: false }),
    ]);
    const { container } = await renderApp();
    expect(inactiveCardCount(container)).toBe(1);

    await enterBulkAndSelectAll();
    await applyActiveAction(/set inactive/i);

    // All three converge to inactive; the already-inactive one is a no-op.
    await waitFor(() => {
      expect(inactiveCardCount(container)).toBe(3);
    });
  });

  it('Set Active converges a mixed selection to active', async () => {
    seedMules([
      makeMule({ id: 'a', active: false }),
      makeMule({ id: 'b', active: false }),
      makeMule({ id: 'c', active: true }),
    ]);
    const { container } = await renderApp();
    expect(inactiveCardCount(container)).toBe(2);

    await enterBulkAndSelectAll();
    await applyActiveAction(/set active/i);

    await waitFor(() => {
      expect(inactiveCardCount(container)).toBe(0);
    });
  });

  it('keeps Bulk Select Mode and the selection after applying', async () => {
    seedMules([makeMule({ id: 'a', active: true }), makeMule({ id: 'b', active: true })]);
    const { container } = await renderApp();

    await enterBulkAndSelectAll();
    await applyActiveAction(/set inactive/i);

    await waitFor(() => {
      expect(inactiveCardCount(container)).toBe(2);
    });

    // Bar still present (mode persists) and the count pill is unchanged
    // (selection persists) — no action exits Bulk Select Mode.
    const bar = container.querySelector('[data-bulk-action-bar]') as HTMLElement;
    expect(bar).toBeTruthy();
    const pill = within(bar).getByText(/2\s*SELECTED/i);
    expect(pill).toBeTruthy();
  });
});
