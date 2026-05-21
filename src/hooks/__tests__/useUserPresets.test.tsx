import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserPresets } from '../useUserPresets';
import { USER_PRESET_STORAGE_KEY } from '../../persistence/userPresetStorage';
import { CURRENT_USER_PRESET_SCHEMA_VERSION } from '../../persistence/userPresetStore';
import { bosses } from '../../data/bosses';

let localStorageStore: Record<string, string> = {};
let sessionStorageStore: Record<string, string> = {};

beforeEach(() => {
  localStorageStore = {};
  sessionStorageStore = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageStore[key];
    }),
    clear: vi.fn(() => {
      localStorageStore = {};
    }),
    get length() {
      return Object.keys(localStorageStore).length;
    },
    key: vi.fn(() => null),
  });
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      sessionStorageStore[key] = value;
    }),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(() => null),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function flushPersist() {
  act(() => {
    window.dispatchEvent(new Event('pagehide'));
  });
}

describe('useUserPresets', () => {
  describe('initial load', () => {
    it('returns [] when the store is empty', () => {
      const { result } = renderHook(() => useUserPresets());
      expect(result.current.userPresets).toEqual([]);
    });

    it('hydrates from the store', () => {
      localStorageStore[USER_PRESET_STORAGE_KEY] = JSON.stringify({
        schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
        userPresets: [{ id: 'p1', name: 'Loaded', slateKeys: ['k1'], partySizes: {} }],
      });
      const { result } = renderHook(() => useUserPresets());
      expect(result.current.userPresets).toEqual([
        { id: 'p1', name: 'Loaded', slateKeys: ['k1'], partySizes: {} },
      ]);
    });
  });

  describe('createUserPreset — name validation', () => {
    it('rejects empty name', () => {
      const { result } = renderHook(() => useUserPresets());
      let outcome: ReturnType<typeof result.current.createUserPreset> | undefined;
      act(() => {
        outcome = result.current.createUserPreset('', ['k1']);
      });
      expect(outcome).toEqual({ ok: false, reason: 'empty' });
      expect(result.current.userPresets).toEqual([]);
    });

    it('rejects whitespace-only name (after trim)', () => {
      const { result } = renderHook(() => useUserPresets());
      let outcome: ReturnType<typeof result.current.createUserPreset> | undefined;
      act(() => {
        outcome = result.current.createUserPreset('   ', ['k1']);
      });
      expect(outcome).toEqual({ ok: false, reason: 'empty' });
    });

    it('trims leading/trailing whitespace before storing', () => {
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('  My Preset  ', ['k1']);
      });
      expect(result.current.userPresets[0].name).toBe('My Preset');
    });

    it('rejects case-insensitive duplicates', () => {
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('CRA Mule', ['k1']);
      });
      let outcome: ReturnType<typeof result.current.createUserPreset> | undefined;
      act(() => {
        outcome = result.current.createUserPreset('cra mule', ['k2']);
      });
      expect(outcome).toEqual({ ok: false, reason: 'duplicate' });
      expect(result.current.userPresets).toHaveLength(1);
    });

    it('rejects names longer than 40 chars (after trim)', () => {
      const { result } = renderHook(() => useUserPresets());
      const tooLong = 'a'.repeat(41);
      let outcome: ReturnType<typeof result.current.createUserPreset> | undefined;
      act(() => {
        outcome = result.current.createUserPreset(tooLong, ['k1']);
      });
      expect(outcome).toEqual({ ok: false, reason: 'too-long' });
    });

    it('accepts names of exactly 40 chars', () => {
      const { result } = renderHook(() => useUserPresets());
      const exactlyMax = 'a'.repeat(40);
      let outcome: ReturnType<typeof result.current.createUserPreset> | undefined;
      act(() => {
        outcome = result.current.createUserPreset(exactlyMax, ['k1']);
      });
      expect(outcome?.ok).toBe(true);
    });
  });

  describe('CRUD smoke', () => {
    it('createUserPreset adds a preset with a fresh uuid', () => {
      const { result } = renderHook(() => useUserPresets());
      let outcome: ReturnType<typeof result.current.createUserPreset> | undefined;
      act(() => {
        outcome = result.current.createUserPreset('Mine', ['k1', 'k2']);
      });
      expect(outcome?.ok).toBe(true);
      expect(result.current.userPresets).toHaveLength(1);
      const created = result.current.userPresets[0];
      expect(created.name).toBe('Mine');
      expect(created.slateKeys).toEqual(['k1', 'k2']);
      expect(typeof created.id).toBe('string');
      expect(created.id.length).toBeGreaterThan(0);
    });

    it('captures slateKeys at save time (caller mutation has no effect)', () => {
      const { result } = renderHook(() => useUserPresets());
      const keys = ['k1', 'k2'];
      act(() => {
        result.current.createUserPreset('Mine', keys);
      });
      keys.push('k3');
      expect(result.current.userPresets[0].slateKeys).toEqual(['k1', 'k2']);
    });

    it('deleteUserPreset removes a preset by id', () => {
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('A', ['k1']);
      });
      const id = result.current.userPresets[0].id;
      act(() => {
        result.current.deleteUserPreset(id);
      });
      expect(result.current.userPresets).toEqual([]);
    });

    it('deleteUserPreset on an unknown id is a no-op (preserves array reference)', () => {
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('A', ['k1']);
      });
      const before = result.current.userPresets;
      act(() => {
        result.current.deleteUserPreset('does-not-exist');
      });
      expect(result.current.userPresets).toBe(before);
    });

    it('persists the library through the store after flush', () => {
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('Persisted', ['k1']);
      });
      flushPersist();
      const saved = JSON.parse(localStorageStore[USER_PRESET_STORAGE_KEY]);
      expect(saved.userPresets).toHaveLength(1);
      expect(saved.userPresets[0].name).toBe('Persisted');
    });
  });

  describe('createUserPreset — partySizes capture', () => {
    it('captures partySizes only for families with slate keys in the snapshot', () => {
      const pinkBean = bosses.find((b) => b.family === 'pink-bean')!;
      const slateKeys = [`${pinkBean.id}:chaos:weekly`];
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('Mine', slateKeys, {
          'pink-bean': 3,
          'unrelated-family': 6,
        });
      });
      expect(result.current.userPresets[0].partySizes).toEqual({ 'pink-bean': 3 });
    });

    it('defaults a captured family to 1 when the live mule has no entry for it', () => {
      const pinkBean = bosses.find((b) => b.family === 'pink-bean')!;
      const slateKeys = [`${pinkBean.id}:chaos:weekly`];
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('Mine', slateKeys, {});
      });
      expect(result.current.userPresets[0].partySizes).toEqual({ 'pink-bean': 1 });
    });

    it('captures Black Mage party size for monthly Black Mage keys', () => {
      const blackMage = bosses.find((b) => b.family === 'black-mage')!;
      const slateKeys = [`${blackMage.id}:extreme:monthly`];
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('Monthly BM', slateKeys, {
          'black-mage': 6,
          lucid: 2,
        });
      });
      expect(result.current.userPresets[0]).toMatchObject({
        slateKeys,
        partySizes: { 'black-mage': 6 },
      });
    });

    it('defaults to empty partySizes when no partySizes argument is provided (legacy callsite)', () => {
      const { result } = renderHook(() => useUserPresets());
      act(() => {
        result.current.createUserPreset('Mine', ['k1', 'k2']);
      });
      expect(result.current.userPresets[0].partySizes).toEqual({});
    });
  });
});
