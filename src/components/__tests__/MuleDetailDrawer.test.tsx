import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@/test/test-utils';

import { MuleDetailDrawer } from '../MuleDetailDrawer';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';
import { WorldIncome } from '../../modules/worldIncome';
import { rosterRowMetrics, type RosterRowMetrics } from '../rosterRowMetrics';
import { formatMeso } from '../../utils/meso';
import { formatDroppedSlots, MuleBossSlate, type SlateKey } from '../../data/muleBossSlate';
import { resolveWorldGroup } from '../../data/worlds';
import { currentDailyStamp, currentWeeklyStamp, currentBmStamp } from '../../utils/cycle';

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;
const HILLA_BOSS = bosses.find((b) => b.family === 'hilla')!;
const NORMAL_HILLA_DAILY = `${HILLA_BOSS.id}:normal:daily`;
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!;
const EXTREME_BLACK_MAGE = `${BLACK_MAGE_BOSS.id}:extreme:monthly`;
const HARD_BLACK_MAGE_MONTHLY = `${BLACK_MAGE_BOSS.id}:hard:monthly`;

// The drawer kebab (touch marking path) is the Mule Actions Menu; open it,
// then interact with its rows.
const getDrawerKebab = () => screen.getByRole('button', { name: /mule actions/i });
const openDrawerMenu = async () => {
  fireEvent.click(getDrawerKebab());
  await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
};

function topWeeklyKeys(n: number): { slateKey: SlateKey; value: number }[] {
  const all: { slateKey: SlateKey; value: number }[] = [];
  for (const boss of bosses) {
    const weeklies = boss.difficulty.filter((difficulty) => difficulty.cadence === 'weekly');
    if (weeklies.length === 0) continue;
    const top = weeklies.reduce((best, current) =>
      current.crystalValue.Heroic > best.crystalValue.Heroic ? current : best,
    );
    all.push({
      slateKey: `${boss.id}:${top.tier}:weekly`,
      value: top.crystalValue.Heroic,
    });
  }
  all.sort((a, b) => b.value - a.value);
  if (all.length < n) throw new Error(`Only found ${all.length} weekly keys`);
  return all.slice(0, n);
}

const baseMule: Mule = {
  id: 'test-mule-1',
  name: 'TestMule',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
};

function metricsFor(mule: Mule | null, worldMules: readonly Mule[]): RosterRowMetrics | null {
  if (!mule) return null;
  const worldIncome = WorldIncome.of(worldMules);
  return rosterRowMetrics(mule, worldIncome.perMule.get(mule.id), worldIncome.totalContributedMeso);
}

type DrawerRenderOverrides = Partial<Parameters<typeof MuleDetailDrawer>[0]> & {
  worldMules?: readonly Mule[];
};

// This suite exercises the Boss Matrix path (cells, columns, toolbar wiring).
// The Slate Display Mode now defaults to cards, so pin matrix explicitly.
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('slate-display-mode', 'matrix');
});

function renderDrawer(overrides: DrawerRenderOverrides = {}) {
  const { worldMules: providedWorldMules, ...propOverrides } = overrides;
  const mule = propOverrides.mule === undefined ? baseMule : propOverrides.mule;
  const worldMules = providedWorldMules ?? (mule ? [mule] : []);
  const props = {
    mule,
    open: true,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    metrics:
      propOverrides.metrics === undefined ? metricsFor(mule, worldMules) : propOverrides.metrics,
    ...propOverrides,
  };
  return {
    ...render(<MuleDetailDrawer {...props} />),
    props,
  };
}

function blockersForCap(topKeys: readonly SlateKey[], tailCount: number): Mule[] {
  return [
    ...Array.from({ length: 13 }, (_, index) => ({
      ...baseMule,
      id: `blocker-${index}`,
      selectedBosses: [...topKeys],
    })),
    {
      ...baseMule,
      id: 'blocker-tail',
      selectedBosses: topKeys.slice(0, tailCount),
    },
  ];
}

function partialDropWorld() {
  const top14 = topWeeklyKeys(14);
  const selectedMule = {
    ...baseMule,
    selectedBosses: [top14[0].slateKey, top14[13].slateKey],
  };
  return {
    selectedMule,
    worldMules: [
      ...blockersForCap(
        top14.slice(0, 13).map((key) => key.slateKey),
        10,
      ),
      selectedMule,
    ],
  };
}

