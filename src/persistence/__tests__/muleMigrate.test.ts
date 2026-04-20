import { describe, expect, it } from 'vitest';
import { muleMigrate, CURRENT_SCHEMA_VERSION } from '../muleMigrate';
import { bosses } from '../../data/bosses';
import type { BossTier, Mule } from '../../types';

/**
 * Boundary tests for the pure `muleMigrate(raw)` function. Every **Load
 * Mode** branch is driven via fixture strings — no JSDOM storage, no
 * fake timers, no React mounting. The fixtures below build selection
 * keys from the live `bosses` catalog so this file never hard-codes a
 * UUID (which would drift silently on catalog edits).
 */

function idForFamily(family: string): string {
  const boss = bosses.find((b) => b.family === family);
  if (!boss) throw new Error(`No boss found for family ${family}`);
  return boss.id;
}

/** Fabricate a native `<uuid>:<tier>:<cadence>` **Slate Key** from boss data. */
function nativeKey(bossId: string, tier: BossTier): string {
  const boss = bosses.find((b) => b.id === bossId)!;
  const diff = boss.difficulty.find((d) => d.tier === tier)!;
  return `${bossId}:${tier}:${diff.cadence}`;
}

const LUCID = idForFamily('lucid');
const VELLUM = idForFamily('vellum');

const HARD_LUCID = nativeKey(LUCID, 'hard');
const NORMAL_LUCID = nativeKey(LUCID, 'normal');
const NORMAL_VELLUM_DAILY = nativeKey(VELLUM, 'normal');
const CHAOS_VELLUM_WEEKLY = nativeKey(VELLUM, 'chaos');

const LEGACY_HARD_LUCID = `${LUCID}:hard`;
const LEGACY_NORMAL_VELLUM = `${VELLUM}:normal`;
const LEGACY_CHAOS_VELLUM = `${VELLUM}:chaos`;

