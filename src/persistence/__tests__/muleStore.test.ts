import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createMuleStore, type StoragePort } from '../muleStore';
import { defaultStoragePort } from '../muleStorage';
import { muleMigrate } from '../muleMigrate';
import { bosses } from '../../data/bosses';
import type { BossTier, Mule } from '../../types';

/**
 * Boundary tests for `createMuleStore(port?)`. Uses an in-memory
 * `StoragePort` double for determinism; the default port
 * (`defaultStoragePort`) is covered by a dedicated block at the bottom
 * that drives it through `window.localStorage` / `window.sessionStorage`
 * with spies.
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

  describe('save() — debounced writes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not write synchronously', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.save([muleFixture()]);
      expect(port.writes).toHaveLength(0);
    });

    it('coalesces a burst of saves into a single write after 200ms', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      const m1 = muleFixture({ name: 'first' });
      const m2 = muleFixture({ name: 'second' });
      const m3 = muleFixture({ name: 'third' });
      store.save([m1]);
      store.save([m2]);
      store.save([m3]);
      expect(port.writes).toHaveLength(0);
      vi.advanceTimersByTime(200);
      expect(port.writes).toHaveLength(1);
      const saved = JSON.parse(port.writes[0]);
      expect(saved).toEqual({ schemaVersion: 4, mules: [m3] });
    });

    it('writes exactly once even when the debounce elapses from the last save', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.save([muleFixture({ name: 'a' })]);
      vi.advanceTimersByTime(150);
      // A fresh save restarts the debounce window.
      store.save([muleFixture({ name: 'b' })]);
      vi.advanceTimersByTime(150);
      expect(port.writes).toHaveLength(0);
      vi.advanceTimersByTime(60);
      expect(port.writes).toHaveLength(1);
      expect(JSON.parse(port.writes[0]).mules[0].name).toBe('b');
    });

    it('starts a fresh debounce after the previous one flushes', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.save([muleFixture({ name: 'first' })]);
      vi.advanceTimersByTime(200);
      expect(port.writes).toHaveLength(1);
      store.save([muleFixture({ name: 'second' })]);
      expect(port.writes).toHaveLength(1);
      vi.advanceTimersByTime(200);
      expect(port.writes).toHaveLength(2);
      expect(JSON.parse(port.writes[1]).mules[0].name).toBe('second');
    });

    it('serializes as { schemaVersion: 4, mules }', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      const mules = [muleFixture({ selectedBosses: [HARD_LUCID] })];
      store.save(mules);
      vi.advanceTimersByTime(200);
      const saved = JSON.parse(port.writes[0]);
      expect(saved.schemaVersion).toBe(4);
      expect(saved.mules).toEqual(mules);
    });
  });

  describe('flush()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('writes pending state immediately without waiting for the timer', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.save([muleFixture({ name: 'urgent' })]);
      store.flush();
      expect(port.writes).toHaveLength(1);
      expect(JSON.parse(port.writes[0]).mules[0].name).toBe('urgent');
    });

    it('cancels the pending timer so no second write fires later', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.save([muleFixture({ name: 'urgent' })]);
      store.flush();
      vi.advanceTimersByTime(1000);
      expect(port.writes).toHaveLength(1);
    });

    it('is a no-op when nothing is pending', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.flush();
      expect(port.writes).toHaveLength(0);
    });

    it('is a no-op when called twice in a row (second flush has nothing pending)', () => {
      const port = makeFakePort();
      const store = createMuleStore(port);
      store.save([muleFixture()]);
      store.flush();
      store.flush();
      expect(port.writes).toHaveLength(1);
    });
  });

  describe('instance isolation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('each store owns its own pending/timer refs (no module-level state)', () => {
      const portA = makeFakePort();
      const portB = makeFakePort();
      const storeA = createMuleStore(portA);
      const storeB = createMuleStore(portB);
      storeA.save([muleFixture({ name: 'from-a' })]);
      storeB.save([muleFixture({ name: 'from-b' })]);
      // Flushing storeA must not touch storeB's pending write.
      storeA.flush();
      expect(portA.writes).toHaveLength(1);
      expect(portB.writes).toHaveLength(0);
      vi.advanceTimersByTime(200);
      expect(portB.writes).toHaveLength(1);
      expect(JSON.parse(portB.writes[0]).mules[0].name).toBe('from-b');
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

describe('defaultStoragePort', () => {
  // Direct coverage of the Storage Fallback Ladder — both directions.
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
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStorageStore[key] = value;
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('read() returns the localStorage value when present', () => {
    localStorageStore['maplestory-mule-tracker'] = 'primary-payload';
    expect(defaultStoragePort.read()).toBe('primary-payload');
  });

  it('read() falls through to sessionStorage when localStorage.getItem throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    sessionStorageStore['maplestory-mule-tracker-fallback'] = 'fallback-payload';
    expect(defaultStoragePort.read()).toBe('fallback-payload');
  });

  it('read() falls through to sessionStorage when localStorage.getItem returns null', () => {
    sessionStorageStore['maplestory-mule-tracker-fallback'] = 'fallback-payload';
    expect(defaultStoragePort.read()).toBe('fallback-payload');
  });

  it('read() returns null when both storages return null', () => {
    expect(defaultStoragePort.read()).toBeNull();
  });

  it('read() returns null when both storages throw', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(defaultStoragePort.read()).toBeNull();
  });

  it('write() writes to localStorage on the happy path', () => {
    defaultStoragePort.write('payload');
    expect(localStorageStore['maplestory-mule-tracker']).toBe('payload');
    // sessionStorage untouched when primary succeeds.
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('write() falls through to sessionStorage when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    defaultStoragePort.write('payload');
    expect(sessionStorageStore['maplestory-mule-tracker-fallback']).toBe('payload');
  });

  it('write() swallows a second throw silently when both storages fail', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    expect(() => defaultStoragePort.write('payload')).not.toThrow();
  });
});
