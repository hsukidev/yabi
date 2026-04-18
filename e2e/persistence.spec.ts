import { test, expect } from '@playwright/test'
import { seedApp } from './fixtures/seed'

test('theme and density persist across reload', async ({ page }) => {
  await seedApp(page, { theme: 'light', density: 'compact' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  await expect(page.locator('body')).toHaveClass(/light/)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  await expect(page.locator('body')).toHaveClass(/light/)
})

test('toggling density updates data-density attribute live', async ({ page }) => {
  await seedApp(page, { theme: 'dark', density: 'comfy' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-density', 'comfy')

  await page.getByRole('radio', { name: /compact/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
})
