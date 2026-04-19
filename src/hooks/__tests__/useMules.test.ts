import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMules } from '../useMules'
import { bosses } from '../../data/bosses'
import { makeKey } from '../../data/bossSelection'

const LUCID_BOSS = bosses.find((b) => b.family === 'lucid')!
const VELLUM_BOSS = bosses.find((b) => b.family === 'vellum')!
const LUCID = LUCID_BOSS.id
const WILL = bosses.find((b) => b.family === 'will')!.id
const VELLUM = VELLUM_BOSS.id
// Slice 2 keys: <uuid>:<tier>:<cadence>. Lucid tiers are all weekly.
const HARD_LUCID = makeKey(LUCID, 'hard', 'weekly')
const NORMAL_LUCID = makeKey(LUCID, 'normal', 'weekly')
const HARD_WILL = makeKey(WILL, 'hard', 'weekly')
// Vellum: Normal is daily, Chaos is weekly.
const NORMAL_VELLUM_DAILY = makeKey(VELLUM, 'normal', 'daily')
const CHAOS_VELLUM_WEEKLY = makeKey(VELLUM, 'chaos', 'weekly')
// Legacy v2 (slice-1B) two-segment keys that should be upgraded on load.
const LEGACY_HARD_LUCID = `${LUCID}:hard`
const LEGACY_NORMAL_VELLUM = `${VELLUM}:normal`
const LEGACY_CHAOS_VELLUM = `${VELLUM}:chaos`

let localStorageStore: Record<string, string> = {}
let sessionStorageStore: Record<string, string> = {}

