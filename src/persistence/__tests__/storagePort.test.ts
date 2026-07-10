import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createFallbackStoragePort } from '../storagePort';

/**
 * Direct coverage of the **Storage Fallback Ladder** — the generic
 * `createFallbackStoragePort(primaryKey, fallbackKey)` factory both
 * default ports (mule, user preset) are built from. Key-binding checks
 * live with each adapter's own suite.
 */

const PRIMARY = 'test-primary-key';
const FALLBACK = 'test-fallback-key';

describe('createFallbackStoragePort', () => {
  let localStorageStore: Record<string, string> = {};
  let sessionStorageStore: Record<string, string> = {};
  const port = createFallbackStoragePort(PRIMARY, FALLBACK);

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

  it('read() returns the localStorage value under the primary key when present', () => {
    localStorageStore[PRIMARY] = 'primary-payload';
    expect(port.read()).toBe('primary-payload');
  });

  it('read() falls through to sessionStorage under the fallback key when localStorage.getItem throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    sessionStorageStore[FALLBACK] = 'fallback-payload';
    expect(port.read()).toBe('fallback-payload');
  });

  it('read() falls through to sessionStorage when localStorage.getItem returns null', () => {
    sessionStorageStore[FALLBACK] = 'fallback-payload';
    expect(port.read()).toBe('fallback-payload');
  });

  it('read() returns null when both storages return null', () => {
    expect(port.read()).toBeNull();
  });

  it('read() returns null when both storages throw', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(port.read()).toBeNull();
  });

  it('write() writes to localStorage under the primary key on the happy path', () => {
    port.write('payload');
    expect(localStorageStore[PRIMARY]).toBe('payload');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('write() falls through to sessionStorage under the fallback key when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    port.write('payload');
    expect(sessionStorageStore[FALLBACK]).toBe('payload');
  });

  it('write() swallows a second throw silently when both storages fail', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    expect(() => port.write('payload')).not.toThrow();
  });
});
