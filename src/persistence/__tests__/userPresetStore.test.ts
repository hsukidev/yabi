import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createUserPresetStore,
  CURRENT_USER_PRESET_SCHEMA_VERSION,
  userPresetMigrate,
} from '../userPresetStore';
import { defaultUserPresetStoragePort, USER_PRESET_STORAGE_KEY } from '../userPresetStorage';
import type { StoragePort } from '../muleStore';
import type { UserPreset } from '../../data/userPresets';

function makeFakePort(initial: string | null = null): StoragePort & { writes: string[] } {
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

function presetFixture(overrides: Partial<UserPreset> = {}): UserPreset {
  return {
    id: 'p1',
    name: 'My Preset',
    slateKeys: ['k1', 'k2'],
    partySizes: {},
    ...overrides,
  };
}

describe('createUserPresetStore', () => {
  describe('load()', () => {
    it('returns [] when the port yields null', () => {
      const port = makeFakePort(null);
      expect(createUserPresetStore(port).load()).toEqual([]);
    });

    it('returns [] on corrupt JSON', () => {
      const port = makeFakePort('not json');
      expect(createUserPresetStore(port).load()).toEqual([]);
    });

    it('round-trips a persisted payload', () => {
      const presets = [presetFixture(), presetFixture({ id: 'p2', name: 'Other', slateKeys: [] })];
      const payload = JSON.stringify({
        schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
        userPresets: presets,
      });
      const port = makeFakePort(payload);
      const store = createUserPresetStore(port);
      expect(store.load()).toEqual(presets);
    });

    it('drops malformed presets but keeps valid ones', () => {
      const payload = JSON.stringify({
        schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
        userPresets: [
          presetFixture(),
          { id: 'bad', name: 'no keys' }, // missing slateKeys
          { id: 42, name: 'wrong id type', slateKeys: [] },
          presetFixture({ id: 'p2' }),
        ],
      });
      const port = makeFakePort(payload);
      const store = createUserPresetStore(port);
      const loaded = store.load();
      expect(loaded.map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('returns [] when payload lacks schemaVersion (a Wipe)', () => {
      const port = makeFakePort(JSON.stringify({ userPresets: [presetFixture()] }));
      expect(createUserPresetStore(port).load()).toEqual([]);
    });

    it('migrates a legacy preset (no partySizes field) to partySizes: {}', () => {
      const payload = JSON.stringify({
        schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
        userPresets: [{ id: 'legacy-1', name: 'Legacy', slateKeys: ['k1'] }],
      });
      const port = makeFakePort(payload);
      const loaded = createUserPresetStore(port).load();
      expect(loaded).toEqual([
        { id: 'legacy-1', name: 'Legacy', slateKeys: ['k1'], partySizes: {} },
      ]);
    });

    it('preserves a persisted partySizes map and ignores out-of-range values', () => {
      const payload = JSON.stringify({
        schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
        userPresets: [
          {
            id: 'p1',
            name: 'With Sizes',
            slateKeys: ['k1'],
            partySizes: { fam: 3, ignored: 99, also: 'not-a-number' },
          },
        ],
      });
      const port = makeFakePort(payload);
      const loaded = createUserPresetStore(port).load();
      expect(loaded).toEqual([
        { id: 'p1', name: 'With Sizes', slateKeys: ['k1'], partySizes: { fam: 3 } },
      ]);
    });

    it('matches userPresetMigrate(port.read()) exactly', () => {
      const payload = JSON.stringify({
        schemaVersion: CURRENT_USER_PRESET_SCHEMA_VERSION,
        userPresets: [presetFixture()],
      });
      const port = makeFakePort(payload);
      expect(createUserPresetStore(port).load()).toEqual(userPresetMigrate(payload));
    });
  });

  // Debounce and flush behaviour is covered once in debouncedStore.test.ts —
  // this suite covers only the user-preset adapter's serialize/migrate
  // bindings.
  describe('serialize', () => {
    it('serializes as { schemaVersion, userPresets }', () => {
      const port = makeFakePort();
      const store = createUserPresetStore(port);
      const presets = [presetFixture()];
      store.save(presets);
      store.flush();
      const saved = JSON.parse(port.writes[0]);
      expect(saved.schemaVersion).toBe(CURRENT_USER_PRESET_SCHEMA_VERSION);
      expect(saved.userPresets).toEqual(presets);
    });
  });

  describe('default port (no argument)', () => {
    let localStorageStore: Record<string, string> = {};

    beforeEach(() => {
      vi.useFakeTimers();
      localStorageStore = {};
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageStore[key] = value;
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(() => null),
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

    it('writes to its own storage key (not the mule key)', () => {
      const store = createUserPresetStore();
      store.save([presetFixture()]);
      vi.advanceTimersByTime(200);
      expect(localStorageStore[USER_PRESET_STORAGE_KEY]).toBeDefined();
      expect(localStorageStore['maplestory-mule-tracker']).toBeUndefined();
    });
  });
});

describe('defaultUserPresetStoragePort — key bindings', () => {
  // The Storage Fallback Ladder itself is covered in storagePort.test.ts;
  // these pin the user-preset port to its own primary/fallback keys.
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

  it('reads under its own primary key', () => {
    localStorageStore[USER_PRESET_STORAGE_KEY] = 'primary';
    expect(defaultUserPresetStoragePort.read()).toBe('primary');
  });

  it('falls back under its own fallback key when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    defaultUserPresetStoragePort.write('payload');
    expect(sessionStorageStore['maplestory-mule-tracker-user-presets-fallback']).toBe('payload');
  });
});
