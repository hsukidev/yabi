import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createMuleStore, type StoragePort } from '../muleStore';
import { muleMigrate } from '../muleMigrate';
import { bosses } from '../../data/bosses';
import type { BossTier, Mule } from '../../types';

/**
 * Boundary tests for the `createMuleStore(port?)` adapter — its
 * serialize/migrate bindings and default-port key binding. The generic
 * debounce/flush machine is covered in debouncedStore.test.ts; the
 * Storage Fallback Ladder in storagePort.test.ts.
 */

function makeFakePort(initial: string | null = null): StoragePort & {
  writes: string[];
} {
  let current: string | null = initial;
  const writes: string[] = [];
  return {
    read(): string | null {
      return current;
    },
    write(data: string): void {
      writes.push(data);
      current = data;
    },
    writes,
  };
}

function idForFamily(family: string): string {
  const boss = bosses.find((b) => b.family === family);
  if (!boss) throw new Error(`No boss found for family ${family}`);
  return boss.id;
}

function nativeKey(bossId: string, tier: BossTier): string {
  const boss = bosses.find((b) => b.id === bossId)!;
  const diff = boss.difficulty.find((d) => d.tier === tier)!;
  return `${bossId}:${tier}:${diff.cadence}`;
}

const LUCID = idForFamily('lucid');
const HARD_LUCID = nativeKey(LUCID, 'hard');

function muleFixture(overrides: Partial<Mule> = {}): Mule {
  return {
    id: 'a',
    name: 'Test',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    partySizes: {},
    active: true,
    ...overrides,
  };
}

describe('createMuleStore', () => {
  describe('load()', () => {
    it('matches muleMigrate(port.read()) exactly', () => {
      const payload = JSON.stringify({
        schemaVersion: 4,
        mules: [muleFixture({ selectedBosses: [HARD_LUCID] })],
      });
      const port = makeFakePort(payload);
      const store = createMuleStore(port);
      expect(store.load()).toEqual(muleMigrate(payload));
    });

    it('returns [] when the port yields null', () => {
      const port = makeFakePort(null);
      expect(createMuleStore(port).load()).toEqual([]);
    });

    it('returns [] on corrupt JSON', () => {
      const port = makeFakePort('not json');
      expect(createMuleStore(port).load()).toEqual([]);
    });
  });

  // Debounce, flush, and instance-isolation behaviour is covered once in
  // debouncedStore.test.ts — this suite covers only the mule adapter's
  // serialize/migrate bindings.
  describe('serialize', () => {
    it('serializes as { schemaVersion: 7, mules }', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      const mules = [muleFixture({ selectedBosses: [HARD_LUCID] })];
      store.save(mules);
      store.flush();
      const saved = JSON.parse(port.writes[0]);
      expect(saved.schemaVersion).toBe(7);
      expect(saved.mules).toEqual(mules);
    });
  });

  describe('default port (no argument)', () => {
    // Distinct jsdom-backed block — spies on window.localStorage to prove
    // createMuleStore() without an arg binds to the Default Storage Port.
    let localStorageStore: Record<string, string> = {};

    beforeEach(() => {
      vi.useFakeTimers();
      localStorageStore = {};
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
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(() => null),
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('writes to localStorage under the expected storage key', () => {
      const store = createMuleStore();
      store.save([muleFixture({ name: 'default-port' })]);
      vi.advanceTimersByTime(200);
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'maplestory-mule-tracker',
        expect.any(String),
      );
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker']);
      expect(saved.mules[0].name).toBe('default-port');
    });

    it('reads via localStorage when load() is called', () => {
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify({
        schemaVersion: 4,
        mules: [muleFixture({ name: 'from-default-port' })],
      });
      const store = createMuleStore();
      expect(store.load()[0].name).toBe('from-default-port');
      expect(localStorage.getItem).toHaveBeenCalledWith('maplestory-mule-tracker');
    });
  });
});
