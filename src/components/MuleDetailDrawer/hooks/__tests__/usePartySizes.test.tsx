import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { usePartySizes } from '../usePartySizes';

describe('usePartySizes', () => {
  describe('setPartySize (Party-Size Clamp 1–6)', () => {
    it('dispatches onUpdate with the clamped partySizes map', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        usePartySizes({ muleId: 'mule-1', partySizes: undefined, onUpdate }),
      );

      act(() => {
        result.current.setPartySize('lucid', 3);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { partySizes: { lucid: 3 } });
    });

    it('clamps values above 6 to 6', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        usePartySizes({ muleId: 'mule-1', partySizes: { lucid: 6 }, onUpdate }),
      );

      act(() => {
        result.current.setPartySize('lucid', 99);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { partySizes: { lucid: 6 } });
    });

    it('clamps values below 1 to 1', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        usePartySizes({ muleId: 'mule-1', partySizes: { lucid: 1 }, onUpdate }),
      );

      act(() => {
        result.current.setPartySize('lucid', 0);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', { partySizes: { lucid: 1 } });
    });

    it('preserves other families in partySizes when updating one', () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() =>
        usePartySizes({
          muleId: 'mule-1',
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
        usePartySizes({ muleId: null, partySizes: undefined, onUpdate }),
      );

      act(() => {
        result.current.setPartySize('lucid', 3);
      });
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('stablePartySizes', () => {
    it('keeps identity stable across renders when partySizes does not change', () => {
      const partySizes = { lucid: 2 };
      const { result, rerender } = renderHook(() =>
        usePartySizes({ muleId: 'mule-1', partySizes, onUpdate: vi.fn() }),
      );
      const first = result.current.stablePartySizes;
      rerender();
      expect(result.current.stablePartySizes).toBe(first);
    });

    it('returns an empty object for undefined input', () => {
      const { result } = renderHook(() =>
        usePartySizes({ muleId: 'mule-1', partySizes: undefined, onUpdate: vi.fn() }),
      );
      expect(result.current.stablePartySizes).toEqual({});
    });

    it('updates identity when partySizes prop changes', () => {
      const { result, rerender } = renderHook(
        ({ partySizes }: { partySizes: Record<string, number> | undefined }) =>
          usePartySizes({ muleId: 'mule-1', partySizes, onUpdate: vi.fn() }),
        { initialProps: { partySizes: { lucid: 2 } as Record<string, number> | undefined } },
      );
      const first = result.current.stablePartySizes;
      rerender({ partySizes: { lucid: 3 } });
      expect(result.current.stablePartySizes).not.toBe(first);
    });
  });

  describe('setPartySize identity (ref-stabilized)', () => {
    it('keeps callback identity stable across rerenders that change partySizes', () => {
      const onUpdate = vi.fn();
      const { result, rerender } = renderHook(
        ({ partySizes }: { partySizes: Record<string, number> | undefined }) =>
          usePartySizes({ muleId: 'mule-1', partySizes, onUpdate }),
        { initialProps: { partySizes: { lucid: 2 } as Record<string, number> | undefined } },
      );
      const first = result.current.setPartySize;
      rerender({ partySizes: { lucid: 3 } });
      expect(result.current.setPartySize).toBe(first);
      rerender({ partySizes: { lucid: 4, 'black-mage': 5 } });
      expect(result.current.setPartySize).toBe(first);
    });

    it('reads the latest partySizes through a ref when invoked after a rerender', () => {
      const onUpdate = vi.fn();
      const { result, rerender } = renderHook(
        ({ partySizes }: { partySizes: Record<string, number> | undefined }) =>
          usePartySizes({ muleId: 'mule-1', partySizes, onUpdate }),
        {
          initialProps: {
            partySizes: { lucid: 2 } as Record<string, number> | undefined,
          },
        },
      );
      const captured = result.current.setPartySize;
      rerender({ partySizes: { lucid: 4, 'black-mage': 5 } });
      act(() => {
        captured('lucid', 6);
      });
      expect(onUpdate).toHaveBeenCalledWith('mule-1', {
        partySizes: { lucid: 6, 'black-mage': 5 },
      });
    });
  });
});
