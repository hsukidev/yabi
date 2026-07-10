import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncedStore } from '../debouncedStore';
import type { StoragePort } from '../storagePort';

/**
 * Behavioural suite for the generic `createDebouncedStore<T>` — the single
 * owner of the **Storage Debounce** (200ms coalesce), `flush()` semantics,
 * and load-through-migrate. The concrete mule / user-preset stores are thin
 * adapters over this module; their suites cover only serialize/migrate
 * specifics and key bindings.
 */

function makePort(initial: string | null = null): StoragePort & { writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    read: () => initial,
    write: (data: string) => {
      writes.push(data);
    },
  };
}

const config = {
  serialize: (value: string[]) => JSON.stringify(value),
  migrate: (raw: string | null): string[] => (raw === null ? [] : (JSON.parse(raw) as string[])),
};

describe('createDebouncedStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('load()', () => {
    it('returns migrate(port.read())', () => {
      const store = createDebouncedStore(makePort('["a","b"]'), config);
      expect(store.load()).toEqual(['a', 'b']);
    });

    it('passes null through to migrate when the port is empty', () => {
      const store = createDebouncedStore(makePort(null), config);
      expect(store.load()).toEqual([]);
    });
  });

  describe('save() — Storage Debounce', () => {
    it('does not write synchronously', () => {
      const port = makePort();
      const store = createDebouncedStore(port, config);
      store.save(['a']);
      expect(port.writes).toHaveLength(0);
    });

    it('coalesces a burst into a single write of the last value after 200ms', () => {
      const port = makePort();
      const store = createDebouncedStore(port, config);
      store.save(['a']);
      vi.advanceTimersByTime(100);
      store.save(['a', 'b']);
      vi.advanceTimersByTime(100);
      store.save(['a', 'b', 'c']);
      vi.advanceTimersByTime(200);
      expect(port.writes).toEqual([JSON.stringify(['a', 'b', 'c'])]);
    });

    it('starts a fresh debounce after the previous one flushes', () => {
      const port = makePort();
      const store = createDebouncedStore(port, config);
      store.save(['a']);
      vi.advanceTimersByTime(200);
      store.save(['b']);
      vi.advanceTimersByTime(200);
      expect(port.writes).toEqual([JSON.stringify(['a']), JSON.stringify(['b'])]);
    });
  });

  describe('flush()', () => {
    it('writes pending state immediately without waiting for the timer', () => {
      const port = makePort();
      const store = createDebouncedStore(port, config);
      store.save(['a']);
      store.flush();
      expect(port.writes).toEqual([JSON.stringify(['a'])]);
    });

    it('cancels the pending timer so no second write fires later', () => {
      const port = makePort();
      const store = createDebouncedStore(port, config);
      store.save(['a']);
      store.flush();
      vi.advanceTimersByTime(400);
      expect(port.writes).toHaveLength(1);
    });

    it('is a no-op when nothing is pending', () => {
      const port = makePort();
      const store = createDebouncedStore(port, config);
      store.flush();
      store.flush();
      expect(port.writes).toHaveLength(0);
    });
  });

  describe('instance isolation', () => {
    it('each store owns its own pending/timer refs (no module-level state)', () => {
      const portA = makePort();
      const portB = makePort();
      const storeA = createDebouncedStore(portA, config);
      const storeB = createDebouncedStore(portB, config);
      storeA.save(['a']);
      storeB.save(['b']);
      storeA.flush();
      expect(portA.writes).toEqual([JSON.stringify(['a'])]);
      expect(portB.writes).toHaveLength(0);
      vi.advanceTimersByTime(200);
      expect(portB.writes).toEqual([JSON.stringify(['b'])]);
    });
  });
});
