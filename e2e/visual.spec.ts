import { test, expect } from '@playwright/test'
import { seedApp } from './fixtures/seed'

const COMBOS = [
  { theme: 'dark', density: 'comfy' },
  { theme: 'dark', density: 'compact' },
  { theme: 'light', density: 'comfy' },
  { theme: 'light', density: 'compact' },
] as const

for (const combo of COMBOS) {
  test(`renders correctly: ${combo.theme}/${combo.density}`, async ({ page }) => {
    await seedApp(page, combo)
    await page.goto('/')
    // Wait for fonts and layout to settle
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot(`app-${combo.theme}-${combo.density}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    })
  })
}
