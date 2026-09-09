import { test, expect } from '@playwright/test';
import { seedApp } from './fixtures/seed';

async function seedNamedMule(page: Parameters<typeof seedApp>[0], worldId: string) {
  await seedApp(page, { theme: 'dark', density: 'comfy' });
  await page.addInitScript(
    ({ worldId }) => {
      localStorage.setItem('world', worldId);
      localStorage.setItem(
        'maplestory-mule-tracker',
        JSON.stringify([
          {
            id: 'profile-mule',
            name: 'Súki/Den',
            level: 0,
            muleClass: 'Hero',
            worldId,
            selectedBosses: [],
            active: false,
          },
        ]),
      );
    },
    { worldId },
  );
}

test('regional MapleRanks link keeps card activation and drag isolated', async ({ page }) => {
  await seedNamedMule(page, 'heroic-solis');
  await page.goto('/');

  const card = page.locator('[data-mule-card="profile-mule"]');
  const link = card.getByRole('link', { name: /view Súki\/Den on MapleRanks.*new tab/i });
  await expect(link).toHaveAttribute('href', 'https://mapleranks.com/u/eu/S%C3%BAki%2FDen');
  await expect(card.locator('[data-card-actions]')).toContainText('');
  await link.focus();
  await expect(page.getByText('View on MapleRanks')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('phone List View keeps a badge-less Tracker Profile Link visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedNamedMule(page, 'interactive-luna');
  await page.goto('/');
  await page
    .getByRole('button', { name: /switch to list view/i })
    .first()
    .click();

  const row = page.getByTestId('mule-row-profile-mule');
  await expect(row.locator('[data-row-level]')).toHaveCount(0);
  await expect(row.getByRole('link', { name: /MapleRanks/ })).toBeVisible();
});
