import { describe, expect, it } from 'vitest'
import { selectBoss } from '../selectBoss'

describe('selectBoss', () => {
  it('adds boss to empty selection', () => {
    expect(selectBoss([], 'hard-lucid', 'lucid')).toEqual(['hard-lucid'])
  })

  it('auto-replaces when selecting a boss in same family', () => {
    expect(selectBoss(['normal-lucid'], 'hard-lucid', 'lucid')).toEqual(['hard-lucid'])
  })

  it('toggles off (deselects) when selecting the same boss', () => {
    expect(selectBoss(['hard-lucid'], 'hard-lucid', 'lucid')).toEqual([])
  })

  it('adds to different family without conflict', () => {
    expect(selectBoss(['hard-lucid'], 'hard-will', 'will')).toEqual(['hard-lucid', 'hard-will'])
  })

  it('replaces in same family while keeping other families', () => {
    expect(selectBoss(['normal-will', 'hard-lucid'], 'hard-will', 'will')).toEqual(['hard-will', 'hard-lucid'])
  })
})