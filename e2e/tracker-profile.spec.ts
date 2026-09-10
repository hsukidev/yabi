import { test, expect, type Page } from '@playwright/test';
import LZString from 'lz-string';
import { seedApp } from './fixtures/seed';

const FULL_APP_DESTINATIONS = [
  ['mapleranks', 'heroic-kronos', 'cards', 'comfy', 'https://mapleranks.com/u/S%C3%BAki%2FDen'],
  ['mapleranks', 'heroic-solis', 'list', 'compact', 'https://mapleranks.com/u/eu/S%C3%BAki%2FDen'],
  [
    'maplebot',
    'heroic-hyperion',
    'cards',
    'compact',
    'https://maplebot.io/character/S%C3%BAki%2FDen?region=NA',
  ],
  [
    'maplebot',
    'interactive-luna',
    'list',
    'comfy',
    'https://maplebot.io/character/S%C3%BAki%2FDen?region=EU',
  ],
  [
    'maplehub',
    'interactive-scania',
    'cards',
    'comfy',
    'https://maplehub.app/roster/na/S%C3%BAki%2FDen',
  ],
  ['maplehub', 'heroic-solis', 'list', 'compact', 'https://maplehub.app/roster/eu/S%C3%BAki%2FDen'],
  [
    'maplehub',
    'interactive-bera',
    'cards',
    'compact',
    'https://maplehub.app/roster/na/S%C3%BAki%2FDen',
  ],
] as const;

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

async function addSecondNamedMule(page: Page, worldId: string) {
  await page.addInitScript(
    ({ worldId }) => {
      const mules = JSON.parse(localStorage.getItem('maplestory-mule-tracker') ?? '[]');
      mules.push({
        id: 'second-mule',
        name: 'Second',
        level: 275,
        muleClass: 'Hero',
        worldId,
        selectedBosses: [],
        active: true,
      });
      localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules));
    },
    { worldId },
  );
}

async function openTrackerPreference(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: /Tracker Preference/ }).click();
  return page.getByRole('dialog', { name: 'Tracker Preference' });
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

for (const [tracker, worldId, display, density, destination] of FULL_APP_DESTINATIONS) {
  test(`${tracker} routes ${worldId} in ${display}/${density}`, async ({ page }) => {
    await seedNamedMule(page, worldId);
    await page.addInitScript(
      ({ tracker, display, density }) => {
        localStorage.setItem('trackerPreference', tracker);
        localStorage.setItem('display', display);
        localStorage.setItem('density', density);
      },
      { tracker, display, density },
    );
    await page.goto('/');

    await expect(page.getByRole('link', { name: /opens in a new tab/i })).toHaveAttribute(
      'href',
      destination,
    );
  });
}

test('World switching keeps the preference and derives each visible Mule Region', async ({
  page,
}) => {
  await seedNamedMule(page, 'heroic-kronos');
  await page.addInitScript(() => {
    localStorage.setItem('trackerPreference', 'maplebot');
    localStorage.setItem(
      'maplestory-mule-tracker',
      JSON.stringify([
        {
          id: 'na-mule',
          name: 'North',
          level: 275,
          muleClass: 'Hero',
          worldId: 'heroic-kronos',
          selectedBosses: [],
          active: true,
        },
        {
          id: 'eu-mule',
          name: 'Europe',
          level: 275,
          muleClass: 'Hero',
          worldId: 'heroic-solis',
          selectedBosses: [],
          active: true,
        },
      ]),
    );
  });
  await page.goto('/');

  await expect(page.getByRole('link', { name: /View North on MapleBot/ })).toHaveAttribute(
    'href',
    'https://maplebot.io/character/North?region=NA',
  );
  await page.locator('[data-slot="world-select-trigger"]').click();
  await page.getByRole('option', { name: 'Solis' }).click();
  await expect(page.getByRole('link', { name: /View Europe on MapleBot/ })).toHaveAttribute(
    'href',
    'https://maplebot.io/character/Europe?region=EU',
  );
});

test('blank names and Bulk Select Mode suppress all Tracker Profile Links', async ({ page }) => {
  await seedNamedMule(page, 'heroic-kronos');
  await page.addInitScript(() => {
    const mules = JSON.parse(localStorage.getItem('maplestory-mule-tracker') ?? '[]');
    mules.push({
      id: 'blank-mule',
      name: '   ',
      level: 275,
      muleClass: 'Hero',
      worldId: 'heroic-kronos',
      selectedBosses: [],
      active: true,
    });
    localStorage.setItem('maplestory-mule-tracker', JSON.stringify(mules));
  });
  await page.goto('/');

  await expect(page.getByRole('link', { name: /opens in a new tab/i })).toHaveCount(1);
  await page.getByRole('button', { name: /enter bulk select mode/i }).click();
  await expect(page.getByRole('link', { name: /opens in a new tab/i })).toHaveCount(0);
});

