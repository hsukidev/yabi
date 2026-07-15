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
    it('exports CURRENT_SCHEMA_VERSION = 8', () => {
      // Sanity: guards against an accidental bump without test updates.
      expect(CURRENT_SCHEMA_VERSION).toBe(8);
    });
  });

  describe('schemaVersion 5 → identity round-trip', () => {
    it('round-trips a canonical v5 payload with avatarUrl', () => {
      const mules: Mule[] = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [HARD_LUCID],
          partySizes: {},
          active: true,
          avatarUrl: 'https://msavatar1.nexon.net/Character/example.png',
        },
      ];
      const raw = JSON.stringify({ schemaVersion: 5, mules });
      expect(muleMigrate(raw)).toEqual(mules);
    });

    it('omits avatarUrl when absent on a v5 payload', () => {
      const v5 = {
        schemaVersion: 5,
        mules: [
          {
            id: 'a',
            name: 'NoAvatar',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            partySizes: {},
            active: true,
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v5));
      expect(mule.avatarUrl).toBeUndefined();
    });

    it('drops a non-string avatarUrl', () => {
      const v5 = {
        schemaVersion: 5,
        mules: [
          {
            id: 'a',
            name: 'BadAvatar',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            avatarUrl: 42,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v5))[0].avatarUrl).toBeUndefined();
    });

    it('drops an empty-string avatarUrl', () => {
      const v5 = {
        schemaVersion: 5,
        mules: [
          {
            id: 'a',
            name: 'EmptyAvatar',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            avatarUrl: '',
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v5))[0].avatarUrl).toBeUndefined();
    });
  });

  describe('schemaVersion 6 → As-Is Load', () => {
    it('loads a v5 payload (no notes key) with notes undefined', () => {
      const v5 = {
        schemaVersion: 5,
        mules: [
          {
            id: 'a',
            name: 'Legacy v5',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v5))[0].notes).toBeUndefined();
    });

    it('omits a whitespace-only notes on a v6 payload', () => {
      const v6 = {
        schemaVersion: 6,
        mules: [
          {
            id: 'a',
            name: 'WhitespaceNotes',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            notes: '   \n\t ',
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v6))[0].notes).toBeUndefined();
    });

    it('omits an empty-string notes on a v6 payload', () => {
      const v6 = {
        schemaVersion: 6,
        mules: [
          {
            id: 'a',
            name: 'EmptyNotes',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            notes: '',
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v6))[0].notes).toBeUndefined();
    });

    it('omits a non-string notes on a v6 payload', () => {
      const v6 = {
        schemaVersion: 6,
        mules: [
          {
            id: 'a',
            name: 'BadNotes',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            notes: 42,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v6))[0].notes).toBeUndefined();
    });

    it('round-trips a canonical v6 payload (no notes)', () => {
      const mules: Mule[] = [
        {
          id: 'a',
          name: 'V6',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [HARD_LUCID],
          partySizes: {},
          active: true,
        },
      ];
      const raw = JSON.stringify({ schemaVersion: 6, mules });
      expect(muleMigrate(raw)).toEqual(mules);
    });

    it('round-trips notes on a v6 payload', () => {
      const mules: Mule[] = [
        {
          id: 'a',
          name: 'V6',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [HARD_LUCID],
          partySizes: {},
          active: true,
          notes: 'main mule, owes legion levels',
        },
      ];
      const raw = JSON.stringify({ schemaVersion: 6, mules });
      const [mule] = muleMigrate(raw);
      expect(mule.notes).toBe('main mule, owes legion levels');
    });

    it('treats v6 as asIs (mixed legacy + native keys → prune, not wipe)', () => {
      // Distinguishes asIs from the wipe-mode fallback: under wipe, ANY
      // legacy id triggers a full wipe of selectedBosses + partySizes.
      // Under asIs, the legacy id drops silently and the native key
      // survives (matches the v4 contract at line 299-315).
      const v6 = {
        schemaVersion: 6,
        mules: [
          {
            id: 'a',
            name: 'V6',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID, 'hard-lucid'],
            partySizes: { lucid: 3 },
            active: true,
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v6));
      expect(mule.selectedBosses).toEqual([HARD_LUCID]);
      // partySizes survive — they only get wiped under wipe mode.
      expect(mule.partySizes).toEqual({ lucid: 3 });
    });
  });

  describe('schemaVersion 7 → Clear Mark fields', () => {
    it('loads a v6 payload (no mark keys) with all marks undefined', () => {
      const v6 = {
        schemaVersion: 6,
        mules: [
          {
            id: 'a',
            name: 'Legacy v6',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v6));
      expect(mule.dailyClearMark).toBeUndefined();
      expect(mule.weeklyClearMark).toBeUndefined();
      expect(mule.bmClearMark).toBeUndefined();
    });

    it('round-trips valid daily / weekly / BM Clear Marks on a v7 payload', () => {
      const mules: Mule[] = [
        {
          id: 'a',
          name: 'Marked',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [HARD_LUCID],
          partySizes: {},
          active: true,
          dailyClearMark: '2026-07-11',
          weeklyClearMark: Date.UTC(2026, 6, 9), // Thursday 2026-07-09 00:00 UTC
          bmClearMark: '2026-07',
        },
      ];
      const raw = JSON.stringify({ schemaVersion: 7, mules });
      expect(muleMigrate(raw)).toEqual(mules);
    });

    it('sanitizes a malformed dailyClearMark (non-string / empty) to undefined', () => {
      const v7 = {
        schemaVersion: 7,
        mules: [
          {
            id: 'a',
            name: 'BadDaily',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            dailyClearMark: 20260711,
          },
          {
            id: 'b',
            name: 'EmptyDaily',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            dailyClearMark: '',
          },
        ],
      };
      const [a, b] = muleMigrate(JSON.stringify(v7));
      expect(a.dailyClearMark).toBeUndefined();
      expect(b.dailyClearMark).toBeUndefined();
    });

    it('sanitizes a malformed weeklyClearMark (non-number / non-finite) to undefined', () => {
      const v7 = {
        schemaVersion: 7,
        mules: [
          {
            id: 'a',
            name: 'StringWeekly',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            weeklyClearMark: '2026-07-09',
          },
          {
            id: 'b',
            name: 'NaNWeekly',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            weeklyClearMark: Number.NaN,
          },
        ],
      };
      const [a, b] = muleMigrate(JSON.stringify(v7));
      expect(a.weeklyClearMark).toBeUndefined();
      expect(b.weeklyClearMark).toBeUndefined();
    });

    it('sanitizes a malformed bmClearMark (non-string / empty) to undefined', () => {
      const v7 = {
        schemaVersion: 7,
        mules: [
          {
            id: 'a',
            name: 'BadBm',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            bmClearMark: { month: '2026-07' },
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v7))[0].bmClearMark).toBeUndefined();
    });

    it('preserves a well-typed but stale stamp (validity is derived, not swept)', () => {
      // A far-past daily stamp survives migration untouched; it is simply
      // inert until compared against the current cycle at read time.
      const v7 = {
        schemaVersion: 7,
        mules: [
          {
            id: 'a',
            name: 'Stale',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            dailyClearMark: '2001-01-01',
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v7))[0].dailyClearMark).toBe('2001-01-01');
    });
  });

  describe('schemaVersion 4 → As-Is Load (legacy mules continue to load)', () => {
    it('loads a v4 payload unchanged with avatarUrl undefined', () => {
      const v4 = {
        schemaVersion: 4,
        mules: [
          {
            id: 'a',
            name: 'Legacy v4',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            partySizes: {},
            active: true,
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v4));
      expect(mule.name).toBe('Legacy v4');
      expect(mule.avatarUrl).toBeUndefined();
    });
  });

  describe('schemaVersion 8 → Combat Power field', () => {
    it('loads a v7 payload (no combatPower key) with combatPower undefined', () => {
      const v7 = {
        schemaVersion: 7,
        mules: [
          {
            id: 'a',
            name: 'Legacy v7',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v7))[0].combatPower).toBeUndefined();
    });

    it('round-trips a positive integer combatPower on a v8 payload', () => {
      const mules: Mule[] = [
        {
          id: 'a',
          name: 'CP',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [HARD_LUCID],
          partySizes: {},
          active: true,
          combatPower: 410042525,
        },
      ];
      const raw = JSON.stringify({ schemaVersion: 8, mules });
      expect(muleMigrate(raw)).toEqual(mules);
    });

    it('floors a hand-edited fractional combatPower on read', () => {
      const v8 = {
        schemaVersion: 8,
        mules: [
          {
            id: 'a',
            name: 'Fractional',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            combatPower: 410042525.9,
          },
        ],
      };
      expect(muleMigrate(JSON.stringify(v8))[0].combatPower).toBe(410042525);
    });

    it('drops a non-numeric combatPower to undefined', () => {
      const v8 = {
        schemaVersion: 8,
        mules: [
          {
            id: 'a',
            name: 'StringCp',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            combatPower: '410042525',
          },
          {
            id: 'b',
            name: 'NaNCp',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            combatPower: Number.NaN,
          },
        ],
      };
      const [a, b] = muleMigrate(JSON.stringify(v8));
      expect(a.combatPower).toBeUndefined();
      expect(b.combatPower).toBeUndefined();
    });

    it('drops a combatPower of 0 (0 ≡ unset)', () => {
      const v8 = {
        schemaVersion: 8,
        mules: [
          {
            id: 'a',
            name: 'ZeroCp',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            combatPower: 0,
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v8));
      expect(mule.combatPower).toBeUndefined();
      expect('combatPower' in mule).toBe(false);
    });

    it('drops a negative combatPower (floors below 1)', () => {
      const v8 = {
        schemaVersion: 8,
        mules: [
          {
            id: 'a',
            name: 'NegCp',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            combatPower: -5,
          },
          {
            id: 'b',
            name: 'SubOneCp',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [],
            partySizes: {},
            active: true,
            combatPower: 0.6,
          },
        ],
      };
      const [a, b] = muleMigrate(JSON.stringify(v8));
      expect(a.combatPower).toBeUndefined();
      expect(b.combatPower).toBeUndefined();
    });

    it('treats v8 as asIs (mixed legacy + native keys → prune, not wipe)', () => {
      const v8 = {
        schemaVersion: 8,
        mules: [
          {
            id: 'a',
            name: 'V8',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID, 'hard-lucid'],
            partySizes: { lucid: 3 },
            active: true,
            combatPower: 12345,
          },
        ],
      };
      const [mule] = muleMigrate(JSON.stringify(v8));
      expect(mule.selectedBosses).toEqual([HARD_LUCID]);
      expect(mule.partySizes).toEqual({ lucid: 3 });
      expect(mule.combatPower).toBe(12345);
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