function fullyDroppedWorld(
  overrides: Partial<Mule> = {},
  extraSelectedBosses: readonly string[] = [],
) {
  const top14 = topWeeklyKeys(14);
  const droppedKey = top14[13].slateKey;
  const selectedMule = {
    ...baseMule,
    id: 'fully-dropped',
    ...overrides,
    selectedBosses: [droppedKey, ...extraSelectedBosses],
  };
  return {
    droppedKey,
    selectedMule,
    worldMules: [
      ...blockersForCap(
        top14.slice(0, 13).map((key) => key.slateKey),
        11,
      ),
      selectedMule,
    ],
  };
}

/**
 * Thin smoke test — detailed behavior lives in the per-hook test files:
 *   - MuleDetailDrawer/hooks/__tests__/useMatrixFilter.test.tsx
 *   - MuleDetailDrawer/hooks/__tests__/usePartySizes.test.tsx
 *   - MuleDetailDrawer/hooks/__tests__/usePresetPill.test.ts
 *   - MuleDetailDrawer/hooks/__tests__/useSlateActions.test.tsx
 *   - MuleDetailDrawer/hooks/__tests__/useDeleteConfirm.test.tsx
 *   - MuleDetailDrawer/hooks/__tests__/useMuleIdentityDraft.test.tsx
 *
 * This file only asserts the drawer renders and wires those hooks into the
 * JSX correctly: name draft bound to the input, matrix toolbar + reset, boss
 * matrix toggle, delete-confirm two-step flow, close button.
 */