test('live preference changes reach Card and List Views in both densities', async ({ page }) => {
  await seedNamedMule(page, 'heroic-solis');
  await page.goto('/');

  const cases = [
    {
      display: 'cards',
      density: 'comfy',
      tracker: 'MapleBot',
      href: 'https://maplebot.io/character/S%C3%BAki%2FDen?region=EU',
    },
    {
      display: 'list',
      density: 'comfy',
      tracker: 'MapleHub',
      href: 'https://maplehub.app/roster/eu/S%C3%BAki%2FDen',
    },
    {
      display: 'cards',
      density: 'compact',
      tracker: 'MapleRanks',
      href: 'https://mapleranks.com/u/eu/S%C3%BAki%2FDen',
    },
    {
      display: 'list',
      density: 'compact',
      tracker: 'MapleBot',
      href: 'https://maplebot.io/character/S%C3%BAki%2FDen?region=EU',
    },
  ] as const;

  for (const testCase of cases) {
    await page.evaluate(({ display, density }) => {
      localStorage.setItem('display', display);
      localStorage.setItem('density', density);
    }, testCase);
    await page.reload();

    const dialog = await openTrackerPreference(page);
    await dialog.getByRole('radio', { name: new RegExp(testCase.tracker) }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(
      page.getByRole('link', { name: new RegExp(`on ${testCase.tracker}`) }),
    ).toHaveAttribute('href', testCase.href);
  }
});

test('User Data export and import preserve the receiving browser Tracker Preference', async ({
  page,
}) => {
  await seedNamedMule(page, 'heroic-kronos');
  await page.addInitScript(() => localStorage.setItem('trackerPreference', 'maplehub'));
  await page.goto('/');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: /Data Management/ }).click();
  await page.getByRole('button', { name: /Export Data/ }).click();
  const transferCode = await page.getByRole('textbox').inputValue();
  const envelope = JSON.parse(LZString.decompressFromEncodedURIComponent(transferCode) ?? '{}');
  expect(envelope.data.trackerPreference).toBeUndefined();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: /Data Management/ }).click();
  await page.getByRole('button', { name: /Import Data/ }).click();
  await page.getByRole('textbox').fill(transferCode);
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByRole('button', { name: 'Replace and reload' }).click();
  await page.waitForLoadState();

  expect(await page.evaluate(() => localStorage.getItem('trackerPreference'))).toBe('maplehub');
  await expect(page.getByRole('link', { name: /on MapleHub/ })).toHaveAttribute(
    'href',
    'https://maplehub.app/roster/na/S%C3%BAki%2FDen',
  );
});

test('keyboard and modified-click activation preserve native tabs without roster side effects', async ({
  page,
  context,
}) => {
  await seedNamedMule(page, 'heroic-kronos');
  await addSecondNamedMule(page, 'heroic-kronos');
  await context.route('https://mapleranks.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>MapleRanks test</title>',
    }),
  );
  await page.goto('/');
  const link = page.getByRole('link', { name: /View Súki\/Den.*opens in a new tab/i });
  const cards = page.locator('[data-mule-card]');
  await expect(cards).toHaveCount(2);
  const originalOrder = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-mule-card')),
  );

  for (const activate of [
    () => link.press('Enter'),
    () => link.click({ modifiers: ['Control'] }),
  ]) {
    const popupPromise = context.waitForEvent('page');
    await activate();
    const popup = await popupPromise;
    await popup.waitForURL('https://mapleranks.com/**');
    expect(popup.url()).toBe('https://mapleranks.com/u/S%C3%BAki%2FDen');
    await popup.close();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(
      await cards.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-mule-card')),
      ),
    ).toEqual(originalOrder);
  }
});

test.describe('touch Tracker Profile Link activation', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('changes Tracker Preference in the narrow-phone dialog', async ({ page }) => {
    await seedNamedMule(page, 'interactive-luna');
    await page.goto('/');

    await page.getByRole('button', { name: 'Settings' }).tap();
    await page.getByRole('menuitem', { name: /Tracker Preference/ }).tap();
    const dialog = page.getByRole('dialog', { name: 'Tracker Preference' });
    const radios = dialog.getByRole('radio');
    const mapleRanks = dialog.getByRole('radio', { name: /MapleRanks.*mapleranks\.com/ });
    const mapleBot = dialog.getByRole('radio', { name: /MapleBot.*maplebot\.io/ });
    const mapleHub = dialog.getByRole('radio', { name: /MapleHub.*maplehub\.app/ });

    await expect(dialog).toBeVisible();
    await expect(radios).toHaveCount(3);
    await expect(mapleRanks).toBeChecked();
    await expect(mapleBot).not.toBeChecked();
    await expect(mapleHub).not.toBeChecked();
    await mapleHub.tap();
    await expect(dialog).toBeVisible();
    await expect(mapleRanks).not.toBeChecked();
    await expect(mapleBot).not.toBeChecked();
    await expect(mapleHub).toBeChecked();
    await expect(mapleHub).toBeFocused();
    const updatedLink = page.locator('[data-mule-card="profile-mule"] a');
    await expect(updatedLink).toHaveAttribute(
      'href',
      'https://maplehub.app/roster/eu/S%C3%BAki%2FDen',
    );

    await dialog.getByRole('button', { name: 'Close' }).tap();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('link', { name: /View Súki\/Den on MapleHub/ })).toBeVisible();
  });

  test('opens one intercepted tab without opening the Drawer or reordering', async ({
    page,
    context,
  }) => {
    await seedNamedMule(page, 'interactive-luna');
    await addSecondNamedMule(page, 'interactive-luna');
    await context.route('https://mapleranks.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>MapleRanks test</title>',
      }),
    );
    await page.goto('/');
    const link = page.getByRole('link', { name: /View Súki\/Den.*opens in a new tab/i });
    const cards = page.locator('[data-mule-card]');
    await expect(cards).toHaveCount(2);
    const originalOrder = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-mule-card')),
    );

    const popupPromise = context.waitForEvent('page');
    await link.tap();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe('https://mapleranks.com/u/eu/S%C3%BAki%2FDen');
    await popup.close();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(
      await cards.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-mule-card')),
      ),
    ).toEqual(originalOrder);
  });
});
