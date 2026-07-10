import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@/test/test-utils';

import { MuleDetailDrawer } from '../MuleDetailDrawer';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';
import { USER_PRESET_STORAGE_KEY } from '../../persistence/userPresetStorage';

const VELLUM = bosses.find((b) => b.family === 'vellum')!; // in every canonical preset (CRA)
const LUCID = bosses.find((b) => b.family === 'lucid')!; // weekly-only family
const HORNTAIL = bosses.find((b) => b.family === 'horntail')!; // daily-only family

const baseMule: Mule = {
  id: 'm1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

/**
 * Stateful drawer stand-in: `onUpdate` feeds patches back into the `mule` prop
 * so slate-driven changes (presets, reset, toggles) actually reflect in the
 * rendered grid, exercising the real end-to-end card-view path. `metrics` is
 * optional on the drawer, so `null` keeps the harness minimal.
 */
function StatefulDrawer({ initial = baseMule }: { initial?: Mule }) {
  const [mule, setMule] = useState<Mule>(initial);
  return (
    <MuleDetailDrawer
      mule={mule}
      metrics={null}
      open
      onClose={vi.fn()}
      onDelete={vi.fn()}
      onUpdate={(_id, patch) => setMule((m) => ({ ...m, ...patch }))}
    />
  );
}

function enterCardView() {
  const group = screen.getByRole('group', { name: /slate display mode/i });
  fireEvent.click(within(group).getByRole('button', { name: /boss card view/i }));
}

function cadence(label: string): HTMLButtonElement {
  const group = screen.getByRole('group', { name: /cadence filter/i });
  return within(group).getByRole('button', {
    name: new RegExp(`^${label}$`, 'i'),
  }) as HTMLButtonElement;
}

function preset(label: string): HTMLButtonElement {
  const group = screen.getByRole('group', { name: /boss presets/i });
  return within(group).getByRole('button', {
    name: new RegExp(`^${label}$`, 'i'),
  }) as HTMLButtonElement;
}

const isSelected = (bossId: string) =>
  screen.queryByTestId(`boss-card-${bossId}`)?.getAttribute('data-selected') === 'true';

beforeEach(() => localStorage.clear());

describe('MuleDetailDrawer — Boss Card View integration (#289)', () => {
  describe('presets + reset drive the card grid', () => {
    it('applying a Canonical Preset (CRA) in card view selects the matching cards', () => {
      render(<StatefulDrawer />);
      enterCardView();
      expect(screen.getByTestId('boss-card-view')).toBeTruthy();
      expect(isSelected(VELLUM.id)).toBe(false);

      fireEvent.click(preset('CRA'));

      // CRA includes Vellum → its Boss Card now holds a Slate Key.
      expect(isSelected(VELLUM.id)).toBe(true);
    });

    it('applying a Canonical Preset in card view flips the Daily cadence filter to All', () => {
      render(<StatefulDrawer />);
      enterCardView();
      fireEvent.click(cadence('Daily'));
      expect(cadence('Daily').className).toContain('on');

      fireEvent.click(preset('CRA'));

      expect(cadence('All').className).toContain('on');
      expect(cadence('Daily').className).not.toContain('on');
    });

    it('applying a User Preset in card view selects the snapshot cards and flips Daily to All', () => {
      localStorage.setItem(
        USER_PRESET_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          userPresets: [
            {
              id: 'p1',
              name: 'MyVellum',
              slateKeys: [`${VELLUM.id}:chaos:weekly`],
              partySizes: {},
            },
          ],
        }),
      );
      render(<StatefulDrawer />);
      enterCardView();
      fireEvent.click(cadence('Daily'));
      expect(isSelected(VELLUM.id)).toBe(false);

      // Open the CUSTOM popover and apply the saved preset by name.
      fireEvent.click(preset('CUSTOM'));
      const list = screen.getByRole('list', { name: /saved user presets/i });
      fireEvent.click(within(list).getByRole('button', { name: 'MyVellum' }));

      expect(isSelected(VELLUM.id)).toBe(true);
      expect(cadence('All').className).toContain('on');
    });

    it('Reset clears every selected card', () => {
      render(<StatefulDrawer />);
      enterCardView();
      fireEvent.click(preset('CRA'));
      expect(isSelected(VELLUM.id)).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));

      expect(isSelected(VELLUM.id)).toBe(false);
    });
  });

  describe('cadence + search filter the cards exactly as the matrix rows', () => {
    it('Daily filter hides a weekly-only family card and keeps a daily-only one', () => {
      render(<StatefulDrawer />);
      enterCardView();
      // All families visible under the default All filter.
      expect(screen.getByTestId(`boss-card-${LUCID.id}`)).toBeTruthy();
      expect(screen.getByTestId(`boss-card-${HORNTAIL.id}`)).toBeTruthy();

      fireEvent.click(cadence('Daily'));

      // Lucid (weekly-only) drops out of the shared projection; Horntail (daily) stays.
      expect(screen.queryByTestId(`boss-card-${LUCID.id}`)).toBeNull();
      expect(screen.getByTestId(`boss-card-${HORNTAIL.id}`)).toBeTruthy();
    });

    it('Weekly filter keeps a weekly family and hides a daily-only one', () => {
      render(<StatefulDrawer />);
      enterCardView();
      fireEvent.click(cadence('Weekly'));
      expect(screen.getByTestId(`boss-card-${LUCID.id}`)).toBeTruthy();
      expect(screen.queryByTestId(`boss-card-${HORNTAIL.id}`)).toBeNull();
    });

    it('search narrows the cards to the matching family', () => {
      render(<StatefulDrawer />);
      enterCardView();
      const searchBox = screen.getByLabelText('Search bosses');
      fireEvent.change(searchBox, { target: { value: 'lucid' } });

      const names = screen.getAllByTestId('boss-card-name').map((n) => n.textContent);
      expect(names).toEqual(['Lucid']);
    });
  });

  describe('empty projection shows the shared empty treatment', () => {
    it('a search matching nothing renders the empty panel instead of a blank card grid', () => {
      render(<StatefulDrawer />);
      enterCardView();
      fireEvent.change(screen.getByLabelText('Search bosses'), { target: { value: 'zzzzzzz' } });

      expect(screen.getByTestId('boss-slate-empty')).toBeTruthy();
      expect(screen.getByTestId('boss-slate-empty').textContent).toContain('No bosses match');
      expect(screen.queryByTestId('boss-card-view')).toBeNull();
      expect(screen.queryAllByTestId('boss-card-name')).toHaveLength(0);
    });

    it('the same empty panel replaces the matrix when the projection is empty (consistent across modes)', () => {
      render(<StatefulDrawer />);
      // Stay in matrix mode (default).
      fireEvent.change(screen.getByLabelText('Search bosses'), { target: { value: 'zzzzzzz' } });

      expect(screen.getByTestId('boss-slate-empty')).toBeTruthy();
      expect(screen.queryByRole('table')).toBeNull();
    });

    it('clearing the search restores the grid', () => {
      render(<StatefulDrawer />);
      enterCardView();
      const searchBox = screen.getByLabelText('Search bosses');
      fireEvent.change(searchBox, { target: { value: 'zzzzzzz' } });
      expect(screen.getByTestId('boss-slate-empty')).toBeTruthy();

      fireEvent.change(searchBox, { target: { value: '' } });
      expect(screen.queryByTestId('boss-slate-empty')).toBeNull();
      expect(screen.getByTestId('boss-card-view')).toBeTruthy();
    });
  });
});
