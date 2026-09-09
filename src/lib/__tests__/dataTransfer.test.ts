import { describe, expect, it, beforeEach } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import {
  buildExport,
  decodeImport,
  applyImport,
  summarizeImport,
  type DataTransferStoragePort,
  type ExportEnvelope,
} from '../dataTransfer';

/**
 * Boundary tests for `src/lib/dataTransfer.ts`. Pattern mirrors
 * `src/persistence/__tests__/muleStore.test.ts` — for the apply-import
 * cases we inject an in-memory `DataTransferStoragePort` double, programmable
 * to throw on the Nth `setItem`, instead of monkey-patching
 * `window.localStorage`.
 */

const TRACKER_KEY = 'maplestory-mule-tracker';
const WORLD_KEY = 'world';
const CHANGELOG_KEY = 'lastSeenChangelog';
const USER_PRESET_KEY = 'maplestory-mule-tracker-user-presets';

function makeFakePort(initial: Partial<Record<string, string>> = {}): DataTransferStoragePort & {
  store: Record<string, string | undefined>;
  setItemCalls: Array<{ key: string; value: string }>;
  removeItemCalls: string[];
  throwOnNthSet: number | null;
} {
  const store: Record<string, string | undefined> = { ...initial };
  const setItemCalls: Array<{ key: string; value: string }> = [];
  const removeItemCalls: string[] = [];
  let setItemAttempts = 0;
  const port = {
    store,
    setItemCalls,
    removeItemCalls,
    throwOnNthSet: null as number | null,
    getItem(key: string): string | null {
      const v = store[key];
      return v === undefined ? null : v;
    },
    setItem(key: string, value: string): void {
      setItemAttempts++;
      if (port.throwOnNthSet !== null && setItemAttempts === port.throwOnNthSet) {
        // Production localStorage rejects without mutating; model the same.
        // Only the Nth attempt throws — rollback writes that follow succeed.
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      setItemCalls.push({ key, value });
      store[key] = value;
    },
    removeItem(key: string): void {
      removeItemCalls.push(key);
      delete store[key];
    },
  };
  return port;
}

function muleFixture(overrides: Partial<{ id: string; worldId: string }>) {
  return {
    id: overrides.id ?? 'm1',
    name: 'Test',
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [],
    partySizes: {},
    active: true,
    ...overrides,
  };
}

function trackerBlob(mules: ReturnType<typeof muleFixture>[]): string {
  return JSON.stringify({ schemaVersion: 6, mules });
}

beforeEach(() => {
  localStorage.clear();
});

describe('buildExport / decodeImport', () => {
  it('round-trips: decoded data is byte-equal to the source localStorage values', () => {
    const tracker = trackerBlob([muleFixture({ id: 'a', worldId: 'heroic-kronos' })]);
    const presetBlob = JSON.stringify({
      schemaVersion: 1,
      userPresets: [{ id: 'p1', name: 'Mine', slateKeys: [], partySizes: {} }],
    });
    localStorage.setItem(TRACKER_KEY, tracker);
    localStorage.setItem(WORLD_KEY, 'heroic-kronos');
    localStorage.setItem(CHANGELOG_KEY, 'v1.0.0');
    localStorage.setItem(USER_PRESET_KEY, presetBlob);

    const code = buildExport();
    const result = decodeImport(code);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.app).toBe('yabi');
    expect(result.payload.exportVersion).toBe(2);
    expect(result.payload.data[TRACKER_KEY]).toBe(tracker);
    expect(result.payload.data[WORLD_KEY]).toBe('heroic-kronos');
    expect(result.payload.data[CHANGELOG_KEY]).toBe('v1.0.0');
    expect(result.payload.data[USER_PRESET_KEY]).toBe(presetBlob);
    expect('trackerPreference' in result.payload.data).toBe(false);
  });

  it('returns { ok: false } for a corrupt non-base64 code without throwing', () => {
    expect(() => decodeImport('!!!not a base64 thing!!!')).not.toThrow();
    expect(decodeImport('!!!not a base64 thing!!!').ok).toBe(false);
  });

  it('returns { ok: false } for valid base64 wrapping garbage JSON', () => {
    const code = compressToEncodedURIComponent('this is not valid json');
    expect(() => decodeImport(code)).not.toThrow();
    expect(decodeImport(code).ok).toBe(false);
  });

  it('rejects an envelope whose app field is not "yabi"', () => {
    const code = compressToEncodedURIComponent(
      JSON.stringify({
        app: 'other-tool',
        exportVersion: 2,
        exportedAt: '2026-05-04T00:00:00.000Z',
        data: {
          [TRACKER_KEY]: '',
          [WORLD_KEY]: '',
          [CHANGELOG_KEY]: '',
          [USER_PRESET_KEY]: '',
        },
      }),
    );
    expect(decodeImport(code).ok).toBe(false);
  });

  it('rejects exportVersion 3 (future)', () => {
    const code = compressToEncodedURIComponent(
      JSON.stringify({
        app: 'yabi',
        exportVersion: 3,
        exportedAt: '2026-05-04T00:00:00.000Z',
        data: {
          [TRACKER_KEY]: '',
          [WORLD_KEY]: '',
          [CHANGELOG_KEY]: '',
          [USER_PRESET_KEY]: '',
        },
      }),
    );
    expect(decodeImport(code).ok).toBe(false);
  });

  it('rejects exportVersion 1 (legacy)', () => {
    const code = compressToEncodedURIComponent(
      JSON.stringify({
        app: 'yabi',
        exportVersion: 1,
        exportedAt: '2026-05-04T00:00:00.000Z',
        data: {
          [TRACKER_KEY]: 'tracker',
          [WORLD_KEY]: 'heroic-kronos',
          [CHANGELOG_KEY]: 'v1.0.0',
        },
      }),
    );
    expect(decodeImport(code).ok).toBe(false);
  });

  it('rejects an envelope missing one of the required data keys', () => {
    const code = compressToEncodedURIComponent(
      JSON.stringify({
        app: 'yabi',
        exportVersion: 2,
        exportedAt: '2026-05-04T00:00:00.000Z',
        data: {
          [TRACKER_KEY]: '',
          [CHANGELOG_KEY]: '',
          [USER_PRESET_KEY]: '',
        },
      }),
    );
    expect(decodeImport(code).ok).toBe(false);
  });
});

