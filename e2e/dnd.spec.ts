import { test, expect } from '@playwright/test';
import { seedApp } from './fixtures/seed';

test('can drag a mule card to reorder', async ({ page }) => {
  await seedApp(page, { theme: 'dark', density: 'comfy' });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const alpha = page.locator('[data-mule-card="mule-a"]');
  const beta = page.locator('[data-mule-card="mule-b"]');

  const alphaBox = await alpha.boundingBox();
  const betaBox = await beta.boundingBox();
  if (!alphaBox || !betaBox) throw new Error('card bounding box missing');

  // Drag alpha past beta
  await page.mouse.move(alphaBox.x + alphaBox.width / 2, alphaBox.y + alphaBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(alphaBox.x + 10, alphaBox.y + 10, { steps: 5 });
  await page.mouse.move(betaBox.x + betaBox.width / 2, betaBox.y + betaBox.height / 2, {
    steps: 10,
  });
  await page.mouse.up();

  // After drop, beta should be before alpha in DOM order
  const cards = page.locator('[data-mule-card]');
  const ids = await cards.evaluateAll((els) => els.map((el) => el.getAttribute('data-mule-card')));
  expect(ids.indexOf('mule-b')).toBeLessThan(ids.indexOf('mule-a'));
});
