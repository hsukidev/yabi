import { describe, expect, it } from 'vitest'
import { sanitizeMuleName } from '../muleName'

describe('sanitizeMuleName', () => {
  it('passes letters through unchanged', () => {
    expect(sanitizeMuleName('Hero')).toBe('Hero')
  })

  it('strips digits', () => {
    expect(sanitizeMuleName('Hero1')).toBe('Hero')
  })

  it('strips symbols and whitespace', () => {
    expect(sanitizeMuleName('He-ro! ')).toBe('Hero')
  })

  it('caps at 12 characters', () => {
    expect(sanitizeMuleName('Abcdefghijklmn')).toBe('Abcdefghijkl')
  })

  it('strips non-letters before applying the cap', () => {
    expect(sanitizeMuleName('H1ero@WorldTooLong')).toBe('HeroWorldToo')
  })
})