beforeEach(() => {
  localStorageStore = {}
  sessionStorageStore = {}
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageStore[key]
    }),
    clear: vi.fn(() => {
      localStorageStore = {}
    }),
    get length() {
      return Object.keys(localStorageStore).length
    },
    key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  })
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      sessionStorageStore[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete sessionStorageStore[key]
    }),
    clear: vi.fn(() => {
      sessionStorageStore = {}
    }),
    get length() {
      return Object.keys(sessionStorageStore).length
    },
    key: vi.fn((index: number) => Object.keys(sessionStorageStore)[index] ?? null),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMules', () => {
  describe('loadMules', () => {
    it('returns [] on first-ever load with no data in localStorage', () => {
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual([])
    })

    it('loads valid data (native-key payload) from localStorage', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
            partySizes: {},
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual(payload.mules)
    })

    it('returns empty array on corrupt JSON when no previous load', () => {
      localStorageStore['maplestory-mule-tracker'] = '{invalid json'
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual([])
    })

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
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toHaveLength(1)
      expect(result.current.mules[0].id).toBe('valid')
    })

    it('prunes unknown keys from selectedBosses on load', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID, 'stale:id', 'another-stale'],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })

    it('enforces one-per-family on load', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [NORMAL_LUCID, HARD_LUCID],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })
  })

  describe('legacy payload migration (wipe-on-load)', () => {
    it('clears selectedBosses when legacy prefix is detected (no schemaVersion)', () => {
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid', 'normal-will'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(legacyRoot)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toHaveLength(1)
      expect(result.current.mules[0].selectedBosses).toEqual([])
    })

    it('stamps the current schemaVersion on the persisted payload after migration', () => {
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(legacyRoot)
      renderHook(() => useMules())
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved.schemaVersion).toBe(3)
      expect(saved.mules[0].selectedBosses).toEqual([])
    })

    it('clears selectedBosses when any entry lacks a colon', () => {
      // Malformed/pre-1B id with no colon triggers migration.
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['no-colon-here'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(legacyRoot)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([])
    })

    it('clears partySizes along with selectedBosses during migration', () => {
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
          partySizes: { lucid: 3 },
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(legacyRoot)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].partySizes).toEqual({})
    })

    it('loads a schemaVersion: 3 payload as-is without wiping', () => {
      // A payload already tagged v3 is trusted — the validator still prunes
      // unknown keys but does not wipe the whole selection.
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Trusted',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })

    it('persists as { schemaVersion, mules } shape after first load even with no data', () => {
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.addMule()
      })
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved.schemaVersion).toBe(3)
      expect(Array.isArray(saved.mules)).toBe(true)
    })

    it('a fresh toggle after migration persists as a <uuid>:<tier>:<cadence> key', () => {
      const legacyRoot = [
        {
          id: 'a',
          name: 'Legacy',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(legacyRoot)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.updateMule('a', { selectedBosses: [HARD_WILL] })
      })
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved.schemaVersion).toBe(3)
      expect(saved.mules[0].selectedBosses).toEqual([HARD_WILL])
    })
  })

  describe('v2 → v3 migration (upgrade in place)', () => {
    it('upgrades <uuid>:<tier> keys to <uuid>:<tier>:<cadence> on load', () => {
      const v2Payload = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2User',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_HARD_LUCID],
            partySizes: { lucid: 3 },
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(v2Payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
      // Party sizes survive the upgrade untouched.
      expect(result.current.mules[0].partySizes).toEqual({ lucid: 3 })
    })

    it('upgrades mixed daily + weekly v2 keys on the same boss', () => {
      // Vellum had Normal (daily) and Chaos (weekly) pre-slice-2.
      const v2Payload = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2User',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_NORMAL_VELLUM, LEGACY_CHAOS_VELLUM],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(v2Payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([
        NORMAL_VELLUM_DAILY,
        CHAOS_VELLUM_WEEKLY,
      ])
    })

    it('silently drops v2 entries whose boss is no longer in the dataset', () => {
      const v2Payload = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2User',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_HARD_LUCID, 'unknown-boss-id:hard'],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(v2Payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })

    it('silently drops v2 entries whose tier is not offered for the boss', () => {
      const v2Payload = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2User',
            level: 200,
            muleClass: 'Hero',
            // Lucid does not offer chaos — drop.
            selectedBosses: [LEGACY_HARD_LUCID, `${LUCID}:chaos`],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(v2Payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })

    it('bumps the persisted schemaVersion to 3 after loading a v2 payload', () => {
      const v2Payload = {
        schemaVersion: 2,
        mules: [
          {
            id: 'a',
            name: 'V2User',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [LEGACY_HARD_LUCID],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(v2Payload)
      renderHook(() => useMules())
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved.schemaVersion).toBe(3)
      expect(saved.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })
  })

  describe('saveMules', () => {
    it('writes to localStorage successfully', () => {
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.addMule()
      })
      expect(result.current.mules).toHaveLength(1)
      expect(localStorageStore['maplestory-mule-tracker']).toBeDefined()
    })

    it('falls back to sessionStorage on QuotaExceededError', () => {
      const mockSetItem = vi.fn((key: string) => {
        if (key === 'maplestory-mule-tracker') {
          const error = new DOMException(
            'QuotaExceededError',
            'QuotaExceededError',
          )
          throw error
        }
      })
      vi.spyOn(localStorage, 'setItem').mockImplementation(mockSetItem)

      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.addMule()
      })

      expect(sessionStorageStore['maplestory-mule-tracker-fallback']).toBeDefined()
    })

    it('falls back to in-memory only when both storages fail', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      })
      vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      })

      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.addMule()
      })
      expect(result.current.mules).toHaveLength(1)
    })

    it('never throws to caller', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Unexpected error')
      })
      vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const { result } = renderHook(() => useMules())
      expect(() => {
        act(() => {
          result.current.addMule()
        })
      }).not.toThrow()
    })
  })

  describe('updateMule', () => {
    it('prunes stale keys on update', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.updateMule('a', {
          selectedBosses: [HARD_LUCID, 'stale:id'],
        })
      })
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })

    it('enforces one-per-family on update', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.updateMule('a', {
          selectedBosses: [NORMAL_LUCID, HARD_LUCID],
        })
      })
      expect(result.current.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })
  })

  describe('addMule', () => {
    it('creates a new mule with default values', () => {
      const { result } = renderHook(() => useMules())
      let newId: string | undefined
      act(() => {
        newId = result.current.addMule()
      })
      expect(result.current.mules).toHaveLength(1)
      expect(result.current.mules[0].id).toBe(newId)
      expect(result.current.mules[0].name).toBe('')
      expect(result.current.mules[0].level).toBe(0)
      expect(result.current.mules[0].muleClass).toBe('')
      expect(result.current.mules[0].selectedBosses).toEqual([])
    })
  })

  describe('deleteMule', () => {
    it('removes a mule by id', () => {
      const payload = {
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
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.deleteMule('a')
      })
      expect(result.current.mules).toEqual([])
    })
  })

  describe('reorderMules', () => {
    it('reorders mules', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'A',
            level: 1,
            muleClass: 'A',
            selectedBosses: [],
          },
          {
            id: 'b',
            name: 'B',
            level: 2,
            muleClass: 'B',
            selectedBosses: [],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.reorderMules(0, 1)
      })
      expect(result.current.mules.map((m) => m.id)).toEqual(['b', 'a'])
    })
  })

  describe('sessionStorage fallback read-back', () => {
    it('reads mules from sessionStorage when localStorage returns null', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Fallback',
            level: 150,
            muleClass: 'Paladin',
            selectedBosses: [HARD_LUCID],
            partySizes: {},
          },
        ],
      }
      sessionStorageStore['maplestory-mule-tracker-fallback'] = JSON.stringify(payload)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual(payload.mules)
    })

    it('prefers localStorage over sessionStorage when both exist', () => {
      const localStorageMules = {
        schemaVersion: 3,
        mules: [
          {
            id: 'ls',
            name: 'FromLocal',
            level: 100,
            muleClass: 'Hero',
            selectedBosses: [],
          },
        ],
      }
      const sessionStorageMules = {
        schemaVersion: 3,
        mules: [
          {
            id: 'ss',
            name: 'FromSession',
            level: 200,
            muleClass: 'Paladin',
            selectedBosses: [],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(localStorageMules)
      sessionStorageStore['maplestory-mule-tracker-fallback'] = JSON.stringify(sessionStorageMules)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].id).toBe('ls')
    })
  })

  describe('retry-on-write', () => {
    it('recovers from transient localStorage failure on subsequent writes', () => {
      let callCount = 0
      vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
        callCount++
        if (key === 'maplestory-mule-tracker' && callCount === 1) {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError')
        }
        localStorageStore[key] = value
      })

      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.addMule()
      })
      expect(sessionStorageStore['maplestory-mule-tracker-fallback']).toBeDefined()

      act(() => {
        result.current.updateMule(result.current.mules[0].id, { name: 'Updated' })
      })
      expect(localStorageStore['maplestory-mule-tracker']).toBeDefined()
      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved.mules[0].name).toBe('Updated')
    })
  })

  describe('self-healing via useEffect', () => {
    it('self-heals cleaned data through useEffect, not loadMules', () => {
      const payload = {
        schemaVersion: 3,
        mules: [
          {
            id: 'a',
            name: 'Test',
            level: 200,
            muleClass: 'Hero',
            selectedBosses: [HARD_LUCID, 'stale:id'],
          },
        ],
      }
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(payload)
      renderHook(() => useMules())

      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved.mules[0].selectedBosses).toEqual([HARD_LUCID])
    })
  })

  describe('outward API unchanged', () => {
    it('returns { mules, addMule, updateMule, deleteMule, reorderMules }', () => {
      const { result } = renderHook(() => useMules())
      const keys = Object.keys(result.current).sort()
      expect(keys).toEqual(
        ['addMule', 'deleteMule', 'mules', 'reorderMules', 'updateMule'],
      )
    })

    it('does not export validateMule or cleanSelectedBosses', () => {
      const { result } = renderHook(() => useMules())
      expect('validateMule' in result.current).toBe(false)
      expect('cleanSelectedBosses' in result.current).toBe(false)
    })
  })
})
