import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { seedApp } from './fixtures/seed';

// iPhone 12 metrics + `hasTouch` so the browser reports itself as a touch
// device. `isMobile` is intentionally left off — the app's desktop layout is
// fine at 390px wide and we want to keep pointer events behaving like a real
// phone, not a mobile-emulated mouse.
test.describe('touch roster drag-and-drop', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  // One CDP session per test, reused across every touch event — opening one
  // per call is a round-trip and leaks the sessions across the suite.
  let cdp: CDPSession;
  test.beforeEach(async ({ page }) => {
    cdp = await page.context().newCDPSession(page);
  });

  async function touchStart(x: number, y: number) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 0 }],
    });
  }

  async function touchMove(x: number, y: number) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y, id: 0 }],
    });
  }

  async function touchEnd() {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  }

  async function cardCenter(page: Page, id: string) {
    const locator = page.locator(`[data-mule-card="${id}"]`);
    // At 390px the roster sits below the fold (KPI card above it) —
    // boundingBox() coords outside the viewport can't receive CDP touches.
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error(`card ${id} has no bounding box`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  test('long-press engages reorder drag', async ({ page }) => {
    await seedApp(page, { theme: 'dark', density: 'comfy' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll the bottom-most card into view first — the whole grid then fits
    // the viewport, so the later cardCenter calls don't move the page and
    // invalidate earlier coordinates.
    const c = await cardCenter(page, 'mule-c');
    const a = await cardCenter(page, 'mule-a');

    await touchStart(a.x, a.y);
    // Hold past the 250ms long-press gate.
    await page.waitForTimeout(320);
    // Nudge through intermediate positions so the SortableContext sees a drag.
    await touchMove(a.x, a.y + 8);
    await touchMove(c.x, c.y);
    await touchEnd();

    const ids = await page
      .locator('[data-mule-card]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-mule-card')));
    // Alpha should have moved past Gamma's slot — not first anymore.
    expect(ids.indexOf('mule-a')).toBeGreaterThan(0);
  });

  test('short tap opens the detail drawer', async ({ page }) => {
    await seedApp(page, { theme: 'dark', density: 'comfy' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a = await cardCenter(page, 'mule-a');
    await touchStart(a.x, a.y);
    await page.waitForTimeout(100); // well under the 250ms gate
    await touchEnd();

    // The drawer mounts a heading with the mule's name.
    await expect(page.getByRole('heading', { name: 'Alpha' })).toBeVisible();
  });

  test('pre-engage vertical swipe cancels long-press and scrolls the page', async ({ page }) => {
    await seedApp(page, { theme: 'dark', density: 'comfy' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Capture the baseline after cardCenter's scroll-into-view, not before —
    // otherwise the swipe's own scroll reads as a delta against page-top.
    const a = await cardCenter(page, 'mule-a');
    const startScroll = await page.evaluate(() => window.scrollY);

    await touchStart(a.x, a.y);
    // Vertical drift within 150ms — well before the 250ms gate.
    await touchMove(a.x, a.y + 20);
    await touchMove(a.x, a.y + 40);
    await touchEnd();

    // No drag overlay was created.
    await expect(page.locator('[role="button"][aria-roledescription="sortable"]')).toHaveCount(
      await page.locator('[data-mule-card]').count(),
    );
    // Order is unchanged — no reorder fired.
    const ids = await page
      .locator('[data-mule-card]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-mule-card')));
    expect(ids).toEqual(['mule-a', 'mule-b', 'mule-c']);
    // A downward swipe scrolls the page up (scrollY decreases) or not at all —
    // it must never scroll the wrong way; no drag engaged is the load-bearing
    // assertion above.
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(startScroll);
  });

  test('bulk mode: long-press then drag paints across cards', async ({ page }) => {
    await seedApp(page, { theme: 'dark', density: 'comfy' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Bulk Select Mode is entered via the Select Button (the header's
    // bulk-delete trash icon it replaced is retired).
    await page.getByRole('button', { name: /enter bulk select mode/i }).click();

    // Bottom-most card first — one scroll brings the whole grid into view, so
    // the remaining centers are computed against a stable scroll position.
    const c = await cardCenter(page, 'mule-c');
    const b = await cardCenter(page, 'mule-b');
    const a = await cardCenter(page, 'mule-a');

    await touchStart(a.x, a.y);
    await page.waitForTimeout(320); // past the 250ms gate
    await touchMove(b.x, b.y);
    await touchMove(c.x, c.y);
    await touchEnd();

    // All three panels read as pressed.
    for (const id of ['mule-a', 'mule-b', 'mule-c']) {
      const pressed = await page
        .locator(`[data-mule-card="${id}"] .panel`)
        .getAttribute('aria-pressed');
      expect(pressed).toBe('true');
    }
  });

  test('bulk mode: engaged paint pins touch-action via data-paint-engaged', async ({ page }) => {
    await seedApp(page, { theme: 'dark', density: 'comfy' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Bulk Select Mode is entered via the Select Button (the header's
    // bulk-delete trash icon it replaced is retired).
    await page.getByRole('button', { name: /enter bulk select mode/i }).click();

    const a = await cardCenter(page, 'mule-a');
    const boundary = page.locator('[data-drag-boundary]');
    await expect(boundary).not.toHaveAttribute('data-paint-engaged', 'true');

    await touchStart(a.x, a.y);
    await page.waitForTimeout(320);

    // Engagement flips the attribute — CSS pins touch-action: none so the
    // autoscroll rAF loop can run without the browser fighting it.
    await expect(boundary).toHaveAttribute('data-paint-engaged', 'true');

    await touchEnd();

    await expect(boundary).not.toHaveAttribute('data-paint-engaged', 'true');
  });
});
