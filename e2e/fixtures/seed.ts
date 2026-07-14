import type { Page } from '@playwright/test';

// Every seeded Mule needs a Mule World Id matching the Selected World — the
// World Lens hides mules whose worldId differs from the 'world' localStorage
// key, so without both the roster renders empty and every roster-dependent
// spec times out.
export const SEED_WORLD_ID = 'heroic-kronos';

export const SEED_MULES = [
  {
    id: 'mule-a',
    name: 'Alpha',
    level: 275,
    muleClass: 'Bishop',
    worldId: SEED_WORLD_ID,
    selectedBosses: ['hard-lucid', 'normal-damien'],
  },
  {
    id: 'mule-b',
    name: 'Beta',
    level: 260,
    muleClass: 'Night Lord',
    worldId: SEED_WORLD_ID,
    selectedBosses: ['chaos-papulatus'],
  },
  {
    id: 'mule-c',
    name: 'Gamma',
    level: 245,
    muleClass: 'Shadower',
    worldId: SEED_WORLD_ID,
    selectedBosses: [],
  },
];

export async function seedApp(
  page: Page,
  opts: { theme: 'dark' | 'light'; density: 'comfy' | 'compact' },
) {
  await page.addInitScript(
    ({ theme, density, mules, world }) => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('density', density);
      localStorage.setItem('world', world);
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules));
    },
    { ...opts, mules: SEED_MULES, world: SEED_WORLD_ID },
  );
}