describe('MuleDetailDrawer (smoke)', () => {
  it('renders content when open with a mule', () => {
    renderDrawer();
    expect(screen.getByRole('heading', { name: 'TestMule' })).toBeTruthy();
  });

  it('renders a Sheet even when mule is null so Base-UI can animate out', () => {
    renderDrawer({ mule: null });
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'TestMule' })).toBeNull();
  });

  it('wires the Close button to onClose', () => {
    const { props } = renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('wires the name input to the identity draft hook (commit on blur)', () => {
    const { props } = renderDrawer();
    const input = screen.getByLabelText('Character Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'NewName' } });
    fireEvent.blur(input);
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, { name: 'NewName' });
  });

  // The drawer header reflects the live identity draft so users see typed
  // changes immediately, before the blur-driven commit lands.
  it('header heading reflects the live Name draft as the user types', () => {
    renderDrawer();
    const input = screen.getByLabelText('Character Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TypingDraft' } });
    expect(input.value).toBe('TypingDraft');
    expect(screen.getByRole('heading', { name: 'TypingDraft' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'TestMule' })).toBeNull();
  });

  it('header level chip reflects the live Level draft as the user types', () => {
    renderDrawer();
    const input = screen.getByLabelText('Level') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '150' } });
    expect(input.value).toBe('150');
    expect(screen.getByText('Lv.150')).toBeTruthy();
    expect(screen.queryByText('Lv.200')).toBeNull();
  });

  it('wires the matrix Reset button to resetBosses (wipes selections and party sizes)', () => {
    const { props } = renderDrawer({
      mule: { ...baseMule, selectedBosses: [HARD_LUCID] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, {
      selectedBosses: [],
      partySizes: {},
    });
  });

  it('wires matrix cells to toggleKey (dispatches onUpdate with slate.toggle(key).keys)', () => {
    const { props } = renderDrawer();
    fireEvent.click(screen.getByTestId(`matrix-cell-${LUCID_BOSS.id}-hard`));
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, {
      selectedBosses: [HARD_LUCID],
    });
  });

  it('wires the kebab Delete row through the two-step confirm flow (delete + close)', async () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    renderDrawer({ onDelete, onClose });

    await openDrawerMenu();
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText('Delete?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onDelete).toHaveBeenCalledWith(baseMule.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel hides the confirm prompt without calling onDelete', async () => {
    const { props } = renderDrawer();
    await openDrawerMenu();
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete?')).toBeNull();
    expect(props.onDelete).not.toHaveBeenCalled();
  });

  // Regression: the drawer used to build its IncomeSource without `worldId`,
  // so `Income.of` fell back to Heroic pricing for every mule — Interactive
  // mules in the Weekly chip displayed Heroic crystal values. Scope queries
  // to the chip itself because the BossMatrix cells render the same price.
  it('prices the Weekly chip against the mule’s World Group (Interactive)', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [HARD_LUCID],
        worldId: 'interactive-scania',
      },
    });
    const chip = screen.getByLabelText(/weekly meso/i);
    expect(within(chip).getByText('100.8M')).toBeTruthy();
    expect(within(chip).queryByText('504M')).toBeNull();
  });

  it('wraps the Weekly chip in a tooltip when the value is nonzero', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [HARD_LUCID],
      },
    });
    const chip = screen.getByLabelText(/weekly meso/i);
    expect(within(chip).getByText('Weekly')).toBeTruthy();
    expect(within(chip).getByText('504M')).toBeTruthy();
    expect(within(chip).queryByText('mesos')).toBeNull();
    expect(chip.className).toContain('cursor-default');
    expect(chip.className).not.toContain('cursor-pointer');
    expect(chip.tagName).toBe('BUTTON');
  });

  it('does not wrap the Weekly chip in a tooltip when the value is zero', () => {
    renderDrawer();
    const chip = screen.getByLabelText(/weekly meso/i);
    expect(within(chip).getByText('Weekly')).toBeTruthy();
    expect(within(chip).getByText('0')).toBeTruthy();
    expect(chip.tagName).not.toBe('BUTTON');
  });

  it('prices the Weekly chip against the mule’s World Group (Heroic)', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [HARD_LUCID],
        worldId: 'heroic-kronos',
      },
    });
    const chip = screen.getByLabelText(/weekly meso/i);
    expect(within(chip).getByText('504M')).toBeTruthy();
    expect(within(chip).queryByText('100.8M')).toBeNull();
  });

  it('renders Contributed Meso in the Weekly chip for an active mule affected by the World Cap Cut', () => {
    const { selectedMule, worldMules } = partialDropWorld();
    const metrics = metricsFor(selectedMule, worldMules)!;
    const potentialMeso = MuleBossSlate.from(
      selectedMule.selectedBosses,
      resolveWorldGroup(selectedMule.worldId),
    ).totalCrystalValue(selectedMule.partySizes);

    expect(metrics.displayedWeeklyMeso.meso).toBeLessThan(potentialMeso);
    expect(metrics.displayedWeeklyMeso.meso).toBeGreaterThan(0);

    renderDrawer({ mule: selectedMule, worldMules });
    const chip = screen.getByLabelText(/weekly meso/i);

    expect(within(chip).getByText(formatMeso(metrics.displayedWeeklyMeso.meso, true))).toBeTruthy();
    expect(within(chip).queryByText(formatMeso(potentialMeso, true))).toBeNull();
  });

  it('renders a fully dropped active mule as a dim 0 in the Weekly chip with the cap-drop icon beside it', () => {
    const { selectedMule, worldMules } = fullyDroppedWorld();

    renderDrawer({ mule: selectedMule, worldMules });
    const row = screen.getByTestId('drawer-weekly-income-row');
    const chip = within(row).getByLabelText(/weekly meso/i);
    const value = within(chip).getByTestId('drawer-weekly-income-value');

    expect(value.textContent).toBe('0');
    expect(value.style.color).toContain('dim');
    expect(within(row).getByRole('button', { name: /show bosses dropped to cap/i })).toBeTruthy();
  });

  it('renders muted Potential Meso in the Weekly chip for an inactive mule', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        active: false,
        selectedBosses: [HARD_LUCID],
        worldId: 'heroic-kronos',
      },
    });

    const chip = screen.getByLabelText(/weekly meso/i);
    const value = within(chip).getByTestId('drawer-weekly-income-value');

    expect(value.textContent).toBe('504M');
    expect(value.style.color).toContain('dim');
  });

  it('keeps the Weekly meso tooltip and cap-drop boss tooltip separate when dropped keys exist', async () => {
    const { selectedMule, worldMules } = partialDropWorld();
    const metrics = metricsFor(selectedMule, worldMules)!;
    const fullWeeklyMeso = formatMeso(metrics.displayedWeeklyMeso.meso, false);
    const [droppedLine] = formatDroppedSlots(metrics.droppedKeys);

    renderDrawer({ mule: selectedMule, worldMules });
    const row = screen.getByTestId('drawer-weekly-income-row');
    const chip = within(row).getByLabelText(`Weekly meso ${fullWeeklyMeso}`);
    const capDropIcon = within(row).getByRole('button', {
      name: /show bosses dropped to cap/i,
    });

    fireEvent.click(chip);
    expect(await screen.findByText(fullWeeklyMeso)).toBeTruthy();

    fireEvent.focus(capDropIcon);
    const bossOnlyLine = await screen.findByText(droppedLine);
    expect(bossOnlyLine.parentElement?.textContent).not.toMatch(/meso|[0-9][\d,.]*\s*[MB]/i);
  });

  it('keeps BM Monthly separate when Displayed Weekly Meso is fully dropped', () => {
    const { selectedMule, worldMules } = fullyDroppedWorld({ id: 'fully-dropped-with-bm' }, [
      EXTREME_BLACK_MAGE,
    ]);

    renderDrawer({ mule: selectedMule, worldMules });
    const weeklyChip = screen.getByLabelText(/weekly meso/i);
    const bmChip = screen.getByLabelText(/potential black mage monthly meso/i);

    expect(within(weeklyChip).getByTestId('drawer-weekly-income-value').textContent).toBe('0');
    expect(within(bmChip).getByText('18B')).toBeTruthy();
  });

  it('renders a separate tooltip BM chip for selected Black Mage monthly value', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [EXTREME_BLACK_MAGE],
      },
    });
    const chip = screen.getByLabelText(/potential black mage monthly meso/i);
    expect(within(chip).getByText('BM MONTHLY')).toBeTruthy();
    expect(within(chip).getByText('18B')).toBeTruthy();
    expect(within(chip).queryByText('mesos')).toBeNull();
    expect(chip.className).toContain('cursor-default');
    expect(chip.className).not.toContain('cursor-pointer');
    expect(chip.tagName).toBe('BUTTON');
  });

  it('does not wrap the BM chip in a tooltip when the value is zero', () => {
    renderDrawer();
    const chip = screen.getByLabelText(/potential black mage monthly meso/i);
    expect(within(chip).getByText('BM MONTHLY')).toBeTruthy();
    expect(within(chip).getByText('0')).toBeTruthy();
    expect(chip.tagName).not.toBe('BUTTON');
  });

  it('shows BM chip potential value for inactive mules', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        active: false,
        selectedBosses: [EXTREME_BLACK_MAGE],
      },
    });
    const chip = screen.getByLabelText(/potential black mage monthly meso/i);
    expect(within(chip).getByText('18B')).toBeTruthy();
  });

  it('divides BM chip value by the mule’s Black Mage Party Size', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [EXTREME_BLACK_MAGE],
        partySizes: { 'black-mage': 6 },
      },
    });
    const chip = screen.getByLabelText(/potential black mage monthly meso/i);
    expect(within(chip).getByText('3B')).toBeTruthy();
    expect(within(chip).queryByText('18B')).toBeNull();
  });

  it('prices BM chip against the mule’s World Group', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [EXTREME_BLACK_MAGE],
        worldId: 'interactive-scania',
      },
    });
    const chip = screen.getByLabelText(/potential black mage monthly meso/i);
    expect(within(chip).getByText('3.6B')).toBeTruthy();
    expect(within(chip).queryByText('18B')).toBeNull();
  });

  it('keeps the Weekly chip weekly-only when Black Mage monthly is selected', () => {
    renderDrawer({
      mule: {
        ...baseMule,
        selectedBosses: [HARD_LUCID, EXTREME_BLACK_MAGE],
      },
    });
    const weeklyChip = screen.getByLabelText(/weekly meso/i);
    expect(within(weeklyChip).getByText('504M')).toBeTruthy();
    expect(within(weeklyChip).queryByText('18.5B')).toBeNull();
  });

  it('renders mule.avatarUrl in the drawer header when present', () => {
    renderDrawer({
      mule: { ...baseMule, avatarUrl: 'https://msavatar1.nexon.net/Character/x.png' },
    });
    const img = screen.getByTestId('drawer-avatar') as HTMLImageElement;
    expect(img.src).toBe('https://msavatar1.nexon.net/Character/x.png');
  });

  it('falls back to the blank PNG in the drawer header when avatarUrl is absent', () => {
    renderDrawer();
    const img = screen.getByTestId('drawer-avatar') as HTMLImageElement;
    expect(img.src).toMatch(/blank-character/);
  });

  it('renders CrystalTally permanently horizontal under the header (no responsive handoff)', () => {
    renderDrawer();
    const header = screen.getByTestId('drawer-header-layout');
    const tallySlot = screen.getByTestId('drawer-crystal-tally-slot');
    const tally = screen.getByRole('group', { name: /crystal tally/i });

    expect(header.className).not.toContain('@min-[605px]/drawer:flex-row');
    expect(tallySlot.className).toContain('self-stretch');
    expect(tally.className).toContain('flex-row');
  });

  describe('Mule Actions Menu (touch marking path)', () => {
    it('renders an always-visible kebab in place of the trash icon', () => {
      renderDrawer();
      const kebab = getDrawerKebab();
      expect(kebab.tagName).toBe('BUTTON');
      // Always visible — the drawer kebab is not fine-pointer/hover gated.
      expect(kebab.style.opacity).toBe('1');
    });

    it('exposes a destructive Delete row', async () => {
      renderDrawer();
      await openDrawerMenu();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('sets the weekly mark through onUpdate (current cycle stamp)', async () => {
      const { props } = renderDrawer();
      await openDrawerMenu();
      fireEvent.click(screen.getByText('Weekly Complete'));
      expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, {
        weeklyClearMark: expect.any(Number),
      });
    });

    it('clears the weekly mark when already marked', async () => {
      const { props } = renderDrawer({
        mule: { ...baseMule, weeklyClearMark: currentWeeklyStamp(Date.now()) },
      });
      await openDrawerMenu();
      fireEvent.click(screen.getByText('Weekly Incomplete'));
      expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, { weeklyClearMark: undefined });
    });

    it('toggles the Active Flag through onUpdate', async () => {
      const { props } = renderDrawer({ mule: { ...baseMule, active: true } });
      await openDrawerMenu();
      fireEvent.click(screen.getByText('Set Inactive'));
      expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, { active: false });
    });

    it('shows the Daily row (and hides BM) for a daily-only slate', async () => {
      renderDrawer({ mule: { ...baseMule, selectedBosses: [NORMAL_HILLA_DAILY] } });
      await openDrawerMenu();
      expect(screen.getByText('Daily Complete')).toBeTruthy();
      expect(screen.queryByText('BM Complete')).toBeNull();
    });

    it('shows the BM row for a monthly slate', async () => {
      renderDrawer({ mule: { ...baseMule, selectedBosses: [HARD_BLACK_MAGE_MONTHLY] } });
      await openDrawerMenu();
      expect(screen.getByText('BM Complete')).toBeTruthy();
    });

    it('hides Daily and BM rows for a weekly-only slate (Weekly always shown)', async () => {
      renderDrawer({ mule: { ...baseMule, selectedBosses: [HARD_LUCID] } });
      await openDrawerMenu();
      expect(screen.getByText('Weekly Complete')).toBeTruthy();
      expect(screen.queryByText('Daily Complete')).toBeNull();
      expect(screen.queryByText('BM Complete')).toBeNull();
    });
  });

  describe('header Completion Checks', () => {
    const NOW = Date.UTC(2026, 6, 11, 12, 0, 0); // 2026-07-11 12:00 UTC

    it('renders no name-side checks when the mule has no valid marks', () => {
      renderDrawer();
      expect(screen.queryByRole('img', { name: /complete/i })).toBeNull();
    });

    it('renders daily → weekly → BM checks beside the name for valid marks', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderDrawer({
          mule: {
            ...baseMule,
            dailyClearMark: currentDailyStamp(NOW),
            weeklyClearMark: currentWeeklyStamp(NOW),
            bmClearMark: currentBmStamp(NOW),
          },
        });
        const checks = screen.getAllByRole('img', { name: /complete/i });
        expect(checks.map((c) => c.getAttribute('aria-label'))).toEqual([
          'Daily complete',
          'Weekly complete',
          'BM complete',
        ]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps the checks un-clipped (shrink-0) beside the truncating name', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderDrawer({ mule: { ...baseMule, weeklyClearMark: currentWeeklyStamp(NOW) } });
        const check = screen.getByRole('img', { name: 'Weekly complete' });
        // The name truncates; the checks live in a shrink-0 wrapper so they
        // never clip.
        expect((check.parentElement as HTMLElement).className).toContain('shrink-0');
        const heading = screen.getByRole('heading', { name: /TestMule/ });
        expect(heading.querySelector('.truncate')).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('expires a name-side check live at the cycle boundary with no reload', () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      try {
        renderDrawer({ mule: { ...baseMule, dailyClearMark: currentDailyStamp(NOW) } });
        expect(screen.getByRole('img', { name: 'Daily complete' })).toBeTruthy();

        act(() => {
          vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1000);
        });

        expect(screen.queryByRole('img', { name: 'Daily complete' })).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Active pill removal', () => {
    it('renders no Active Flag pill or switch — the Mule Actions Menu owns the flag', () => {
      renderDrawer();
      // No standalone Active toggle/pill: the flag is only reachable through
      // the Mule Actions Menu (nothing named Set Active/Inactive is on screen
      // until the kebab menu is opened).
      expect(screen.queryByRole('switch')).toBeNull();
      expect(screen.queryByText('Set Active')).toBeNull();
      expect(screen.queryByText('Set Inactive')).toBeNull();
    });
  });

  describe('Preset click auto-switches Cadence Filter from Daily to All', () => {
    function getToggleButton(groupName: RegExp, label: string): HTMLButtonElement {
      const group = screen.getByRole('group', { name: groupName });
      return within(group).getByRole('button', {
        name: new RegExp(`^${label}$`, 'i'),
      }) as HTMLButtonElement;
    }
    const cadence = (label: string) => getToggleButton(/cadence filter/i, label);
    const preset = (label: string) => getToggleButton(/boss presets/i, label);

    it('clicking CRA while filter is Daily flips filter to All', () => {
      renderDrawer();
      fireEvent.click(cadence('Daily'));
      expect(cadence('Daily').className).toContain('on');
      fireEvent.click(preset('CRA'));
      expect(cadence('All').className).toContain('on');
      expect(cadence('Daily').className).not.toContain('on');
    });

    it('clicking CUSTOM while filter is Daily does not flip filter (CUSTOM is the popover trigger)', () => {
      renderDrawer();
      fireEvent.click(cadence('Daily'));
      fireEvent.click(preset('CUSTOM'));
      // CUSTOM is now the popover trigger and never alters the filter or
      // the slate; the cadence stays where the user put it.
      expect(cadence('Daily').className).toContain('on');
    });

    it('clicking CRA while filter is Weekly does not change the filter', () => {
      renderDrawer();
      fireEvent.click(cadence('Weekly'));
      fireEvent.click(preset('CRA'));
      expect(cadence('Weekly').className).toContain('on');
    });

    it('clicking CRA while filter is All leaves filter on All', () => {
      renderDrawer();
      fireEvent.click(preset('CRA'));
      expect(cadence('All').className).toContain('on');
    });
  });

  it('threads activeCadence to BossMatrix so switching to Daily collapses the Extreme column', () => {
    renderDrawer();
    expect(screen.getByRole('columnheader', { name: /extreme/i })).toBeTruthy();
    const group = screen.getByRole('group', { name: /cadence filter/i });
    fireEvent.click(within(group).getByRole('button', { name: /^daily$/i }));
    expect(screen.queryByRole('columnheader', { name: /extreme/i })).toBeNull();
  });

  it('renders a Notes textarea seeded from mule.notes', () => {
    renderDrawer({ mule: { ...baseMule, notes: 'main mule, owes legion levels' } });
    const textarea = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('main mule, owes legion levels');
  });

  it('typing into Notes does NOT call onUpdate per-keystroke', () => {
    const { props } = renderDrawer();
    const textarea = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'draft typing' } });
    expect(props.onUpdate).not.toHaveBeenCalled();
  });

  it('wires the Notes textarea to the notes draft hook (commit on blur)', () => {
    const { props } = renderDrawer();
    const textarea = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'committed note' } });
    fireEvent.blur(textarea);
    expect(props.onUpdate).toHaveBeenCalledWith(baseMule.id, { notes: 'committed note' });
  });

  it('character counter reflects current Notes draft length', () => {
    renderDrawer({ mule: { ...baseMule, notes: 'hello' } });
    const counter = screen.getByTestId('notes-character-counter');
    expect(counter.textContent).toBe('5 / 500');
    const textarea = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello world' } });
    expect(counter.textContent).toBe('11 / 500');
  });
});
