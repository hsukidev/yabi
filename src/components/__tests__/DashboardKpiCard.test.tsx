import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp, screen, within } from '../../test/test-utils';
import { STORAGE_KEY } from '../../persistence/muleStorage';
import { CURRENT_SCHEMA_VERSION } from '../../persistence/muleMigrate';
import { bosses } from '../../data/bosses';
import type { Mule } from '../../types';

const BLACK_MAGE_EXTREME = `${bosses.find((b) => b.family === 'black-mage')!.id}:extreme:monthly`;

function persistedRoot(mules: Mule[]) {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, mules };
}

function seedMules(mules: Mule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedRoot(mules)));
}

function makeMule(overrides: Partial<Mule> = {}): Mule {
  return {
    id: 'mule',
    name: 'Mule',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    active: true,
    worldId: 'heroic-kronos',
    ...overrides,
  };
}

// The BM income block now wears a Progress Readout ("X / expected"); its
// combined aria-label carries the expected denominator.
function incomeExpected(label: string): string {
  const card = screen.getByTestId('income-card') as HTMLElement;
  const aria =
    within(card)
      .getByLabelText(new RegExp(`^${label}:`, 'i'))
      .getAttribute('aria-label') ?? '';
  return / of (.+)$/.exec(aria)?.[1] ?? '';
}

beforeEach(() => {
  localStorage.clear();
});

describe('Dashboard KPI Card', () => {
  it('scopes Expected Black Mage Income to active mules in the selected world', async () => {
    seedMules([
      makeMule({
        id: 'selected-active',
        selectedBosses: [BLACK_MAGE_EXTREME],
        worldId: 'heroic-kronos',
      }),
      makeMule({
        id: 'selected-inactive',
        active: false,
        selectedBosses: [BLACK_MAGE_EXTREME],
        worldId: 'heroic-kronos',
      }),
      makeMule({
        id: 'other-world-active',
        selectedBosses: [BLACK_MAGE_EXTREME],
        worldId: 'interactive-scania',
      }),
    ]);
    localStorage.setItem('world', 'heroic-kronos');

    await renderApp();

    expect(incomeExpected('Expected Black Mage income')).toBe('18B');
  });
});
