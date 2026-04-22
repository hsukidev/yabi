import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useBossMatrixView } from '../useBossMatrixView';
import { bosses } from '../../../../data/bosses';
import { PRESET_FAMILIES, presetEntryKey } from '../../../../data/bossPresets';
import { MuleBossSlate } from '../../../../data/muleBossSlate';

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const HARD_LUCID = `${LUCID_BOSS.id}:hard:weekly`;
const NORMAL_LUCID = `${LUCID_BOSS.id}:normal:weekly`;

const WILL_BOSS = bosses.find((b) => b.family === 'will')!;
const HARD_WILL = `${WILL_BOSS.id}:hard:weekly`;

const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!;
const CRIMSON_QUEEN_BOSS = bosses.find((b) => b.family === 'crimson-queen')!;
const BLACK_MAGE_BOSS = bosses.find((b) => b.family === 'black-mage')!;
// Baldrix is a weekly-only family that sits outside every canonical preset —
// the stand-in for "a weekly key on a non-preset family" role that Black Mage
// used to play before it flipped to a monthly cadence.
const BALDRIX_BOSS = bosses.find((b) => b.family === 'baldrix')!;
const FIRST_ADVERSARY_BOSS = bosses.find((b) => b.family === 'first-adversary')!;
const HORNTAIL_BOSS = bosses.find((b) => b.family === 'horntail')!;
const MORI_BOSS = bosses.find((b) => b.family === 'mori-ranmaru')!;
const DAMIEN_BOSS = bosses.find((b) => b.family === 'damien')!;
const LOTUS_BOSS = bosses.find((b) => b.family === 'lotus')!;
const ARKARIUM_BOSS = bosses.find((b) => b.family === 'arkarium')!;

const CRA_KEYS = PRESET_FAMILIES.CRA.map((entry) => presetEntryKey(entry)!);
const LOMIEN_KEYS = PRESET_FAMILIES.LOMIEN.map((entry) => presetEntryKey(entry)!);
const CTENE_KEYS = PRESET_FAMILIES.CTENE.map((entry) => presetEntryKey(entry)!);

