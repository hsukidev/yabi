import { describe, expect, it } from 'vitest'
import { darkCharcoalTheme } from '../theme'

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const digits = hex.replace('#', '')
  return {
    r: parseInt(digits.substring(0, 2), 16),
    g: parseInt(digits.substring(2, 4), 16),
    b: parseInt(digits.substring(4, 6), 16),
  }
}

describe('darkCharcoalTheme', () => {
  describe('dark color scale', () => {
    it('has exactly 10 shades in colors.dark', () => {
      const dark = darkCharcoalTheme.colors?.dark
      expect(dark).toHaveLength(10)
    })

    it('uses hex values in the #161616–#252525 range', () => {
      const dark = darkCharcoalTheme.colors?.dark ?? []
      for (const shade of dark) {
        const { r, g, b } = parseHexColor(shade)
        expect(r).toBeGreaterThanOrEqual(0x16)
        expect(r).toBeLessThanOrEqual(0x25)
        expect(g).toBeGreaterThanOrEqual(0x16)
        expect(g).toBeLessThanOrEqual(0x25)
        expect(b).toBeGreaterThanOrEqual(0x16)
        expect(b).toBeLessThanOrEqual(0x25)
      }
    })

    it('starts with lighter shades and ends with darker shades', () => {
      const dark = darkCharcoalTheme.colors?.dark ?? []
      const { r: firstR, g: firstG, b: firstB } = parseHexColor(dark.at(0)!)
      const { r: lastR, g: lastG, b: lastB } = parseHexColor(dark.at(9)!)
      const firstValue = (firstR << 16) | (firstG << 8) | firstB
      const lastValue = (lastR << 16) | (lastG << 8) | lastB
      expect(firstValue).toBeGreaterThan(lastValue)
    })
  })

  describe('light mode preservation', () => {
    it('does not override primaryColor', () => {
      expect(darkCharcoalTheme.primaryColor).toBeUndefined()
    })
  })
})