describe('applyImport', () => {
  function payloadOf(data: Record<string, string>): ExportEnvelope {
    return {
      app: 'yabi',
      exportVersion: 2,
      exportedAt: '2026-05-04T00:00:00.000Z',
      data: {
        [TRACKER_KEY]: data[TRACKER_KEY] ?? '',
        [WORLD_KEY]: data[WORLD_KEY] ?? '',
        [CHANGELOG_KEY]: data[CHANGELOG_KEY] ?? '',
        [USER_PRESET_KEY]: data[USER_PRESET_KEY] ?? '',
      },
    };
  }

  it('writes all three keys and returns { ok: true } on success', () => {
    const port = makeFakePort();
    const result = applyImport(
      payloadOf({
        [TRACKER_KEY]: 'tracker-new',
        [WORLD_KEY]: 'heroic-kronos',
        [CHANGELOG_KEY]: 'v2.0.0',
      }),
      port,
    );

    expect(result).toEqual({ ok: true });
    expect(port.store[TRACKER_KEY]).toBe('tracker-new');
    expect(port.store[WORLD_KEY]).toBe('heroic-kronos');
    expect(port.store[CHANGELOG_KEY]).toBe('v2.0.0');
  });

  it('rolls back when the first write throws — storage left untouched', () => {
    const port = makeFakePort({
      [TRACKER_KEY]: 'tracker-old',
      [WORLD_KEY]: 'heroic-solis',
      [CHANGELOG_KEY]: 'v1.0.0',
    });
    port.throwOnNthSet = 1;

    const result = applyImport(
      payloadOf({
        [TRACKER_KEY]: 'tracker-new',
        [WORLD_KEY]: 'heroic-kronos',
        [CHANGELOG_KEY]: 'v2.0.0',
      }),
      port,
    );

    expect(result).toEqual({ ok: false });
    expect(port.setItemCalls).toHaveLength(0);
    expect(port.removeItemCalls).toHaveLength(0);
    expect(port.store[TRACKER_KEY]).toBe('tracker-old');
    expect(port.store[WORLD_KEY]).toBe('heroic-solis');
    expect(port.store[CHANGELOG_KEY]).toBe('v1.0.0');
  });

  it('rolls back the first key when the second write throws', () => {
    const port = makeFakePort({
      [TRACKER_KEY]: 'tracker-old',
      [WORLD_KEY]: 'heroic-solis',
      [CHANGELOG_KEY]: 'v1.0.0',
    });
    port.throwOnNthSet = 2;

    const result = applyImport(
      payloadOf({
        [TRACKER_KEY]: 'tracker-new',
        [WORLD_KEY]: 'heroic-kronos',
        [CHANGELOG_KEY]: 'v2.0.0',
      }),
      port,
    );

    expect(result).toEqual({ ok: false });
    expect(port.store[TRACKER_KEY]).toBe('tracker-old');
    expect(port.store[WORLD_KEY]).toBe('heroic-solis');
    expect(port.store[CHANGELOG_KEY]).toBe('v1.0.0');
  });

  it('removeItem-s a pre-import absent key during rollback rather than restoring an empty string', () => {
    const port = makeFakePort({
      [TRACKER_KEY]: 'tracker-old',
      // WORLD_KEY absent — getItem returns null
      [CHANGELOG_KEY]: 'v1.0.0',
    });
    port.throwOnNthSet = 3; // first two writes succeed, third throws

    const result = applyImport(
      payloadOf({
        [TRACKER_KEY]: 'tracker-new',
        [WORLD_KEY]: 'heroic-kronos',
        [CHANGELOG_KEY]: 'v2.0.0',
      }),
      port,
    );

    expect(result).toEqual({ ok: false });
    // First key restored from snapshot string.
    expect(port.store[TRACKER_KEY]).toBe('tracker-old');
    // Second key was absent pre-import; rollback must remove, not setItem('').
    expect(port.removeItemCalls).toContain(WORLD_KEY);
    expect(port.store[WORLD_KEY]).toBeUndefined();
    // Third key was never written, so it stays at its pre-import value.
    expect(port.store[CHANGELOG_KEY]).toBe('v1.0.0');
  });

  it('writes USER_PRESET_KEY when the envelope includes it', () => {
    const port = makeFakePort();
    const result = applyImport(
      payloadOf({
        [TRACKER_KEY]: 'tracker-new',
        [WORLD_KEY]: 'heroic-kronos',
        [CHANGELOG_KEY]: 'v2.0.0',
        [USER_PRESET_KEY]: 'preset-blob',
      }),
      port,
    );
    expect(result).toEqual({ ok: true });
    expect(port.store[USER_PRESET_KEY]).toBe('preset-blob');
  });

  it('rolls back the first two keys when the third write throws', () => {
    const port = makeFakePort({
      [TRACKER_KEY]: 'tracker-old',
      [WORLD_KEY]: 'heroic-solis',
      [CHANGELOG_KEY]: 'v1.0.0',
    });
    port.throwOnNthSet = 3;

    const result = applyImport(
      payloadOf({
        [TRACKER_KEY]: 'tracker-new',
        [WORLD_KEY]: 'heroic-kronos',
        [CHANGELOG_KEY]: 'v2.0.0',
      }),
      port,
    );

    expect(result).toEqual({ ok: false });
    expect(port.store[TRACKER_KEY]).toBe('tracker-old');
    expect(port.store[WORLD_KEY]).toBe('heroic-solis');
    expect(port.store[CHANGELOG_KEY]).toBe('v1.0.0');
  });
});

