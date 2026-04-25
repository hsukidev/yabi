import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMules } from '../useMules';
import { bosses } from '../../data/bosses';

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!;
const LUCID = LUCID_BOSS.id;
const HARD_LUCID = `${LUCID}:hard:weekly`;
const NORMAL_LUCID = `${LUCID}:normal:weekly`;

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
    key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  });
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      sessionStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete sessionStorageStore[key];
    }),
    clear: vi.fn(() => {
      sessionStorageStore = {};
    }),
    get length() {
      return Object.keys(sessionStorageStore).length;
    },
    key: vi.fn((index: number) => Object.keys(sessionStorageStore)[index] ?? null),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * The hook saves through the `MuleStore`'s 200ms debounce. Firing `pagehide`
 * is the public flush seam — the hook wires `store.flush()` to that event.
 */
function flushPersist() {
  act(() => {
    window.dispatchEvent(new Event('pagehide'));
  });
}

describe('useMules', () => {
  describe('initial load', () => {
    it('returns [] when the store is empty', () => {
      const { result } = renderHook(() => useMules());
      expect(result.current.mules).toEqual([]);
    });

    it('hydrates from the store via muleMigrate(port.read())', () => {
      // Full migration coverage lives in muleMigrate.test.ts — this just
      // proves the hook routes its initial state through the store.
      const payload = {
        schemaVersion: 4,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            partySizes: {},
            active: true,
          },
        ],
      };
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload);
      const { result } = renderHook(() => useMules());
      expect(result.current.mules).toEqual(payload.mules);
    });
  });

  describe('addMule', () => {
    it('creates a new mule with default values and returns its id', () => {
      const { result } = renderHook(() => useMules());
      let newId: string | undefined;
      act(() => {
        newId = result.current.addMule('heroic-kronos');
      });
      expect(result.current.mules).toHaveLength(1);
      const created = result.current.mules[0];
      expect(created.id).toBe(newId);
      expect(created.name).toBe('');
      expect(created.level).toBe(0);
      expect(created.muleClass).toBe('');
      expect(created.selectedBosses).toEqual([]);
      expect(created.partySizes).toEqual({});
      expect(created.active).toBe(true);
    });

    it('stamps the supplied worldId on the new mule', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-hyperion');
      });
      expect(result.current.mules[0].worldId).toBe('heroic-hyperion');
    });

    it('flows through to store.save (persisted after flush)', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      flushPersist();
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker']);
      expect(saved.schemaVersion).toBe(5);
      expect(saved.mules).toHaveLength(1);
    });
  });

  describe('updateMule', () => {
    it('merges updates onto the matching mule', () => {
      const { result } = renderHook(() => useMules());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.updateMule(id, { name: 'Alice', level: 250 });
      });
      expect(result.current.mules[0].name).toBe('Alice');
      expect(result.current.mules[0].level).toBe(250);
    });

    it('normalizes selectedBosses via MuleBossSlate.from(...).keys', () => {
      // Both NORMAL_LUCID and HARD_LUCID map to the (lucid, weekly) bucket.
      // The higher-tier key (HARD_LUCID) must win per the Selection Invariant.
      const { result } = renderHook(() => useMules());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.updateMule(id, {
          selectedBosses: [NORMAL_LUCID, HARD_LUCID, 'stale:id'],
        });
      });
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID]);
    });

    it('persists the updated state to the store', () => {
      const { result } = renderHook(() => useMules());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.updateMule(id, { name: 'Alice' });
      });
      flushPersist();
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker']);
      expect(saved.mules[0].name).toBe('Alice');
    });
  });

  describe('deleteMule', () => {
    it('removes a mule by id', () => {
      const { result } = renderHook(() => useMules());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      act(() => {
        result.current.deleteMule(id);
      });
      expect(result.current.mules).toEqual([]);
    });
  });

  describe('deleteMules (batch)', () => {
    it('deletes the listed mules in a single state pass', () => {
      const { result } = renderHook(() => useMules());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      const before = result.current.mules;
      act(() => {
        result.current.deleteMules([ids[0], ids[2]]);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[1]]);
      expect(result.current.mules).not.toBe(before);
    });

    it('is a no-op on an empty ids array (same array reference)', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      const before = result.current.mules;
      act(() => {
        result.current.deleteMules([]);
      });
      expect(result.current.mules).toBe(before);
    });

    it('is a no-op when every id is unknown', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      const before = result.current.mules;
      act(() => {
        result.current.deleteMules(['x', 'y']);
      });
      expect(result.current.mules).toBe(before);
    });

    it('persists the remaining mules after flush', () => {
      const { result } = renderHook(() => useMules());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.deleteMules([ids[0]]);
      });
      flushPersist();
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker']);
      expect(saved.mules.map((m: { id: string }) => m.id)).toEqual([ids[1]]);
    });
  });

  describe('restoreMule', () => {
    it('inserts the mule back at the given index', () => {
      const { result } = renderHook(() => useMules());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      const snapshot = result.current.mules[1];
      act(() => {
        result.current.deleteMule(ids[1]);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[2]]);
      act(() => {
        result.current.restoreMule(snapshot, 1);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[1], ids[2]]);
    });

    it('clamps an out-of-range index to the end of the roster', () => {
      const { result } = renderHook(() => useMules());
      let id = '';
      act(() => {
        id = result.current.addMule('heroic-kronos');
      });
      const snapshot = result.current.mules[0];
      act(() => {
        result.current.deleteMule(id);
      });
      act(() => {
        result.current.restoreMule(snapshot, 999);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([id]);
    });
  });

  describe('restoreMules (batch)', () => {
    it('restores snapshots at their original indexes when fed in ascending order', () => {
      const { result } = renderHook(() => useMules());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      const snapshots = [
        { mule: result.current.mules[1], index: 1 },
        { mule: result.current.mules[3], index: 3 },
      ];
      act(() => {
        result.current.deleteMules([ids[1], ids[3]]);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[2]]);
      act(() => {
        result.current.restoreMules(snapshots);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[1], ids[2], ids[3]]);
    });

    it('handles snapshots provided out of order (sorts by original index)', () => {
      const { result } = renderHook(() => useMules());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      const snapshots = [
        { mule: result.current.mules[2], index: 2 },
        { mule: result.current.mules[0], index: 0 },
      ];
      act(() => {
        result.current.deleteMules([ids[0], ids[2]]);
      });
      act(() => {
        result.current.restoreMules(snapshots);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[0], ids[1], ids[2]]);
    });

    it('is a no-op on an empty snapshots array', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      const before = result.current.mules;
      act(() => {
        result.current.restoreMules([]);
      });
      expect(result.current.mules).toBe(before);
    });
  });

  describe('reorderMules', () => {
    it('moves a mule from oldIndex to newIndex', () => {
      const { result } = renderHook(() => useMules());
      const ids: string[] = [];
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        ids.push(result.current.addMule('heroic-kronos'));
      });
      act(() => {
        result.current.reorderMules(0, 1);
      });
      expect(result.current.mules.map((m) => m.id)).toEqual([ids[1], ids[0]]);
    });
  });

  describe('debounced persistence via the store', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not write to localStorage synchronously on state change', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeUndefined();
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeDefined();
    });

    it('flushes pending writes synchronously on pagehide', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeUndefined();
      act(() => {
        window.dispatchEvent(new Event('pagehide'));
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeDefined();
    });

    it('flushes pending writes synchronously on beforeunload', () => {
      const { result } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeUndefined();
      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeDefined();
    });

    it('flushes pending writes on unmount', () => {
      const { result, unmount } = renderHook(() => useMules());
      act(() => {
        result.current.addMule('heroic-kronos');
      });
      expect(localStorageStore['maplestory-mule-tracker']).toBeUndefined();
      unmount();
      expect(localStorageStore['maplestory-mule-tracker']).toBeDefined();
    });
  });

  describe('outward API unchanged', () => {
    it('returns { mules, addMule, updateMule, deleteMule, deleteMules, reorderMules, restoreMule, restoreMules }', () => {
      const { result } = renderHook(() => useMules());
      const keys = Object.keys(result.current).sort();
      expect(keys).toEqual([
        'addMule',
        'deleteMule',
        'deleteMules',
        'mules',
        'reorderMules',
        'restoreMule',
        'restoreMules',
        'updateMule',
      ]);
    });
  });
});
