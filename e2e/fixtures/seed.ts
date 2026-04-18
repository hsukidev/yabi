import type { Page } from '@playwright/test'

export const SEED_MULES = [
  { id: 'mule-a', name: 'Alpha', level: 275, muleClass: 'Bishop', selectedBosses: ['hard-lucid', 'normal-damien'] },
  { id: 'mule-b', name: 'Beta', level: 260, muleClass: 'Night Lord', selectedBosses: ['chaos-papulatus'] },
  { id: 'mule-c', name: 'Gamma', level: 245, muleClass: 'Shadower', selectedBosses: [] },
]

export async function seedApp(
  page: Page,
  opts: { theme: 'dark' | 'light'; density: 'comfy' | 'compact' },
) {
  await page.addInitScript(
    ({ theme, density, mules }) => {
      localStorage.setItem('theme', theme)
      localStorage.setItem('density', density)
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules))
    },
    { ...opts, mules: SEED_MULES },
  )
}