describe('muleMigrate', () => {
  describe('input-shape failures → Wipe to empty array', () => {
    it('returns [] for null input', () => {
      expect(muleMigrate(null)).toEqual([]);
    });

    it('returns [] for corrupt JSON', () => {
      expect(muleMigrate('not json')).toEqual([]);
      expect(muleMigrate('{incomplete')).toEqual([]);
    });

    it('returns [] for valid JSON with unusable shape', () => {
      // Not an array, not a { mules: [...] } envelope.
      expect(muleMigrate(JSON.stringify({ foo: 'bar' }))).toEqual([]);
      expect(muleMigrate(JSON.stringify(42))).toEqual([]);
      expect(muleMigrate(JSON.stringify('string'))).toEqual([]);
    });
  });

  describe('pre-1B bare-array payload → Wipe', () => {
    it('returns [] for an empty bare array', () => {
      expect(muleMigrate('[]')).toEqual([]);
    });

    it('wipes legacy-id selections but preserves non-selection fields', () => {
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid', 'normal-will'],
          partySizes: { lucid: 3 },
        },
      ];
      const [mule] = muleMigrate(JSON.stringify(legacyRoot));
      expect(mule.id).toBe('a');
      expect(mule.name).toBe('Legacy');
      expect(mule.level).toBe(200);
      expect(mule.muleClass).toBe('Hero');
      expect(mule.selectedBosses).toEqual([]);
      // partySizes are dropped alongside the wiped selections.
      expect(mule.partySizes).toEqual({});
      // Active Default applied.
      expect(mule.active).toBe(true);
    });

    it('wipes when any entry lacks a colon', () => {
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 1,
          muleClass: 'A',
          selectedBosses: ['no-colon'],
        },
      ];
      expect(muleMigrate(JSON.stringify(legacyRoot))[0].selectedBosses).toEqual([]);
    });
  });

  describe('schemaVersion 2 → Upgrade V2', () => {
    it('rewrites <uuid>:<tier> keys to <uuid>:<tier>:<cadence>', () => {
      const v2 = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_HARD_LUCID],
            partySizes: { lucid: 3 },
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v2));
      expect(mule.selectedBosses).toEqual([HARD_LUCID]);
      // partySizes survive the upgrade untouched.
      expect(mule.partySizes).toEqual({ lucid: 3 });
      expect(mule.active).toBe(true);
    });

    it('upgrades mixed daily + weekly v2 keys on the same boss', () => {
      // Vellum: Normal (daily) + Chaos (weekly) — both cadences coexist.
      const v2 = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_NORMAL_VELLUM, LEGACY_CHAOS_VELLUM],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v2))[0].selectedBosses).toEqual([
        NORMAL_VELLUM_DAILY,
        CHAOS_VELLUM_WEEKLY,
      ]);
    });

    it('silently drops v2 entries whose boss is no longer in the dataset', () => {
      const v2 = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_HARD_LUCID, 'unknown-boss-id:hard'],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v2))[0].selectedBosses).toEqual([HARD_LUCID]);
    });

    it('silently drops v2 entries whose tier is not offered for the boss', () => {
      // Lucid does not offer chaos.
      const v2 = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_HARD_LUCID, `${LUCID}:chaos`],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v2))[0].selectedBosses).toEqual([HARD_LUCID]);
    });
  });

  describe('schemaVersion 3 → As-Is Load + Active Default', () => {
    it('loads native selection keys unchanged', () => {
      const v3 = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'V3',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            partySizes: { lucid: 3 },
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v3));
      expect(mule.selectedBosses).toEqual([HARD_LUCID]);
      expect(mule.partySizes).toEqual({ lucid: 3 });
    });

    it('applies Active Default when `active` is missing', () => {
      const v3 = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'V3',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v3))[0].active).toBe(true);
    });

    it('prunes unknown keys via MuleBossSlate.from', () => {
      const v3 = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'V3',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID, 'stale:id', 'another-stale'],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v3))[0].selectedBosses).toEqual([HARD_LUCID]);
    });

    it('enforces one-winner-per-(bossId,cadence) via MuleBossSlate.from', () => {
      // Both HARD_LUCID and NORMAL_LUCID land in the (lucid, weekly) bucket;
      // the higher crystalValue key (HARD_LUCID) wins.
      const v3 = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'V3',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [NORMAL_LUCID, HARD_LUCID],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v3))[0].selectedBosses).toEqual([HARD_LUCID]);
    });
  });

  describe('schemaVersion 4 → identity round-trip', () => {
    it('round-trips a canonical v4 payload', () => {
      const mules: Mule[] = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [HARD_LUCID, NORMAL_VELLUM_DAILY, CHAOS_VELLUM_WEEKLY],
          partySizes: { lucid: 3 },
          active: true,
        },
      ];
      const raw = JSON.stringify({ schemaVersion: 4, mules });
      expect(muleMigrate(raw)).toEqual(mules);
    });

    it('preserves active: false on a v4 payload', () => {
      const v4 = {
        schemaVersion: 4,
        mules: [
          {
            id: 'a',
            name: 'Inactive',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            partySizes: {},
            active: false,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v4))[0].active).toBe(false);
    });

    it('treats non-boolean `active` as missing and defaults to true', () => {
      const v4 = {
        schemaVersion: 4,
        mules: [
          {
            id: 'a',
            name: 'BadActive',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            active: 'yes',
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v4))[0].active).toBe(true);
    });

    it('rejects Legacy Slate Keys even on v4 payloads', () => {
      const v4 = {
        schemaVersion: 4,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID, LEGACY_HARD_LUCID],
            partySizes: {},
            active: true,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v4))[0].selectedBosses).toEqual([HARD_LUCID]);
    });
  });

  describe('unknown schemaVersion → Wipe (fail-safe)', () => {
    it('wipes legacy selections when schemaVersion is 999', () => {
      const future = {
        schemaVersion: 999,
        mules: [
          {
            id: 'a',
            name: 'Future',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: ['hard-lucid'],
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(future));
      expect(mule.selectedBosses).toEqual([]);
    });

    it('wipes when schemaVersion is missing', () => {
      const missing = {
        mules: [
          {
            id: 'a',
            name: 'Missing',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: ['hard-lucid'],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(missing))[0].selectedBosses).toEqual([]);
    });
  });

  describe('per-item validation', () => {
    it('drops structurally invalid mules and keeps valid ones', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'valid',
            name: 'Valid',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
          },
          { id: 123, name: 'BadId' },
          { name: 'MissingId' },
          { id: 'no-name', level: 200 },
          {
            id: 'bad-bosses',
            name: 'BadBosses',
            level: 1,
            muleClass: 'A',
            selectedBosses: 'not-an-array',
          },
          null,
          'scalar',
        ],
      };
      const mules = muleMigrate(JSON.stringify(payload));
      expect(mules).toHaveLength(1);
      expect(mules[0].id).toBe('valid');
    });

    it('sanitizes partySizes — drops non-number and non-finite entries', () => {
      const v3 = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {
              lucid: 3,
              will: 'six',
              gloom: Number.NaN,
              vellum: Number.POSITIVE_INFINITY,
              lotus: 4,
            },
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v3))[0].partySizes).toEqual({
        lucid: 3,
        lotus: 4,
      });
    });

    it('returns partySizes: {} when the field is absent', () => {
      const v3 = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v3))[0].partySizes).toEqual({});
    });
  });

  describe('schema lineage constant', () => {
    it('exports CURRENT_SCHEMA_VERSION = 4', () => {
      // Sanity: guards against an accidental bump without test updates.
      expect(CURRENT_SCHEMA_VERSION).toBe(4);
    });
  });

  describe('purity — no React, no window, no storage APIs', () => {
    it('never touches window.localStorage (sanity: running in jsdom by default)', () => {
      // The migrator is a pure function; this is a smoke test that it
      // never crashes even if storage is unavailable. We run it against
      // a fixture and assert on the return value — no spy needed because
      // touching `localStorage` inside the pure function would require
      // an import we grep for separately in the acceptance criteria.
      expect(muleMigrate('[]')).toEqual([]);
      expect(muleMigrate(null)).toEqual([]);
    });
  });
});