describe('summarizeImport', () => {
  function payloadWithMules(mules: ReturnType<typeof muleFixture>[]): ExportEnvelope {
    return {
      app: 'yabi',
      exportVersion: 2,
      exportedAt: '2026-05-04T00:00:00.000Z',
      data: {
        [TRACKER_KEY]: trackerBlob(mules),
        [WORLD_KEY]: '',
        [CHANGELOG_KEY]: '',
        [USER_PRESET_KEY]: '',
      },
    };
  }

  it('groups counts by world label, sorted alphabetically, omitting zero-mule worlds per side', () => {
    localStorage.setItem(
      TRACKER_KEY,
      trackerBlob([
        muleFixture({ id: 'a', worldId: 'heroic-solis' }),
        muleFixture({ id: 'b', worldId: 'heroic-solis' }),
        muleFixture({ id: 'c', worldId: 'heroic-kronos' }),
      ]),
    );

    const summary = summarizeImport(
      payloadWithMules([
        muleFixture({ id: 'x', worldId: 'interactive-luna' }),
        muleFixture({ id: 'y', worldId: 'heroic-hyperion' }),
        muleFixture({ id: 'z', worldId: 'heroic-hyperion' }),
      ]),
    );

    expect(summary.before.map((c) => c.worldLabel)).toEqual(['Kronos', 'Solis']);
    expect(summary.before.find((c) => c.worldLabel === 'Solis')!.count).toBe(2);
    expect(summary.before.find((c) => c.worldLabel === 'Kronos')!.count).toBe(1);

    expect(summary.after.map((c) => c.worldLabel)).toEqual(['Hyperion', 'Luna']);
    expect(summary.after.find((c) => c.worldLabel === 'Hyperion')!.count).toBe(2);
    expect(summary.after.find((c) => c.worldLabel === 'Luna')!.count).toBe(1);
  });

  it('falls back to the raw worldId string when the id is unknown', () => {
    const summary = summarizeImport(
      payloadWithMules([
        muleFixture({ id: 'a', worldId: 'made-up-world' }),
        muleFixture({ id: 'b', worldId: 'heroic-kronos' }),
      ]),
    );

    expect(summary.after.map((c) => c.worldLabel)).toContain('made-up-world');
    expect(summary.after.find((c) => c.worldLabel === 'made-up-world')!.count).toBe(1);
  });
});
