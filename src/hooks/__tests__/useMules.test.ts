import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMules } from '../useMules'

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

    it('loads valid data from localStorage', () => {
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual(mules)
    })

    it('returns empty array on corrupt JSON when no previous load', () => {
      localStorageStore['maplestory-mule-tracker'] = '{invalid json'
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual([])
    })

    it('drops structurally invalid mules and keeps valid ones', () => {
      const mixed = [
        {
          id: 'valid',
          name: 'Valid',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
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
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mixed)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toHaveLength(1)
      expect(result.current.mules[0].id).toBe('valid')
    })

    it('prunes stale boss IDs from selectedBosses on load', () => {
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid', 'stale-boss-id', 'another-stale'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual(['hard-lucid'])
    })

    it('enforces one-per-family on load', () => {
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['normal-lucid', 'hard-lucid'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules[0].selectedBosses).toEqual(['hard-lucid'])
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
    it('prunes stale boss IDs on update', () => {
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.updateMule('a', {
          selectedBosses: ['hard-lucid', 'stale-boss-id'],
        })
      })
      expect(result.current.mules[0].selectedBosses).toEqual(['hard-lucid'])
    })

    it('enforces one-per-family on update', () => {
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.updateMule('a', {
          selectedBosses: ['normal-lucid', 'hard-lucid'],
        })
      })
      expect(result.current.mules[0].selectedBosses).toEqual(['hard-lucid'])
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
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: [],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.deleteMule('a')
      })
      expect(result.current.mules).toEqual([])
    })
  })

  describe('reorderMules', () => {
    it('reorders mules', () => {
      const mules = [
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
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      act(() => {
        result.current.reorderMules(0, 1)
      })
      expect(result.current.mules.map((m) => m.id)).toEqual(['b', 'a'])
    })
  })

  describe('sessionStorage fallback read-back', () => {
    it('reads mules from sessionStorage when localStorage returns null', () => {
      const mules = [
        {
          id: 'a',
          name: 'Fallback',
          level: 150,
          muleClass: 'Paladin',
          selectedBosses: ['hard-lucid'],
        },
      ]
      sessionStorageStore['maplestory-mule-tracker-fallback'] =
        JSON.stringify(mules)
      const { result } = renderHook(() => useMules())
      expect(result.current.mules).toEqual(mules)
    })

    it('prefers localStorage over sessionStorage when both exist', () => {
      const localStorageMules = [
        {
          id: 'ls',
          name: 'FromLocal',
          level: 100,
          muleClass: 'Hero',
          selectedBosses: [],
        },
      ]
      const sessionStorageMules = [
        {
          id: 'ss',
          name: 'FromSession',
          level: 200,
          muleClass: 'Paladin',
          selectedBosses: [],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] =
        JSON.stringify(localStorageMules)
      sessionStorageStore['maplestory-mule-tracker-fallback'] =
        JSON.stringify(sessionStorageMules)
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
      expect(saved[0].name).toBe('Updated')
    })
  })

  describe('self-healing via useEffect', () => {
    it('self-heals cleaned data through useEffect, not loadMules', () => {
      const mules = [
        {
          id: 'a',
          name: 'Test',
          level: 200,
          muleClass: 'Hero',
          selectedBosses: ['hard-lucid', 'stale-boss-id'],
        },
      ]
      localStorageStore['maplestory-mule-tracker'] = JSON.stringify(mules)
      renderHook(() => useMules())

      const saved = JSON.parse(localStorageStore['maplestory-mule-tracker'])
      expect(saved[0].selectedBosses).toEqual(['hard-lucid'])
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

