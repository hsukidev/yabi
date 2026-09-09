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

test('Tracker Preference updates every link immediately and persists across reload', async ({
  page,
  context,
}) => {
  await seedNamedMule(page, 'heroic-solis');
  await context.route('https://maplehub.app/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>MapleHub test</title>' }),
  );
  await page.goto('/');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: /Tracker Preference/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Tracker Preference' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('radio')).toHaveCount(3);
  await expect(dialog.getByRole('radio', { name: /MapleRanks.*mapleranks\.com/ })).toBeChecked();

  const mapleRanks = dialog.getByRole('radio', { name: /MapleRanks/ });
  await mapleRanks.focus();
  await mapleRanks.press('End');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('radio', { name: /MapleHub.*maplehub\.app/ })).toBeChecked();
  await dialog.getByRole('button', { name: 'Close' }).click();

  const cardLink = page
    .locator('[data-mule-card="profile-mule"]')
    .getByRole('link', { name: /View Súki\/Den on MapleHub.*new tab/i });
  await expect(cardLink).toHaveAttribute('href', 'https://maplehub.app/roster/eu/S%C3%BAki%2FDen');

  const popupPromise = context.waitForEvent('page');
  await cardLink.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe('https://maplehub.app/roster/eu/S%C3%BAki%2FDen');
  await popup.close();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole('link', { name: /View Súki\/Den on MapleHub.*new tab/i }),
  ).toHaveAttribute('href', 'https://maplehub.app/roster/eu/S%C3%BAki%2FDen');

  await page
    .getByRole('button', { name: /switch to list view/i })
    .first()
    .click();
  await expect(
    page.getByTestId('mule-row-profile-mule').getByRole('link', { name: /MapleHub/ }),
  ).toHaveAttribute('href', 'https://maplehub.app/roster/eu/S%C3%BAki%2FDen');
});

test('an unrecognized saved preference falls back to MapleRanks', async ({ page }) => {
  await seedNamedMule(page, 'heroic-kronos');
  await page.addInitScript(() => localStorage.setItem('trackerPreference', 'unknown-site'));
  await page.goto('/');
  await expect(page.getByRole('link', { name: /MapleRanks/ })).toHaveAttribute(
    'href',
    'https://mapleranks.com/u/S%C3%BAki%2FDen',
  );
});