describe('useBossMatrixView', () => {
  describe('toggleKey', () => {
    it('dispatches onUpdate with slate.toggle(key).keys', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        selectedBosses: [HARD_LUCID],
      });
    });

    it('tier-swaps within a (bossId, cadence) bucket', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [NORMAL_LUCID],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        selectedBosses: [HARD_LUCID],
      });
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.toggleKey(HARD_LUCID);
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('applyPreset (Conform)', () => {
    it('applies CRA on empty selection', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(new Set(CRA_KEYS));
    });

    it('wipes non-preset weeklies when swapping from CRA + extra to CRA', () => {
      // Starts in Custom territory (no canonical match because Arkarium is
      // non-preset). Clicking CRA conforms, wiping Arkarium.
      const arkariumKey = `${ARKARIUM_BOSS.id}:normal:weekly`;
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [...CRA_KEYS, arkariumKey],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).not.toContain(arkariumKey);
      for (const k of CRA_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('swap CRA → CTENE: adds CTENE keys and drops CRA-only families', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CTENE');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      for (const k of CTENE_KEYS) expect(update.selectedBosses).toContain(k);
    });

    it('short-circuits (zero onUpdate) when clicking the Active Pill', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('preserves daily keys on conform', () => {
      const horntailDaily = `${HORNTAIL_BOSS.id}:chaos:daily`;
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [horntailDaily],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).toContain(horntailDaily);
    });

    it('LOMIEN swap from CTENE preserves Hard Damien + Hard Lotus', () => {
      // CTENE has Damien (hardest = hard) + Hard Lotus — both tiers LOMIEN
      // accepts. After swap, those keys stay put; the rest of CTENE's unique
      // families (Darknell, Verus Hilla, etc.) get wiped; CRA-shared families
      // in LOMIEN remain at Hardest.
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CTENE_KEYS,
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('LOMIEN');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(update.selectedBosses).toContain(`${DAMIEN_BOSS.id}:hard:weekly`);
      expect(update.selectedBosses).toContain(`${LOTUS_BOSS.id}:hard:weekly`);
    });

    it('normalizes resulting keys through MuleBossSlate.from (Selection Invariant)', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      const update = onUpdate.mock.calls[0][1] as { selectedBosses: string[] };
      expect(new Set(update.selectedBosses)).toEqual(
        new Set(MuleBossSlate.from(update.selectedBosses).keys),
      );
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CRA');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('activePill (Same-Cadence Equality)', () => {
    it('is null for an empty selection', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBeNull();
    });

    it('is "CUSTOM" for CRA + extra non-preset weekly (no canonical match, weekly ≥ 1)', () => {
      // Baldrix is weekly-cadence and outside every canonical preset.
      const baldrixKey = `${BALDRIX_BOSS.id}:hard:weekly`;
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [...CRA_KEYS, baldrixKey],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('CUSTOM');
    });

    it('is "CUSTOM" for a single weekly key on a family no canonical preset covers', () => {
      const baldrixKey = `${BALDRIX_BOSS.id}:hard:weekly`;
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [baldrixKey],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('CUSTOM');
    });

    it('is "CRA" for an exact CRA selection', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('CRA');
    });

    it('is "LOMIEN" for an exact LOMIEN selection', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: LOMIEN_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('LOMIEN');
    });

    it('is "CTENE" for an exact CTENE selection', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CTENE_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('CTENE');
    });

    it('LOMIEN stays lit when Damien is swapped Normal → Hard', () => {
      const swapped = LOMIEN_KEYS.filter((k) => !k.startsWith(`${DAMIEN_BOSS.id}:`)).concat([
        `${DAMIEN_BOSS.id}:hard:weekly`,
      ]);
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: swapped,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('LOMIEN');
    });

    it('is null when only daily keys are selected (CUSTOM stays dark for daily-only)', () => {
      const vellumDaily = `${VELLUM_BOSS.id}:normal:daily`;
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [vellumDaily],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBeNull();
    });

    it('is null when a non-preset-family has only a daily key (no weekly anywhere)', () => {
      const horntailDaily = `${HORNTAIL_BOSS.id}:chaos:daily`;
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [horntailDaily],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBeNull();
    });
  });

  describe('applyPreset("CUSTOM") — inert click', () => {
    it('produces zero onUpdate calls when selection is already CUSTOM', () => {
      const arkariumKey = `${ARKARIUM_BOSS.id}:normal:weekly`;
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [arkariumKey],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('produces zero onUpdate calls even when a canonical preset is active', () => {
      // Pills are apply-only; clicking CUSTOM never rewrites selection, no
      // matter what's currently selected.
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('produces zero onUpdate calls when selection is empty', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('CUSTOM click lights the pill even when selection is empty', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBeNull();

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');
    });

    it('resetBosses clears the CUSTOM override when matrix is already empty', () => {
      // The selection-empty transition effect only fires on non-empty → empty.
      // When the matrix is already empty and the user clicks CUSTOM then Reset,
      // resetBosses itself must clear the override or the pill would stay lit.
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      act(() => {
        result.current.resetBosses();
      });
      expect(result.current.activePill).toBeNull();
    });

    it('CUSTOM click lights the pill even when CRA is the canonical match', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.activePill).toBe('CRA');

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');
    });

    it('CUSTOM override clears when selection transitions to empty', () => {
      const { result, rerender } = renderHook(
        ({ selectedBosses }: { selectedBosses: string[] }) =>
          useBossMatrixView({
            muleId: 'mule-1',
            selectedBosses,
            partySizes: undefined,
            onUpdate: vi.fn(),
          }),
        { initialProps: { selectedBosses: CRA_KEYS } },
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      // Reset-like transition: parent clears the selection.
      rerender({ selectedBosses: [] });
      expect(result.current.activePill).toBeNull();

      // Rebuilding CRA afterwards should light CRA, not CUSTOM.
      rerender({ selectedBosses: CRA_KEYS });
      expect(result.current.activePill).toBe('CRA');
    });

    it('CUSTOM override clears on Mule Switch (drawer close/reopen)', () => {
      const { result, rerender } = renderHook(
        ({ muleId, selectedBosses }: { muleId: string | null; selectedBosses: string[] }) =>
          useBossMatrixView({
            muleId,
            selectedBosses,
            partySizes: undefined,
            onUpdate: vi.fn(),
          }),
        { initialProps: { muleId: 'mule-1' as string | null, selectedBosses: CRA_KEYS } },
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      // Drawer closes: muleId → null, selection clears.
      rerender({ muleId: null, selectedBosses: [] });
      // Drawer reopens on the same mule: muleId flips back, selection restored.
      rerender({ muleId: 'mule-1', selectedBosses: CRA_KEYS });
      expect(result.current.activePill).toBe('CRA');
    });

    it('toggling a boss clears the CUSTOM override so canonical can reassert', () => {
      // CTENE → click CUSTOM → toggle an extra boss on → toggle it off.
      // After the second toggle the selection is exactly CTENE again, so
      // the pill should revert from CUSTOM to CTENE.
      const onUpdate = vi.fn();
      const { result, rerender } = renderHook(
        ({ selectedBosses }: { selectedBosses: string[] }) =>
          useBossMatrixView({
            muleId: 'mule-1',
            selectedBosses,
            partySizes: undefined,
            onUpdate,
          }),
        { initialProps: { selectedBosses: CTENE_KEYS } },
      );
      expect(result.current.activePill).toBe('CTENE');

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      // User adds a non-CTENE weekly (Baldrix is outside every preset).
      const extraKey = `${BALDRIX_BOSS.id}:hard:weekly`;
      act(() => {
        result.current.toggleKey(extraKey);
      });
      rerender({ selectedBosses: [...CTENE_KEYS, extraKey] });
      // Selection no longer matches CTENE, but the override is already
      // cleared by the toggle — CUSTOM still lights via derivation.
      expect(result.current.activePill).toBe('CUSTOM');

      // User removes Baldrix Hard: selection returns to CTENE_KEYS.
      act(() => {
        result.current.toggleKey(extraKey);
      });
      rerender({ selectedBosses: CTENE_KEYS });
      expect(result.current.activePill).toBe('CTENE');
    });

    it('toggling a daily ON preserves the CUSTOM override (canonical does not reassert)', () => {
      const horntailDaily = `${HORNTAIL_BOSS.id}:chaos:daily`;
      const { result, rerender } = renderHook(
        ({ selectedBosses }: { selectedBosses: string[] }) =>
          useBossMatrixView({
            muleId: 'mule-1',
            selectedBosses,
            partySizes: undefined,
            onUpdate: vi.fn(),
          }),
        { initialProps: { selectedBosses: CRA_KEYS } },
      );
      expect(result.current.activePill).toBe('CRA');

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      act(() => {
        result.current.toggleKey(horntailDaily);
      });
      rerender({ selectedBosses: [...CRA_KEYS, horntailDaily] });
      // Daily toggle does not clear the override; pill stays CUSTOM even
      // though the weekly selection still matches CRA.
      expect(result.current.activePill).toBe('CUSTOM');
    });

    it('toggling a daily OFF preserves the CUSTOM override (canonical does not reassert)', () => {
      const horntailDaily = `${HORNTAIL_BOSS.id}:chaos:daily`;
      const { result, rerender } = renderHook(
        ({ selectedBosses }: { selectedBosses: string[] }) =>
          useBossMatrixView({
            muleId: 'mule-1',
            selectedBosses,
            partySizes: undefined,
            onUpdate: vi.fn(),
          }),
        { initialProps: { selectedBosses: [...CRA_KEYS, horntailDaily] } },
      );
      expect(result.current.activePill).toBe('CRA');

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      act(() => {
        result.current.toggleKey(horntailDaily);
      });
      rerender({ selectedBosses: CRA_KEYS });
      // Removing a daily also leaves weekly match status unchanged, so
      // the override persists.
      expect(result.current.activePill).toBe('CUSTOM');
    });

    it('clicking a canonical pill clears the CUSTOM override', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: CRA_KEYS,
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.applyPreset('CUSTOM');
      });
      expect(result.current.activePill).toBe('CUSTOM');

      act(() => {
        result.current.applyPreset('CRA');
      });
      // Override cleared; selection still matches CRA, so CRA is lit.
      expect(result.current.activePill).toBe('CRA');
    });
  });

  describe('setPartySize (Party-Size Clamp 1–6)', () => {
    it('dispatches onUpdate with the clamped partySizes map', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 3);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 3 },
      });
    });

    it('clamps values above 6 to 6', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: { lucid: 6 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 99);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 6 },
      });
    });

    it('clamps values below 1 to 1', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: { lucid: 1 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 0);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 1 },
      });
    });

    it('preserves other families in partySizes when updating one', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: { 'black-mage': 3, lucid: 1 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 2);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { 'black-mage': 3, lucid: 2 },
      });
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.setPartySize('lucid', 3);
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('visibleBosses (search + cadence filter)', () => {
    it('returns every family except Black Mage when search is empty and filter is All', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      // Black Mage is hidden from the Matrix; all other families appear.
      expect(result.current.visibleBosses.length).toBe(bosses.length - 1);
      expect(result.current.visibleBosses.map((f) => f.family)).not.toContain('black-mage');
    });

    it('responds to search (narrows to families matching substring)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setSearch('vell');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('responds to cadence filter (Weekly hides daily-only and monthly-only families)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFilter('Weekly');
      });
      const names = result.current.visibleBosses.map((f) => f.displayName);
      expect(names).not.toContain(HORNTAIL_BOSS.name);
      expect(names).not.toContain(MORI_BOSS.name);
      // Black Mage is monthly-only (Hard + Extreme) — should NOT appear under Weekly.
      expect(names).not.toContain(BLACK_MAGE_BOSS.name);
      expect(names).toContain(FIRST_ADVERSARY_BOSS.name);
      expect(names).toContain(VELLUM_BOSS.name);
    });

    it('responds to cadence filter (Daily hides weekly-only families)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFilter('Daily');
      });
      const names = result.current.visibleBosses.map((f) => f.displayName);
      expect(names).not.toContain(BLACK_MAGE_BOSS.name);
      expect(names).toContain(HORNTAIL_BOSS.name);
      expect(names).toContain(VELLUM_BOSS.name);
    });

    it('composes search + filter (Weekly + "vell" → Vellum only)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setFilter('Weekly');
      });
      act(() => {
        result.current.setSearch('vell');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('is case-insensitive (VELL matches Vellum)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setSearch('VELL');
      });
      expect(result.current.visibleBosses).toHaveLength(1);
      expect(result.current.visibleBosses[0].displayName).toBe(VELLUM_BOSS.name);
    });

    it('search matches family slug (cri → Crimson Queen)', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );

      act(() => {
        result.current.setSearch('cri');
      });
      expect(
        result.current.visibleBosses.some((f) => f.displayName === CRIMSON_QUEEN_BOSS.name),
      ).toBe(true);
    });
  });

  describe('muleId change', () => {
    it('auto-resets search and filter on muleId change', () => {
      const { result, rerender } = renderHook(
        ({ muleId }: { muleId: string | null }) =>
          useBossMatrixView({
            muleId,
            selectedBosses: [],
            partySizes: undefined,
            onUpdate: vi.fn(),
          }),
        { initialProps: { muleId: 'mule-1' as string | null } },
      );

      act(() => {
        result.current.setSearch('vell');
      });
      act(() => {
        result.current.setFilter('Weekly');
      });
      expect(result.current.search).toBe('vell');
      expect(result.current.filter).toBe('Weekly');

      rerender({ muleId: 'mule-2' });

      expect(result.current.search).toBe('');
      expect(result.current.filter).toBe('All');
    });
  });

  describe('weeklyCount', () => {
    it('counts weekly selections', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID, HARD_WILL],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.weeklyCount).toBe(2);
    });

    it('returns 0 when no selections', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.weeklyCount).toBe(0);
    });
  });

  describe('dailyCount', () => {
    const NORMAL_VELLUM_DAILY = `${VELLUM_BOSS.id}:normal:daily`;

    it('counts daily selections separately from weekly selections', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID, NORMAL_VELLUM_DAILY],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.dailyCount).toBe(1);
      expect(result.current.weeklyCount).toBe(1);
    });

    it('returns 0 when no selections', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.dailyCount).toBe(0);
    });
  });

  describe('stablePartySizes', () => {
    it('keeps identity stable across renders when partySizes does not change', () => {
      const partySizes = { lucid: 2 };
      const { result, rerender } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes,
          onUpdate: vi.fn(),
        }),
      );
      const first = result.current.stablePartySizes;
      rerender();
      expect(result.current.stablePartySizes).toBe(first);
    });

    it('returns an empty object for undefined input', () => {
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [],
          partySizes: undefined,
          onUpdate: vi.fn(),
        }),
      );
      expect(result.current.stablePartySizes).toEqual({});
    });
  });

  describe('resetBosses', () => {
    it('dispatches onUpdate with empty selectedBosses and cleared partySizes', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          partySizes: { lucid: 4 },
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        selectedBosses: [],
        partySizes: {},
      });
    });

    it('payload contains selectedBosses and partySizes only', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: 'mule-1',
          selectedBosses: [HARD_LUCID],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      const update = onUpdate.mock.calls[0][1];
      expect(Object.keys(update).sort()).toEqual(['partySizes', 'selectedBosses']);
    });

    it('no-ops when muleId is null', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        useBossMatrixView({
          muleId: null,
          selectedBosses: [],
          partySizes: undefined,
          onUpdate,
        }),
      );

      act(() => {
        result.current.resetBosses();
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});
